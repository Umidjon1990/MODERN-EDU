'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BrandMark, Avatar } from '@/components/brand';
import { ThemeToggle } from '@/components/theme-toggle';

export type ClientUser = { id: string; name: string; color: string; role: string };
export type ClientMember = ClientUser & { online: boolean };
export type ClientAttachment = {
  mediaId: string;
  kind: 'image' | 'video' | 'audio' | 'file' | 'pdf';
  mimeType: string | null;
  sizeBytes?: number | null;
  url: string; // to'liq kontent URL (token bilan)
};

export type ClientMessage = {
  id: string;
  seq: number;
  senderId: string;
  type: 'text' | 'system' | 'announcement';
  body: string;
  createdAt: string;
  reactions: { emoji: string; userIds: string[] }[];
  replyToId?: string;
  pinned: boolean;
  attachments?: ClientAttachment[];
};

const QUICK_EMOJI = ['👍', '❤️', '🔥', '🎉', '🙏', '😂'];

export type LiveHandlers = {
  onNew: (m: ClientMessage) => void;
  onUpdate: (m: ClientMessage) => void;
  onDelete: (messageId: string) => void;
};

export type ClassroomActions = {
  sendMessage: (body: string, replyToId?: string) => Promise<ClientMessage>;
  toggleReaction: (messageId: string, emoji: string) => Promise<ClientMessage>;
  /** Rasm/fayl yuklab, xabar sifatida yuboradi. */
  uploadAndSend?: (file: File) => Promise<ClientMessage>;
  /** Jonli (realtime) hodisalarga obuna. Cleanup funksiyasini qaytaradi. */
  subscribe?: (handlers: LiveHandlers) => () => void;
};

