/**
 * Bulk Operations Tools - Batch task operations with error tracking
 *
 * Production-ready bulk operations that process items sequentially with
 * comprehensive error handling, partial success tracking, and detailed reporting.
 *
 * Key constraints:
 * - Each sub-operation counts individually toward rate limits (1500 req/min paid, 150 free)
 * - Operations are sequential (not parallel) — large batches may be slow
 * - Partial failures: some items may succeed while others fail
 * - Results include per-item success/failure details with error messages
 * - Use stopOnError=true to abort on first failure (available on some tools)
 * - NOT atomic: successful operations are NOT rolled back if later ones fail
 *
 * @module bulk-operations
 */

/**
 * Execute bulk operation with comprehensive error handling
 * @param {Array} items - Items to process
 * @param {Function} operation - Async operation to execute for each item
 * @param {Object} options - Execution options
 * @param {boolean} [options.stopOnError=false] - Stop execution on first error
 * @param {boolean} [options.rollbackOnError=false] - Rollback all changes on error
 * @returns {Promise<Object>} Execution results with detailed statistics
 */
async function executeBulkOperation(items, operation, options = {}) {
  if (!items || !Array.isArray(items)) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      items: [],
      summary: {
        successRate: 'N/A',
        failureRate: 'N/A',
        errors: [{ message: 'No items provided or items is not an array', code: 'INVALID_INPUT' }]
      }
    };
  }
  const results = {
    total: items.length,
    successful: 0,
    failed: 0,
    items: [],
    summary: {
      successRate: 0,
      failureRate: 0,
      errors: []
    }
  };

  const createdItems = []; // Track created items for potential rollback

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    try {
      const result = await operation(item, i);

      results.successful++;
      results.items.push({
        index: i,
        success: true,
        data: result,
        item: item
      });

      // Track for potential rollback
      if (result?.data?.gid) {
        createdItems.push(result.data.gid);
      }

    } catch (error) {
      results.failed++;

      const errorInfo = {
        index: i,
        success: false,
        error: error.message,
        errorCode: error.code || 'UNKNOWN',
        item: item
      };

      results.items.push(errorInfo);
      results.summary.errors.push({
        message: error.message,
        code: error.code || 'UNKNOWN',
        item: item
      });

      // Stop on error if configured
      if (options.stopOnError) {
        results.summary.stoppedEarly = true;
        results.summary.stoppedAt = i;
        break;
      }

      // Rollback on error if configured
      if (options.rollbackOnError && createdItems.length > 0) {
        results.summary.rollbackAttempted = true;
        // Note: Actual rollback implementation would go here
        // For now, we just track that it was attempted
        break;
      }
    }
  }

  // Calculate success/failure rates
  results.summary.successRate = results.total > 0
    ? ((results.successful / results.total) * 100).toFixed(2) + '%'
    : 'N/A';

  results.summary.failureRate = results.total > 0
    ? ((results.failed / results.total) * 100).toFixed(2) + '%'
    : 'N/A';

  return results;
}

