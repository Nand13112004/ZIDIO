import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AtSign, Loader2, Paperclip, Send, SmilePlus } from 'lucide-react';
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
  { label: 'Thumbs up', value: String.fromCodePoint(0x1f44d) },
  { label: 'Raised hands', value: String.fromCodePoint(0x1f64c) },
  { label: 'Check', value: String.fromCodePoint(0x2705) },
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
  const {
    messages,
    isLoading,
    fetchMessages,
    sendMessage,
    addMessage,
    addReaction,
    clearMessages,
  } = useMessageStore();

  const chatQuery = useMemo(
    () => ({
      roomId,
      meetingId,
      teamId,
      limit: 75,
    }),
    [meetingId, roomId, teamId]
  );

  const conversationKey = roomId || meetingId || teamId || 'global';
  const userName = `${user?.firstName || 'Team'} ${user?.lastName || 'Member'}`.trim();

  useEffect(() => {
    void fetchMessages(chatQuery);

    const handleNewMessage = (message: { _id?: string }) => {
      if (!message._id) return;

      const exists = useMessageStore
        .getState()
        .messages.some((storedMessage) => storedMessage._id === message._id);

      if (!exists) {
        addMessage(message as never);
      }
    };

    const handleTyping = (payload: { userId: string; userName: string }) => {
      if (payload.userId === user?._id) return;
      setTypingUsers((current) => ({
        ...current,
        [payload.userId]: payload.userName,
      }));
    };

    const handleStopTyping = (payload: { userId: string }) => {
      setTypingUsers((current) => {
        const next = { ...current };
        delete next[payload.userId];
        return next;
      });
    };

    socketService.on('message:new', handleNewMessage);
    socketService.on('chat:typing', handleTyping);
    socketService.on('chat:stop-typing', handleStopTyping);

    return () => {
      socketService.off('message:new', handleNewMessage);
      socketService.off('chat:typing', handleTyping);
      socketService.off('chat:stop-typing', handleStopTyping);
      clearMessages();
    };
  }, [addMessage, chatQuery, clearMessages, fetchMessages, user?._id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const emitTyping = () => {
    if (!user) return;

    socketService.emit('chat:typing', {
      roomId,
      meetingId,
      teamId,
      userId: user._id,
      userName,
    });

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      socketService.emit('chat:stop-typing', {
        roomId,
        meetingId,
        teamId,
        userId: user._id,
      });
    }, 1200);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;

    setSendError('');
    setDraft('');

    try {
      await sendMessage({
        content,
        roomId,
        meetingId,
        teamId,
        messageType: 'text',
      });
    } catch {
      setDraft(content);
      setSendError('Message failed to send. Check your connection and try again.');
    }
  };

  const typingText = Object.values(typingUsers).join(', ');

  return (
    <section className="flex h-full min-h-[520px] flex-col rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-4 dark:border-gray-800">
        <div>
          <h2 className="text-lg font-bold text-gray-950 dark:text-white">{title}</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
        </div>
        <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {conversationKey}
        </div>
      </div>

      <div className={`flex-1 space-y-4 overflow-y-auto p-4 ${compact ? 'max-h-[420px]' : ''}`}>
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading messages
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
            <AtSign className="h-8 w-8 text-primary" />
            <p className="mt-3 font-semibold text-gray-900 dark:text-white">No messages yet</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Start a thread, mention a teammate, or drop a meeting note.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const senderName =
              message.senderName ||
              `${message.sender?.firstName || 'Team'} ${message.sender?.lastName || 'Member'}`;
            const isMine = message.sender?._id === user?._id || message.sender === user?._id;

            return (
              <article
                key={message._id}
                className={`flex gap-3 ${isMine ? 'flex-row-reverse text-right' : ''}`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-bold text-white">
                  {getInitials(senderName.split(' ')[0] || 'T', senderName.split(' ')[1] || 'M')}
                </div>
                <div className={`max-w-[78%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className="mb-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{senderName}</span>
                    <span>{formatTime(message.createdAt)}</span>
                  </div>
                  <div
                    className={`rounded-lg px-4 py-3 text-sm leading-relaxed ${
                      isMine
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                    }`}
                  >
                    {message.content}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.reactions?.map((reaction, index) => (
                      <button
                        key={`${reaction.emoji}-${index}`}
                        type="button"
                        className="rounded-full bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800"
                        onClick={() => void addReaction(message._id, reaction.emoji)}
                      >
                        {reaction.emoji}
                      </button>
                    ))}
                    {quickReactions.map((reaction) => (
                      <button
                        key={reaction.label}
                        type="button"
                        className="rounded-full border border-gray-200 px-2 py-1 text-xs text-gray-500 transition hover:border-primary hover:text-primary dark:border-gray-700"
                        title={reaction.label}
                        onClick={() => void addReaction(message._id, reaction.value)}
                      >
                        {reaction.value}
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

      <div className="border-t border-gray-200 p-4 dark:border-gray-800">
        {typingText && (
          <p className="mb-2 text-xs font-medium text-primary">{typingText} typing...</p>
        )}
        {sendError && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{sendError}</p>}
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:text-primary dark:border-gray-700"
            title="Attach file"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:text-primary dark:border-gray-700"
            title="Emoji reactions"
          >
            <SmilePlus className="h-5 w-5" />
          </button>
          <textarea
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              emitTyping();
            }}
            rows={1}
            placeholder="Write a message or @mention a teammate"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="rounded-lg bg-primary p-3 text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            title="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </section>
  );
}
