import { Hash, MessageSquare, Radio, Zap } from 'lucide-react';
import ChatPanel from '../components/chat/ChatPanel';

const channels = [
  { icon: MessageSquare, label: 'Threads',  desc: 'Async conversation threads', color: '#2563EB' },
  { icon: Hash,          label: 'Channels', desc: 'Topic-based discussions',     color: '#7c3aed' },
  { icon: Radio,         label: 'Live',     desc: 'Real-time meeting chat',      color: '#16a34a' },
];

export default function Messages() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="im-page-title">Messages</h1>
          <p className="im-page-subtitle">
            Persistent workspace chat with live delivery, typing indicators, and reactions.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[--color-border] bg-[--color-surface-2] px-4 py-2">
          <Zap className="h-4 w-4 text-[--color-primary]" />
          <span className="text-xs font-semibold text-[--color-text-secondary]">Real-time via Socket.io</span>
        </div>
      </div>

      {/* Channel type cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {channels.map(({ icon: Icon, label, desc, color }) => (
          <div key={label} className="im-card p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${color}18` }}
            >
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <div>
              <p className="font-bold text-[--color-foreground] text-sm">{label}</p>
              <p className="text-xs text-[--color-text-muted] mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chat panel */}
      <ChatPanel
        roomId="global"
        title="General"
        subtitle="Company-wide chat for announcements and quick async notes"
      />
    </div>
  );
}
