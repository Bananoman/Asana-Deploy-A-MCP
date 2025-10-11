/** Composite Operations Tools - Complex multi-step operations */
module.exports = (client) => [
  {
    name: 'create_project_with_structure',
    description: 'Create a project with sections and initial tasks',
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
      if (args.sections && args.sections.length > 0) {
        for (const sectionName of args.sections) {
          const section = await client.post(`/projects/${project.data.gid}/sections`, {
            name: sectionName
          });
          sections.push(section.data);
        }
      }

      return {
        project: project.data,
        sections
      };
    }
  },
  {
    name: 'clone_project_structure',
    description: 'Clone a project structure (sections and tasks) to a new project',
    inputSchema: {
      type: 'object',
      properties: {
        source_project_gid: { type: 'string', description: 'Source project GID' },
        target_project_name: { type: 'string', description: 'New project name' },
        workspace: { type: 'string', description: 'Workspace GID' },
        clone_tasks: { type: 'boolean', description: 'Also clone tasks (default: false)' }
      },
      required: ['source_project_gid', 'target_project_name', 'workspace']
    },
    handler: async (args) => {
      // Get source project
      const sourceProject = await client.get(`/projects/${args.source_project_gid}`);

      // Create new project
      const newProject = await client.post('/projects', {
        workspace: args.workspace,
        name: args.target_project_name,
        color: sourceProject.data.color
      });

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
    description: 'Move multiple tasks from one project to another',
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
    description: 'Create a series of recurring tasks',
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
    description: 'Archive all completed tasks in a project',
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
    description: 'Setup a complete project workflow with sections, custom fields, and initial tasks',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID' },
        project_name: { type: 'string', description: 'Project name' },
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
      const project = await client.post('/projects', {
        workspace: args.workspace,
        name: args.project_name
      });

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
