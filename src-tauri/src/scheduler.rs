//! Daily scheduler for the Attic rollover.
//!
//! At 23:59 local time every day we ask the frontend to move unfinished tasks
//! into the Attic (the frontend owns the DB connection, so it does the actual
//! work — see the `attic-migrate` listener in `App.tsx`). This mirrors the
//! `[DEBUG] Trigger Attic Migration Now` tray item, just on a schedule.
//!
//! Implemented with a plain background thread + `chrono` rather than a cron
//! crate: it has zero extra dependencies and the loop recomputes the delay each
//! iteration, so it self-corrects after sleep/hibernate or clock changes.

use chrono::{Days, Local, Timelike};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Runtime};

/// Event the frontend listens for to run the migration.
pub const ATTIC_MIGRATE_EVENT: &str = "attic-migrate";

const ROLLOVER_HOUR: u32 = 23;
const ROLLOVER_MIN: u32 = 59;

pub fn start<R: Runtime>(app: AppHandle<R>) {
    std::thread::spawn(move || loop {
        let wait = seconds_until_next(ROLLOVER_HOUR, ROLLOVER_MIN);
        std::thread::sleep(Duration::from_secs(wait));

        if let Err(e) = app.emit(ATTIC_MIGRATE_EVENT, ()) {
            eprintln!("scheduler: failed to emit {ATTIC_MIGRATE_EVENT}: {e}");
        }

        // Step past the target minute so the next recompute lands on tomorrow,
        // never re-firing within the same minute.
        std::thread::sleep(Duration::from_secs(70));
    });
}

/// Seconds from now until the next occurrence of `hour:min:00` in local time.
fn seconds_until_next(hour: u32, min: u32) -> u64 {
    let now = Local::now();
    let mut target = now
        .with_hour(hour)
        .and_then(|t| t.with_minute(min))
        .and_then(|t| t.with_second(0))
        .and_then(|t| t.with_nanosecond(0))
        .unwrap_or(now);

    if target <= now {
        target = target + Days::new(1);
    }

    (target - now).num_seconds().max(0) as u64
}
