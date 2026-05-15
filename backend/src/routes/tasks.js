const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createTask,
  getTask,
  getTasks,
  updateTask,
  completeTask,
  addSubtask,
  completeSubtask,
  addWatcher,
  deleteTask,
} = require('../controllers/taskController');

// ────────────────────────────────────────────────────────
// PROTECTED ROUTES - All require authentication
// ────────────────────────────────────────────────────────

/**
 * @route  POST /api/tasks
 * @desc   Create new task
 * @access Protected
 */
router.post('/', protect, createTask);

/**
 * @route  GET /api/tasks
 * @desc   Get tasks (filtered)
 * @access Protected
 * @query  status, priority, assignee, team, sort, page, limit
 */
router.get('/', protect, getTasks);

/**
 * @route  GET /api/tasks/:taskId
 * @desc   Get task by ID
 * @access Protected
 */
router.get('/:taskId', protect, getTask);

/**
 * @route  PUT /api/tasks/:taskId
 * @desc   Update task
 * @access Protected (reporter/assignee only)
 */
router.put('/:taskId', protect, updateTask);

/**
 * @route  PATCH /api/tasks/:taskId/complete
 * @desc   Mark task as complete
 * @access Protected
 */
router.patch('/:taskId/complete', protect, completeTask);

/**
 * @route  POST /api/tasks/:taskId/subtasks
 * @desc   Add subtask
 * @access Protected
 */
router.post('/:taskId/subtasks', protect, addSubtask);

/**
 * @route  PATCH /api/tasks/:taskId/subtasks/:subtaskIndex/complete
 * @desc   Complete subtask
 * @access Protected
 */
router.patch('/:taskId/subtasks/:subtaskIndex/complete', protect, completeSubtask);

/**
 * @route  POST /api/tasks/:taskId/watchers
 * @desc   Add watcher to task
 * @access Protected
 */
router.post('/:taskId/watchers', protect, addWatcher);

/**
 * @route  DELETE /api/tasks/:taskId
 * @desc   Delete task
 * @access Protected (reporter only)
 */
router.delete('/:taskId', protect, deleteTask);

module.exports = router;
