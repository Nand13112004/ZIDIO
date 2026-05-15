import { create } from 'zustand';
import { meetingService } from '../services/index';

interface Meeting {
  _id: string;
  meetingId: string;
  title: string;
  description: string;
  host: any;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  participants: any[];
  createdAt: string;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  summary?: any;
}

interface MeetingStore {
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  isLoading: boolean;
  error: string | null;
  fetchMeetings: (status: string) => Promise<void>;
  fetchMeetingById: (meetingId: string) => Promise<void>;
  createMeeting: (data: any) => Promise<Meeting>;
  joinMeeting: (meetingId: string) => Promise<void>;
  leaveMeeting: (meetingId: string) => Promise<void>;
  endMeeting: (meetingId: string) => Promise<void>;
  setCurrentMeeting: (meeting: Meeting | null) => void;
  clearError: () => void;
}

export const useMeetingStore = create<MeetingStore>((set) => ({
  meetings: [],
  currentMeeting: null,
  isLoading: false,
  error: null,

  fetchMeetings: async (status: string = 'completed') => {
    try {
      set({ isLoading: true, error: null });
      const response = await meetingService.getMeetings(status);
      set({ meetings: response.data.data.meetings });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to fetch meetings' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMeetingById: async (meetingId: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await meetingService.getMeetingById(meetingId);
      set({ currentMeeting: response.data.data.meeting });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to fetch meeting' });
    } finally {
      set({ isLoading: false });
    }
  },

  createMeeting: async (data: any) => {
    try {
      set({ isLoading: true, error: null });
      const response = await meetingService.createMeeting(data);
      const newMeeting = response.data.data.meeting;
      set((state) => ({
        meetings: [newMeeting, ...state.meetings],
      }));
      return newMeeting;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create meeting';
      set({ error: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  joinMeeting: async (meetingId: string) => {
    try {
      set({ isLoading: true });
      await meetingService.joinMeeting(meetingId);
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to join meeting' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  leaveMeeting: async (meetingId: string) => {
    try {
      await meetingService.leaveMeeting(meetingId);
      set({ currentMeeting: null });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to leave meeting' });
    }
  },

  endMeeting: async (meetingId: string) => {
    try {
      set({ isLoading: true });
      await meetingService.endMeeting(meetingId);
      set({ currentMeeting: null });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to end meeting' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  setCurrentMeeting: (meeting: Meeting | null) => {
    set({ currentMeeting: meeting });
  },

  clearError: () => set({ error: null }),
}));
