import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import { useSettingsStore } from '@/stores/settingsStore';
import { todayISO } from '@/utils/date';

/**
 * Wrapper around Tauri notifications enforcing the project's hard rules:
 * at most 7 notifications per day and at least 30 minutes between them.
 */
class NotificationService {
  private readonly maxPerDay = 7;
  private readonly minGapMs = 30 * 60 * 1000;

  private dayKey = '';
  private countToday = 0;
  private lastSentAt = 0;

  private async ensurePermission(): Promise<boolean> {
    let granted = await isPermissionGranted();
    if (!granted) {
      granted = (await requestPermission()) === 'granted';
    }
    return granted;
  }

  /** Send a notification if within rate limits and permitted. Returns whether it was sent. */
  async send(title: string, body: string): Promise<boolean> {
    if (!useSettingsStore.getState().notificationsEnabled) return false;

    const today = todayISO();
    if (this.dayKey !== today) {
      this.dayKey = today;
      this.countToday = 0;
    }

    if (this.countToday >= this.maxPerDay) return false;
    if (Date.now() - this.lastSentAt < this.minGapMs) return false;
    if (!(await this.ensurePermission())) return false;

    sendNotification({ title, body });
    this.countToday += 1;
    this.lastSentAt = Date.now();
    return true;
  }
}

export const notifications = new NotificationService();
