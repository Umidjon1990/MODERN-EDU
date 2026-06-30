import http from 'node:http';
import { Server, type Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import jwt from 'jsonwebtoken';
import { and, eq, isNull } from 'drizzle-orm';
import { classMembers, createDb } from '@modern-edu/db';
import {
  accessTokenClaimsSchema,
  classRoom,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@modern-edu/contracts';
import { loadEnv } from './env.js';

type SocketData = { userId: string; classIds: string[] };

const env = loadEnv();
const db = createDb(env.DATABASE_URL, { max: 5 });

const httpServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'modern-edu-realtime' }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
  },
});

// Ko'p instansli fan-out uchun Redis adapteri (API emitter ham shu kanalga yozadi)
if (env.REDIS_URL) {
  const pub = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  const sub = pub.duplicate();
  io.adapter(createAdapter(pub, sub));
}

// Autentifikatsiya: access token tekshiriladi, a'zoliklar yuklanadi
io.use(async (socket, next) => {
  try {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      socket.handshake.headers.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('unauthorized'));

    const claims = accessTokenClaimsSchema.parse(jwt.verify(token, env.JWT_ACCESS_SECRET));
    const rows = await db
      .select({ classId: classMembers.classId })
      .from(classMembers)
      .where(and(eq(classMembers.userId, claims.sub), isNull(classMembers.removedAt)));

    socket.data.userId = claims.sub;
    socket.data.classIds = rows.map((r) => r.classId);
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});

io.on(
  'connection',
  (
    socket: Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>,
  ) => {
    // Xona = sinf. Faqat a'zo bo'lgan sinflarга qo'shiladi (maxfiylik chegarasi).
    for (const classId of socket.data.classIds) {
      void socket.join(classRoom(classId));
    }

    socket.on('typing', ({ classId, typing }) => {
      if (!socket.data.classIds.includes(classId)) return;
      socket.to(classRoom(classId)).emit('presence:typing', {
        classId,
        userId: socket.data.userId,
        typing,
      });
    });
  },
);

httpServer.listen(env.PORT, '0.0.0.0', () => {
  console.warn(`🔌 Modern Edu realtime: ws://0.0.0.0:${env.PORT}`);
});