export function Classroom({
  currentUser,
  klass,
  members,
  initialMessages,
  onLogout,
  actions,
}: {
  currentUser: ClientUser;
  klass: { name: string; subject: string };
  members: ClientMember[];
  initialMessages: ClientMessage[];
  onLogout: () => void;
  actions?: ClassroomActions;
}) {
  const [messages, setMessages] = useState<ClientMessage[]>(initialMessages);
  const [replyTo, setReplyTo] = useState<ClientMessage | null>(null);
  const [draft, setDraft] = useState('');
  const [teacherTyping, setTeacherTyping] = useState(false);

  const memberById = useMemo(() => {
    const m = new Map<string, ClientMember>();
    for (const x of members) m.set(x.id, x);
    return m;
  }, [members]);

  const pinned = useMemo(() => messages.filter((m) => m.pinned), [messages]);
  const announcement = useMemo(
    () => [...messages].reverse().find((m) => m.type === 'announcement'),
    [messages],
  );

  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  function scrollToBottom(smooth = true) {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }

  useEffect(() => {
    scrollToBottom(false);
  }, []);

  // Jonli (realtime) hodisalar — API rejimida
  useEffect(() => {
    if (!actions?.subscribe) return;
    const unsub = actions.subscribe({
      onNew: (m) => {
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        requestAnimationFrame(() => scrollToBottom(true));
      },
      onUpdate: (m) => {
        setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
      },
      onDelete: (id) => {
        setMessages((prev) =>
          prev.map((x) => (x.id === id ? { ...x, body: 'Bu xabar o‘chirildi', reactions: [] } : x)),
        );
      },
    });
    return unsub;
  }, [actions]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollDown(dist > 220);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  function send() {
    const body = draft.trim();
    if (!body) return;
    const replyToId = replyTo?.id;
    setDraft('');
    setReplyTo(null);

    // API rejimi: optimistik qo'shib, server javobi bilan moslash
    if (actions) {
      const tempId = `temp_${Date.now()}`;
      const seq = (messages.at(-1)?.seq ?? 0) + 1;
      const optimistic: ClientMessage = {
        id: tempId,
        seq,
        senderId: currentUser.id,
        type: 'text',
        body,
        createdAt: new Date().toISOString(),
        reactions: [],
        replyToId,
        pinned: false,
      };
      setMessages((prev) => [...prev, optimistic]);
      requestAnimationFrame(() => scrollToBottom(true));
      void actions
        .sendMessage(body, replyToId)
        .then((saved) => {
          setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
        })
        .catch(() => {
          // Muvaffaqiyatsiz — optimistik xabarni olib tashlaymiz
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        });
      return;
    }

    // Demo (mock) rejim — lokal qo'shish + o'qituvchidan avto-javob
    const seq = (messages.at(-1)?.seq ?? 0) + 1;
    const msg: ClientMessage = {
      id: `local_${seq}_${Date.now()}`,
      seq,
      senderId: currentUser.id,
      type: 'text',
      body,
      createdAt: new Date().toISOString(),
      reactions: [],
      replyToId,
      pinned: false,
    };
    setMessages((prev) => [...prev, msg]);
    requestAnimationFrame(() => scrollToBottom(true));

    if (currentUser.id !== 'usr_teacher') {
      setTeacherTyping(true);
      window.setTimeout(() => {
        setTeacherTyping(false);
        setMessages((prev) => {
          const nseq = (prev.at(-1)?.seq ?? 0) + 1;
          return [
            ...prev,
            {
              id: `auto_${nseq}`,
              seq: nseq,
              senderId: 'usr_teacher',
              type: 'text',
              body: 'Yaxshi savol! Bu haqida darsda batafsil to‘xtalamiz 👍',
              createdAt: new Date().toISOString(),
              reactions: [],
              pinned: false,
            },
          ];
        });
        requestAnimationFrame(() => scrollToBottom(true));
      }, 2200);
    }
  }

  function toggleReaction(messageId: string, emoji: string) {
    if (actions) {
      void actions
        .toggleReaction(messageId, emoji)
        .then((updated) => {
          setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
        })
        .catch(() => {
          /* e'tiborsiz */
        });
      return;
    }
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const existing = m.reactions.find((r) => r.emoji === emoji);
        let reactions = m.reactions;
        if (existing) {
          const has = existing.userIds.includes(currentUser.id);
          reactions = m.reactions
            .map((r) =>
              r.emoji === emoji
                ? {
                    ...r,
                    userIds: has
                      ? r.userIds.filter((u) => u !== currentUser.id)
                      : [...r.userIds, currentUser.id],
                  }
                : r,
            )
            .filter((r) => r.userIds.length > 0);
        } else {
          reactions = [...m.reactions, { emoji, userIds: [currentUser.id] }];
        }
        return { ...m, reactions };
      }),
    );
  }

  const onlineCount = members.filter((m) => m.online).length;

  return (
    <div className="bg-app flex h-dvh overflow-hidden">
      {/* ==== Chap panel ==== */}
      <aside
        className="hidden w-[264px] shrink-0 flex-col border-r p-3 md:flex"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div className="flex items-center gap-2.5 px-2 py-2">
          <BrandMark size={34} />
          <div className="leading-tight">
            <div className="text-sm font-bold">Modern Edu</div>
            <div className="text-muted text-xs">Sinfxona</div>
          </div>
        </div>

        <div className="mt-3 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
          Mening sinfim
        </div>
        <button
          className="mt-1.5 flex w-full items-center gap-3 rounded-[var(--radius-md)] border p-2.5 text-left shadow-soft"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
        >
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)] text-white"
            style={{
              background: 'linear-gradient(135deg,var(--color-brand-500),var(--color-brand-700))',
            }}
          >
            <span className="text-sm font-bold">9B</span>
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{klass.name}</span>
            <span className="text-muted block truncate text-xs">{klass.subject}</span>
          </span>
        </button>

        <nav className="mt-4 grid gap-1">
          <NavItem active icon={<ChatIcon />} label="Chat" badge={String(messages.length)} />
          <NavItem icon={<TaskIcon />} label="Vazifalar" badge="2" />
          <NavItem icon={<TestIcon />} label="Testlar" />
          <NavItem icon={<UsersIcon />} label="A'zolar" badge={String(members.length)} />
          <NavItem icon={<SparkIcon />} label="AI-Repetitor" />
        </nav>

        <div className="mt-auto">
          <UserCard user={currentUser} onLogout={onLogout} />
        </div>
      </aside>

      {/* ==== Markaz: chat ==== */}
      <main className="flex min-w-0 flex-1 flex-col">
        <Header klass={klass} onlineCount={onlineCount} memberCount={members.length} />

        {announcement && (
          <AnnouncementBanner
            text={announcement.body}
            author={memberById.get(announcement.senderId)?.name ?? 'O‘qituvchi'}
          />
        )}

        {pinned.length > 0 && (
          <PinnedStrip
            items={pinned.map((p) => ({
              id: p.id,
              author: memberById.get(p.senderId)?.name ?? '—',
              text: p.body,
            }))}
          />
        )}

        <div
          ref={listRef}
          className="thin-scroll relative flex-1 overflow-y-auto px-3 py-4 sm:px-6"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-0.5">
            <MessageList
              messages={messages}
              currentUserId={currentUser.id}
              memberById={memberById}
              onReact={toggleReaction}
              onReply={setReplyTo}
            />
            {teacherTyping && (
              <TypingRow
                name={memberById.get('usr_teacher')?.name ?? 'O‘qituvchi'}
                color={memberById.get('usr_teacher')?.color ?? '#4f46e5'}
              />
            )}
            <div ref={bottomRef} />
          </div>

          {showScrollDown && (
            <button
              onClick={() => scrollToBottom(true)}
              aria-label="Pastga o‘tish"
              className="ring-brand animate-pop-in fixed bottom-28 right-6 z-10 grid h-11 w-11 place-items-center rounded-full shadow-soft-lg md:right-10"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            >
              <ArrowDownIcon />
            </button>
          )}
        </div>

        <Composer
          draft={draft}
          setDraft={setDraft}
          onSend={send}
          replyTo={replyTo}
          replyToName={replyTo ? (memberById.get(replyTo.senderId)?.name ?? '') : ''}
          onCancelReply={() => setReplyTo(null)}
          onAttach={
            actions?.uploadAndSend
              ? (file) => {
                  void actions.uploadAndSend!(file)
                    .then((saved) => {
                      setMessages((prev) =>
                        prev.some((x) => x.id === saved.id) ? prev : [...prev, saved],
                      );
                      requestAnimationFrame(() => scrollToBottom(true));
                    })
                    .catch(() => undefined);
                }
              : undefined
          }
        />
      </main>

      {/* ==== O'ng panel: a'zolar ==== */}
      <aside
        className="hidden w-[260px] shrink-0 flex-col border-l p-4 xl:flex"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          A’zolar — {members.length}
        </div>
        <div className="mt-3 grid gap-1">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-[var(--radius-md)] p-2">
              <Avatar name={m.name} color={m.color} size={36} online={m.online} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{m.name}</span>
                  {m.role === 'teacher' && <TeacherBadge />}
                </div>
                <span className="text-muted text-xs">{m.online ? 'onlayn' : 'oflayn'}</span>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

