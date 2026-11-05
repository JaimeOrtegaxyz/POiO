/**
 * Debug panel (?debug=1). English is fine here: it's not device UI.
 * Profile, timing, scale, variant, checkpoint speed, advance clock, brain
 * mode, mute, recent API calls, event-log tail, refresh stats, reset.
 */
import type { UsageSummary } from '../shared/types';
import type { App } from './flows/app';
import { PROFILES, type ProfileId, type TimingMode } from './screen/profiles';
import { clearState } from './state/store';

export interface DebugSources {
  usage: () => UsageSummary | null;
  events: () => { time: string; type: string; data?: unknown }[];
  setVariant: (v: 'a' | 'b') => void;
}

export function initDebug(host: HTMLElement, app: App, src: DebugSources): () => void {
  host.hidden = false;
  host.innerHTML = `
    <h2>POiO debug</h2>
    <div><span class="badge" data-k="brain"></span></div>
    <label>profile <select data-k="profile">${Object.values(PROFILES).map((p) => `<option value="${p.id}">${p.id}</option>`).join('')}</select></label>
    <label>timing <select data-k="timing"><option value="fast">fast</option><option value="real">real</option></select></label>
    <label>scale <select data-k="scale"><option>1</option><option>2</option><option>3</option></select></label>
    <label>variant <select data-k="variant"><option value="a">a · images + frames</option><option value="b">b · text-led</option></select></label>
    <label>checkpoint speed <input data-k="speed" type="number" min="1" max="600" step="1" style="width:70px"></label>
    <div class="row">clock <button data-adv="600000">+10 min</button><button data-adv="3600000">+1 h</button><button data-adv="10800000">+3 h</button><button data-adv="86400000">+1 day</button><button data-adv="0">reset</button></div>
    <div data-k="clock"></div>
    <label>mute <input data-k="mute" type="checkbox"></label>
    <div data-k="refresh"></div>
    <h2>recent API calls</h2><pre data-k="calls"></pre>
    <h2>event log (tail)</h2><pre data-k="events"></pre>
    <div class="row"><button data-k="reset">reset device</button></div>`;
  const q = <T extends HTMLElement>(k: string) => host.querySelector(`[data-k="${k}"]`) as T;
  const s = app.state.settings;

  const profile = q<HTMLSelectElement>('profile');
  const timing = q<HTMLSelectElement>('timing');
  const scale = q<HTMLSelectElement>('scale');
  const variant = q<HTMLSelectElement>('variant');
  const speed = q<HTMLInputElement>('speed');
  const mute = q<HTMLInputElement>('mute');

  profile.value = app.screen.profile.id;
  timing.value = app.screen.timing;
  scale.value = String(app.screen.scale);
  variant.value = app.variant;
  speed.value = String(s.speed);
  mute.checked = app.sounds.muted;

  const repaintFull = () => { if (app.on) app.render('full'); };
  profile.onchange = () => {
    s.profile = profile.value as ProfileId;
    s.scale = undefined;
    app.screen.setProfile(s.profile);
    scale.value = String(app.screen.scale);
    app.save();
    if (app.on) repaintFull(); else app.screen.blank();
  };
  timing.onchange = () => { s.timing = timing.value as TimingMode; app.screen.setTiming(s.timing); app.save(); };
  scale.onchange = () => { s.scale = Number(scale.value); app.screen.setScale(s.scale); app.save(); };
  variant.onchange = () => { src.setVariant(variant.value as 'a' | 'b'); repaintFull(); };
  speed.onchange = () => { s.speed = Math.max(1, Number(speed.value) || 1); app.save(); };
  mute.onchange = () => { app.sounds.muted = mute.checked; s.muted = mute.checked; app.save(); };
  host.querySelectorAll<HTMLButtonElement>('[data-adv]').forEach((b) => {
    b.onclick = () => {
      const ms = Number(b.dataset.adv);
      s.clockOffsetMs = ms === 0 ? 0 : s.clockOffsetMs + ms;
      app.save();
      app.tick();
      update();
    };
  });
  q<HTMLButtonElement>('reset').onclick = () => {
    if (!confirm('Reset this device? Pantry, poionotas and history are cleared.')) return;
    clearState();
    localStorage.removeItem('poio.events.v1');
    location.reload();
  };

  const update = () => {
    const u = src.usage();
    q('brain').textContent = u ? (u.fake ? 'modo demo (fake brain)' : `live · ${u.model}`) : 'brain: ?';
    const off = s.clockOffsetMs;
    q('clock').textContent = `device clock: ${new Date(app.now()).toLocaleString('es-MX')}${off ? ` (+${Math.round(off / 60000)} min)` : ''}`;
    const st = app.screen.display.stats;
    q('refresh').textContent = `refresh: ${st.full} full · ${st.partial} partial · last ${st.last ?? '-'}${st.lastRect ? ` ${st.lastRect.w}×${st.lastRect.h}@${st.lastRect.x},${st.lastRect.y}` : ''} · screen ${app.rt.screen}`;
    q('calls').textContent = (u?.recent ?? [])
      .map((r) => `${r.time.slice(11, 19)} ${r.endpoint} ${r.model.replace('claude-', '')} in ${r.input_tokens} cw ${r.cache_creation_input_tokens} cr ${r.cache_read_input_tokens} out ${r.output_tokens} $${r.usd.toFixed(5)}`)
      .join('\n') || '(none)';
    q('events').textContent = src.events().slice(-12).reverse().map((e) => `${e.time.slice(11, 19)} ${e.type} ${e.data ? JSON.stringify(e.data) : ''}`).join('\n') || '(none)';
  };
  update();
  return update;
}
