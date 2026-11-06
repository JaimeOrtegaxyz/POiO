/**
 * Who may use /api/*. Three ways in, checked in this order:
 *
 *   1. profile  a valid invite session cookie (poio_sid): an isolated
 *               browser profile with its own state and its own caps
 *   2. local    a request from this machine that no proxy forwarded
 *   3. code     POIO_ACCESS_CODE (header x-poio-access or ?access=): the
 *               interim kitchen-test path through the iMac tunnel
 *
 * 2 and 3 are "local mode": state stays in that browser, as before invites.
 *
 * A tunnel (cloudflared) connects from 127.0.0.1, so loopback alone is not
 * "this machine": a request carrying a proxy header (cf-connecting-ip,
 * x-forwarded-for, forwarded, x-real-ip, cf-ray) came from outside and needs
 * a cookie or the code. Proxy headers are trusted for nothing else, except
 * cf-connecting-ip from loopback as the client IP for the per-IP limit.
 */
import type { Context, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Auth } from './auth';

export type IpOf = (c: Context) => string;

export type Access =
  | { kind: 'profile'; profileId: string }
  | { kind: 'local'; via: 'loopback' | 'code' };

export const SESSION_COOKIE = 'poio_sid';
export const LOCAL_PROFILE = 'local';

/** Remote address from the Node socket (@hono/node-server puts `incoming` on env). */
export const socketIp: IpOf = (c) => {
  const env = c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined;
  return env?.incoming?.socket?.remoteAddress ?? '';
};

export function isLoopback(ip: string): boolean {
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

const PROXY_HEADERS = ['cf-connecting-ip', 'cf-ray', 'x-forwarded-for', 'forwarded', 'x-real-ip'];

export function isProxied(c: Context): boolean {
  return PROXY_HEADERS.some((h) => c.req.header(h) !== undefined);
}

/** The client's IP for rate limiting: the socket, or the tunnel's cf-connecting-ip when the socket is loopback. */
export function clientIp(c: Context, ipOf: IpOf): string {
  const ip = ipOf(c);
  const cf = c.req.header('cf-connecting-ip');
  return isLoopback(ip) && cf ? cf.trim().slice(0, 64) : ip;
}

/** This machine, not forwarded by any proxy. */
export function isLocal(c: Context, ipOf: IpOf): boolean {
  return isLoopback(ipOf(c)) && !isProxied(c);
}

export interface AccessDeps {
  auth: Auth;
  accessCode: string | undefined;
  ipOf: IpOf;
}

export async function resolveAccess(c: Context, d: AccessDeps): Promise<Access | null> {
  const s = await d.auth.session(getCookie(c, SESSION_COOKIE));
  if (s) return { kind: 'profile', profileId: s.profileId };
  if (isLocal(c, d.ipOf)) return { kind: 'local', via: 'loopback' };
  const given = c.req.header('x-poio-access') ?? c.req.query('access');
  if (d.accessCode && given && given === d.accessCode) return { kind: 'local', via: 'code' };
  return null;
}

/** Gate for /api/*: sets c.get('access') or answers 403. */
export function requireAccess(d: AccessDeps): MiddlewareHandler {
  return async (c, next) => {
    const a = await resolveAccess(c, d);
    if (!a) return c.json({ error: 'forbidden', invite: true }, 403);
    c.set('access' as never, a as never);
    return next();
  };
}

export function accessOf(c: Context): Access {
  return c.get('access' as never) as Access;
}
