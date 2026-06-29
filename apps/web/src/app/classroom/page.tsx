import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { demoClass, demoMessages, usersInClass } from '@/lib/demo-data';
import { Classroom, type ClientMember, type ClientMessage } from '@/components/classroom/classroom';

export default async function ClassroomPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // A'zolik chegarasi: foydalanuvchi faqat o'z sinfining ma'lumotini oladi (docs/02 §7).
  const members: ClientMember[] = usersInClass(user.classId).map((u) => ({
    id: u.id,
    name: u.fullName,
    color: u.avatarColor,
    role: u.role,
    online: u.id === user.id || u.id === 'usr_teacher' || u.id === 'usr_jasur',
  }));

  const messages: ClientMessage[] = demoMessages.map((m) => ({
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

  return (
    <Classroom
      currentUser={{ id: user.id, name: user.fullName, color: user.avatarColor, role: user.role }}
      klass={{ name: demoClass.name, subject: demoClass.subject }}
      members={members}
      initialMessages={messages}
    />
  );
}
