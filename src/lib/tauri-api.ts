import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

/** Pin/unpin the widget above all other windows. */
export async function setAlwaysOnTop(value: boolean): Promise<void> {
  await invoke('set_always_on_top', { value });
}

/** Show and focus the main widget window. */
export async function showMainWindow(): Promise<void> {
  await invoke('show_main_window');
}

/** Hide the main widget window to the tray. */
export async function hideMainWindow(): Promise<void> {
  await invoke('hide_main_window');
}

/** Minimize the current window. */
export async function minimizeWindow(): Promise<void> {
  await getCurrentWindow().minimize();
}

/**
 * Close the current window. For the main window this is intercepted in Rust and
 * hides to the tray instead of quitting.
 */
export async function closeWindow(): Promise<void> {
  await getCurrentWindow().close();
}
