const express = require('express');
const { body } = require('express-validator');
const {
  createTask,
  getProjectTasks,
  loadTaskWithAccess,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getDashboard,
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');
const { loadProjectAndMembership } = require('../middleware/projectAccess');

// NOTE: kept as separate arrays (not reused/mutated) because express-validator
// chains are stateful - calling .optional() on a shared chain would leak
// across routes that import the same array reference.
const createTaskValidators = [
  body('title').trim().isLength({ min: 2, max: 150 }).withMessage('Title must be 2-150 characters'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('dueDate').optional().isISO8601().withMessage('dueDate must be a valid date'),
];

const updateTaskValidators = [
  body('title').optional().trim().isLength({ min: 2, max: 150 }).withMessage('Title must be 2-150 characters'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('dueDate').optional().isISO8601().withMessage('dueDate must be a valid date'),
];

// --- Nested under /api/projects/:id/tasks (mergeParams so :id is visible) ---
const nested = express.Router({ mergeParams: true });
nested.use(protect, loadProjectAndMembership);
nested.post('/', createTaskValidators, createTask);
nested.get('/', getProjectTasks);

// --- Top-level /api/tasks/... for single-task and dashboard operations ---
const router = express.Router();
router.use(protect);

router.get('/dashboard', getDashboard);

router.use('/:id', loadTaskWithAccess);
router.get('/:id', getTaskById);
router.put('/:id', updateTaskValidators, updateTask);
router.patch('/:id/status', updateTaskStatus);
router.delete('/:id', deleteTask);

module.exports = router;
module.exports.nested = nested;
