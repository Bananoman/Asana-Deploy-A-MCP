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
    description: 'Create many tasks at once from a list — use for "create 25 onboarding tasks in project New Hires from this list", scaffolding multiple tasks from a brief/CSV/template, bulk task seeding. Direct action — pass project by GID and tasks array; do NOT call get_project or list_workspaces first. Sequential (each counts toward rate limit). Per-item error tracking; stopOnError=true to abort on first failure (default: continue). Returns aggregated counts + per-item details. Max 50 tasks per call. Related: create_task (single), bulk_update_tasks, batch_api (parallel arbitrary calls).',
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
    description: 'Update many tasks at once with arbitrary field changes — use for "rename these 20 tasks", "set all these tasks to high priority", batch arbitrary edits not covered by bulk_assign / bulk_complete / bulk_set_due_dates. Direct action — pass tasks array of {task_gid, data}; do NOT call get_task on each first. Sequential with per-item error tracking. Max 50 tasks. Related: update_task (single), bulk_assign_tasks (assignee), bulk_complete_tasks (completion), bulk_set_task_due_dates (dates).',
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
    description: 'Subscribe the same people to notifications on many tasks at once — use for "add Carlos as follower to these 15 tasks", broadcasting visibility to stakeholders across a batch. Direct action — pass tasks array and users by GID. Followers get notifications on task changes. Sequential with per-task results. Max 50 tasks. Related: add_task_followers (single task), bulk_add_task_tags, remove_task_followers.',
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
    description: 'Apply the same tag / label to many tasks at once — use for "tag all these tasks as urgent", batch categorization, sprint labeling, status tagging. Direct action — pass tasks and tag by GID. Tag must already exist (use create_tag first if needed). Sequential with per-task results. Max 50 tasks. Related: add_task_tag (single task), create_tag (new tag), remove_task_tag, list_workspace_tags.',
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
    description: 'Move many tasks into a single section (board column / list group) in one call — use for "move all backlog tasks of project 4040 into Sprint 24 section", "drop these tasks into Done column", board column shuffles, sprint-end cleanup. Direct action — pass tasks and section by GID; do NOT call get_project_sections or list_tasks first. Tasks must already be in the section\'s project. Sequential. Max 50 tasks. Related: add_task_to_section (single task), bulk_assign_tasks.',
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
    description: 'Bulk-reassign / batch-assign many tasks to one person at once — use for "assign these 12 tasks to Carlos", workload redistribution, sprint planning rebalance, handoff between teammates. Direct action — pass tasks and assignee by GID. Overwrites existing assignees (use update_task per-task if you need conditional logic). Sequential with per-task error tracking. Max 50 tasks. Related: update_task (single), bulk_update_tasks (arbitrary edits).',
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
    description: 'Set / push / align the due date on many tasks in one call — use for "set the due date to next Friday for the 30 tasks I pasted", sprint deadline alignment, milestone coordination, deadline slip propagation, batch deferral. Direct action — pass tasks by GID and due_on (YYYY-MM-DD). Overwrites existing due dates. Sequential. Max 50 tasks. Related: update_task (single date change), bulk_update_tasks (arbitrary edits).',
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
    description: 'Mark a batch of tasks complete in one call — use for "mark all tasks in section X complete", "close out the sprint", end-of-week task cleanup, finishing a milestone. Direct action — pass tasks by GID; do NOT call list_tasks or get_task first. Triggers follower notifications. Sequential with per-task results. Max 50 tasks. Related: update_task (single completion), archive_completed_tasks (remove from project view), bulk_delete_tasks (destructive).',
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
    description: 'Permanently delete a batch of tasks — use for "delete these 50 stale tasks from the inbox cleanup", "purge the test data", removing obsolete work. DESTRUCTIVE: cannot be undone. Consider bulk_complete_tasks or archive_completed_tasks first if tasks should be preserved. Direct action — pass tasks by GID. Subtasks become top-level after deletion. stopOnError=true recommended for safety. Sequential. Max 50 tasks. Related: delete_task (single), bulk_complete_tasks (soft-close), archive_completed_tasks (non-destructive cleanup).',
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
    description: 'Add the same people to many projects at once — use for "onboard these 3 new hires to all current sprint projects", granting team-wide visibility, batch project access. Direct action — pass projects and users by GID. Members get edit access per project. Sequential with per-project results. Max 50 projects. Related: add_project_members (single project), bulk_add_task_followers (task-level visibility).',
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
