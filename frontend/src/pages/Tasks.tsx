import {
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Flag,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from 'react';
import { formatDate, getFullName, getPriorityColor } from '../lib/utils';
import { taskService, teamService } from '../services';
import { socketService } from '../services/socket';
import type { Task, Team } from '../types';

const columns: Array<{ id: Task['status']; title: string; icon: typeof ClipboardCheck }> = [
  { id: 'todo', title: 'To do', icon: ClipboardCheck },
  { id: 'in-progress', title: 'In progress', icon: Clock3 },
  { id: 'review', title: 'Review', icon: RefreshCw },
  { id: 'done', title: 'Done', icon: CheckCircle2 },
];

const priorityOptions: Task['priority'][] = ['low', 'medium', 'high', 'urgent'];

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

  const tasksByStatus = useMemo(
    () =>
      columns.reduce(
        (accumulator, column) => ({
          ...accumulator,
          [column.id]: tasks.filter((task) => task.status === column.id),
        }),
        {} as Record<Task['status'], Task[]>
      ),
    [tasks]
  );

  const stats = useMemo(
    () => ({
      total: tasks.length,
      done: tasks.filter((task) => task.status === 'done').length,
      urgent: tasks.filter((task) => task.priority === 'urgent').length,
      overdue: tasks.filter((task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done')
        .length,
    }),
    [tasks]
  );

  const loadBoard = async () => {
    setIsLoading(true);
    setError('');

    try {
      const [taskResponse, teamResponse] = await Promise.all([
        taskService.getTasks({ limit: 100, sort: '-createdAt' }),
        teamService.getTeams(),
      ]);

      setTasks(taskResponse.data.data.tasks);
      setTeams(teamResponse.data.data.teams);
    } catch {
      setError('Unable to load the task board. Confirm the backend and MongoDB are running.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBoard();

    const handleTaskUpdated = (payload: { taskId: string; updates: Partial<Task> }) => {
      setTasks((current) =>
        current.map((task) => (task._id === payload.taskId ? { ...task, ...payload.updates } : task))
      );
    };

    socketService.on('task:updated', handleTaskUpdated);
    return () => socketService.off('task:updated', handleTaskUpdated);
  }, []);

  const handleCreateTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) return;

    setIsCreating(true);
    setError('');

    try {
      const response = await taskService.createTask({
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        team: form.team || undefined,
      });

      const createdTask = response.data.data.task;
      setTasks((current) => [createdTask, ...current]);
      setForm({ title: '', description: '', priority: 'medium', team: '', dueDate: '' });
      socketService.emit('task:updated', { taskId: createdTask._id, updates: createdTask });
    } catch {
      setError('Task creation failed. Check required fields and permissions.');
    } finally {
      setIsCreating(false);
    }
  };

  const moveTask = async (taskId: string, status: Task['status']) => {
    const previousTasks = tasks;
    setTasks((current) => current.map((task) => (task._id === taskId ? { ...task, status } : task)));

    try {
      await taskService.updateTask(taskId, { status });
      socketService.emit('task:updated', { taskId, updates: { status } });
    } catch {
      setTasks(previousTasks);
      setError('Task move failed. You may need reporter or assignee permissions.');
    }
  };

  const completeTask = async (taskId: string) => {
    const previousTasks = tasks;
    setTasks((current) => current.map((task) => (task._id === taskId ? { ...task, status: 'done' } : task)));

    try {
      await taskService.completeTask(taskId);
      socketService.emit('task:updated', { taskId, updates: { status: 'done' } });
    } catch {
      setTasks(previousTasks);
      setError('Unable to complete the task.');
    }
  };

  const handleDragStart = (event: DragEvent<HTMLElement>, taskId: string) => {
    event.dataTransfer.setData('text/plain', taskId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, status: Task['status']) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/plain');
    if (taskId) {
      void moveTask(taskId, status);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tasks</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Kanban planning with real-time updates, priorities, due dates, and team context.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Total" value={stats.total} />
          <Metric label="Done" value={stats.done} />
          <Metric label="Urgent" value={stats.urgent} />
          <Metric label="Overdue" value={stats.overdue} />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreateTask}
        className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(220px,1.4fr)_minmax(180px,0.8fr)_160px_190px_auto]">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Task</span>
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Create launch checklist"
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Team</span>
            <select
              value={form.team}
              onChange={(event) => setForm((current) => ({ ...current, team: event.target.value }))}
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">No team</option>
              {teams.map((team) => (
                <option key={team._id} value={team._id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Priority</span>
            <select
              value={form.priority}
              onChange={(event) =>
                setForm((current) => ({ ...current, priority: event.target.value as Task['priority'] }))
              }
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Due date</span>
            <input
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </label>
          <button
            type="submit"
            disabled={isCreating || !form.title.trim()}
            className="inline-flex items-center justify-center gap-2 self-end rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
          >
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add task
          </button>
        </div>
        <label className="mt-4 grid gap-2">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Description</span>
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            rows={2}
            placeholder="Add acceptance criteria, meeting context, or AI-generated action-item details"
            className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </label>
      </form>

      {isLoading ? (
        <div className="flex min-h-80 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 dark:border-gray-800 dark:bg-gray-900">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading task board
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-4">
          {columns.map((column) => {
            const Icon = column.icon;
            return (
              <div
                key={column.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDrop(event, column.id)}
                className="min-h-[560px] rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <h2 className="font-bold text-gray-900 dark:text-white">{column.title}</h2>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                    {tasksByStatus[column.id].length}
                  </span>
                </div>

                <div className="space-y-3">
                  {tasksByStatus[column.id].map((task) => (
                    <article
                      key={task._id}
                      draggable
                      onDragStart={(event) => handleDragStart(event, task._id)}
                      className="cursor-grab rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <h3 className="font-semibold leading-snug text-gray-900 dark:text-white">{task.title}</h3>
                        <Flag className={`h-4 w-4 shrink-0 ${getPriorityColor(task.priority)}`} />
                      </div>
                      {task.description && (
                        <p className="line-clamp-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                          {task.description}
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-full bg-gray-100 px-2.5 py-1 font-semibold ${getPriorityColor(task.priority)} dark:bg-gray-800`}>
                          {task.priority}
                        </span>
                        {task.dueDate && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
                        <p className="text-xs text-gray-500">
                          {task.assignee
                            ? getFullName(task.assignee.firstName, task.assignee.lastName)
                            : 'Unassigned'}
                        </p>
                        {task.status !== 'done' && (
                          <button
                            type="button"
                            onClick={() => void completeTask(task._id)}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
