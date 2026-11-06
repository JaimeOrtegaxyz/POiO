/**
 * Feedback typed into the demo, stored for review (npm run feedback). The
 * person chose to send it; the screen id and A/B variant say where they were.
 * No node: imports here.
 */
import type { Sql } from './db/sql';

export const MAX_FEEDBACK_CHARS = 1000;

export interface FeedbackRow {
  id: number; time: string; profile_id: string; screen: string; variant: string; text: string;
  /** The invite's label, when the profile came from one. */
  label: string | null;
}

/** Trimmed text within the limit, or null. */
export function cleanFeedback(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.replace(/\s+/g, ' ').trim();
  return t && t.length <= MAX_FEEDBACK_CHARS ? t : null;
}

export class FeedbackLog {
  constructor(private sql: Sql, private now: () => Date = () => new Date()) {}

  async add(profileId: string, text: string, screen = '', variant = ''): Promise<void> {
    await this.sql.run('INSERT INTO feedback (time, profile_id, screen, variant, text) VALUES (?, ?, ?, ?, ?)', [
      this.now().toISOString(), profileId, /^[a-z]{1,16}$/.test(screen) ? screen : '', variant === 'a' || variant === 'b' ? variant : '', text,
    ]);
  }

  async list(n = 50): Promise<FeedbackRow[]> {
    return this.sql.all<FeedbackRow>(
      `SELECT f.id, f.time, f.profile_id, f.screen, f.variant, f.text, i.label
         FROM feedback f LEFT JOIN profiles p ON p.id = f.profile_id LEFT JOIN invites i ON i.id = p.invite_id
       ORDER BY f.id DESC LIMIT ?`,
      [n],
    );
  }
}
