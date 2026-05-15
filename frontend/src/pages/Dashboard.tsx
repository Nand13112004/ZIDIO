import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMeetingStore } from '../store/meetingStore';
import { useAuthStore } from '../store/authStore';
import { formatDateTime, formatDuration } from '../lib/utils';
import { Video, Users, Calendar, Plus } from 'lucide-react';

export default function Dashboard() {
  const { meetings, fetchMeetings, isLoading } = useMeetingStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchMeetings('completed');
  }, [fetchMeetings]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome back, {user?.firstName}!</p>
        </div>
        <Link
          to="/meeting/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Meeting
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Meetings</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{meetings.length}</p>
            </div>
            <Video className="w-12 h-12 text-primary/20" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Duration</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {formatDuration(meetings.reduce((acc, m) => acc + (m.endedAt ? 0 : 0), 0))}
              </p>
            </div>
            <Calendar className="w-12 h-12 text-secondary/20" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Team Members</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {user?.teams.length || 0}
              </p>
            </div>
            <Users className="w-12 h-12 text-accent/20" />
          </div>
        </div>
      </div>

      {/* Recent Meetings */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Meetings</h2>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {isLoading ? (
            <div className="p-6 text-center text-gray-600 dark:text-gray-400">Loading...</div>
          ) : meetings.length === 0 ? (
            <div className="p-6 text-center text-gray-600 dark:text-gray-400">
              No meetings yet. Create one to get started!
            </div>
          ) : (
            meetings.slice(0, 10).map((meeting) => (
              <div key={meeting._id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{meeting.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{meeting.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {meeting.participants.length} participants
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDateTime(meeting.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      meeting.status === 'completed'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : meeting.status === 'ongoing'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                    }`}>
                      {meeting.status}
                    </span>
                    <Link
                      to={`/meeting/${meeting.meetingId}`}
                      className="mt-3 block text-sm font-semibold text-primary hover:underline"
                    >
                      Join
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
