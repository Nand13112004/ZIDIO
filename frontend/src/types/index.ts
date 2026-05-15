// Type definitions for the frontend

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: 'user' | 'admin' | 'moderator';
  status: 'online' | 'offline' | 'idle' | 'dnd';
  department?: string;
  jobTitle?: string;
  teams: string[];
}

export interface Meeting {
  _id: string;
  meetingId: string;
  title: string;
  description: string;
  host: User;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  type: 'one-on-one' | 'group' | 'team-meeting';
  participants: Participant[];
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  isRecording: boolean;
  recordingUrl?: string;
  summary?: Summary;
}

export interface Participant {
  userId: User;
  name: string;
  joinedAt: string;
  leftAt?: string;
  duration?: number;
  status: 'joined' | 'left' | 'pending';
}

export interface Message {
  _id: string;
  content: string;
  sender: User;
  senderName: string;
  senderAvatar?: string;
  roomId?: string;
  meetingId?: string;
  teamId?: string;
  messageType: 'text' | 'file' | 'image' | 'video' | 'emoji' | 'system';
  attachments: Attachment[];
  reactions: Reaction[];
  mentionedUsers: User[];
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  readBy: ReadReceipt[];
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  name: string;
  url: string;
  type: string;
  size?: number;
}

export interface Reaction {
  emoji: string;
  userId: User;
}

export interface ReadReceipt {
  userId: User;
  readAt: string;
}

export interface Team {
  _id: string;
  name: string;
  description: string;
  icon?: string;
  avatar?: string;
  owner: User;
  members: TeamMember[];
  stats: TeamStats;
}

export interface TeamMember {
  userId: User;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  joinedAt: string;
}

export interface TeamStats {
  memberCount: number;
  messageCount: number;
  meetingCount: number;
  taskCount: number;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: User;
  reporter: User;
  team?: Team;
  dueDate?: string;
  completedAt?: string;
  subtasks: Subtask[];
  attachments: Attachment[];
  watchers: User[];
}

export interface Subtask {
  title: string;
  completed: boolean;
  completedAt?: string;
}

export interface Summary {
  _id: string;
  meeting: string;
  transcript?: string;
  summary?: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  sentiment: Sentiment;
}

export interface ActionItem {
  task: string;
  assignee?: User;
  deadline?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface Sentiment {
  overall: 'positive' | 'neutral' | 'negative';
  scores?: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  sender?: User;
  isRead: boolean;
  createdAt: string;
}
