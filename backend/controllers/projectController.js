const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');

// @desc    Create a project (creator becomes admin member automatically)
// @route   POST /api/projects
// @access  Private
const createProject = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array().map((e) => e.msg).join(', '));
  }

  const { name, description } = req.body;

  const project = await Project.create({
    name,
    description,
    owner: req.user._id,
    members: [{ user: req.user._id, role: 'admin' }],
  });

  res.status(201).json({ success: true, data: project });
});

// @desc    Get all projects the logged-in user belongs to
// @route   GET /api/projects
// @access  Private
const getMyProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({ 'members.user': req.user._id })
    .populate('owner', 'name email')
    .populate('members.user', 'name email')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: projects.length, data: projects });
});

// @desc    Get single project (must be a member)
// @route   GET /api/projects/:id
// @access  Private (member)
const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.project._id)
    .populate('owner', 'name email')
    .populate('members.user', 'name email');

  res.json({ success: true, data: project });
});

// @desc    Update project details
// @route   PUT /api/projects/:id
// @access  Private (project admin)
const updateProject = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array().map((e) => e.msg).join(', '));
  }

  const { name, description } = req.body;
  if (name !== undefined) req.project.name = name;
  if (description !== undefined) req.project.description = description;

  await req.project.save();
  res.json({ success: true, data: req.project });
});

// @desc    Delete a project and its tasks
// @route   DELETE /api/projects/:id
// @access  Private (project admin)
const deleteProject = asyncHandler(async (req, res) => {
  await Task.deleteMany({ project: req.project._id });
  await req.project.deleteOne();
  res.json({ success: true, message: 'Project and its tasks deleted' });
});

// @desc    Add a member to the project by email
// @route   POST /api/projects/:id/members
// @access  Private (project admin)
const addMember = asyncHandler(async (req, res) => {
  const { email, role } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Email is required to add a member');
  }

  const userToAdd = await User.findOne({ email: email.toLowerCase() });
  if (!userToAdd) {
    res.status(404);
    throw new Error('No user found with that email');
  }

  const alreadyMember = req.project.members.some(
    (m) => m.user.toString() === userToAdd._id.toString()
  );
  if (alreadyMember) {
    res.status(409);
    throw new Error('User is already a member of this project');
  }

  req.project.members.push({
    user: userToAdd._id,
    role: role === 'admin' ? 'admin' : 'member',
  });
  await req.project.save();

  const populated = await req.project.populate('members.user', 'name email');
  res.status(201).json({ success: true, data: populated.members });
});

// @desc    Change a member's role (admin/member)
// @route   PATCH /api/projects/:id/members/:userId
// @access  Private (project admin)
const updateMemberRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) {
    res.status(400);
    throw new Error("Role must be 'admin' or 'member'");
  }

  const member = req.project.members.find(
    (m) => m.user.toString() === req.params.userId
  );
  if (!member) {
    res.status(404);
    throw new Error('That user is not a member of this project');
  }

  if (
    member.user.toString() === req.project.owner.toString() &&
    role !== 'admin'
  ) {
    res.status(400);
    throw new Error("The project owner's role cannot be downgraded");
  }

  member.role = role;
  await req.project.save();
  res.json({ success: true, data: req.project.members });
});

// @desc    Remove a member from the project
// @route   DELETE /api/projects/:id/members/:userId
// @access  Private (project admin)
const removeMember = asyncHandler(async (req, res) => {
  if (req.params.userId === req.project.owner.toString()) {
    res.status(400);
    throw new Error('The project owner cannot be removed');
  }

  req.project.members = req.project.members.filter(
    (m) => m.user.toString() !== req.params.userId
  );
  await req.project.save();

  // Unassign tasks that were assigned to the removed member
  await Task.updateMany(
    { project: req.project._id, assignedTo: req.params.userId },
    { $set: { assignedTo: null } }
  );

  res.json({ success: true, data: req.project.members });
});

module.exports = {
  createProject,
  getMyProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMember,
  updateMemberRole,
  removeMember,
};
