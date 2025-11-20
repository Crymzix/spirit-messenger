// Core type definitions for MSN Messenger Clone

export type PresenceStatus = 'online' | 'away' | 'busy' | 'appear_offline' | 'offline';

export type MessageType = 'text' | 'file' | 'system';

export type ConversationType = 'one_on_one' | 'group';

export type ContactStatus = 'pending' | 'accepted' | 'blocked';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  personalMessage: string;
  displayPictureUrl: string;
  presenceStatus: PresenceStatus;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  userId: string;
  contactUser: User;
  status: ContactStatus;
  createdAt: Date;
}

export interface ContactGroup {
  id: string;
  userId: string;
  name: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactGroupMembership {
  id: string;
  groupId: string;
  contactId: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: User;
  content: string;
  messageType: MessageType;
  metadata: {
    emoticons?: Array<{ position: number; code: string }>;
    formatting?: { bold?: boolean; italic?: boolean; color?: string };
    fileInfo?: { filename: string; size: number; mimeType: string };
    fileTransferRequest?: { filename: string; size: number; mimeType: string };
  };
  createdAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string;
  participants: User[];
  lastMessage?: Message;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatbotPersonality {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  systemPrompt: string;
}

export interface AppSettings {
  notifications: {
    enabled: boolean;
    soundEnabled: boolean;
    soundVolume: number;
    desktopAlerts: boolean;
  };
  startup: {
    autoLaunch: boolean;
    startMinimized: boolean;
  };
  files: {
    downloadLocation: string;
    autoAcceptFrom: string[];
  };
}
