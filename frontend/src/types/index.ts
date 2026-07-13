export type ProjectRole = 'admin' | 'member';
export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
}

export interface Member {
  user: User;
  role: ProjectRole;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  owner: User | string;
  members: Member[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  project: string | { _id: string; name: string };
  assignedTo?: User | null;
  createdBy: User | string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  isOverdue?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardData {
  totalProjects: number;
  totalTasks: number;
  byStatus: Record<TaskStatus, number>;
  overdue: Task[];
  assignedToMe: Task[];
}
