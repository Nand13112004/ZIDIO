import { create } from 'zustand';
import { messageService } from '../services/index';

interface Message {
  _id: string;
  content: string;
  sender: any;
  senderName: string;
  roomId?: string;
  meetingId?: string;
  teamId?: string;
  messageType: string;
  createdAt: string;
  reactions: any[];
  readBy: any[];
}

interface MessageStore {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  fetchMessages: (params: any) => Promise<void>;
  sendMessage: (data: any) => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
}

export const useMessageStore = create<MessageStore>((set) => ({
  messages: [],
  isLoading: false,
  error: null,

  fetchMessages: async (params: any) => {
    try {
      set({ isLoading: true, error: null });
      const response = await messageService.getMessages(params);
      set({ messages: response.data.data.messages });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to fetch messages' });
    } finally {
      set({ isLoading: false });
    }
  },

  sendMessage: async (data: any) => {
    try {
      set({ error: null });
      // Just POST — the backend emits `message:new` via socket to all room members
      // including the sender, so the socket listener in ChatPanel handles the state update
      await messageService.sendMessage(data);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send message';
      set({ error: message });
      throw error;
    }
  },

  addMessage: (message: Message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  updateMessage: async (messageId: string, content: string) => {
    try {
      await messageService.editMessage(messageId, content);
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId ? { ...m, content } : m
        ),
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to update message' });
      throw error;
    }
  },

  deleteMessage: async (messageId: string) => {
    try {
      await messageService.deleteMessage(messageId);
      set((state) => ({
        messages: state.messages.filter((m) => m._id !== messageId),
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to delete message' });
      throw error;
    }
  },

  addReaction: async (messageId: string, emoji: string) => {
    try {
      await messageService.addReaction(messageId, emoji);
      set((state) => ({
        messages: state.messages.map((m) => {
          if (m._id === messageId) {
            const existingReaction = m.reactions.find((r) => r.emoji === emoji);
            if (existingReaction) {
              return {
                ...m,
                reactions: m.reactions.filter((r) => r.emoji !== emoji),
              };
            } else {
              return {
                ...m,
                reactions: [...m.reactions, { emoji, userId: '' }],
              };
            }
          }
          return m;
        }),
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to add reaction' });
    }
  },

  clearMessages: () => set({ messages: [] }),
  clearError: () => set({ error: null }),
}));
