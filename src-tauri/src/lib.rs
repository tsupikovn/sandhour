mod backup;
mod migrations;
mod scheduler;
mod shortcuts;
mod tray;
mod window;

use tauri::Manager;
use tauri_plugin_global_shortcut::GlobalShortcutExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must be the FIRST plugin: a second launch is caught here and, instead
        // of starting a rival process that fights over the database, it reveals
        // and focuses the already-running window.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(w) = app.get_webview_window(window::MAIN_WINDOW) {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        // Outbound requests to third-party AI providers go through Rust so they
        // are not subject to the webview's CORS rules.
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(migrations::DB_URL, migrations::migrations())
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(shortcuts::on_shortcut)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            window::set_always_on_top,
            window::show_main_window,
            window::hide_main_window,
        ])
        .setup(|app| {
            // Snapshot the DB before the SQL plugin opens it (once per day).
            backup::run_startup_backup(app.handle());
            tray::create_tray(app.handle())?;
            scheduler::start(app.handle().clone());
            // Register the global quick-capture shortcut. A failure (e.g. the
            // combo is taken by another app) must not abort startup.
            if let Err(e) = app.global_shortcut().register(shortcuts::inbox_shortcut()) {
                eprintln!("failed to register inbox shortcut: {e}");
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing either window hides it instead of destroying it, so the
            // widget lives in the tray and the quick-add window stays ready.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == window::MAIN_WINDOW
                    || window.label() == shortcuts::INBOX_WINDOW
                {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
