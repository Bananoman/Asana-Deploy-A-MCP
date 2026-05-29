/**
 * Composite Operations - Multi-step convenience operations
 *
 * These tools combine multiple API calls into single operations for common workflows.
 * They execute sequentially and handle intermediate results automatically.
 *
 * Key constraints:
 * - Each sub-operation counts toward rate limits individually
 * - Partial failures are possible — some operations may succeed while others fail
 * - Not atomic: if a later step fails, earlier steps are NOT rolled back
 * - For large projects (50,000+ tasks), operations may be slow due to sequential processing
 *
 * NOT possible via API (use Asana UI instead):
 * - Creating forms or intake workflows
 * - Setting up dashboard charts
 * - Configuring AI-powered automation rules
 *
 * @module composite-operations
 */
const { coerceStringArray } = require('../../core/coerce');

module.exports = (client) => [
  {
    name: 'create_project_with_structure',
    description: 'Create a project AND its sections in one call — use when the user names a project plus sections/columns ("create project Edenred Onboarding as a board with sections Discovery, Build, UAT, Live"). Direct action — do NOT call get_current_user, list_workspaces, or list_teams first. Pass workspace by GID (team optional but recommended in organizations). Creates project then sections sequentially. Related: create_project (no sections), create_section (add to existing), setup_project_workflow (predefined templates: scrum/kanban/standard), clone_project_structure (copy sections from existing).',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID' },
        name: { type: 'string', description: 'Project name' },
        sections: {
          type: 'array',
          items: { type: 'string' },
          description: 'Section names to create'
        },
        team: { type: 'string', description: 'Team GID' }
      },
      required: ['workspace', 'name']
    },
    handler: async (args) => {
      // Create project
      const project = await client.post('/projects', {
        workspace: args.workspace,
        name: args.name,
        team: args.team
      });

      const sections = [];
      // Coerce sections in case the client serialized the array as a JSON/CSV string,
      // otherwise iterating a string would create one section per character.
      const sectionNames = coerceStringArray(args.sections);
      for (const sectionName of sectionNames) {
        const section = await client.post(`/projects/${project.data.gid}/sections`, {
          name: sectionName
        });
        sections.push(section.data);
      }

      return {
        project: project.data,
        sections
      };
    }
  },
  {
    name: 'clone_project_structure',
    description: 'Reuse a project skeleton — clone sections (and optionally tasks) from a source project into a new project. Use for "clone the structure of project X into a fresh project for the next client", template-from-existing patterns. Direct action — pass source project GID; do NOT call get_project first. Team is inherited from source if omitted. clone_tasks=true also copies tasks. Related: duplicate_project (full async clone with all task details), create_project_with_structure (specify sections directly), instantiate_project_template (from saved template).',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        source_project_gid: { type: 'string', description: 'Source project GID' },
        target_project_name: { type: 'string', description: 'New project name' },
        workspace: { type: 'string', description: 'Workspace GID' },
        team: { type: 'string', description: 'Team GID for the new project. If omitted, uses the source project team.' },
        clone_tasks: { type: 'boolean', description: 'Also clone tasks (default: false)' }
      },
      required: ['source_project_gid', 'target_project_name', 'workspace']
    },
    handler: async (args) => {
      // Get source project including team info
      const sourceProject = await client.get(`/projects/${args.source_project_gid}`, { opt_fields: 'name,color,team' });

      // Determine team: use provided team, or fall back to source project's team
      const team = args.team || sourceProject.data?.team?.gid;

      // Create new project
      const projectData = {
        workspace: args.workspace,
        name: args.target_project_name,
        color: sourceProject.data.color
      };
      if (team) projectData.team = team;

      const newProject = await client.post('/projects', projectData);

      // Clone sections
      const sections = await client.get(`/projects/${args.source_project_gid}/sections`);
      const clonedSections = [];

      for (const section of sections.data) {
        const newSection = await client.post(`/projects/${newProject.data.gid}/sections`, {
          name: section.name
        });
        clonedSections.push(newSection.data);
      }

      return {
        project: newProject.data,
        sections: clonedSections
      };
    }
  },
  {
    name: 'move_tasks_between_projects',
    description: 'Move multiple tasks from one project to another. For each task: removes from source project, adds to target project. Returns per-task success/failure results. NOT atomic — if a task fails, previously moved tasks are NOT rolled back. Each task move uses 2 API calls (remove + add). Related: add_task_to_project for single task, remove_task_from_project, bulk_move_tasks_to_section.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Task GIDs to move'
        },
        source_project_gid: { type: 'string', description: 'Source project GID' },
        target_project_gid: { type: 'string', description: 'Target project GID' }
      },
      required: ['task_gids', 'source_project_gid', 'target_project_gid']
    },
    handler: async (args) => {
      const results = [];
      for (const task_gid of args.task_gids) {
        try {
          // Remove from source
          await client.post(`/tasks/${task_gid}/removeProject`, {
            project: args.source_project_gid
          });
          // Add to target
          await client.post(`/tasks/${task_gid}/addProject`, {
            project: args.target_project_gid
          });
          results.push({ success: true, task_gid });
        } catch (error) {
          results.push({ success: false, task_gid, error: error.message });
        }
      }
      return { results };
    }
  },
  {
    name: 'create_recurring_tasks',
    description: 'Create a series of tasks with recurring due dates. Generates multiple tasks named "[base_name] - [YYYY-MM-DD]" spaced by frequency_days. Useful for weekly reports, monthly reviews, sprint ceremonies, etc. Each task is created individually — counts toward rate limits. Related: create_task for single tasks, bulk_create_tasks for arbitrary batch creation.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID' },
        name: { type: 'string', description: 'Base task name' },
        project: { type: 'string', description: 'Project GID' },
        start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        frequency_days: { type: 'number', description: 'Repeat every N days' },
        count: { type: 'number', description: 'Number of tasks to create' }
      },
      required: ['workspace', 'name', 'start_date', 'frequency_days', 'count']
    },
    handler: async (args) => {
      const tasks = [];
      const startDate = new Date(args.start_date);

      for (let i = 0; i < args.count; i++) {
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + (i * args.frequency_days));

        const task = await client.post('/tasks', {
          workspace: args.workspace,
          name: `${args.name} - ${dueDate.toISOString().split('T')[0]}`,
          due_on: dueDate.toISOString().split('T')[0],
          projects: args.project ? [args.project] : undefined
        });

        tasks.push(task.data);
      }

      return { tasks };
    }
  },
  {
    name: 'archive_completed_tasks',
    description: 'Remove all completed tasks from a project. Tasks are NOT deleted, only unlinked from the project — they remain accessible by GID. Processes one page at a time (default first 20 tasks checked). For large projects, may need multiple runs to process all tasks. Each task requires 2 API calls (get + remove). Related: bulk_complete_tasks to mark tasks done, list_project_tasks.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' }
      },
      required: ['project_gid']
    },
    handler: async (args) => {
      const tasks = await client.get(`/projects/${args.project_gid}/tasks`);
      const archived = [];

      for (const task of tasks.data) {
        const fullTask = await client.get(`/tasks/${task.gid}`);
        if (fullTask.data.completed) {
          await client.post(`/tasks/${task.gid}/removeProject`, {
            project: args.project_gid
          });
          archived.push(task.gid);
        }
      }

      return { archived_count: archived.length, task_gids: archived };
    }
  },
  {
    name: 'setup_project_workflow',
    description: 'Create a project with pre-configured workflow sections. Choose from three templates: kanban (Backlog/To Do/In Progress/Review/Done), sprint (Sprint Backlog/In Progress/Testing/Done), or waterfall (Requirements/Design/Development/Testing/Deployment). In organizations, provide team GID. NOTE: This creates sections only — for automation rules, use setup_kanban_workflow or setup_sprint_workflow after creation. Cannot create forms, charts, or AI rules via API. Related: create_project_with_structure for custom sections, setup_kanban_workflow for rules-based automation.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID' },
        project_name: { type: 'string', description: 'Project name' },
        team: { type: 'string', description: 'Team GID for the project. Required for organization workspaces.' },
        workflow_type: {
          type: 'string',
          description: 'Workflow type: kanban, sprint, waterfall',
          enum: ['kanban', 'sprint', 'waterfall']
        }
      },
      required: ['workspace', 'project_name', 'workflow_type']
    },
    handler: async (args) => {
      // Create project
      const projectData = {
        workspace: args.workspace,
        name: args.project_name
      };
      if (args.team) projectData.team = args.team;

      const project = await client.post('/projects', projectData);

      const sections = [];
      let sectionNames = [];

      if (args.workflow_type === 'kanban') {
        sectionNames = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];
      } else if (args.workflow_type === 'sprint') {
        sectionNames = ['Sprint Backlog', 'In Progress', 'Testing', 'Done'];
      } else if (args.workflow_type === 'waterfall') {
        sectionNames = ['Requirements', 'Design', 'Development', 'Testing', 'Deployment'];
      }

      for (const name of sectionNames) {
        const section = await client.post(`/projects/${project.data.gid}/sections`, { name });
        sections.push(section.data);
      }

      return {
        project: project.data,
        sections,
        workflow_type: args.workflow_type
      };
    }
  }
];
