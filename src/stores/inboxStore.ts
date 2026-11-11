import { create } from 'zustand';
import {
  getInboxItems,
  inboxToToday,
  inboxToAttic,
  deleteInboxItem,
  type InboxItem,
} from '@/services/inbox';

interface InboxState {
  items: InboxItem[];
  loading: boolean;
  load: () => Promise<void>;
  sendToToday: (item: InboxItem) => Promise<void>;
  sendToAttic: (item: InboxItem) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useInboxStore = create<InboxState>((set, get) => ({
  items: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    const items = await getInboxItems();
    set({ items, loading: false });
  },

  sendToToday: async (item) => {
    await inboxToToday(item);
    set({ items: get().items.filter((i) => i.id !== item.id) });
  },

  sendToAttic: async (item) => {
    await inboxToAttic(item);
    set({ items: get().items.filter((i) => i.id !== item.id) });
  },

  remove: async (id) => {
    await deleteInboxItem(id);
    set({ items: get().items.filter((i) => i.id !== id) });
  },
}));
