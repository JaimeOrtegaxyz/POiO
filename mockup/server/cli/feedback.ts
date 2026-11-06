/**
 * Read the feedback people typed into the demo, newest first. From mockup/:
 *
 *   npm run feedback            # the latest 50
 *   npm run feedback -- 200     # the latest 200
 *
 * Each line: time, who (the invite's label, or "local"), the screen and A/B
 * variant they were on, and the text.
 */
import { loadConfig, loadDotEnv } from '../config';
import { openSqlite } from '../db/sqlite';
import { FeedbackLog } from '../feedback';

loadDotEnv();
const config = loadConfig();
const n = Math.min(Math.max(Number(process.argv[2]) || 50, 1), 1000);
const sql = await openSqlite(config.dbPath);
try {
  const rows = await new FeedbackLog(sql).list(n);
  if (!rows.length) console.log('(no feedback yet)');
  for (const r of rows) {
    const who = r.profile_id === 'local' ? 'local' : r.label || r.profile_id;
    const where = [r.screen, r.variant && `variant ${r.variant}`].filter(Boolean).join(', ');
    console.log(`${r.time.slice(0, 16).replace('T', ' ')} UTC  ${who}${where ? `  (${where})` : ''}\n  ${r.text}\n`);
  }
} finally {
  sql.close();
}
