use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

/// Stable backup directory, deliberately OUTSIDE the app's data folder so a reset
/// or corruption of the live DB can never take the backups with it. Prefers the
/// user's Documents (`Documents\Sandhour\backups`), falling back to the app data
/// dir if Documents is unavailable.
fn backups_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .document_dir()
        .or_else(|_| app.path().app_data_dir())
        .map_err(|e| e.to_string())?;
    let dir = base.join("Sandhour").join("backups");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Copy the live DB (and its `-wal` / `-shm` sidecars) into a dated snapshot,
/// once per day. Runs at startup BEFORE the SQL plugin opens the database, so
/// there is no lock contention and the copy is a crash-consistent set that
/// SQLite can recover. Any failure is logged, never fatal.
pub fn run_startup_backup(app: &AppHandle) {
    if let Err(e) = try_backup(app) {
        eprintln!("[backup] startup backup skipped: {e}");
    }
}

fn try_backup(app: &AppHandle) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db = data_dir.join("sandhour.db");
    if !db.exists() {
        return Ok(()); // first launch — nothing to back up yet
    }

    let dir = backups_dir(app)?;
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let target = dir.join(format!("sandhour_{today}.db"));

    // Redo if today's snapshot is missing or a previous run left it empty.
    let need = fs::metadata(&target).map(|m| m.len() == 0).unwrap_or(true);
    if need {
        for ext in ["", "-wal", "-shm"] {
            let src = data_dir.join(format!("sandhour.db{ext}"));
            let dst = dir.join(format!("sandhour_{today}.db{ext}"));
            if src.exists() {
                fs::copy(&src, &dst).map_err(|e| e.to_string())?;
            } else {
                // A stale sidecar from an older run must not linger.
                let _ = fs::remove_file(&dst);
            }
        }
    }

    prune(&dir, 14);
    Ok(())
}

/// Keep only the newest `keep` daily snapshots; delete older ones with their
/// sidecars. Filenames embed an ISO date, so a lexical sort is chronological.
fn prune(dir: &Path, keep: usize) {
    let mut days: Vec<String> = match fs::read_dir(dir) {
        Ok(rd) => rd
            .filter_map(|e| e.ok())
            .filter_map(|e| e.file_name().into_string().ok())
            .filter(|n| n.starts_with("sandhour_") && n.ends_with(".db"))
            .collect(),
        Err(_) => return,
    };
    days.sort();
    if days.len() <= keep {
        return;
    }
    for base in &days[..days.len() - keep] {
        for ext in ["", "-wal", "-shm"] {
            let _ = fs::remove_file(dir.join(format!("{base}{ext}")));
        }
    }
}
