'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, clearSession } from '@/lib/client-session';
import { findUserById, demoMessages, usersInClass, demoClass } from '@/lib/demo-data';
import { BrandMark } from '@/components/brand';
import {
  Classroom,
  type ClientMember,
  type ClientMessage,
  type ClientUser,
} from '@/components/classroom/classroom';

type Loaded = {
  currentUser: ClientUser;
  klass: { name: string; subject: string };
  members: ClientMember[];
  initialMessages: ClientMessage[];
};

export default function ClassroomPage() {
  const router = useRouter();
  const [state, setState] = useState<Loaded | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const id = getSession();
    const user = id ? findUserById(id) : undefined;
    if (!user) {
      router.replace('/login');
      setChecked(true);
      return;
    }

    // A'zolik chegarasi: foydalanuvchi faqat o'z sinfining ma'lumotini ko'radi.
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
  }, [router]);

  const onLogout = useMemo(
    () => () => {
      clearSession();
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
