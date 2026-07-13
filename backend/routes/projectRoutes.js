const express = require('express');
const { body } = require('express-validator');
const {
  createProject,
  getMyProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMember,
  updateMemberRole,
  removeMember,
} = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');
const { loadProjectAndMembership, requireProjectRole } = require('../middleware/projectAccess');
const taskRouter = require('./taskRoutes');

const router = express.Router();

router.use(protect);

router.post(
  '/',
  [body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Project name must be 2-100 characters')],
  createProject
);
router.get('/', getMyProjects);

// Any route below deals with one specific project -> load it + check membership first
router.use('/:id', loadProjectAndMembership);

router.get('/:id', getProjectById);
router.put(
  '/:id',
  requireProjectRole('admin'),
  [body('name').optional().trim().isLength({ min: 2, max: 100 })],
  updateProject
);
router.delete('/:id', requireProjectRole('admin'), deleteProject);

router.post('/:id/members', requireProjectRole('admin'), addMember);
router.patch('/:id/members/:userId', requireProjectRole('admin'), updateMemberRole);
router.delete('/:id/members/:userId', requireProjectRole('admin'), removeMember);

// Nested task routes: /api/projects/:id/tasks
router.use('/:id/tasks', taskRouter.nested);

module.exports = router;
