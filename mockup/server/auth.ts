/**
 * Invites, browser profiles and cookie sessions. No accounts, no email.
 *
 *   invite   short-lived, single-use, opaque token; only its SHA-256 is stored
 *   redeem   one conditional UPDATE marks it used (two tabs racing: one wins),
 *            then a new profile and a session are minted
 *   session  an opaque cookie value; only its SHA-256 is stored
 *   revoke   an invite revokes the profile it became and every session of it
 *
 * Web Crypto only (no node: imports), so this runs on Workers unchanged.
 */
import type { Sql } from './db/sql';

export interface AuthOptions {
  /** How long a session cookie lives. */
  sessionMs: number;
  now?: () => number;
}

export interface MintedInvite { id: string; token: string; expiresAt: number }
export interface Redeemed { profileId: string; sessionToken: string; expiresAt: number }
export interface SessionInfo { profileId: string }
export interface InviteRow {
  id: string; label: string; created_at: number; expires_at: number;
  redeemed_at: number | null; revoked_at: number | null; profile_id: string | null;
}

/** 32 random bytes, base64url: 43 characters. */
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

function randomToken(bytes = 32): string {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomHex(bytes: number): string {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function inviteStatus(r: Pick<InviteRow, 'expires_at' | 'redeemed_at' | 'revoked_at'>, now: number): 'revoked' | 'redeemed' | 'expired' | 'open' {
  if (r.revoked_at) return 'revoked';
  if (r.redeemed_at) return 'redeemed';
  if (r.expires_at <= now) return 'expired';
  return 'open';
}

export class Auth {
  private now: () => number;

  constructor(private sql: Sql, private opts: AuthOptions) {
    this.now = opts.now ?? (() => Date.now());
  }

  async createInvite(label: string, ttlMs: number): Promise<MintedInvite> {
    const token = randomToken();
    const id = `inv_${randomHex(5)}`;
    const now = this.now();
    const expiresAt = now + ttlMs;
    await this.sql.run('INSERT INTO invites (id, token_hash, label, created_at, expires_at) VALUES (?, ?, ?, ?, ?)', [id, await sha256(token), label.slice(0, 80), now, expiresAt]);
    return { id, token, expiresAt };
  }

  /** Read-only: is this invite still redeemable? (The invite page asks before showing its button.) */
  async inviteOpen(token: string): Promise<boolean> {
    if (!TOKEN_RE.test(token)) return false;
    const r = await this.sql.get<InviteRow>('SELECT expires_at, redeemed_at, revoked_at FROM invites WHERE token_hash = ?', [await sha256(token)]);
    return !!r && inviteStatus(r, this.now()) === 'open';
  }

  /** Single use: the UPDATE only matches an open invite, so of two racing redeems exactly one wins. */
  async redeem(token: string): Promise<Redeemed | null> {
    if (!TOKEN_RE.test(token)) return null;
    const hash = await sha256(token);
    const now = this.now();
    const won = await this.sql.run(
      'UPDATE invites SET redeemed_at = ? WHERE token_hash = ? AND redeemed_at IS NULL AND revoked_at IS NULL AND expires_at > ?',
      [now, hash, now],
    );
    if (won.changes !== 1) return null;
    const inv = await this.sql.get<{ id: string }>('SELECT id FROM invites WHERE token_hash = ?', [hash]);
    if (!inv) return null;
    const profileId = `prf_${randomHex(12)}`;
    await this.sql.run('INSERT INTO profiles (id, invite_id, created_at) VALUES (?, ?, ?)', [profileId, inv.id, now]);
    const s = await this.mintSession(profileId);
    return { profileId, ...s };
  }

  private async mintSession(profileId: string): Promise<{ sessionToken: string; expiresAt: number }> {
    const sessionToken = randomToken();
    const now = this.now();
    const expiresAt = now + this.opts.sessionMs;
    await this.sql.run('INSERT INTO sessions (token_hash, profile_id, created_at, expires_at) VALUES (?, ?, ?, ?)', [await sha256(sessionToken), profileId, now, expiresAt]);
    return { sessionToken, expiresAt };
  }

  /** The profile behind a cookie value, or null if it's unknown, expired or revoked anywhere up the chain. */
  async session(cookieValue: string | undefined): Promise<SessionInfo | null> {
    if (!cookieValue || !TOKEN_RE.test(cookieValue)) return null;
    const r = await this.sql.get<{ profile_id: string }>(
      `SELECT s.profile_id FROM sessions s
         JOIN profiles p ON p.id = s.profile_id
         LEFT JOIN invites i ON i.id = p.invite_id
       WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
         AND p.revoked_at IS NULL AND i.revoked_at IS NULL`,
      [await sha256(cookieValue), this.now()],
    );
    return r ? { profileId: r.profile_id } : null;
  }

  /** Revoke an invite and everything minted from it. Returns false if there's no such invite. */
  async revokeInvite(id: string): Promise<boolean> {
    const now = this.now();
    const r = await this.sql.run('UPDATE invites SET revoked_at = COALESCE(revoked_at, ?) WHERE id = ?', [now, id]);
    if (r.changes === 0) return false;
    await this.sql.run('UPDATE profiles SET revoked_at = COALESCE(revoked_at, ?) WHERE invite_id = ?', [now, id]);
    await this.sql.run('UPDATE sessions SET revoked_at = COALESCE(revoked_at, ?) WHERE profile_id IN (SELECT id FROM profiles WHERE invite_id = ?)', [now, id]);
    return true;
  }

  /** Sign a profile out everywhere without revoking it (it can't sign back in without a new invite, so this is mostly for lost devices). */
  async revokeSessions(profileId: string): Promise<number> {
    const r = await this.sql.run('UPDATE sessions SET revoked_at = ? WHERE profile_id = ? AND revoked_at IS NULL', [this.now(), profileId]);
    return r.changes;
  }

  async listInvites(): Promise<(InviteRow & { status: string })[]> {
    const rows = await this.sql.all<InviteRow>(
      `SELECT i.id, i.label, i.created_at, i.expires_at, i.redeemed_at, i.revoked_at, p.id AS profile_id
         FROM invites i LEFT JOIN profiles p ON p.invite_id = i.id ORDER BY i.created_at DESC`,
    );
    const now = this.now();
    return rows.map((r) => ({ ...r, status: inviteStatus(r, now) }));
  }
}
