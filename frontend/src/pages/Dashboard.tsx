import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMeetingStore } from '../store/meetingStore';
import { useAuthStore } from '../store/authStore';
import { formatDateTime } from '../lib/utils';
import {
  Video, Users, Calendar, Plus, Clock, ArrowRight,
  Sparkles, CheckCircle2, TrendingUp, Brain, LogIn
} from 'lucide-react';

export default function Dashboard() {
  const { meetings, fetchMeetings, isLoading } = useMeetingStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchMeetings('completed');
  }, [fetchMeetings]);

  const completedCount = meetings.filter(m => m.status === 'completed').length;
  const ongoingCount = meetings.filter(m => m.status === 'ongoing').length;

  return (
    <div className="space-y-8 animate-fade-in">

      {/* Welcome header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="im-page-title">
            Good {getGreeting()}, {user?.firstName || 'there'} 👋
          </h1>
          <p className="im-page-subtitle mt-1">Here's what's happening in your workspace today.</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/meeting/new?mode=join"
            id="dashboard-join-meeting"
            className="im-btn im-btn-secondary shrink-0"
          >
            <LogIn className="h-4 w-4" />
            Join Meeting
          </Link>
          <Link
            to="/meeting/new?mode=create"
            id="dashboard-new-meeting"
            className="im-btn im-btn-primary shrink-0"
          >
            <Plus className="h-4 w-4" />
            New Meeting
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Meetings"
          value={meetings.length}
          icon={Video}
          color="blue"
          trend="+12% this week"
        />
        <StatCard
          label="Completed"
          value={completedCount}
          icon={CheckCircle2}
          color="green"
          trend="85% completion rate"
        />
        <StatCard
          label="Active Now"
          value={ongoingCount}
          icon={Clock}
          color="purple"
          trend={ongoingCount > 0 ? 'In progress' : 'None running'}
        />
        <StatCard
          label="Team Members"
          value={user?.teams?.length || 0}
          icon={Users}
          color="indigo"
          trend="Across all teams"
        />
      </div>

      {/* AI Features promo */}
      <div
        className="relative overflow-hidden rounded-2xl p-6"
        style={{ background: 'linear-gradient(135deg, #2563EB 0%, #7c3aed 100%)' }}
      >
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-12 right-24 h-52 w-52 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="text-white">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-5 w-5 text-blue-200" />
              <span className="text-blue-200 text-sm font-semibold">AI Engine Active</span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">Meetings that write themselves</h2>
            <p className="mt-1.5 text-blue-100/80 text-sm leading-relaxed">
              Live transcription · AI summaries · Auto action items · Sentiment analysis
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link to="/tasks" className="im-btn im-btn-lg bg-white/15 text-white border border-white/30 hover:bg-white/25 shrink-0 font-bold backdrop-blur-sm">
              <CheckCircle2 className="h-4 w-4" />
              View Tasks
            </Link>
          </div>
        </div>
      </div>

      {/* Recent meetings */}
      <div className="im-card">
        <div className="flex items-center justify-between border-b border-[--color-border] px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[--color-primary]" />
            <h2 className="text-lg font-bold text-[--color-foreground]">Recent Meetings</h2>
          </div>
          {meetings.length > 0 && (
            <Link to="/meeting/new?mode=join" className="flex items-center gap-1.5 text-sm font-semibold text-[--color-primary] hover:underline">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-[--color-text-muted]">
            <span className="im-spinner" />
            <span className="text-sm">Loading meetings…</span>
          </div>
        ) : meetings.length === 0 ? (
          <div className="im-empty m-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
              style={{ background: 'linear-gradient(135deg, #eff6ff, #f5f3ff)' }}
            >
              <Video className="h-8 w-8 text-[--color-primary]" />
            </div>
            <h3 className="text-base font-bold text-[--color-foreground]">No meetings yet</h3>
            <p className="mt-1 text-sm text-[--color-text-secondary] max-w-xs">
              Create your first meeting and invite team members to collaborate.
            </p>
            <Link to="/meeting/new?mode=create" className="im-btn im-btn-primary mt-5">
              <Plus className="h-4 w-4" />
              Create first meeting
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[--color-border]">
            {meetings.slice(0, 8).map((meeting) => (
              <div key={meeting._id} className="flex items-center gap-4 px-6 py-4 hover:bg-[--color-surface-2] transition-colors group">
                {/* Icon */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: meeting.status === 'ongoing' ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)' : 'linear-gradient(135deg, #eff6ff, #dbeafe)' }}
                >
                  <Video className={`h-5 w-5 ${meeting.status === 'ongoing' ? 'text-green-600' : 'text-[--color-primary]'}`} />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-[--color-foreground] truncate">{meeting.title}</h3>
                    <StatusBadge status={meeting.status} />
                  </div>
                  {meeting.description && (
                    <p className="text-sm text-[--color-text-muted] truncate mt-0.5">{meeting.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-[--color-text-muted]">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {meeting.participants.length} participants
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDateTime(meeting.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Join link */}
                <Link
                  to={`/meeting/${meeting.meetingId}`}
                  className="im-btn im-btn-outline im-btn-sm shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {meeting.status === 'ongoing' ? 'Join' : 'View'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickAction
          icon={TrendingUp}
          color="blue"
          title="Meeting Analytics"
          desc="View frequency charts, productivity metrics, and engagement reports."
          action="View insights"
          href="/"
        />
        <QuickAction
          icon={CheckCircle2}
          color="green"
          title="Task Board"
          desc="Manage action items extracted from meetings on your Kanban board."
          action="Open tasks"
          href="/tasks"
        />
        <QuickAction
          icon={Users}
          color="purple"
          title="Team Workspaces"
          desc="Collaborate with your teams, chat, and manage shared projects."
          action="View teams"
          href="/teams"
        />
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

function StatCard({ label, value, icon: Icon, color, trend }: {
  label: string; value: number; icon: any; color: string; trend: string;
}) {
  const palettes: Record<string, { bg: string; icon: string; pill: string }> = {
    blue:   { bg: '#eff6ff', icon: '#2563EB', pill: '#dbeafe' },
    green:  { bg: '#f0fdf4', icon: '#16a34a', pill: '#dcfce7' },
    purple: { bg: '#f5f3ff', icon: '#7c3aed', pill: '#ede9fe' },
    indigo: { bg: '#eef2ff', icon: '#4338ca', pill: '#e0e7ff' },
  };
  const p = palettes[color] ?? palettes.blue;

  return (
    <div className="im-stat">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-[--color-text-muted] uppercase tracking-wider">{label}</p>
          <p className="im-stat-value mt-2">{value}</p>
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: p.bg }}
        >
          <Icon className="h-5 w-5" style={{ color: p.icon }} />
        </div>
      </div>
      <p className="mt-3 text-xs text-[--color-text-muted]">{trend}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'im-badge im-badge-green',
    ongoing:   'im-badge im-badge-blue',
    scheduled: 'im-badge im-badge-yellow',
  };
  return (
    <span className={map[status] ?? 'im-badge im-badge-gray'}>
      {status === 'ongoing' && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
      {status}
    </span>
  );
}

function QuickAction({ icon: Icon, color, title, desc, action, href }: {
  icon: any; color: string; title: string; desc: string; action: string; href: string;
}) {
  const palettes: Record<string, { bg: string; icon: string }> = {
    blue:   { bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', icon: '#2563EB' },
    green:  { bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', icon: '#16a34a' },
    purple: { bg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', icon: '#7c3aed' },
  };
  const p = palettes[color] ?? palettes.blue;

  return (
    <div className="im-card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: p.bg }}>
        <Icon className="h-5.5 w-5.5" style={{ color: p.icon, width: '22px', height: '22px' }} />
      </div>
      <div>
        <h3 className="font-bold text-[--color-foreground]">{title}</h3>
        <p className="mt-1 text-sm text-[--color-text-secondary] leading-relaxed">{desc}</p>
      </div>
      <Link to={href} className="im-btn im-btn-outline im-btn-sm self-start">
        {action} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
