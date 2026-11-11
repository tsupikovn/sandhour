import { desc, eq } from 'drizzle-orm';
import { emit } from '@tauri-apps/api/event';
import { getDb } from '@/services/database/client';
import { inboxItems, tasks } from '@/services/database/schema';
import { nowISO, todayISO } from '@/utils/date';

export interface InboxItem {
  id: string;
  text: string;
  createdAt: string;
  source?: string;
}

/** Event broadcast (cross-window) whenever the inbox changes. */
export const INBOX_CHANGED = 'inbox-changed';

/** Insert one item per non-empty line. Used by the global-hotkey quick add. */
export async function addInboxItems(lines: string[], source = 'hotkey'): Promise<number> {
  const clean = lines.map((l) => l.trim()).filter(Boolean);
  if (clean.length === 0) return 0;

  await getDb()
    .insert(inboxItems)
    .values(
      clean.map((text) => ({
        id: crypto.randomUUID(),
        text,
        createdAt: nowISO(),
        processed: false,
        source,
      }))
    );

  await emit(INBOX_CHANGED);
  return clean.length;
}

/** All unprocessed inbox items, newest first. */
export async function getInboxItems(): Promise<InboxItem[]> {
  const rows = await getDb()
    .select()
    .from(inboxItems)
    .where(eq(inboxItems.processed, false))
    .orderBy(desc(inboxItems.createdAt));

  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    createdAt: r.createdAt ?? nowISO(),
    source: r.source ?? undefined,
  }));
}

async function consume(id: string): Promise<void> {
  await getDb().delete(inboxItems).where(eq(inboxItems.id, id));
  await emit(INBOX_CHANGED);
}

/** Turn an inbox item into a task for today. */
export async function inboxToToday(item: InboxItem): Promise<void> {
  await getDb().insert(tasks).values({
    id: crypto.randomUUID(),
    text: item.text,
    completed: false,
    createdAt: nowISO(),
    targetDate: todayISO(),
    priority: 0,
    inAttic: false,
  });
  await consume(item.id);
}

/** Send an inbox item straight to the Attic. */
export async function inboxToAttic(item: InboxItem): Promise<void> {
  await getDb().insert(tasks).values({
    id: crypto.randomUUID(),
    text: item.text,
    completed: false,
    createdAt: nowISO(),
    targetDate: todayISO(),
    priority: 0,
    inAttic: true,
    movedToAtticAt: nowISO(),
  });
  await consume(item.id);
}

/** Discard an inbox item. */
export async function deleteInboxItem(id: string): Promise<void> {
  await consume(id);
}
