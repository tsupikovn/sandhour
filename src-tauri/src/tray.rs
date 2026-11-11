//! System tray icon and menu for Sandhour.
//!
//! Left-clicking the tray icon toggles the widget's visibility. The context menu
//! offers explicit Show / Hide and Quit actions.

use tauri::{
    menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Runtime,
};

use crate::window;

pub fn create_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
    let hide_i = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_i, &hide_i, &sep, &quit_i])?;

    TrayIconBuilder::with_id("sandhour-tray")
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("Sandhour")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(handle_menu_event)
        .on_tray_icon_event(handle_tray_icon_event)
        .build(app)?;

    Ok(())
}

fn handle_menu_event<R: Runtime>(app: &tauri::AppHandle<R>, event: MenuEvent) {
    match event.id.as_ref() {
        "show" => {
            if let Some(win) = app.get_webview_window(window::MAIN_WINDOW) {
                let _ = win.show();
                let _ = win.set_focus();
            }
        }
        "hide" => {
            if let Some(win) = app.get_webview_window(window::MAIN_WINDOW) {
                let _ = win.hide();
            }
        }
        "quit" => {
            app.exit(0);
        }
        _ => {}
    }
}

fn handle_tray_icon_event<R: Runtime>(tray: &tauri::tray::TrayIcon<R>, event: TrayIconEvent) {
    if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
    } = event
    {
        window::toggle_main_window(tray.app_handle());
    }
}
