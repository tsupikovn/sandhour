import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Mirrors `src-tauri/src/migrations.rs`, which owns the actual DDL.

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  completed: integer('completed', { mode: 'boolean' }).default(false),
  completedAt: text('completed_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  /** YYYY-MM-DD. For a plan (`isPlan`) this is only the creation date. */
  targetDate: text('target_date').notNull(),
  scheduledTime: text('scheduled_time'), // HH:MM
  priority: integer('priority').default(0), // 0 = normal, 1 = one of the day's top 3
  inAttic: integer('in_attic', { mode: 'boolean' }).default(false),
  movedToAtticAt: text('moved_to_attic_at'),
  /** An undated task waiting for a day. */
  isPlan: integer('is_plan', { mode: 'boolean' }).default(false),
});

export const inboxItems = sqliteTable('inbox_items', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  processed: integer('processed', { mode: 'boolean' }).default(false),
  processedAt: text('processed_at'),
  source: text('source'), // 'manual' | 'hotkey'
});

export const dailyRituals = sqliteTable('daily_rituals', {
  id: text('id').primaryKey(),
  ritualDate: text('ritual_date').notNull().unique(),
  top3Tasks: text('top_3_tasks'), // JSON array of task ids
  completedAt: text('completed_at'),
});

export const aiConversations = sqliteTable('ai_conversations', {
  id: text('id').primaryKey(),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  sessionId: text('session_id'),
});

export const userSettings = sqliteTable('user_settings', {
  key: text('key').primaryKey(),
  value: text('value'),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const vocabWords = sqliteTable('vocab_words', {
  id: text('id').primaryKey(),
  word: text('word').notNull(),
  partOfSpeech: text('part_of_speech'),
  translation: text('translation').notNull(),
  example: text('example'),
  exampleTranslation: text('example_translation'),
  forms: text('forms'), // JSON: { items: [{ label, value }], reading }
  showCount: integer('show_count').default(0),
  nextShowDate: text('next_show_date'), // YYYY-MM-DD
  lastShownDate: text('last_shown_date'), // YYYY-MM-DD
  status: text('status').default('active'), // 'active' | 'retired' | 'known'
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  language: text('language').notNull().default('Spanish'), // language being learned
});

export const birthdays = sqliteTable('birthdays', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  month: integer('month').notNull(), // 1-12
  day: integer('day').notNull(), // 1-31
  year: integer('year'), // birth year, optional
  congratulatedYear: integer('congratulated_year'), // last year marked as done
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
