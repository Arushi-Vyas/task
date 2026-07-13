const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');

// @desc    Create a task within a project
// @route   POST /api/projects/:projectId/tasks
// @access  Private (project member; admin can assign to anyone, member can assign to self)
const createTask = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array().map((e) => e.msg).join(', '));
  }

  const { title, description, assignedTo, priority, dueDate } = req.body;

  if (assignedTo) {
    const isMember = req.project.members.some(
      (m) => m.user.toString() === assignedTo
    );
    if (!isMember) {
      res.status(400);
      throw new Error('Cannot assign task to a user who is not a project member');
    }
    // Members may only assign tasks to themselves; admins may assign to anyone
    if (req.membership.role !== 'admin' && assignedTo !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Only project admins can assign tasks to other members');
    }
  }

  const task = await Task.create({
    title,
    description,
    project: req.project._id,
    assignedTo: assignedTo || null,
    createdBy: req.user._id,
    priority,
    dueDate,
  });

  const populated = await task.populate('assignedTo', 'name email');
  res.status(201).json({ success: true, data: populated });
});

// @desc    Get all tasks for a project, optionally filtered
// @route   GET /api/projects/:projectId/tasks?status=&assignedTo=&overdue=true
// @access  Private (project member)
const getProjectTasks = asyncHandler(async (req, res) => {
  const filter = { project: req.project._id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

  let tasks = await Task.find(filter)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  if (req.query.overdue === 'true') {
    tasks = tasks.filter((t) => t.isOverdue);
  }

  res.json({ success: true, count: tasks.length, data: tasks });
});

// Helper to load a task and confirm the requester belongs to its project
const loadTaskWithAccess = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  const project = await Project.findById(task.project);
  const membership = project?.members.find(
    (m) => m.user.toString() === req.user._id.toString()
  );
  if (!project || !membership) {
    res.status(403);
    throw new Error('You do not have access to this task');
  }
  req.task = task;
  req.project = project;
  req.membership = membership;
  next();
});

// @desc    Get a single task
// @route   GET /api/tasks/:id
// @access  Private (project member)
const getTaskById = asyncHandler(async (req, res) => {
  const populated = await req.task.populate([
    { path: 'assignedTo', select: 'name email' },
    { path: 'createdBy', select: 'name email' },
  ]);
  res.json({ success: true, data: populated });
});

// @desc    Update a task (title/description/priority/dueDate/assignment)
// @route   PUT /api/tasks/:id
// @access  Private (admin, or the creator, or the assignee for limited fields)
const updateTask = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array().map((e) => e.msg).join(', '));
  }

  const isAdmin = req.membership.role === 'admin';
  const isCreator = req.task.createdBy.toString() === req.user._id.toString();
  const isAssignee = req.task.assignedTo?.toString() === req.user._id.toString();

  if (!isAdmin && !isCreator && !isAssignee) {
    res.status(403);
    throw new Error('You do not have permission to update this task');
  }

  const { title, description, priority, dueDate, assignedTo } = req.body;

  // Only admins/creators can reassign or edit core fields; assignees can only
  // touch status (handled in a separate endpoint) so block field edits here.
  if (!isAdmin && !isCreator) {
    res.status(403);
    throw new Error('Only the task creator or a project admin can edit these fields');
  }

  if (assignedTo !== undefined) {
    if (assignedTo) {
      const isMember = req.project.members.some(
        (m) => m.user.toString() === assignedTo
      );
      if (!isMember) {
        res.status(400);
        throw new Error('Cannot assign task to a user who is not a project member');
      }
    }
    req.task.assignedTo = assignedTo || null;
  }

  if (title !== undefined) req.task.title = title;
  if (description !== undefined) req.task.description = description;
  if (priority !== undefined) req.task.priority = priority;
  if (dueDate !== undefined) req.task.dueDate = dueDate;

  await req.task.save();
  const populated = await req.task.populate('assignedTo', 'name email');
  res.json({ success: true, data: populated });
});

// @desc    Update just the status of a task (any member can move their own task)
// @route   PATCH /api/tasks/:id/status
// @access  Private (admin, creator, or assignee)
const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['todo', 'in-progress', 'done'].includes(status)) {
    res.status(400);
    throw new Error("Status must be one of: todo, in-progress, done");
  }

  const isAdmin = req.membership.role === 'admin';
  const isCreator = req.task.createdBy.toString() === req.user._id.toString();
  const isAssignee = req.task.assignedTo?.toString() === req.user._id.toString();

  if (!isAdmin && !isCreator && !isAssignee) {
    res.status(403);
    throw new Error('You do not have permission to update this task status');
  }

  req.task.status = status;
  await req.task.save();
  res.json({ success: true, data: req.task });
});

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private (project admin or task creator)
const deleteTask = asyncHandler(async (req, res) => {
  const isAdmin = req.membership.role === 'admin';
  const isCreator = req.task.createdBy.toString() === req.user._id.toString();

  if (!isAdmin && !isCreator) {
    res.status(403);
    throw new Error('Only the task creator or a project admin can delete this task');
  }

  await req.task.deleteOne();
  res.json({ success: true, message: 'Task deleted' });
});

// @desc    Dashboard summary across all of the user's projects
// @route   GET /api/tasks/dashboard
// @access  Private
const getDashboard = asyncHandler(async (req, res) => {
  const projects = await Project.find({ 'members.user': req.user._id }).select('_id name');
  const projectIds = projects.map((p) => p._id);

  const tasks = await Task.find({ project: { $in: projectIds } })
    .populate('assignedTo', 'name email')
    .populate('project', 'name');

  const now = Date.now();
  const summary = {
    totalTasks: tasks.length,
    byStatus: { todo: 0, 'in-progress': 0, done: 0 },
    overdue: [],
    assignedToMe: [],
  };

  tasks.forEach((t) => {
    summary.byStatus[t.status] = (summary.byStatus[t.status] || 0) + 1;
    if (t.dueDate && t.status !== 'done' && t.dueDate.getTime() < now) {
      summary.overdue.push(t);
    }
    if (t.assignedTo && t.assignedTo._id.toString() === req.user._id.toString()) {
      summary.assignedToMe.push(t);
    }
  });

  res.json({
    success: true,
    data: {
      totalProjects: projects.length,
      ...summary,
    },
  });
});

module.exports = {
  createTask,
  getProjectTasks,
  loadTaskWithAccess,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getDashboard,
};
