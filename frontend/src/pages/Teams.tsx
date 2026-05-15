import {
  BriefcaseBusiness,
  Crown,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import ChatPanel from '../components/chat/ChatPanel';
import { getFullName, getInitials } from '../lib/utils';
import { teamService, userService } from '../services';
import { socketService } from '../services/socket';
import type { Team, TeamMember, User } from '../types';

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [inviteQuery, setInviteQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);

  const selectedStats = useMemo(
    () => selectedTeam?.stats || { memberCount: selectedTeam?.members.length || 0, messageCount: 0, meetingCount: 0, taskCount: 0 },
    [selectedTeam]
  );

  const loadTeams = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await teamService.getTeams();
      const loadedTeams = response.data.data.teams;
      setTeams(loadedTeams);
      setSelectedTeamId((current) => current || loadedTeams[0]?._id || '');
    } catch {
      setError('Unable to load teams. Confirm the backend is running and you are authenticated.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTeams();
  }, []);

  useEffect(() => {
    if (!selectedTeamId) {
      setSelectedTeam(null);
      return;
    }

    let mounted = true;

    const loadTeamDetails = async () => {
      try {
        const response = await teamService.getTeamById(selectedTeamId);
        if (mounted) {
          setSelectedTeam(response.data.data.team);
        }
      } catch {
        if (mounted) {
          setError('Unable to load the selected team workspace.');
        }
      }
    };

    void loadTeamDetails();

    return () => {
      mounted = false;
    };
  }, [selectedTeamId]);

  const handleCreateTeam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createForm.name.trim()) return;

    setIsCreating(true);
    setError('');

    try {
      const response = await teamService.createTeam({
        name: createForm.name.trim(),
        description: createForm.description.trim(),
      });
      const team = response.data.data.team;
      setTeams((current) => [team, ...current]);
      setSelectedTeamId(team._id);
      setCreateForm({ name: '', description: '' });
    } catch {
      setError('Team creation failed. Team names must be unique and at least 3 characters.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSearchUsers = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inviteQuery.trim().length < 2) return;

    setIsSearching(true);
    setError('');

    try {
      const response = await userService.searchUsers(inviteQuery.trim(), 6);
      setSearchResults(response.data.data.users);
    } catch {
      setError('Search needs at least 2 characters and an active backend connection.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!selectedTeam) return;

    try {
      await teamService.addMember(selectedTeam._id, userId, 'member');
      const response = await teamService.getTeamById(selectedTeam._id);
      setSelectedTeam(response.data.data.team);
      setSearchResults((current) => current.filter((user) => user._id !== userId));
      socketService.emit('team:member-joined', {
        teamId: selectedTeam._id,
        member: userId,
      });
    } catch {
      setError('Unable to add that member. You may need owner or admin access.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Teams</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Workspaces for members, chat, meetings, and shared delivery boards.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <WorkspaceMetric label="Members" value={selectedStats.memberCount} />
          <WorkspaceMetric label="Messages" value={selectedStats.messageCount} />
          <WorkspaceMetric label="Meetings" value={selectedStats.meetingCount} />
          <WorkspaceMetric label="Tasks" value={selectedStats.taskCount} />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <form
            onSubmit={handleCreateTeam}
            className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-gray-900 dark:text-white">Create Team</h2>
            </div>
            <label className="mb-3 grid gap-2">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Name</span>
              <input
                value={createForm.name}
                onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Product Strategy"
                className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Description</span>
              <textarea
                value={createForm.description}
                onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                placeholder="Mission, operating rhythm, and focus area"
                className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </label>
            <button
              type="submit"
              disabled={isCreating || !createForm.name.trim()}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
            >
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create workspace
            </button>
          </form>

          <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex items-center gap-2 px-2">
              <BriefcaseBusiness className="h-5 w-5 text-secondary" />
              <h2 className="font-bold text-gray-900 dark:text-white">Your Teams</h2>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center p-8 text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading
              </div>
            ) : teams.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 dark:text-gray-400">Create a workspace to get started.</p>
            ) : (
              <div className="space-y-2">
                {teams.map((team) => (
                  <button
                    key={team._id}
                    type="button"
                    onClick={() => setSelectedTeamId(team._id)}
                    className={`w-full rounded-lg px-3 py-3 text-left transition ${
                      selectedTeamId === team._id
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="block font-semibold">{team.name}</span>
                    <span className="mt-1 block truncate text-xs opacity-80">
                      {team.description || 'No description yet'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <main className="space-y-6">
          {selectedTeam ? (
            <>
              <section className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary font-bold text-white">
                        {getInitials(selectedTeam.name, 'Team')}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedTeam.name}</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{selectedTeam.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm dark:bg-gray-800">
                    <p className="text-gray-500">Owner</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {selectedTeam.owner
                        ? getFullName(selectedTeam.owner.firstName, selectedTeam.owner.lastName)
                        : 'Workspace owner'}
                    </p>
                  </div>
                </div>
              </section>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <h2 className="font-bold text-gray-900 dark:text-white">Members</h2>
                    </div>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      {selectedTeam.members.length}
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {selectedTeam.members.map((member) => (
                      <MemberCard key={`${member.userId._id}-${member.role}`} member={member} />
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-4 flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-secondary" />
                    <h2 className="font-bold text-gray-900 dark:text-white">Invite Members</h2>
                  </div>
                  <form onSubmit={handleSearchUsers} className="flex gap-2">
                    <input
                      value={inviteQuery}
                      onChange={(event) => setInviteQuery(event.target.value)}
                      placeholder="Search name or email"
                      className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={isSearching || inviteQuery.trim().length < 2}
                      className="rounded-lg bg-primary p-3 text-white transition hover:bg-primary/90 disabled:opacity-60"
                      title="Search users"
                    >
                      {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                    </button>
                  </form>
                  <div className="mt-4 space-y-3">
                    {searchResults.map((result) => (
                      <div
                        key={result._id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3 dark:border-gray-800"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-900 dark:text-white">
                            {getFullName(result.firstName, result.lastName)}
                          </p>
                          <p className="truncate text-xs text-gray-500">{result.email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleAddMember(result._id)}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white dark:border-gray-700"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <ChatPanel
                teamId={selectedTeam._id}
                title={`${selectedTeam.name} Chat`}
                subtitle="Team decisions, handoffs, mentions, and task context"
              />
            </>
          ) : (
            <div className="flex min-h-[520px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
              <Users className="h-10 w-10 text-primary" />
              <p className="mt-4 font-semibold text-gray-900 dark:text-white">No team selected</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Create or select a workspace to view members, invites, and chat.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function WorkspaceMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function MemberCard({ member }: { member: TeamMember }) {
  const Icon = member.role === 'owner' ? Crown : ShieldCheck;

  return (
    <article className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-4 dark:border-gray-800">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white">
          {getInitials(member.userId.firstName || 'Team', member.userId.lastName || 'Member')}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900 dark:text-white">
            {getFullName(member.userId.firstName || 'Team', member.userId.lastName || 'Member')}
          </p>
          <p className="truncate text-xs text-gray-500">{member.userId.email}</p>
        </div>
      </div>
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold capitalize text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <Icon className="h-3.5 w-3.5" />
        {member.role}
      </span>
    </article>
  );
}