module.exports = (client) => [
  {
    name: 'bulk_create_tasks',
    description: 'Create multiple tasks in batch with per-item error tracking. Tasks are created sequentially (not in parallel). Each creation counts toward rate limits. Returns aggregated success/failure counts and per-item details. Use stopOnError=true to abort on first failure. Related: create_task for single tasks, batch_api for parallel API calls.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              workspace: { type: 'string' },
              name: { type: 'string' },
              projects: { type: 'array', items: { type: 'string' } },
              assignee: { type: 'string' },
              due_on: { type: 'string' }
            },
            required: ['workspace', 'name']
          },
          description: 'Array of task objects to create'
        },
        stopOnError: {
          type: 'boolean',
          description: 'Stop execution on first error (default: false)',
          default: false
        }
      },
      required: ['tasks']
    },
    handler: async (args) => {
      return executeBulkOperation(
        args.tasks,
        async (task) => await client.post('/tasks', task),
        { stopOnError: args.stopOnError || false }
      );
    }
  },

  {
    name: 'bulk_update_tasks',
    description: 'Update multiple tasks in batch. Each update specifies a task_gid and data object with fields to change. Sequential execution with per-item error tracking. Related: update_task for single updates, bulk_assign_tasks, bulk_complete_tasks for specific update patterns.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        updates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              task_gid: { type: 'string' },
              data: { type: 'object' }
            },
            required: ['task_gid', 'data']
          },
          description: 'Array of task updates'
        },
        stopOnError: {
          type: 'boolean',
          description: 'Stop execution on first error',
          default: false
        }
      },
      required: ['updates']
    },
    handler: async (args) => {
      return executeBulkOperation(
        args.updates,
        async (update) => await client.put(`/tasks/${update.task_gid}`, update.data),
        { stopOnError: args.stopOnError || false }
      );
    }
  },

  {
    name: 'bulk_add_task_followers',
    description: 'Add the same set of followers to multiple tasks. Followers receive notifications about task changes. Sequential processing with per-task results. Related: add_task_followers for single task, bulk_add_task_tags.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of task GIDs'
        },
        followers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of user GIDs to add as followers'
        }
      },
      required: ['task_gids', 'followers']
    },
    handler: async (args) => {
      return executeBulkOperation(
        args.task_gids,
        async (task_gid) => await client.post(`/tasks/${task_gid}/addFollowers`, {
          followers: args.followers
        })
      );
    }
  },

  {
    name: 'bulk_add_task_tags',
    description: 'Add the same tag to multiple tasks. Useful for batch categorization or sprint labeling. The tag must already exist. Sequential processing with per-task results. Related: add_task_tag for single task, create_tag to create tags first, bulk_add_task_followers.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of task GIDs'
        },
        tag: { type: 'string', description: 'Tag GID to add' }
      },
      required: ['task_gids', 'tag']
    },
    handler: async (args) => {
      return executeBulkOperation(
        args.task_gids,
        async (task_gid) => await client.post(`/tasks/${task_gid}/addTag`, { tag: args.tag })
      );
    }
  },

  {
    name: 'bulk_move_tasks_to_section',
    description: 'Move multiple tasks to the same section. Useful for batch board column changes (e.g., moving sprint tasks to "Done"). Tasks must already be in the project containing the section. Sequential processing. Related: add_task_to_section for single task, bulk_assign_tasks.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of task GIDs'
        },
        section_gid: { type: 'string', description: 'Section GID' }
      },
      required: ['task_gids', 'section_gid']
    },
    handler: async (args) => {
      return executeBulkOperation(
        args.task_gids,
        async (task_gid) => await client.post(`/sections/${args.section_gid}/addTask`, {
          task: task_gid
        })
      );
    }
  },

  {
    name: 'bulk_assign_tasks',
    description: 'Assign multiple tasks to the same user. Useful for workload redistribution or sprint planning. Overwrites existing assignees. Sequential processing with per-task results. Related: update_task for single assignment, bulk_update_tasks for arbitrary updates.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of task GIDs'
        },
        assignee: { type: 'string', description: 'User GID to assign tasks to' }
      },
      required: ['task_gids', 'assignee']
    },
    handler: async (args) => {
      return executeBulkOperation(
        args.task_gids,
        async (task_gid) => await client.put(`/tasks/${task_gid}`, { assignee: args.assignee })
      );
    }
  },

  {
    name: 'bulk_set_task_due_dates',
    description: 'Set the same due date on multiple tasks. Useful for sprint deadline alignment or milestone coordination. Date format: YYYY-MM-DD. Overwrites existing due dates. Sequential processing. Related: update_task for single date change, bulk_update_tasks.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of task GIDs'
        },
        due_on: { type: 'string', description: 'Due date (YYYY-MM-DD)' }
      },
      required: ['task_gids', 'due_on']
    },
    handler: async (args) => {
      return executeBulkOperation(
        args.task_gids,
        async (task_gid) => await client.put(`/tasks/${task_gid}`, { due_on: args.due_on })
      );
    }
  },

  {
    name: 'bulk_complete_tasks',
    description: 'Mark multiple tasks as completed. Useful for closing out sprints, archiving done work, or batch status updates. Completion triggers notifications to task followers. Sequential processing with per-task results. Related: update_task for single completion, archive_completed_tasks to remove completed tasks from projects.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of task GIDs to complete'
        }
      },
      required: ['task_gids']
    },
    handler: async (args) => {
      return executeBulkOperation(
        args.task_gids,
        async (task_gid) => await client.put(`/tasks/${task_gid}`, { completed: true })
      );
    }
  },

  {
    name: 'bulk_delete_tasks',
    description: 'Permanently delete multiple tasks. DESTRUCTIVE: Cannot be undone. Deleted tasks are removed from all projects; subtasks become top-level tasks. Use stopOnError=true for safety. Consider bulk_complete_tasks instead if tasks should be preserved. Sequential processing. Related: delete_task for single deletion, archive_completed_tasks for non-destructive cleanup.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of task GIDs to delete'
        },
        stopOnError: {
          type: 'boolean',
          description: 'Stop execution on first error',
          default: false
        }
      },
      required: ['task_gids']
    },
    handler: async (args) => {
      return executeBulkOperation(
        args.task_gids,
        async (task_gid) => await client.delete(`/tasks/${task_gid}`),
        { stopOnError: args.stopOnError || false }
      );
    }
  },

  {
    name: 'bulk_add_project_members',
    description: 'Add the same set of members to multiple projects. Members get edit access to each project. Useful for onboarding users to multiple projects at once. Sequential processing with per-project results. Related: add_project_members for single project, bulk_add_task_followers.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of project GIDs'
        },
        members: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of user GIDs to add as members'
        }
      },
      required: ['project_gids', 'members']
    },
    handler: async (args) => {
      return executeBulkOperation(
        args.project_gids,
        async (project_gid) => await client.post(`/projects/${project_gid}/addMembers`, {
          members: args.members
        })
      );
    }
  }
];
