//! Database migrations for the Sandhour SQLite database.
//!
//! These run automatically on startup via `tauri-plugin-sql`. The schema here is
//! the source of truth at the storage layer and mirrors the Drizzle schema in
//! `src/services/database/schema.ts` on the frontend.
//!
//! Never edit a migration that has shipped — add a new one with the next version.

use tauri_plugin_sql::{Migration, MigrationKind};

/// The connection URL used everywhere in the app. `sqlite:` resolves the file
/// inside the app's data directory (managed by tauri-plugin-sql).
pub const DB_URL: &str = "sqlite:sandhour.db";

pub fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create_initial_schema",
        kind: MigrationKind::Up,
        sql: r#"
            CREATE TABLE IF NOT EXISTS tasks (
                id                TEXT PRIMARY KEY,
                text              TEXT NOT NULL,
                completed         INTEGER DEFAULT 0,
                completed_at      TEXT,
                created_at        TEXT DEFAULT CURRENT_TIMESTAMP,
                target_date       TEXT NOT NULL,
                scheduled_time    TEXT,
                priority          INTEGER DEFAULT 0,
                in_attic          INTEGER DEFAULT 0,
                moved_to_attic_at TEXT,
                is_plan           INTEGER DEFAULT 0
            );

            CREATE INDEX IF NOT EXISTS idx_tasks_target_date ON tasks(target_date);
            CREATE INDEX IF NOT EXISTS idx_tasks_in_attic ON tasks(in_attic);
            CREATE INDEX IF NOT EXISTS idx_tasks_is_plan ON tasks(is_plan);

            CREATE TABLE IF NOT EXISTS inbox_items (
                id           TEXT PRIMARY KEY,
                text         TEXT NOT NULL,
                created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
                processed    INTEGER DEFAULT 0,
                processed_at TEXT,
                source       TEXT
            );

            CREATE TABLE IF NOT EXISTS daily_rituals (
                id           TEXT PRIMARY KEY,
                ritual_date  TEXT NOT NULL UNIQUE,
                top_3_tasks  TEXT,
                completed_at TEXT
            );

            CREATE TABLE IF NOT EXISTS ai_conversations (
                id         TEXT PRIMARY KEY,
                role       TEXT NOT NULL,
                content    TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                session_id TEXT
            );

            CREATE TABLE IF NOT EXISTS user_settings (
                key        TEXT PRIMARY KEY,
                value      TEXT,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS vocab_words (
                id                  TEXT PRIMARY KEY,
                word                TEXT NOT NULL,
                part_of_speech      TEXT,
                translation         TEXT NOT NULL,
                example             TEXT,
                example_translation TEXT,
                forms               TEXT,
                show_count          INTEGER DEFAULT 0,
                next_show_date      TEXT,
                last_shown_date     TEXT,
                status              TEXT DEFAULT 'active',
                created_at          TEXT DEFAULT CURRENT_TIMESTAMP,
                language            TEXT NOT NULL DEFAULT 'Spanish'
            );

            CREATE INDEX IF NOT EXISTS idx_vocab_next_show ON vocab_words(next_show_date);
            CREATE INDEX IF NOT EXISTS idx_vocab_last_shown ON vocab_words(last_shown_date);
            CREATE INDEX IF NOT EXISTS idx_vocab_language ON vocab_words(language);

            CREATE TABLE IF NOT EXISTS birthdays (
                id                 TEXT PRIMARY KEY,
                name               TEXT NOT NULL,
                month              INTEGER NOT NULL,
                day                INTEGER NOT NULL,
                year               INTEGER,
                congratulated_year INTEGER,
                created_at         TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_birthdays_month_day ON birthdays(month, day);
        "#,
    }]
}
