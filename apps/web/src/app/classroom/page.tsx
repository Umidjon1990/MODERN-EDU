'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MessageDto } from '@modern-edu/contracts';
import { getSession, clearSession } from '@/lib/client-session';
import { findUserById, demoMessages, usersInClass, demoClass } from '@/lib/demo-data';
import { apiEnabled, getApi, tokenStore, userStore } from '@/lib/api';
import { createSocket, realtimeEnabled } from '@/lib/socket';
import { BrandMark } from '@/components/brand';
import {
  Classroom,
  type ClassroomActions,
  type ClientMember,
  type ClientMessage,
  type ClientUser,
} from '@/components/classroom/classroom';

type Loaded = {
  currentUser: ClientUser;
  klass: { name: string; subject: string };
  members: ClientMember[];
  initialMessages: ClientMessage[];
  actions?: ClassroomActions;
};

const DEFAULT_COLOR = '#4f46e5';

function mapMessage(m: MessageDto, toUrl: (rel: string) => string): ClientMessage {
  return {
    id: m.id,
    seq: m.seq,
    senderId: m.senderId ?? 'system',
    type: m.type === 'announcement' ? 'announcement' : m.type === 'system' ? 'system' : 'text',
    body: m.body ?? '',
    createdAt: m.createdAt,
    reactions: m.reactions,
    replyToId: m.replyToId ?? undefined,
    pinned: m.pinned,
    attachments: m.attachments.map((a) => ({
      mediaId: a.mediaId,
      kind: a.kind,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      url: toUrl(a.url),
    })),
  };
}

function pickKind(file: File): 'image' | 'pdf' | 'audio' | 'file' {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'file';
}

export default function ClassroomPage() {
  const router = useRouter();
  const [state, setState] = useState<Loaded | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (apiEnabled) {
      void loadFromApi();
    } else {
      loadMock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadMock() {
    const id = getSession();
    const user = id ? findUserById(id) : undefined;
    if (!user) {
      router.replace('/login');
      setChecked(true);
      return;
    }
    const members: ClientMember[] = usersInClass(user.classId).map((u) => ({
      id: u.id,
      name: u.fullName,
      color: u.avatarColor,
      role: u.role,
      online: u.id === user.id || u.id === 'usr_teacher' || u.id === 'usr_jasur',
    }));
    const initialMessages: ClientMessage[] = demoMessages.map((m) => ({
      id: m.id,
      seq: m.seq,
      senderId: m.senderId,
      type: m.type,
      body: m.body,
      createdAt: m.createdAt,
      reactions: m.reactions,
      replyToId: m.replyToId,
      pinned: m.pinned ?? false,
    }));
    setState({
      currentUser: { id: user.id, name: user.fullName, color: user.avatarColor, role: user.role },
      klass: { name: demoClass.name, subject: demoClass.subject },
      members,
      initialMessages,
    });
    setChecked(true);
  }

  async function loadFromApi() {
    if (!tokenStore.get()) {
      router.replace('/login');
      setChecked(true);
      return;
    }
    try {
      const api = getApi();
      const me = userStore.get() ?? (await api.auth.me());
      const classes = await api.classes.list();
      const klass = classes[0];
      if (!klass) {
        // Hech qanday sinf yo'q — bo'sh holat
        setState({
          currentUser: {
            id: me.id,
            name: me.fullName,
            color: me.avatarColor ?? DEFAULT_COLOR,
            role: me.role,
          },
          klass: { name: 'Sinfingiz hali tayyor emas', subject: '' },
          members: [],
          initialMessages: [],
        });
        setChecked(true);
        return;
      }

      const room = await api.classes.classroom(klass.id);
      const members: ClientMember[] = room.members.map((m) => ({
        id: m.userId,
        name: m.fullName,
        color: m.avatarColor ?? DEFAULT_COLOR,
        role: m.roleInClass,
        online: m.userId === me.id,
      }));

      const toUrl = (rel: string) => api.media.contentUrl(rel);

      const actions: ClassroomActions = {
        sendMessage: async (body, replyToId) => {
          const saved = await api.messages.post(klass.id, {
            body,
            type: 'text',
            ...(replyToId ? { replyToId } : {}),
            clientMsgId: crypto.randomUUID(),
          });
          return mapMessage(saved, toUrl);
        },
        toggleReaction: async (messageId, emoji) => {
          const updated = await api.messages.react(messageId, emoji);
          return mapMessage(updated, toUrl);
        },
        uploadAndSend: async (file) => {
          const mediaId = await api.media.upload(file, pickKind(file));
          const saved = await api.messages.post(klass.id, {
            type: 'text',
            mediaIds: [mediaId],
            clientMsgId: crypto.randomUUID(),
          });
          return mapMessage(saved, toUrl);
        },
        ...(realtimeEnabled
          ? {
              subscribe: (handlers) => {
                const socket = createSocket(tokenStore.get() ?? '');
                socket.on('message:new', (m) => {
                  if (m.classId === klass.id) handlers.onNew(mapMessage(m, toUrl));
                });
                socket.on('message:update', (m) => {
                  if (m.classId === klass.id) handlers.onUpdate(mapMessage(m, toUrl));
                });
                socket.on('message:delete', (p) => {
                  if (p.classId === klass.id) handlers.onDelete(p.messageId);
                });
                return () => socket.disconnect();
              },
            }
          : {}),
      };

      setState({
        currentUser: {
          id: me.id,
          name: me.fullName,
          color: me.avatarColor ?? DEFAULT_COLOR,
          role: me.role,
        },
        klass: { name: room.class.name, subject: room.class.subject ?? '' },
        members,
        initialMessages: room.messages.map((m) => mapMessage(m, toUrl)),
        actions,
      });
      setChecked(true);
    } catch {
      router.replace('/login');
      setChecked(true);
    }
  }

  const onLogout = useMemo(
    () => () => {
      if (apiEnabled) {
        void getApi()
          .auth.logout()
          .catch(() => undefined);
        tokenStore.clear();
      } else {
        clearSession();
      }
      router.replace('/login');
    },
    [router],
  );

  if (!state) {
    return <LoadingScreen redirecting={checked} />;
  }

  return (
    <Classroom
      currentUser={state.currentUser}
      klass={state.klass}
      members={state.members}
      initialMessages={state.initialMessages}
      onLogout={onLogout}
      {...(state.actions ? { actions: state.actions } : {})}
    />
  );
}

function LoadingScreen({ redirecting }: { redirecting: boolean }) {
  return (
    <div className="bg-app grid min-h-dvh place-items-center">
      <div className="flex animate-fade-rise flex-col items-center gap-3">
        <BrandMark size={44} />
        <p className="text-muted text-sm">{redirecting ? 'Yo‘naltirilmoqda…' : 'Yuklanmoqda…'}</p>
      </div>
    </div>
  );
}
