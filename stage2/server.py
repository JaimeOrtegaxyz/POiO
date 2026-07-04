#!/usr/bin/env python3
"""POiO Stage-2 local server — the brain the e-paper companion talks to.

Zero dependencies (Python stdlib). Serves the pantry, the stepper recipes, and
the post-cook "used tonight?" prediction over a small JSON API, and serves the
encoder app as a static front end from web/. SKILL.md + pantry.md are the brain;
this wraps their logic in something the device (and the laptop-as-device
prototype) can poll over HTTP.

The hot cooking loop needs NO live LLM: recipes are structured JSON, and the
post-cook diff is computed deterministically from each ingredient's `depletes`.
The LLM (headless `claude` CLI) is only for generating suggestions / new recipes
— see ask_llm() — and is off the critical path so the kitchen stays instant.

Run:  python3 stage2/server.py [--port 8781]
"""
import json
import re
import shutil
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

HERE = Path(__file__).resolve().parent
DATA = HERE / "data"
RECIPES_DIR = DATA / "recipes"
PANTRY_JSON = DATA / "pantry.json"
WEB = HERE / "web"

# --- pantry status prediction (the encoder control's whole trick) -----------
# current status + how much the dish draws it down -> predicted status.
def predict(status: str, depletes: str) -> str:
    if depletes == "finishes":
        return "out"
    if depletes == "heavy":
        return {"plenty": "low", "low": "out"}.get(status, status)
    if depletes == "some":
        return {"low": "out"}.get(status, status)
    return status  # none / light -> no change


FORCE_FIRSTRUN = False


def provisioned() -> bool:
    """A fresh clone has no pantry.json — that's the first-run signal.
    --first-run forces this off so onboarding can be previewed non-destructively."""
    return PANTRY_JSON.exists() and not FORCE_FIRSTRUN


def load_pantry() -> dict:
    return json.loads(PANTRY_JSON.read_text())


def save_pantry(doc: dict) -> None:
    doc["counts"] = {s: sum(1 for it in doc["items"] if it["status"] == s)
                     for s in ("plenty", "low", "out")}
    tmp = PANTRY_JSON.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n")
    tmp.replace(PANTRY_JSON)


def load_recipes() -> dict:
    out = {}
    for f in sorted(RECIPES_DIR.glob("*.json")):
        r = json.loads(f.read_text())
        out[r["id"]] = r
    return out


RECIPES = load_recipes()


def pantry_index():
    return {it["key"]: it for it in load_pantry()["items"]}


def recipe_summary(r, pidx):
    missing = [ing["item"] for ing in r["ingredients"]
               if ing.get("required", True) and pidx.get(ing["item"], {}).get("status") == "out"]
    return {
        "id": r["id"], "name": r["name"], "vibe": r["vibe"], "serves": r["serves"],
        "time": r["time"], "flavor": r.get("flavor"), "tags": r.get("tags", []),
        "feasible": not missing, "missing": missing,
    }


def recipe_full(r, pidx):
    """Recipe with live pantry status stamped on each ingredient + step use."""
    r = json.loads(json.dumps(r))  # deep copy
    for ing in r["ingredients"]:
        ing["status"] = pidx.get(ing["item"], {}).get("status", "out")
        ing["label"] = pidx.get(ing["item"], {}).get("label", ing.get("display", ing["item"]))
    r["feasible"] = not [i for i in r["ingredients"]
                         if i.get("required", True) and i["status"] == "out"]
    return r


def consumed_diff(r, pidx):
    """Predicted post-cook pantry changes — the 'used tonight?' checklist."""
    changes = []
    for ing in r["ingredients"]:
        it = pidx.get(ing["item"])
        if not it:
            continue
        new = predict(it["status"], ing.get("depletes", "none"))
        if new != it["status"]:
            changes.append({"item": ing["item"], "label": it["label"],
                            "display": ing.get("display", it["label"]),
                            "from": it["status"], "to": new})
    return changes


def pick_today(pidx):
    """Deterministic 'tonight' pick: first feasible recipe. (LLM upgrades this.)"""
    for r in RECIPES.values():
        s = recipe_summary(r, pidx)
        if s["feasible"]:
            return s
    return next(iter(RECIPES.values()), None) and recipe_summary(next(iter(RECIPES.values())), pidx)


# --- LLM seam: headless `claude` CLI (uses existing Claude Code auth) --------
# resolved from PATH so it's portable across machines (no hardcoded home dir).
CLAUDE_BIN = shutil.which("claude")


def llm_available() -> bool:
    return CLAUDE_BIN is not None


def ask_llm(prompt: str, timeout: int = 60) -> str:
    """One-shot headless call. Off the hot path — used for suggest/generate only.
    Decision (flag to Jaime): we shell out to the `claude` CLI rather than the
    Anthropic API so it rides his existing auth — no API key to manage, and
    SKILL.md can be loaded as the system context. Swap for the API later if a
    key + lower latency matter."""
    if not llm_available():
        raise RuntimeError("claude CLI not found on PATH")
    proc = subprocess.run([CLAUDE_BIN, "-p", prompt],
                          capture_output=True, text=True, timeout=timeout)
    if proc.returncode != 0:
        raise RuntimeError(f"claude CLI failed: {proc.stderr[:200]}")
    return proc.stdout.strip()


