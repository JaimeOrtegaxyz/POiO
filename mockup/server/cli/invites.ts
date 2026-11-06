/**
 * Mint, list and revoke demo invites (v1 admin is this CLI). From mockup/:
 *
 *   npm run invites -- create --label "Angie" [--hours 72]
 *   npm run invites -- list
 *   npm run invites -- revoke inv_0a1b2c3d4e
 *
 * `create` prints the link once; only the token's hash is stored, so a lost
 * link can't be shown again (revoke it and mint another). Links use
 * POIO_PUBLIC_URL (the tunnel or host origin). Safe to run while the server
 * runs: the database is in WAL mode.
 */
import { Auth } from '../auth';
import { loadConfig, loadDotEnv } from '../config';
import { openSqlite } from '../db/sqlite';

loadDotEnv();
const config = loadConfig();

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

const fmt = (ms: number | null) => (ms ? new Date(ms).toISOString().slice(0, 16).replace('T', ' ') : '-');

async function main(): Promise<number> {
  const [cmd, ...args] = process.argv.slice(2);
  const sql = await openSqlite(config.dbPath);
  const auth = new Auth(sql, { sessionMs: config.profileSessionMs });
  try {
    if (cmd === 'create') {
      const label = flag(args, 'label') ?? '';
      const hours = Number(flag(args, 'hours') ?? config.inviteTtlMs / 3_600_000);
      if (!Number.isFinite(hours) || hours <= 0 || hours > 24 * 30) { console.error('--hours must be between 0 and 720'); return 2; }
      const inv = await auth.createInvite(label, hours * 3_600_000);
      console.log(`${inv.id}  ${label ? `(${label})  ` : ''}expires ${fmt(inv.expiresAt)} UTC, single use`);
      console.log(`${config.publicUrl}/invite/${inv.token}`);
      if (config.publicUrl.startsWith('http://localhost')) console.log('(set POIO_PUBLIC_URL to the tunnel or host origin for a shareable link)');
      return 0;
    }
    if (cmd === 'list') {
      const rows = await auth.listInvites();
      if (!rows.length) { console.log('(no invites)'); return 0; }
      for (const r of rows) {
        console.log([r.id, r.status.padEnd(8), `created ${fmt(r.created_at)}`, `expires ${fmt(r.expires_at)}`, r.profile_id ? `profile ${r.profile_id}` : '', r.label].filter(Boolean).join('  '));
      }
      return 0;
    }
    if (cmd === 'revoke') {
      const id = args[0];
      if (!id) { console.error('usage: revoke <invite id>'); return 2; }
      const ok = await auth.revokeInvite(id);
      console.log(ok ? `revoked ${id}: the invite, its profile and every session from it` : `no invite ${id}`);
      return ok ? 0 : 1;
    }
    console.error('usage: npm run invites -- create --label <name> [--hours 72] | list | revoke <id>');
    return 2;
  } finally {
    sql.close();
  }
}

process.exitCode = await main();
