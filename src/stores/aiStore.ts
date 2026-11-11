import { create } from 'zustand';
import { eq } from 'drizzle-orm';
import { getDb } from '@/services/database/client';
import { userSettings, aiConversations } from '@/services/database/schema';
import { sendChat } from '@/services/ai';
import { nowISO } from '@/utils/date';
import {
  DEFAULT_AI_SETTINGS,
  isConfigured,
  normalizeAISettings,
  type AISettings,
  type ChatMessage,
} from '@/types/ai';

const SETTINGS_KEY = 'ai_settings';

interface AIState {
  settings: AISettings;
  messages: ChatMessage[];
  sending: boolean;
  chatOpen: boolean;
  settingsOpen: boolean;
  sessionId: string;

  load: () => Promise<void>;
  saveSettings: (patch: Partial<AISettings>) => Promise<void>;
  open: () => void;
  close: () => void;
  toggleSettings: (open?: boolean) => void;
  send: (text: string) => Promise<void>;
}

async function persistMessage(msg: ChatMessage, sessionId: string): Promise<void> {
  try {
    await getDb().insert(aiConversations).values({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt,
      sessionId,
    });
  } catch (err) {
    console.error('Persist AI message failed:', err);
  }
}

export const useAIStore = create<AIState>((set, get) => ({
  settings: DEFAULT_AI_SETTINGS,
  messages: [],
  sending: false,
  chatOpen: false,
  settingsOpen: false,
  sessionId: crypto.randomUUID(),

  load: async () => {
    const rows = await getDb()
      .select({ value: userSettings.value })
      .from(userSettings)
      .where(eq(userSettings.key, SETTINGS_KEY));
    if (rows[0]?.value) {
      try {
        // Fills in defaults for anything missing or malformed.
        set({ settings: normalizeAISettings(JSON.parse(rows[0].value)) });
      } catch {
        /* keep defaults */
      }
    }
  },

  saveSettings: async (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    const value = JSON.stringify(settings);
    await getDb()
      .insert(userSettings)
      .values({ key: SETTINGS_KEY, value, updatedAt: nowISO() })
      .onConflictDoUpdate({ target: userSettings.key, set: { value, updatedAt: nowISO() } });
  },

  open: () => {
    const { settings } = get();
    // Provider not set up yet → land on settings first.
    set({ chatOpen: true, settingsOpen: !isConfigured(settings) });
  },
  close: () => set({ chatOpen: false }),
  toggleSettings: (open) =>
    set((s) => ({ settingsOpen: open === undefined ? !s.settingsOpen : open })),

  send: async (text) => {
    const trimmed = text.trim();
    if (!trimmed || get().sending) return;
    const { settings, sessionId } = get();

    if (!isConfigured(settings)) {
      set({ settingsOpen: true });
      return;
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      createdAt: nowISO(),
    };
    const history = [...get().messages, userMsg];
    set({ messages: history, sending: true });
    persistMessage(userMsg, sessionId);

    try {
      const reply = await sendChat(history, settings);
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply,
        createdAt: nowISO(),
      };
      set({ messages: [...get().messages, aiMsg], sending: false });
      persistMessage(aiMsg, sessionId);
    } catch (err) {
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: err instanceof Error ? err.message : 'Could not get a reply.',
        createdAt: nowISO(),
        error: true,
      };
      set({ messages: [...get().messages, aiMsg], sending: false });
    }
  },
}));
