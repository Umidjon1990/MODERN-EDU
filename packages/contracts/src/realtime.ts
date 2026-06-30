import type { MessageDto } from './messaging.js';

/** Realtime kanal: har bir sinf alohida "xona". */
export const classRoom = (classId: string): string => `class:${classId}`;

/** Server → mijoz hodisalari. */
export type ServerToClientEvents = {
  'message:new': (msg: MessageDto) => void;
  'message:update': (msg: MessageDto) => void;
  'message:delete': (payload: { classId: string; messageId: string }) => void;
  'presence:typing': (payload: { classId: string; userId: string; typing: boolean }) => void;
};

/** Mijoz → server hodisalari. */
export type ClientToServerEvents = {
  typing: (payload: { classId: string; typing: boolean }) => void;
};

export const REALTIME_EVENTS = {
  MESSAGE_NEW: 'message:new',
  MESSAGE_UPDATE: 'message:update',
  MESSAGE_DELETE: 'message:delete',
  PRESENCE_TYPING: 'presence:typing',
} as const;
