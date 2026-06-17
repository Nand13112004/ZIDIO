import {
  BriefcaseBusiness,
  Crown,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  AlertTriangle,
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
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState('');
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [inviteQuery, setInviteQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);

  const selectedStats = useMemo(
    () => selectedTeam?.stats || { memberCount: selectedTeam?.members.length || 0, messageCount: 0, meetingCount: 0, taskCount: 0 },
    [selectedTeam]
  );

  const loadTeams = async () => {
    setIsLoading(true); setError('');
    try {
      const res = await teamService.getTeams();
      const loaded = res.data.data.teams;
      setTeams(loaded);
      setSelectedTeamId((cur) => cur || loaded[0]?._id || '');
    } catch {
      setError('Unable to load teams. Check your backend connection.');
    } finally { setIsLoading(false); }
  };

  useEffect(() => { void loadTeams(); }, []);

  useEffect(() => {
    if (!selectedTeamId) { setSelectedTeam(null); return; }
    let mounted = true;
    (async () => {
      try {
        const res = await teamService.getTeamById(selectedTeamId);
        if (mounted) setSelectedTeam(res.data.data.team);
      } catch { if (mounted) setError('Unable to load team details.'); }
    })();
    return () => { mounted = false; };
  }, [selectedTeamId]);

  const handleCreateTeam = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;
    setIsCreating(true); setError('');
    try {
      const res = await teamService.createTeam({ name: createForm.name.trim(), description: createForm.description.trim() });
      const team = res.data.data.team;
      setTeams((c) => [team, ...c]);
      setSelectedTeamId(team._id);
      setCreateForm({ name: '', description: '' });
    } catch { setError('Team creation failed. Names must be unique and ≥ 3 characters.'); }
    finally { setIsCreating(false); }
  };

  const handleSearchUsers = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inviteQuery.trim().length < 2) return;
    setIsSearching(true); setError('');
    try {
      const res = await userService.searchUsers(inviteQuery.trim(), 6);
      setSearchResults(res.data.data.users);
    } catch { setError('Search requires at least 2 characters.'); }
    finally { setIsSearching(false); }
  };

  const handleAddMember = async (userId: string) => {
    if (!selectedTeam) return;
    try {
      await teamService.addMember(selectedTeam._id, userId, 'member');
      const res = await teamService.getTeamById(selectedTeam._id);
      setSelectedTeam(res.data.data.team);
      setSearchResults((c) => c.filter((u) => u._id !== userId));
      socketService.emit('team:member-joined', { teamId: selectedTeam._id, member: userId });
    } catch { setError('Unable to add member. You may need owner/admin access.'); }
  };

  const handleInviteByEmail = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;
    const email = inviteQuery.trim();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setIsInviting(true);
    setError('');
    try {
      await teamService.inviteByEmail(selectedTeam._id, email);
      setInviteQuery('');
      // Optional: show a success message
      alert('Invitation sent successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send invitation. Ensure you have proper access.');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="im-page-title">Teams</h1>
          <p className="im-page-subtitle">Workspaces for members, chat, meetings, and shared delivery boards.</p>
        </div>
        {selectedTeam && (
          <div className="flex gap-3 flex-wrap">
            {[
              { label: 'Members',  value: selectedStats.memberCount },
              { label: 'Messages', value: selectedStats.messageCount },
              { label: 'Meetings', value: selectedStats.meetingCount },
              { label: 'Tasks',    value: selectedStats.taskCount },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-[--color-border] bg-white px-4 py-2 text-center shadow-xs">
                <p className="text-[11px] text-[--color-text-muted] font-medium">{label}</p>
                <p className="text-xl font-bold text-[--color-foreground]">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="im-alert im-alert-error">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Create team */}
          <div className="im-card p-5">
            <h2 className="text-sm font-bold text-[--color-foreground] mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-[--color-primary]" />
              Create Team
            </h2>
            <form onSubmit={handleCreateTeam} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[--color-text-secondary] mb-1.5" htmlFor="team-name">Team name</label>
                <input
                  id="team-name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((c) => ({ ...c, name: e.target.value }))}
                  placeholder="e.g. Product Strategy"
                  className="im-input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[--color-text-secondary] mb-1.5" htmlFor="team-desc">Description</label>
                <textarea
                  id="team-desc"
                  value={createForm.description}
                  onChange={(e) => setCreateForm((c) => ({ ...c, description: e.target.value }))}
                  rows={2}
                  placeholder="Mission and focus area…"
                  className="im-input resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={isCreating || !createForm.name.trim()}
                className="im-btn im-btn-primary w-full"
                id="btn-create-team"
              >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create workspace
              </button>
            </form>
          </div>

          {/* Team list */}
          <div className="im-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[--color-border]">
              <BriefcaseBusiness className="h-4 w-4 text-[--color-primary]" />
              <h2 className="text-sm font-bold text-[--color-foreground]">Your Teams</h2>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-[--color-text-muted]">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : teams.length === 0 ? (
              <p className="p-5 text-sm text-[--color-text-muted]">Create a workspace to get started.</p>
            ) : (
              <div className="p-2 space-y-1">
                {teams.map((team) => (
                  <button
                    key={team._id}
                    type="button"
                    id={`team-${team._id}`}
                    onClick={() => setSelectedTeamId(team._id)}
                    className={`w-full rounded-xl px-3 py-3 text-left transition-all ${
                      selectedTeamId === team._id
                        ? 'bg-[--color-primary] text-white shadow-sm'
                        : 'text-[--color-text-secondary] hover:bg-[--color-surface-2] hover:text-[--color-foreground]'
                    }`}
                  >
                    <span className="block text-sm font-semibold truncate">{team.name}</span>
                    <span className={`block text-xs mt-0.5 truncate ${selectedTeamId === team._id ? 'text-blue-100' : 'text-[--color-text-muted]'}`}>
                      {team.description || 'No description'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="space-y-5 min-w-0">
          {selectedTeam ? (
            <>
              {/* Team info card */}
              <div className="im-card p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #2563EB, #7c3aed)' }}
                    >
                      {getInitials(selectedTeam.name, 'Team')}
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-[--color-foreground] tracking-tight">{selectedTeam.name}</h2>
                      <p className="text-sm text-[--color-text-secondary] mt-0.5">{selectedTeam.description}</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-[--color-surface-2] border border-[--color-border] px-4 py-3">
                    <p className="text-xs text-[--color-text-muted] font-medium">Owner</p>
                    <p className="text-sm font-bold text-[--color-foreground] mt-0.5">
                      {selectedTeam.owner
                        ? getFullName(selectedTeam.owner.firstName, selectedTeam.owner.lastName)
                        : 'Workspace owner'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                {/* Members */}
                <div className="im-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[--color-primary]" />
                      <h2 className="font-bold text-[--color-foreground]">Members</h2>
                    </div>
                    <span className="im-badge im-badge-blue">{selectedTeam.members.length}</span>
                  </div>
                  <div className="grid gap-2.5 md:grid-cols-2">
                    {selectedTeam.members.filter((member) => member.userId).map((member) => (
                      <MemberCard key={`${member.userId._id}-${member.role}`} member={member} />
                    ))}
                  </div>
                </div>

                {/* Invite */}
                <div className="im-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <UserPlus className="h-4 w-4 text-[--color-secondary]" />
                    <h2 className="font-bold text-[--color-foreground]">Invite Members</h2>
                  </div>
                  <form onSubmit={handleSearchUsers} className="flex gap-2">
                    <input
                      value={inviteQuery}
                      onChange={(e) => setInviteQuery(e.target.value)}
                      placeholder="Search by name or email…"
                      className="im-input flex-1 min-w-0"
                      id="invite-search"
                    />
                    <button
                      type="submit"
                      disabled={isSearching || inviteQuery.trim().length < 2}
                      className="im-btn im-btn-primary im-btn-icon"
                      title="Search"
                      id="btn-search-users"
                    >
                      {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </button>
                    {inviteQuery.includes('@') && (
                      <button
                        type="button"
                        onClick={handleInviteByEmail}
                        disabled={isInviting || !inviteQuery.trim()}
                        className="im-btn im-btn-secondary"
                        title="Invite via Email"
                      >
                        {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Invite Email'}
                      </button>
                    )}
                  </form>
                  <div className="mt-3 space-y-2">
                    {searchResults.map((u) => (
                      <div key={u._id} className="flex items-center justify-between gap-3 rounded-xl border border-[--color-border] bg-[--color-surface-2] px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[--color-foreground] truncate">
                            {getFullName(u.firstName, u.lastName)}
                          </p>
                          <p className="text-xs text-[--color-text-muted] truncate">{u.email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleAddMember(u._id)}
                          className="im-btn im-btn-primary im-btn-sm shrink-0"
                          id={`btn-add-${u._id}`}
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Team chat */}
              <ChatPanel
                teamId={selectedTeam._id}
                title={`${selectedTeam.name} Chat`}
                subtitle="Team decisions, handoffs, mentions, and task context"
              />
            </>
          ) : (
            <div className="im-empty" style={{ minHeight: '520px' }}>
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
                style={{ background: 'linear-gradient(135deg, #eff6ff, #f5f3ff)' }}
              >
                <Users className="h-8 w-8 text-[--color-primary]" />
              </div>
              <h3 className="font-bold text-[--color-foreground]">No team selected</h3>
              <p className="mt-1 text-sm text-[--color-text-secondary] max-w-sm">
                Create or select a workspace to view members, invite people, and access team chat.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function MemberCard({ member }: { member: TeamMember }) {
  const Icon = member.role === 'owner' ? Crown : ShieldCheck;
  return (
    <article className="flex items-center gap-3 rounded-xl border border-[--color-border] bg-[--color-surface-2] p-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ background: 'linear-gradient(135deg, #2563EB, #7c3aed)' }}
      >
        {getInitials(member.userId.firstName || 'T', member.userId.lastName || 'M')}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[--color-foreground] truncate">
          {getFullName(member.userId.firstName || 'Team', member.userId.lastName || 'Member')}
        </p>
        <p className="text-xs text-[--color-text-muted] truncate">{member.userId.email}</p>
      </div>
      <span className={`im-badge ${member.role === 'owner' ? 'im-badge-purple' : 'im-badge-blue'} shrink-0`}>
        <Icon className="h-3 w-3" />
        {member.role}
      </span>
    </article>
  );
}
