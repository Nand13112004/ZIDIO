import {
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Flag,
  Loader2,
  Plus,
  RefreshCw,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from 'react';
import { formatDate, getFullName } from '../lib/utils';
import { taskService, teamService } from '../services';
import { socketService } from '../services/socket';
import type { Task, Team } from '../types';

const columns: Array<{ id: Task['status']; title: string; icon: typeof ClipboardCheck; color: string }> = [
  { id: 'todo',        title: 'To Do',       icon: ClipboardCheck, color: '#64748b' },
  { id: 'in-progress', title: 'In Progress',  icon: Clock3,         color: '#2563EB' },
  { id: 'review',      title: 'Review',       icon: RefreshCw,      color: '#d97706' },
  { id: 'done',        title: 'Done',         icon: CheckCircle2,   color: '#16a34a' },
];

const priorityOptions: Task['priority'][] = ['low', 'medium', 'high', 'urgent'];

const colBg: Record<string, string> = {
  'todo':        '#f8fafc',
  'in-progress': '#eff6ff',
  'review':      '#fffbeb',
  'done':        '#f0fdf4',
};

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    team: '',
    dueDate: '',
  });
  const [dragOver, setDragOver] = useState<string | null>(null);

  const tasksByStatus = useMemo(
    () =>
      columns.reduce(
        (acc, col) => ({ ...acc, [col.id]: tasks.filter((t) => t.status === col.id) }),
        {} as Record<Task['status'], Task[]>
      ),
    [tasks]
  );

  const stats = useMemo(() => ({
    total:  tasks.length,
    done:   tasks.filter((t) => t.status === 'done').length,
    urgent: tasks.filter((t) => t.priority === 'urgent').length,
    overdue: tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length,
  }), [tasks]);

  const loadBoard = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [taskRes, teamRes] = await Promise.all([
        taskService.getTasks({ limit: 100, sort: '-createdAt' }),
        teamService.getTeams(),
      ]);
      setTasks(taskRes.data.data.tasks);
      setTeams(teamRes.data.data.teams);
    } catch {
      setError('Unable to load tasks. Please check your backend connection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBoard();
    const handleTaskUpdated = (payload: { taskId: string; updates: Partial<Task> }) => {
      setTasks((cur) => cur.map((t) => (t._id === payload.taskId ? { ...t, ...payload.updates } : t)));
    };
    socketService.on('task:updated', handleTaskUpdated);
    return () => socketService.off('task:updated', handleTaskUpdated);
  }, []);

  const handleCreateTask = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setIsCreating(true);
    setError('');
    try {
      const res = await taskService.createTask({
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        team: form.team || undefined,
      });
      const task = res.data.data.task;
      setTasks((cur) => [task, ...cur]);
      setForm({ title: '', description: '', priority: 'medium', team: '', dueDate: '' });
      socketService.emit('task:updated', { taskId: task._id, updates: task });
    } catch {
      setError('Task creation failed. Check required fields.');
    } finally {
      setIsCreating(false);
    }
  };

  const moveTask = async (taskId: string, status: Task['status']) => {
    const prev = tasks;
    setTasks((cur) => cur.map((t) => (t._id === taskId ? { ...t, status } : t)));
    try {
      await taskService.updateTask(taskId, { status });
      socketService.emit('task:updated', { taskId, updates: { status } });
    } catch {
      setTasks(prev);
      setError('Task move failed.');
    }
  };

  const completeTask = async (taskId: string) => {
    const prev = tasks;
    setTasks((cur) => cur.map((t) => (t._id === taskId ? { ...t, status: 'done' } : t)));
    try {
      await taskService.completeTask(taskId);
      socketService.emit('task:updated', { taskId, updates: { status: 'done' } });
    } catch {
      setTasks(prev);
      setError('Unable to complete task.');
    }
  };

  const handleDragStart = (e: DragEvent<HTMLElement>, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, status: Task['status']) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) void moveTask(taskId, status);
    setDragOver(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="im-page-title">Task Board</h1>
          <p className="im-page-subtitle">Kanban planning with real-time updates and AI-extracted action items.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <StatChip icon={Target}       label="Total"   value={stats.total}  color="#2563EB" />
          <StatChip icon={CheckCircle2} label="Done"    value={stats.done}   color="#16a34a" />
          <StatChip icon={Flag}         label="Urgent"  value={stats.urgent} color="#dc2626" />
          <StatChip icon={AlertTriangle}label="Overdue" value={stats.overdue} color="#d97706" />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="im-alert im-alert-error animate-fade-in">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Create task form */}
      <form onSubmit={handleCreateTask} className="im-card p-5">
        <h2 className="text-sm font-bold text-[--color-foreground] mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-[--color-primary]" />
          Add New Task
        </h2>
        <div className="grid gap-4 xl:grid-cols-[1fr_180px_160px_190px_auto]">
          <div>
            <label className="block text-xs font-semibold text-[--color-text-secondary] mb-1.5">Task title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
              placeholder="e.g. Review AI meeting summary"
              className="im-input"
              id="task-title"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[--color-text-secondary] mb-1.5">Team</label>
            <select
              value={form.team}
              onChange={(e) => setForm((c) => ({ ...c, team: e.target.value }))}
              className="im-input"
              id="task-team"
            >
              <option value="">No team</option>
              {teams.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[--color-text-secondary] mb-1.5">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm((c) => ({ ...c, priority: e.target.value as Task['priority'] }))}
              className="im-input"
              id="task-priority"
            >
              {priorityOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[--color-text-secondary] mb-1.5">Due date</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((c) => ({ ...c, dueDate: e.target.value }))}
              className="im-input"
              id="task-due"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isCreating || !form.title.trim()}
              className="im-btn im-btn-primary h-10 px-5"
              id="btn-add-task"
            >
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </button>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs font-semibold text-[--color-text-secondary] mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
            rows={2}
            placeholder="Add details, acceptance criteria, or AI-generated action-item context…"
            className="im-input resize-none"
            id="task-desc"
          />
        </div>
      </form>

      {/* Kanban board */}
      {isLoading ? (
        <div className="flex min-h-80 items-center justify-center gap-3 rounded-2xl border border-[--color-border] bg-white text-[--color-text-muted]">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading board…</span>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-4">
          {columns.map((col) => {
            const Icon = col.icon;
            const colTasks = tasksByStatus[col.id] ?? [];
            return (
              <div
                key={col.id}
                id={`column-${col.id}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(col.id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => handleDrop(e, col.id)}
                className="rounded-2xl border border-[--color-border] transition-all"
                style={{
                  background: dragOver === col.id ? '#e0f2fe' : colBg[col.id] || '#f8fafc',
                  minHeight: '560px',
                }}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-[--color-border]/60">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4.5 w-4.5" style={{ color: col.color, width: '18px', height: '18px' }} />
                    <h2 className="text-sm font-bold text-[--color-foreground]">{col.title}</h2>
                  </div>
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: col.color }}
                  >
                    {colTasks.length}
                  </span>
                </div>

                {/* Tasks */}
                <div className="p-3 space-y-3">
                  {colTasks.map((task) => (
                    <article
                      key={task._id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task._id)}
                      id={`task-${task._id}`}
                      className="rounded-xl border border-[--color-border] bg-white p-4 shadow-sm cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-sm font-semibold text-[--color-foreground] leading-snug flex-1">{task.title}</h3>
                        <PriorityDot priority={task.priority} />
                      </div>
                      {task.description && (
                        <p className="text-xs text-[--color-text-muted] leading-relaxed line-clamp-2 mb-3">
                          {task.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 mb-3">
                        <PriorityBadge priority={task.priority} />
                        {task.dueDate && (
                          <span className="im-badge im-badge-gray text-[11px]">
                            <CalendarClock className="h-3 w-3" />
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between border-t border-[--color-border] pt-2.5">
                        <p className="text-[11px] text-[--color-text-muted] font-medium">
                          {task.assignee
                            ? getFullName(task.assignee.firstName, task.assignee.lastName)
                            : 'Unassigned'}
                        </p>
                        {task.status !== 'done' && (
                          <button
                            type="button"
                            onClick={() => void completeTask(task._id)}
                            className="text-[11px] font-bold text-[--color-primary] hover:underline"
                          >
                            Complete ✓
                          </button>
                        )}
                      </div>
                    </article>
                  ))}

                  {colTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[--color-border] p-8 text-center opacity-50">
                      <Icon className="h-8 w-8 text-[--color-text-muted] mb-2" />
                      <p className="text-xs text-[--color-text-muted]">Drop tasks here</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatChip({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[--color-border] bg-white px-4 py-2.5 shadow-xs">
      <Icon className="h-4 w-4" style={{ color }} />
      <div>
        <p className="text-xs text-[--color-text-muted] font-medium">{label}</p>
        <p className="text-lg font-bold text-[--color-foreground] leading-tight">{value}</p>
      </div>
    </div>
  );
}

function PriorityDot({ priority }: { priority: Task['priority'] }) {
  const colors: Record<string, string> = {
    low: '#94a3b8', medium: '#f59e0b', high: '#f97316', urgent: '#ef4444',
  };
  return (
    <span
      className="h-2.5 w-2.5 rounded-full shrink-0 mt-0.5"
      style={{ background: colors[priority] ?? '#94a3b8' }}
      title={priority}
    />
  );
}

function PriorityBadge({ priority }: { priority: Task['priority'] }) {
  const map: Record<string, string> = {
    low: 'im-badge im-badge-gray', medium: 'im-badge im-badge-yellow',
    high: 'im-badge', urgent: 'im-badge im-badge-red',
  };
  return <span className={map[priority] ?? 'im-badge im-badge-gray'} style={priority === 'high' ? { background: '#fff7ed', color: '#c2410c', borderColor: '#fed7aa' } : {}}>{priority}</span>;
}
