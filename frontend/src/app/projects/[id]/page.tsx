'use client';

import { useEffect, useState, FormEvent, use as usePromise } from 'react';
import api, { getApiErrorMessage } from '@/lib/api';
import AppShell from '@/components/AppShell';
import { StatusBadge, PriorityBadge, RoleBadge } from '@/components/Badge';
import { useAuth } from '@/context/AuthContext';
import { Project, Task, TaskStatus, TaskPriority } from '@/types';

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = usePromise(params);
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');

  // New task form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  // Add member form
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<'admin' | 'member'>('member');
  const [addingMember, setAddingMember] = useState(false);

  const myMembership = project?.members.find(
    (m) => (typeof m.user === 'object' ? m.user._id || m.user.id : m.user) === (user?.id || user?._id)
  );
  const isAdmin = myMembership?.role === 'admin';

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [projRes, taskRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/tasks`, {
          params: statusFilter !== 'all' ? { status: statusFilter } : {},
        }),
      ]);
      setProject(projRes.data.data);
      setTasks(taskRes.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, statusFilter]);

  const handleCreateTask = async (e: FormEvent) => {
    e.preventDefault();
    setCreatingTask(true);
    setError('');
    try {
      await api.post(`/projects/${id}/tasks`, {
        title: taskTitle,
        description: taskDesc,
        assignedTo: taskAssignee || undefined,
        priority: taskPriority,
        dueDate: taskDueDate || undefined,
      });
      setTaskTitle('');
      setTaskDesc('');
      setTaskAssignee('');
      setTaskPriority('medium');
      setTaskDueDate('');
      setShowTaskForm(false);
      loadData();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setCreatingTask(false);
    }
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status });
      loadData();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      loadData();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();
    setAddingMember(true);
    setError('');
    try {
      await api.post(`/projects/${id}/members`, { email: memberEmail, role: memberRole });
      setMemberEmail('');
      setMemberRole('member');
      setShowMemberForm(false);
      loadData();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member from the project?')) return;
    try {
      await api.delete(`/projects/${id}/members/${userId}`);
      loadData();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <AppShell>
        <p className="text-slate-500">Loading…</p>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell>
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error || 'Project not found'}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        {project.description && <p className="mt-1 text-slate-500">{project.description}</p>}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Tasks column */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Tasks</h2>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="todo">To do</option>
                <option value="in-progress">In progress</option>
                <option value="done">Done</option>
              </select>
              <button
                onClick={() => setShowTaskForm((s) => !s)}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                {showTaskForm ? 'Cancel' : '+ New Task'}
              </button>
            </div>
          </div>

          {showTaskForm && (
            <form
              onSubmit={handleCreateTask}
              className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <input
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task title"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
              <textarea
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <select
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  className="rounded-md border border-slate-300 px-2 py-2 text-sm"
                >
                  <option value="">Unassigned</option>
                  {project.members.map((m) => {
                    const u = typeof m.user === 'object' ? m.user : null;
                    if (!u) return null;
                    const uid = u._id || u.id || '';
                    // Non-admins may only assign to themselves
                    if (!isAdmin && uid !== (user?.id || user?._id)) return null;
                    return (
                      <option key={uid} value={uid}>
                        {u.name}
                      </option>
                    );
                  })}
                </select>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                  className="rounded-md border border-slate-300 px-2 py-2 text-sm"
                >
                  <option value="low">Low priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="high">High priority</option>
                </select>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="rounded-md border border-slate-300 px-2 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={creatingTask}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {creatingTask ? 'Creating…' : 'Create task'}
              </button>
            </form>
          )}

          {tasks.length === 0 ? (
            <p className="text-sm text-slate-500">No tasks match this filter.</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((t) => {
                const uid = user?.id || user?._id;
                const createdById = typeof t.createdBy === 'object' ? t.createdBy._id || t.createdBy.id : t.createdBy;
                const canManage = isAdmin || createdById === uid || t.assignedTo?._id === uid;
                return (
                  <div
                    key={t._id}
                    className={`rounded-xl border bg-white p-4 shadow-sm ${
                      t.isOverdue ? 'border-red-300' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium text-slate-900">{t.title}</h3>
                        {t.description && (
                          <p className="mt-1 text-sm text-slate-500">{t.description}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <PriorityBadge priority={t.priority} />
                        <StatusBadge status={t.status} />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <div className="flex items-center gap-3">
                        <span>{t.assignedTo ? `Assigned: ${t.assignedTo.name}` : 'Unassigned'}</span>
                        {t.dueDate && (
                          <span className={t.isOverdue ? 'font-medium text-red-600' : ''}>
                            Due {new Date(t.dueDate).toLocaleDateString()}
                            {t.isOverdue ? ' (overdue)' : ''}
                          </span>
                        )}
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-2">
                          <select
                            value={t.status}
                            onChange={(e) => handleStatusChange(t._id, e.target.value as TaskStatus)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                          >
                            <option value="todo">To do</option>
                            <option value="in-progress">In progress</option>
                            <option value="done">Done</option>
                          </select>
                          <button
                            onClick={() => handleDeleteTask(t._id)}
                            className="text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Members column */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Members</h2>
            {isAdmin && (
              <button
                onClick={() => setShowMemberForm((s) => !s)}
                className="text-sm font-medium text-slate-900 hover:underline"
              >
                {showMemberForm ? 'Cancel' : '+ Add'}
              </button>
            )}
          </div>

          {showMemberForm && (
            <form
              onSubmit={handleAddMember}
              className="mb-4 space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <input
                required
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="Member's email"
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value as 'admin' | 'member')}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={addingMember}
                className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {addingMember ? 'Adding…' : 'Add member'}
              </button>
            </form>
          )}

          <div className="space-y-2">
            {project.members.map((m) => {
              const u = typeof m.user === 'object' ? m.user : null;
              if (!u) return null;
              const uid = u._id || u.id || '';
              const isOwner = typeof project.owner === 'object' ? project.owner._id === uid : project.owner === uid;
              return (
                <div
                  key={uid}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {u.name} {isOwner && <span className="text-xs text-slate-400">(owner)</span>}
                    </p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <RoleBadge role={m.role} />
                    {isAdmin && !isOwner && (
                      <button
                        onClick={() => handleRemoveMember(uid)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