/* ============ Sarlavha ============ */
function Header({
  klass,
  onlineCount,
  memberCount,
}: {
  klass: { name: string; subject: string };
  onlineCount: number;
  memberCount: number;
}) {
  return (
    <header
      className="glass z-10 flex items-center gap-3 border-b px-4 py-3 sm:px-6"
      style={{ borderColor: 'var(--border)' }}
    >
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-md)] text-white md:hidden"
        style={{
          background: 'linear-gradient(135deg,var(--color-brand-500),var(--color-brand-700))',
        }}
      >
        <span className="text-sm font-bold">9B</span>
      </span>
      <div className="min-w-0">
        <h1 className="truncate text-base font-bold leading-tight">{klass.name}</h1>
        <p className="text-muted truncate text-xs">
          {memberCount} a’zo · <span style={{ color: 'var(--success)' }}>{onlineCount} onlayn</span>
        </p>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <IconButton label="Qidirish">
          <SearchIcon />
        </IconButton>
        <ThemeToggle />
      </div>
    </header>
  );
}

/* ============ E'lon + Pinlar ============ */
function AnnouncementBanner({ text, author }: { text: string; author: string }) {
  return (
    <div
      className="flex items-start gap-3 border-b px-4 py-2.5 sm:px-6"
      style={{
        borderColor: 'var(--border)',
        background: 'color-mix(in srgb, var(--color-brand-500) 9%, var(--surface))',
      }}
    >
      <span className="mt-0.5 text-base">📣</span>
      <p className="text-sm">
        <span className="font-semibold">E’lon · {author}: </span>
        <span className="text-muted">{text}</span>
      </p>
    </div>
  );
}

