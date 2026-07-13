'use client';

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import api, { getApiErrorMessage } from '@/lib/api';
import AppShell from '@/components/AppShell';
import { StatusBadge, PriorityBadge } from '@/components/Badge';
import { DashboardData, Project } from '@/types';

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, projRes] = await Promise.all([
        api.get('/tasks/dashboard'),
        api.get('/projects'),
      ]);
      setDashboard(dashRes.data.data);
      setProjects(projRes.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await api.post('/projects', { name: newProjectName, description: newProjectDesc });
      setNewProjectName('');
      setNewProjectDesc('');
      setShowForm(false);
      loadData();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          {showForm ? 'Cancel' : '+ New Project'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreateProject}
          className="mb-6 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Project name</label>
            <input
              required
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              placeholder="e.g. Website Redesign"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              rows={2}
              placeholder="Optional"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create project'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <>
          {dashboard && (
            <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Projects" value={dashboard.totalProjects} />
              <StatCard label="Total tasks" value={dashboard.totalTasks} />
              <StatCard label="Assigned to me" value={dashboard.assignedToMe.length} />
              <StatCard label="Overdue" value={dashboard.overdue.length} />
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h2 className="mb-3 text-lg font-semibold">Your projects</h2>
              {projects.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No projects yet. Create one to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {projects.map((p) => (
                    <Link
                      key={p._id}
                      href={`/projects/${p._id}`}
                      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-slate-900">{p.name}</h3>
                        <span className="text-xs text-slate-500">
                          {p.members.length} member{p.members.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {p.description && (
                        <p className="mt-1 line-clamp-1 text-sm text-slate-500">{p.description}</p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold">Overdue tasks</h2>
              {!dashboard || dashboard.overdue.length === 0 ? (
                <p className="text-sm text-slate-500">Nothing overdue. Nice work!</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.overdue.map((t) => (
                    <div
                      key={t._id}
                      className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-900">{t.title}</span>
                        <PriorityBadge priority={t.priority} />
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <StatusBadge status={t.status} />
                        {t.dueDate && (
                          <span className="text-xs text-red-700">
                            Due {new Date(t.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
