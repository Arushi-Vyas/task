const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Project = require('../models/Project');

// Loads the project referenced by :projectId (or :id) in the route,
// verifies the logged-in user is a member of it, and attaches
// req.project + req.membership (that user's { user, role } entry).
const loadProjectAndMembership = asyncHandler(async (req, res, next) => {
  const projectId = req.params.projectId || req.params.id;

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    res.status(400);
    throw new Error('Invalid project id');
  }

  const project = await Project.findById(projectId);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  const membership = project.members.find(
    (m) => m.user.toString() === req.user._id.toString()
  );

  if (!membership) {
    res.status(403);
    throw new Error('You are not a member of this project');
  }

  req.project = project;
  req.membership = membership;
  next();
});

// Factory: restricts a route to specific project-level roles (e.g. 'admin')
const requireProjectRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.membership) {
      res.status(500);
      throw new Error('requireProjectRole used without loadProjectAndMembership');
    }
    if (!allowedRoles.includes(req.membership.role)) {
      res.status(403);
      throw new Error(`This action requires one of these roles: ${allowedRoles.join(', ')}`);
    }
    next();
  };
};

module.exports = { loadProjectAndMembership, requireProjectRole };
