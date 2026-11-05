/**
 * requireAccess: the seam where Google login plugs in later. Today it allows
 * requests from this machine, plus anyone presenting POIO_ACCESS_CODE (header
 * `x-poio-access` or `?access=`). Forwarded-for headers are not trusted.
 */
import type { Context, MiddlewareHandler } from 'hono';

export type IpOf = (c: Context) => string;

/** Remote address from the Node socket (@hono/node-server puts `incoming` on env). */
export const socketIp: IpOf = (c) => {
  const env = c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined;
  return env?.incoming?.socket?.remoteAddress ?? '';
};

export function isLoopback(ip: string): boolean {
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

export function requireAccess(accessCode: string | undefined, ipOf: IpOf = socketIp): MiddlewareHandler {
  return async (c, next) => {
    if (isLoopback(ipOf(c))) return next();
    const given = c.req.header('x-poio-access') ?? c.req.query('access');
    if (accessCode && given && given === accessCode) return next();
    return c.json({ error: 'forbidden' }, 403);
  };
}
