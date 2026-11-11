//! Window management commands for the Sandhour widget.
//!
//! The main window is frameless (`decorations: false` in tauri.conf.json) and
//! draggable via `data-tauri-drag-region` on the frontend header. These commands
//! cover the parts that must live in Rust: always-on-top, show/hide, and quit.

use tauri::{Manager, Runtime, WebviewWindow};

pub const MAIN_WINDOW: &str = "main";

/// Set the always-on-top flag explicitly. The frontend tracks the current value
/// (persisted in settings) and passes the desired state here.
#[tauri::command]
pub fn set_always_on_top<R: Runtime>(
    window: WebviewWindow<R>,
    value: bool,
) -> Result<(), String> {
    window.set_always_on_top(value).map_err(|e| e.to_string())
}

/// Show and focus the main window.
#[tauri::command]
pub fn show_main_window<R: Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(MAIN_WINDOW) {
        win.show().map_err(|e| e.to_string())?;
        win.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Hide the main window (keeps the app alive in the tray).
#[tauri::command]
pub fn hide_main_window<R: Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(MAIN_WINDOW) {
        win.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Toggle visibility of the main window. Returns the resulting visibility.
pub fn toggle_main_window<R: Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(win) = app.get_webview_window(MAIN_WINDOW) {
        match win.is_visible() {
            Ok(true) => {
                let _ = win.hide();
            }
            _ => {
                let _ = win.show();
                let _ = win.set_focus();
            }
        }
    }
}
