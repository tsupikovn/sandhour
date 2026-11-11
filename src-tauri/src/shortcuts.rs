//! Global keyboard shortcuts.
//!
//! `Ctrl+Shift+I` (from any application) reveals the always-ready, hidden
//! "inbox-quick" window for a fast capture. The window is pre-created in
//! `tauri.conf.json` (hidden) so showing it is instant (<200ms).

use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutEvent, ShortcutState};

pub const INBOX_WINDOW: &str = "inbox-quick";

/// The quick-capture shortcut: Ctrl+Shift+I.
pub fn inbox_shortcut() -> Shortcut {
    Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyI)
}

/// Handler invoked by the global-shortcut plugin. Only one shortcut is
/// registered, so any "pressed" event means: reveal the quick-add window.
pub fn on_shortcut<R: Runtime>(app: &AppHandle<R>, _shortcut: &Shortcut, event: ShortcutEvent) {
    if event.state == ShortcutState::Pressed {
        if let Some(win) = app.get_webview_window(INBOX_WINDOW) {
            let _ = win.show();
            let _ = win.center();
            let _ = win.set_focus();
        }
    }
}