function PinnedStrip({ items }: { items: { id: string; author: string; text: string }[] }) {
  return (
    <div
      className="thin-scroll flex gap-2 overflow-x-auto border-b px-4 py-2 sm:px-6"
      style={{ borderColor: 'var(--border)' }}
    >
      {items.map((p) => (
        <div
          key={p.id}
          className="flex max-w-[260px] shrink-0 items-center gap-2 rounded-[var(--radius-md)] border px-3 py-1.5 text-xs shadow-soft"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
        >
          <PinIcon />
          <span className="truncate">
            <span className="font-semibold">{p.author}: </span>
            <span className="text-muted">{p.text}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/* ============ Xabarlar ro'yxati ============ */
function MessageList({
  messages,
  currentUserId,
  memberById,
  onReact,
  onReply,
}: {
  messages: ClientMessage[];
  currentUserId: string;
  memberById: Map<string, ClientMember>;
  onReact: (id: string, emoji: string) => void;
  onReply: (m: ClientMessage) => void;
}) {
  const rows: React.ReactNode[] = [];
  let lastDay = '';
  let lastSender = '';
  let lastTime = 0;

  messages.forEach((m) => {
    const day = dayKey(m.createdAt);
    if (day !== lastDay) {
      rows.push(<DateSeparator key={`sep_${m.id}`} label={dayLabel(m.createdAt)} />);
      lastDay = day;
      lastSender = '';
    }
    const t = new Date(m.createdAt).getTime();
    const grouped = m.senderId === lastSender && t - lastTime < 5 * 60_000 && m.type === 'text';
    lastSender = m.senderId;
    lastTime = t;

    const sender = memberById.get(m.senderId);
    rows.push(
      <MessageBubble
        key={m.id}
        message={m}
        sender={sender}
        mine={m.senderId === currentUserId}
        grouped={grouped}
        replyTo={m.replyToId ? messages.find((x) => x.id === m.replyToId) : undefined}
        replyToName={
          m.replyToId
            ? memberById.get(messages.find((x) => x.id === m.replyToId)?.senderId ?? '')?.name
            : undefined
        }
        currentUserId={currentUserId}
        onReact={onReact}
        onReply={onReply}
      />,
    );
  });

  return <>{rows}</>;
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="my-3 flex justify-center">
      <span
        className="rounded-full px-3 py-1 text-[11px] font-medium shadow-soft"
        style={{
          background: 'var(--surface)',
          color: 'var(--text-muted)',
          border: '1px solid var(--border)',
        }}
      >
        {label}
      </span>
    </div>
  );
}

function MessageBubble({
  message,
  sender,
  mine,
  grouped,
  replyTo,
  replyToName,
  currentUserId,
  onReact,
  onReply,
}: {
  message: ClientMessage;
  sender?: ClientMember;
  mine: boolean;
  grouped: boolean;
  replyTo?: ClientMessage;
  replyToName?: string;
  currentUserId: string;
  onReact: (id: string, emoji: string) => void;
  onReply: (m: ClientMessage) => void;
}) {
  const [showEmoji, setShowEmoji] = useState(false);
  const isAnnouncement = message.type === 'announcement';

  return (
    <div
      className={`group flex animate-fade-rise gap-2.5 ${mine ? 'flex-row-reverse' : ''} ${grouped ? 'mt-0.5' : 'mt-3'}`}
    >
      <div className="w-9 shrink-0">
        {!mine && !grouped && sender && (
          <Avatar name={sender.name} color={sender.color} size={36} />
        )}
      </div>

      <div className={`flex max-w-[78%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
        {!mine && !grouped && sender && (
          <span className="mb-1 px-1 text-xs font-semibold" style={{ color: sender.color }}>
            {sender.name}
            {sender.role === 'teacher' && <span className="text-muted"> · o‘qituvchi</span>}
          </span>
        )}

        <div className={`relative flex items-end gap-1.5 ${mine ? 'flex-row-reverse' : ''}`}>
          <div
            className="rounded-[var(--radius-lg)] px-3.5 py-2 text-[0.95rem] leading-relaxed shadow-soft"
            style={{
              background: isAnnouncement
                ? 'color-mix(in srgb, var(--color-brand-500) 14%, var(--surface))'
                : mine
                  ? 'var(--bubble-self)'
                  : 'var(--bubble-other)',
              color: mine && !isAnnouncement ? 'var(--bubble-self-fg)' : 'var(--bubble-other-fg)',
              borderTopRightRadius: mine && !grouped ? '4px' : undefined,
              borderTopLeftRadius: !mine && !grouped ? '4px' : undefined,
            }}
          >
            {replyTo && (
              <div
                className="mb-1.5 rounded-[var(--radius-sm)] border-l-2 px-2 py-1 text-xs"
                style={{
                  borderColor: mine ? 'rgba(255,255,255,.6)' : 'var(--primary)',
                  background: mine ? 'rgba(255,255,255,.12)' : 'var(--surface-2)',
                }}
              >
                <span className="font-semibold">{replyToName}</span>
                <span className="ml-1 opacity-80">
                  {replyTo.body.length > 60 ? replyTo.body.slice(0, 60) + '…' : replyTo.body}
                </span>
              </div>
            )}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-1 grid gap-1.5">
                {message.attachments.map((a) => (
                  <Attachment key={a.mediaId} attachment={a} mine={mine} />
                ))}
              </div>
            )}
            {message.body && (
              <span className="whitespace-pre-wrap break-words">{message.body}</span>
            )}
            <span
              className="ml-2 inline-block translate-y-0.5 text-[10px]"
              style={{
                color: mine && !isAnnouncement ? 'rgba(255,255,255,.7)' : 'var(--text-muted)',
              }}
            >
              {timeLabel(message.createdAt)}
            </span>
          </div>

          {/* Hover harakatlar */}
          <div className="relative flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              onClick={() => setShowEmoji((s) => !s)}
              className="ring-brand grid h-7 w-7 place-items-center rounded-full"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
              }}
              aria-label="Reaksiya"
            >
              <SmileIcon />
            </button>
            <button
              onClick={() => onReply(message)}
              className="ring-brand grid h-7 w-7 place-items-center rounded-full"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
              }}
              aria-label="Javob berish"
            >
              <ReplyIcon />
            </button>

            {showEmoji && (
              <div
                className="animate-pop-in absolute bottom-9 z-20 flex gap-1 rounded-full p-1 shadow-soft-lg"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  [mine ? 'right' : 'left']: 0,
                }}
              >
                {QUICK_EMOJI.map((e) => (
                  <button
                    key={e}
                    onClick={() => {
                      onReact(message.id, e);
                      setShowEmoji(false);
                    }}
                    className="grid h-8 w-8 place-items-center rounded-full text-lg transition hover:scale-125"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {message.reactions.length > 0 && (
          <div className={`mt-1 flex flex-wrap gap-1 ${mine ? 'justify-end' : ''}`}>
            {message.reactions.map((r) => {
              const reacted = r.userIds.includes(currentUserId);
              return (
                <button
                  key={r.emoji}
                  onClick={() => onReact(message.id, r.emoji)}
                  className="animate-pop-in flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition"
                  style={{
                    background: reacted
                      ? 'color-mix(in srgb, var(--primary) 16%, var(--surface))'
                      : 'var(--surface-2)',
                    border: `1px solid ${reacted ? 'var(--primary)' : 'var(--border)'}`,
                  }}
                >
                  <span>{r.emoji}</span>
                  <span className="font-medium text-muted">{r.userIds.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatBytes(n?: number | null): string {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function Attachment({ attachment, mine }: { attachment: ClientAttachment; mine: boolean }) {
  const a = attachment;
  if (a.kind === 'image') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <a href={a.url} target="_blank" rel="noopener noreferrer">
        <img
          src={a.url}
          alt="rasm"
          className="max-h-72 w-auto max-w-full rounded-[var(--radius-md)] object-cover"
          loading="lazy"
        />
      </a>
    );
  }
  if (a.kind === 'audio') {
    return <audio controls src={a.url} className="w-56 max-w-full" />;
  }
  // pdf / file
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-[var(--radius-md)] px-2.5 py-2 text-sm"
      style={{
        background: mine ? 'rgba(255,255,255,.14)' : 'var(--surface-2)',
        color: 'inherit',
      }}
    >
      <FileIcon />
      <span className="min-w-0">
        <span className="block truncate font-medium">
          {a.kind === 'pdf' ? 'PDF hujjat' : 'Fayl'}
        </span>
        <span className="text-xs opacity-70">{formatBytes(a.sizeBytes)}</span>
      </span>
    </a>
  );
}

function FileIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function TypingRow({ name, color }: { name: string; color: string }) {
  return (
    <div className="mt-3 flex animate-fade-rise items-end gap-2.5">
      <Avatar name={name} color={color} size={36} />
      <div
        className="flex items-center gap-1 rounded-[var(--radius-lg)] px-4 py-3 shadow-soft"
        style={{ background: 'var(--bubble-other)' }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-1.5 w-1.5 rounded-full"
            style={{
              background: 'var(--text-muted)',
              animation: `typing-bounce 1.2s ${i * 0.15}s infinite ease-in-out`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ============ Composer ============ */
function Composer({
  draft,
  setDraft,
  onSend,
  replyTo,
  replyToName,
  onCancelReply,
  onAttach,
}: {
  draft: string;
  setDraft: (v: string) => void;
  onSend: () => void;
  replyTo: ClientMessage | null;
  replyToName: string;
  onCancelReply: () => void;
  onAttach?: (file: File) => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [draft]);

  return (
    <div className="border-t px-3 py-3 sm:px-6" style={{ borderColor: 'var(--border)' }}>
      <div className="mx-auto max-w-3xl">
        {replyTo && (
          <div
            className="mb-2 flex items-center gap-2 rounded-[var(--radius-md)] border-l-2 px-3 py-2 text-sm"
            style={{ borderColor: 'var(--primary)', background: 'var(--surface-2)' }}
          >
            <ReplyIcon />
            <span className="min-w-0 flex-1 truncate">
              <span className="font-semibold">{replyToName}</span>
              <span className="text-muted ml-1">
                {replyTo.body.length > 70 ? replyTo.body.slice(0, 70) + '…' : replyTo.body}
              </span>
            </span>
            <button onClick={onCancelReply} aria-label="Bekor qilish" className="text-muted">
              <CloseIcon />
            </button>
          </div>
        )}

        <div
          className="flex items-end gap-2 rounded-[var(--radius-xl)] border p-1.5 shadow-soft"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <button
            type="button"
            aria-label="Biriktirish"
            title="Rasm/fayl biriktirish"
            disabled={!onAttach}
            onClick={() => fileRef.current?.click()}
            className="ring-brand grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)] text-muted transition hover:text-[var(--text)] disabled:opacity-40"
          >
            <AttachIcon />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf,audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onAttach) onAttach(file);
              e.target.value = '';
            }}
          />
          <textarea
            ref={taRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            rows={1}
            placeholder="Xabar yozing…"
            className="thin-scroll max-h-40 flex-1 resize-none bg-transparent px-1 py-2 text-[0.95rem] outline-none"
            style={{ color: 'var(--text)' }}
          />
          <IconButton label="Emoji">
            <SmileIcon />
          </IconButton>
          <button
            onClick={onSend}
            disabled={!draft.trim()}
            aria-label="Yuborish"
            className="ring-brand grid h-10 w-10 shrink-0 place-items-center rounded-full transition active:scale-95 disabled:opacity-40"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
          >
            <SendIcon />
          </button>
        </div>
        <p className="text-muted mt-1.5 px-2 text-center text-[11px]">
          Enter — yuborish · Shift+Enter — yangi qator
        </p>
      </div>
    </div>
  );
}

/* ============ Kichik bo'laklar ============ */
function NavItem({
  active,
  icon,
  label,
  badge,
}: {
  active?: boolean;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <button
      className="ring-brand flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition"
      style={{
        background: active
          ? 'color-mix(in srgb, var(--primary) 12%, var(--surface))'
          : 'transparent',
        color: active ? 'var(--primary)' : 'var(--text-muted)',
      }}
    >
      <span className="grid h-5 w-5 place-items-center">{icon}</span>
      <span className="flex-1 text-left" style={{ color: active ? 'var(--text)' : undefined }}>
        {label}
      </span>
      {badge && (
        <span
          className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
          style={{
            background: active ? 'var(--primary)' : 'var(--surface-2)',
            color: active ? '#fff' : 'var(--text-muted)',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function UserCard({ user, onLogout }: { user: ClientUser; onLogout: () => void }) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-[var(--radius-md)] border p-2"
      style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
    >
      <Avatar name={user.name} color={user.color} size={36} online />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{user.name}</div>
        <div className="text-muted text-xs">{roleLabel(user.role)}</div>
      </div>
      <button
        type="button"
        onClick={onLogout}
        aria-label="Chiqish"
        className="ring-brand grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] text-muted transition hover:text-[var(--danger)]"
      >
        <LogoutIcon />
      </button>
    </div>
  );
}

function IconButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="ring-brand grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)] text-muted transition hover:text-[var(--text)]"
    >
      {children}
    </button>
  );
}

function TeacherBadge() {
  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
      style={{
        background: 'color-mix(in srgb, var(--primary) 16%, var(--surface))',
        color: 'var(--primary)',
      }}
    >
      o‘qituvchi
    </span>
  );
}

/* ============ Format yordamchilari ============ */
function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Bugun';
  if (d.toDateString() === yest.toDateString()) return 'Kecha';
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' });
}
function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}
function roleLabel(role: string): string {
  if (role === 'teacher') return 'O‘qituvchi';
  if (role === 'admin' || role === 'super_admin') return 'Administrator';
  return 'O‘quvchi';
}

/* ============ Ikonkalar ============ */
function ChatIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
    </svg>
  );
}
function TaskIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
function TestIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 13l2 2 4-4" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function SparkIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}
function AttachIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.49" />
    </svg>
  );
}
function SmileIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
    </svg>
  );
}
function ReplyIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 17l-6-6 6-6" />
      <path d="M3 11h11a4 4 0 0 1 4 4v2" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--primary)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 17v5M9 10.76V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6.76l2 3.24H7l2-3.24z" />
    </svg>
  );
}
function ArrowDownIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