class Handler(BaseHTTPRequestHandler):
    server_version = "poio-stage2/0.1"

    def _send(self, code, obj=None, ctype="application/json", raw=None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        if raw is not None:
            self.wfile.write(raw)
        elif obj is not None:
            self.wfile.write(json.dumps(obj, ensure_ascii=False).encode("utf-8"))

    def log_message(self, *a):  # quieter
        pass

    def do_OPTIONS(self):
        self._send(204)

    def do_GET(self):
        u = urlparse(self.path)
        path, qs = u.path, parse_qs(u.query)
        try:
            if path == "/api/health":
                return self._send(200, {"ok": True, "recipes": len(RECIPES),
                                        "llm": llm_available(), "provisioned": provisioned()})
            if path == "/api/pantry":
                if not provisioned():
                    return self._send(200, {"provisioned": False,
                                            "counts": {"plenty": 0, "low": 0, "out": 0}, "items": []})
                doc = load_pantry()
                items = doc["items"]
                if qs.get("filter", [""])[0] == "attention":
                    items = [it for it in items if it["status"] in ("low", "out")]
                return self._send(200, {"provisioned": True, "updated": doc.get("updated"),
                                        "counts": doc["counts"], "items": items})
            if path == "/api/recipes":
                pidx = pantry_index()
                return self._send(200, {"recipes": [recipe_summary(r, pidx) for r in RECIPES.values()]})
            m = re.match(r"^/api/recipes/([a-z0-9-]+)(/consumed)?$", path)
            if m:
                rid, sub = m.group(1), m.group(2)
                r = RECIPES.get(rid)
                if not r:
                    return self._send(404, {"error": "no such recipe", "id": rid})
                pidx = pantry_index()
                if sub == "/consumed":
                    return self._send(200, {"id": rid, "changes": consumed_diff(r, pidx)})
                return self._send(200, recipe_full(r, pidx))
            if path == "/api/today":
                if not provisioned():
                    return self._send(200, {"provisioned": False, "tonight": None})
                return self._send(200, {"provisioned": True, "tonight": pick_today(pantry_index())})
            # static: serve the app from web/
            return self._serve_static(path)
        except Exception as e:  # noqa
            return self._send(500, {"error": str(e)})

    def do_POST(self):
        u = urlparse(self.path)
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length) or "{}") if length else {}
            if u.path == "/api/pantry/apply":
                return self._apply(body)
            if u.path == "/api/pantry/bootstrap":
                return self._bootstrap(body)
            if u.path == "/api/suggest":
                return self._suggest(body)
            return self._send(404, {"error": "unknown endpoint"})
        except Exception as e:  # noqa
            return self._send(500, {"error": str(e)})

    def _apply(self, body):
        changes = body.get("changes", [])
        doc = load_pantry()
        idx = {it["key"]: it for it in doc["items"]}
        applied = []
        for ch in changes:
            it = idx.get(ch.get("item"))
            to = ch.get("to")
            if it and to in ("plenty", "low", "out"):
                it["status"] = to
                applied.append({"item": it["key"], "to": to})
        save_pantry(doc)
        return self._send(200, {"applied": applied, "counts": doc["counts"]})

    def _bootstrap(self, body):
        """First-run provisioning. mode='demo' seeds a plausible pantry so a fresh
        clone is cookable in one press; the real path is the conversational
        bootstrap (talk to the poio skill → pantry.md → bootstrap_pantry.py)."""
        mode = body.get("mode", "demo")
        args = [sys.executable, str(HERE / "bootstrap_pantry.py")]
        if mode == "demo":
            args.append("--demo")
        proc = subprocess.run(args, capture_output=True, text=True, timeout=30)
        if proc.returncode != 0:
            return self._send(500, {"error": "bootstrap failed", "detail": proc.stderr[:300]})
        doc = load_pantry()
        return self._send(200, {"provisioned": True, "mode": mode, "counts": doc["counts"]})

    def _suggest(self, body):
        """Mode-1 'what should I cook'. Tries the LLM; falls back to the
        deterministic feasible list so the endpoint never blocks the kitchen."""
        pidx = pantry_index()
        feasible = [s for s in (recipe_summary(r, pidx) for r in RECIPES.values()) if s["feasible"]]
        return self._send(200, {"source": "deterministic",
                                 "note": "LLM suggestion wired via ask_llm(); this milestone returns feasible recipes.",
                                 "suggestions": feasible})

    def _serve_static(self, path):
        rel = "index.html" if path in ("/", "") else path.lstrip("/")
        f = (WEB / rel).resolve()
        if WEB in f.parents or f == WEB / rel:
            if f.is_file() and str(f).startswith(str(WEB)):
                ctype = {"html": "text/html", "css": "text/css", "js": "application/javascript",
                         "json": "application/json", "svg": "image/svg+xml", "woff2": "font/woff2",
                         "woff": "font/woff", "ttf": "font/ttf"}.get(f.suffix.lstrip("."), "text/plain")
                return self._send(200, raw=f.read_bytes(), ctype=ctype + "; charset=utf-8")
        return self._send(404, {"error": "not found", "path": path})


def main():
    global FORCE_FIRSTRUN
    port = 8781
    if "--port" in sys.argv:
        port = int(sys.argv[sys.argv.index("--port") + 1])
    if "--first-run" in sys.argv:
        FORCE_FIRSTRUN = True  # preview the onboarding screen without touching pantry.json
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"poio stage-2 on http://127.0.0.1:{port}  "
          f"(recipes={len(RECIPES)}, llm={'yes' if llm_available() else 'no'}"
          f"{', FIRST-RUN preview' if FORCE_FIRSTRUN else ''})")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
