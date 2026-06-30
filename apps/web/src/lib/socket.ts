'use client';

import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@modern-edu/contracts';

const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL;

/** Realtime yoqilganmi (Railway). */
export const realtimeEnabled = Boolean(REALTIME_URL);

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createSocket(token: string): AppSocket {
  if (!REALTIME_URL) throw new Error('NEXT_PUBLIC_REALTIME_URL aniqlanmagan');
  return io(REALTIME_URL, {
    auth: { token },
    transports: ['websocket'],
    withCredentials: true,
  });
}
