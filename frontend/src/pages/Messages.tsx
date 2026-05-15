import { Hash, MessageSquare, Radio } from 'lucide-react';
import ChatPanel from '../components/chat/ChatPanel';

export default function Messages() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Messages</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Persistent workspace chat with live delivery, typing indicators, and reactions.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
            <MessageSquare className="mb-2 h-4 w-4 text-primary" />
            Threads
          </div>
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
            <Hash className="mb-2 h-4 w-4 text-secondary" />
            Channels
          </div>
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
            <Radio className="mb-2 h-4 w-4 text-accent" />
            Live
          </div>
        </div>
      </div>

      <ChatPanel roomId="global" title="General" subtitle="Company-wide chat for announcements and quick async notes" />
    </div>
  );
}
