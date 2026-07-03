import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AtSign, Loader2, Paperclip, Send, SmilePlus, MessageCircle } from 'lucide-react';
import { formatTime, getInitials } from '../../lib/utils';
import { socketService } from '../../services/socket';
import { useAuthStore } from '../../store/authStore';
import { useMessageStore } from '../../store/messageStore';

interface ChatPanelProps {
  title?: string;
  subtitle?: string;
  roomId?: string;
  meetingId?: string;
  teamId?: string;
  compact?: boolean;
}

const quickReactions = [
  { label: 'Thumbs up',   value: String.fromCodePoint(0x1f44d) },
  { label: 'Raised hands', value: String.fromCodePoint(0x1f64c) },
  { label: 'Check mark',  value: String.fromCodePoint(0x2705) },
];

export default function ChatPanel({
  title = 'Workspace Chat',
  subtitle = 'Real-time messages, mentions, reactions, and typing status',
  roomId,
  meetingId,
  teamId,
  compact = false,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [sendError, setSendError] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const { user } = useAuthStore();
  const { messages, isLoading, fetchMessages, sendMessage, addMessage, addReaction, clearMessages } = useMessageStore();

  const chatQuery = useMemo(
    () => ({ roomId, meetingId, teamId, limit: 75 }),
    [meetingId, roomId, teamId]
  );

  const conversationKey = roomId || meetingId || teamId || 'global';
  const userName = `${user?.firstName || 'Team'} ${user?.lastName || 'Member'}`.trim();

  useEffect(() => {
    void fetchMessages(chatQuery);

    const handleNewMessage = (message: { _id?: string }) => {
      if (!message._id) return;
      const exists = useMessageStore.getState().messages.some((m) => m._id === message._id);
      if (!exists) addMessage(message as never);
    };

    const handleTyping = (payload: { userId: string; userName: string }) => {
      if (payload.userId === user?._id) return;
      setTypingUsers((cur) => ({ ...cur, [payload.userId]: payload.userName }));
    };

    const handleStopTyping = (payload: { userId: string }) => {
      setTypingUsers((cur) => { const n = { ...cur }; delete n[payload.userId]; return n; });
    };

    socketService.on('message:new', handleNewMessage);
    socketService.on('chat:typing', handleTyping);
    socketService.on('chat:stop-typing', handleStopTyping);

    // Always join the conversation socket room so message:new events are received
    // conversationKey covers 'global', specific roomIds, or teamIds
    socketService.joinChat(roomId ?? (meetingId || teamId ? undefined : conversationKey), teamId, meetingId);

    return () => {
      socketService.off('message:new', handleNewMessage);
      socketService.off('chat:typing', handleTyping);
      socketService.off('chat:stop-typing', handleStopTyping);
      socketService.leaveChat(roomId ?? (meetingId || teamId ? undefined : conversationKey), teamId, meetingId);
      clearMessages();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationKey]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const emitTyping = () => {
    if (!user) return;
    socketService.emit('chat:typing', { roomId, meetingId, teamId, userId: user._id, userName });
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      socketService.emit('chat:stop-typing', { roomId, meetingId, teamId, userId: user._id });
    }, 1200);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setSendError(''); setDraft('');
    try {
      await sendMessage({ content, roomId, meetingId, teamId, messageType: 'text' });
    } catch {
      setDraft(content);
      setSendError('Message failed to send. Check your connection.');
    }
  };

  const typingText = Object.values(typingUsers).join(', ');

  return (
    <section
      className="flex flex-col rounded-2xl border border-[--color-border] bg-white overflow-hidden"
      style={{ minHeight: compact ? '420px' : '520px' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-[--color-border] px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[--color-primary-light] mt-0.5">
            <MessageCircle className="h-4.5 w-4.5 text-[--color-primary]" style={{ width: '18px', height: '18px' }} />
          </div>
          <div>
            <h2 className="text-base font-bold text-[--color-foreground]">{title}</h2>
            <p className="text-xs text-[--color-text-muted] mt-0.5 leading-relaxed">{subtitle}</p>
          </div>
        </div>
        <span className="im-badge im-badge-blue shrink-0 text-[11px]">{conversationKey}</span>
      </div>

      {/* Messages */}
      <div className={`flex-1 space-y-1 overflow-y-auto p-4 scrollbar-thin ${compact ? 'max-h-[360px]' : ''}`}>
        {isLoading ? (
          <div className="flex h-full items-center justify-center gap-2 text-[--color-text-muted]">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading messages…</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[--color-border] p-8 text-center my-4">
            <AtSign className="h-8 w-8 text-[--color-primary] opacity-40" />
            <p className="mt-3 font-semibold text-[--color-foreground] text-sm">No messages yet</p>
            <p className="mt-1 text-xs text-[--color-text-muted]">Start a thread, mention a teammate, or drop a note.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const senderName = msg.senderName || `${msg.sender?.firstName || 'Team'} ${msg.sender?.lastName || 'Member'}`;
            const isMine = msg.sender?._id === user?._id || msg.sender === user?._id;

            return (
              <article
                key={msg._id}
                className={`flex gap-3 ${isMine ? 'flex-row-reverse' : ''} group`}
              >
                {/* Avatar */}
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white self-end"
                  style={{ background: 'linear-gradient(135deg, #2563EB, #7c3aed)' }}
                >
                  {getInitials(senderName.split(' ')[0] || 'T', senderName.split(' ')[1] || 'M')}
                </div>

                <div className={`max-w-[76%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  {/* Sender + time */}
                  <div className={`mb-1 flex items-center gap-1.5 text-[11px] text-[--color-text-muted] ${isMine ? 'flex-row-reverse' : ''}`}>
                    <span className="font-semibold text-[--color-text-secondary]">{senderName}</span>
                    <span>·</span>
                    <span>{formatTime(msg.createdAt)}</span>
                  </div>

                  {/* Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isMine
                        ? 'rounded-tr-sm bg-primary text-white'
                        : 'rounded-tl-sm bg-[--color-surface-2] text-[--color-foreground] border border-[--color-border]'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Reactions */}
                  <div className="mt-1.5 flex flex-wrap gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {msg.reactions?.map((r, i) => (
                      <button
                        key={`${r.emoji}-${i}`}
                        type="button"
                        className="rounded-full border border-[--color-border] bg-white px-2 py-0.5 text-xs hover:border-[--color-primary] transition-colors"
                        onClick={() => void addReaction(msg._id, r.emoji)}
                      >
                        {r.emoji}
                      </button>
                    ))}
                    {quickReactions.map((r) => (
                      <button
                        key={r.label}
                        type="button"
                        title={r.label}
                        className="rounded-full border border-[--color-border] bg-white px-2 py-0.5 text-xs hover:border-[--color-primary] transition-colors"
                        onClick={() => void addReaction(msg._id, r.value)}
                      >
                        {r.value}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {/* Footer */}
      <div className="border-t border-[--color-border] bg-[--color-surface-2] px-4 py-3">
        {typingText && (
          <p className="mb-2 text-xs font-semibold text-primary animate-pulse">
            {typingText} is typing…
          </p>
        )}
        {sendError && <p className="mb-2 text-xs text-red-600">{sendError}</p>}

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[--color-border] bg-white text-[--color-text-muted] hover:text-[--color-primary] transition-colors"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[--color-border] bg-white text-[--color-text-muted] hover:text-[--color-primary] transition-colors"
            title="Emoji"
          >
            <SmilePlus className="h-4 w-4" />
          </button>
          <textarea
            id="chat-input"
            value={draft}
            onChange={(e) => { setDraft(e.target.value); emitTyping(); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            placeholder="Write a message or @mention a teammate…"
            className="max-h-32 min-h-[38px] flex-1 resize-none rounded-xl border border-[--color-border] bg-white px-4 py-2.5 text-sm text-[--color-foreground] outline-none transition focus:border-[--color-primary] focus:ring-2 focus:ring-blue-100 placeholder:text-[--color-text-muted]"
          />
          <button
            type="submit"
            id="btn-send-message"
            disabled={!draft.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition hover:bg-primary-hover disabled:opacity-40"
            title="Send message (Enter)"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </section>
  );
}
