const asyncHandler = require('../utils/asyncHandler');
const Task = require('../models/Task');
const logger = require('../utils/logger');

// ────────────────────────────────────────────────────────
// CREATE TASK
// ────────────────────────────────────────────────────────

exports.createTask = asyncHandler(async (req, res) => {
  const { title, description, priority, dueDate, assignee, team, project } = req.body;

  if (!title) {
    const error = new Error('Task title is required');
    error.statusCode = 400;
    throw error;
  }

  const task = await Task.create({
    title: title.trim(),
    description: description || '',
    priority: priority || 'medium',
    dueDate,
    assignee,
    team,
    project,
    reporter: req.user.id,
  });

  await task.populate('assignee', 'firstName lastName avatar');
  await task.populate('reporter', 'firstName lastName avatar');

  logger.info(`Task created: ${task.title} by ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    data: { task },
  });
});

// ────────────────────────────────────────────────────────
// GET TASK BY ID
// ────────────────────────────────────────────────────────

exports.getTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const task = await Task.findById(taskId)
    .populate('assignee', 'firstName lastName avatar')
    .populate('reporter', 'firstName lastName avatar')
    .populate('watchers', 'firstName lastName avatar')
    .populate('team', 'name');

  if (!task) {
    const error = new Error('Task not found');
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    message: 'Task fetched successfully',
    data: { task },
  });
});

// ────────────────────────────────────────────────────────
// GET TASKS (Filtered)
// ────────────────────────────────────────────────────────

exports.getTasks = asyncHandler(async (req, res) => {
  const { status, priority, assignee, team, sort = '-createdAt', page = 1, limit = 20 } = req.query;

  const filter = {};

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assignee) filter.assignee = assignee;
  if (team) filter.team = team;

  const skip = (page - 1) * limit;

  const tasks = await Task.find(filter)
    .populate('assignee', 'firstName lastName avatar')
    .populate('reporter', 'firstName lastName avatar')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Task.countDocuments(filter);

  res.status(200).json({
    success: true,
    message: 'Tasks fetched successfully',
    data: {
      tasks,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// ────────────────────────────────────────────────────────
// UPDATE TASK
// ────────────────────────────────────────────────────────

exports.updateTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { title, description, status, priority, dueDate, assignee } = req.body;

  const task = await Task.findById(taskId);

  if (!task) {
    const error = new Error('Task not found');
    error.statusCode = 404;
    throw error;
  }

  // Check authorization (reporter or assignee can update)
  if (task.reporter.toString() !== req.user.id && task.assignee?.toString() !== req.user.id) {
    const error = new Error('Not authorized to update this task');
    error.statusCode = 403;
    throw error;
  }

  // Update fields
  if (title) task.title = title.trim();
  if (description !== undefined) task.description = description;
  if (status) task.status = status;
  if (priority) task.priority = priority;
  if (dueDate) task.dueDate = dueDate;
  if (assignee) task.assignee = assignee;

  // Add activity log entry
  task.activityLog.push({
    action: 'updated',
    userId: req.user.id,
    changes: { title, status, priority },
    timestamp: new Date(),
  });

  await task.save();

  logger.info(`Task updated: ${task.title}`);

  res.status(200).json({
    success: true,
    message: 'Task updated successfully',
    data: { task },
  });
});

// ────────────────────────────────────────────────────────
// COMPLETE TASK
// ────────────────────────────────────────────────────────

exports.completeTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const task = await Task.findById(taskId);

  if (!task) {
    const error = new Error('Task not found');
    error.statusCode = 404;
    throw error;
  }

  task.status = 'done';
  task.completedAt = new Date();

  task.activityLog.push({
    action: 'completed',
    userId: req.user.id,
    timestamp: new Date(),
  });

  await task.save();

  logger.info(`Task completed: ${task.title}`);

  res.status(200).json({
    success: true,
    message: 'Task marked as completed',
    data: { task },
  });
});

// ────────────────────────────────────────────────────────
// ADD SUBTASK
// ────────────────────────────────────────────────────────

exports.addSubtask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { title } = req.body;

  const task = await Task.findById(taskId);

  if (!task) {
    const error = new Error('Task not found');
    error.statusCode = 404;
    throw error;
  }

  task.subtasks.push({
    title: title.trim(),
    completed: false,
  });

  await task.save();

  res.status(200).json({
    success: true,
    message: 'Subtask added successfully',
    data: { task },
  });
});

// ────────────────────────────────────────────────────────
// COMPLETE SUBTASK
// ────────────────────────────────────────────────────────

exports.completeSubtask = asyncHandler(async (req, res) => {
  const { taskId, subtaskIndex } = req.params;

  const task = await Task.findById(taskId);

  if (!task) {
    const error = new Error('Task not found');
    error.statusCode = 404;
    throw error;
  }

  const subtask = task.subtasks[subtaskIndex];
  if (!subtask) {
    const error = new Error('Subtask not found');
    error.statusCode = 404;
    throw error;
  }

  subtask.completed = true;
  subtask.completedAt = new Date();

  await task.save();

  res.status(200).json({
    success: true,
    message: 'Subtask completed',
    data: { task },
  });
});

// ────────────────────────────────────────────────────────
// ADD WATCHER
// ────────────────────────────────────────────────────────

exports.addWatcher = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { userId } = req.body;

  const task = await Task.findById(taskId);

  if (!task) {
    const error = new Error('Task not found');
    error.statusCode = 404;
    throw error;
  }

  if (!task.watchers.includes(userId)) {
    task.watchers.push(userId);
    await task.save();
  }

  res.status(200).json({
    success: true,
    message: 'Watcher added',
    data: { task },
  });
});

// ────────────────────────────────────────────────────────
// DELETE TASK
// ────────────────────────────────────────────────────────

exports.deleteTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const task = await Task.findById(taskId);

  if (!task) {
    const error = new Error('Task not found');
    error.statusCode = 404;
    throw error;
  }

  // Check authorization (reporter can delete)
  if (task.reporter.toString() !== req.user.id) {
    const error = new Error('Not authorized to delete this task');
    error.statusCode = 403;
    throw error;
  }

  await Task.findByIdAndDelete(taskId);

  logger.info(`Task deleted: ${task.title}`);

  res.status(200).json({
    success: true,
    message: 'Task deleted successfully',
  });
});

module.exports = {
  createTask: exports.createTask,
  getTask: exports.getTask,
  getTasks: exports.getTasks,
  updateTask: exports.updateTask,
  completeTask: exports.completeTask,
  addSubtask: exports.addSubtask,
  completeSubtask: exports.completeSubtask,
  addWatcher: exports.addWatcher,
  deleteTask: exports.deleteTask,
};
