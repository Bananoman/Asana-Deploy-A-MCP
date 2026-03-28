/**
 * Methodology Tools — Consulting workflow tools for Xmarts Asana implementations
 *
 * These tools power the Asana Wizard and follow the 5-phase consulting methodology:
 * Scoring → Discovery → Fit-Gap → Proposal → Execution
 *
 * Tools:
 * - assess_asana_maturity: Score workspace maturity across 5 dimensions (0-100)
 * - generate_fitgap_analysis: Classify requirements as N/C/D/CP
 * - generate_implementation_plan: Produce DVA (Documento de Visión y Alcance)
 * - estimate_automation_savings: Estimate hours saved per automation recommendation
 *
 * @module methodology-tools
 */

// ─── Methodology decision matrix ───

const METHODOLOGY_THRESHOLDS = {
  quick_start: { max: 35, team_size: '1-2', duration: '2-4 weeks', description: 'Quick Start — basic setup with standard config' },
  hybrid: { max: 65, team_size: '3-5', duration: '1-3 months', description: 'Hybrid — standard config + some customization' },
  enterprise: { max: 100, team_size: '5+', duration: '3-6 months', description: 'Enterprise — full implementation with governance' }
};

// ─── Asana native capabilities for fit-gap classification ───

const NATIVE_CAPABILITIES = new Set([
  'create tasks', 'create subtasks', 'assign tasks', 'set due dates', 'add comments',
  'create projects', 'create sections', 'move tasks between sections', 'add followers',
  'create custom fields', 'set custom field values', 'create tags', 'add tags to tasks',
  'create project templates', 'duplicate projects', 'create portfolios', 'create goals',
  'upload attachments', 'create status updates', 'add task dependencies',
  'create teams', 'manage team memberships', 'project permissions',
  'list view', 'board view', 'timeline view', 'calendar view',
  'search tasks', 'filter by custom fields', 'sort tasks',
  'track time on tasks', 'create milestones', 'create approvals'
]);

const CONFIGURABLE_CAPABILITIES = new Set([
  'auto-assign tasks', 'auto-move tasks on status change', 'auto-complete tasks',
  'notify on overdue', 'create follow-up tasks', 'route by custom field',
  'kanban workflow automation', 'sprint workflow automation',
  'ai teammate draft briefs', 'ai teammate review specs', 'ai teammate status updates',
  'ai teammate intake processing', 'ai teammate weekly digests',
  'scheduled task creation', 'recurring tasks', 'template instantiation',
  'custom field validation via rules', 'auto-tag by section'
]);

// ─── Effort estimation baselines (hours) ───

const EFFORT_BASELINES = {
  native: { low: 0.25, expected: 0.5, high: 1 },
  configurable: { low: 0.5, expected: 1.5, high: 3 },
  development: { low: 2, expected: 5, high: 10 },
  process_change: { low: 1, expected: 3, high: 8 }
};

// ─── Savings baselines per automation type (hours/week) ───

const SAVINGS_BASELINES = {
  ai_teammate: {
    brief_writer: { low: 0.5, high: 1.5, basis: 'per brief generated' },
    status_writer: { low: 1.0, high: 2.5, basis: 'per status update cycle' },
    reviewer: { low: 0.5, high: 1.0, basis: 'per review performed' },
    digest_writer: { low: 1.0, high: 2.0, basis: 'per digest cycle' },
    intake_processor: { low: 0.3, high: 0.8, basis: 'per intake processed' }
  },
  ai_studio_rule: {
    routing: { low: 0.1, high: 0.3, basis: 'per task routed' },
    notification: { low: 0.05, high: 0.1, basis: 'per notification sent' },
    field_update: { low: 0.05, high: 0.15, basis: 'per field updated' },
    task_creation: { low: 0.1, high: 0.3, basis: 'per task created' }
  },
  claude_code_agent: {
    data_sync: { low: 2.0, high: 5.0, basis: 'per sync cycle' },
    report_generation: { low: 1.0, high: 3.0, basis: 'per report generated' },
    web_research: { low: 1.5, high: 4.0, basis: 'per research task' }
  }
};

module.exports = (client) => [

  // ════════════════════════════════════════════════════════════
  // TOOL 1: assess_asana_maturity
  // ════════════════════════════════════════════════════════════

  {
    name: 'assess_asana_maturity',
    description: 'Assess an Asana workspace maturity across 5 dimensions: structure, adoption, automation, integrations, and governance. Produces a score (0-100), recommends a consulting methodology (quick_start/hybrid/enterprise), team size, and estimated duration. Also identifies specific findings, blockers, and quick wins. Use this as the FIRST step in an Asana implementation engagement. This tool reads data only. Related: generate_fitgap_analysis for requirement classification, analyze_project_ai_readiness for AI-specific readiness.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace_gid: { type: 'string', description: 'The workspace GID to assess' }
      },
      required: ['workspace_gid']
    },
    handler: async (args) => {
      // Parallel fetch: teams, projects, goals, portfolios
      const [teams, projects, goals, portfolios] = await Promise.all([
        client.get(`/organizations/${args.workspace_gid}/teams`, { limit: 100, opt_fields: 'name' })
          .catch(() => ({ data: [] })),
        client.get('/projects', {
          workspace: args.workspace_gid, limit: 100, archived: false,
          opt_fields: 'name,team,team.name,public,modified_at,owner,owner.name,custom_field_settings,custom_field_settings.custom_field,custom_field_settings.custom_field.name,custom_field_settings.custom_field.type'
        }),
        client.get(`/goals`, { workspace: args.workspace_gid, limit: 10, opt_fields: 'name' })
          .catch(() => ({ data: [] })),
        client.get('/portfolios', { workspace: args.workspace_gid, limit: 10, opt_fields: 'name' })
          .catch(() => ({ data: [] }))
      ]);

      const projectList = projects.data || [];
      const teamList = teams.data || [];
      const goalList = goals.data || [];
      const portfolioList = portfolios.data || [];

      // Sort projects by activity, pick top 5 for deep analysis
      const sortedProjects = [...projectList]
        .sort((a, b) => new Date(b.modified_at) - new Date(a.modified_at))
        .slice(0, 5);

      // Parallel fetch: sections + rules + task samples for top projects
      const projectDetails = await Promise.all(
        sortedProjects.map(async (p) => {
          const [sections, rules, tasks] = await Promise.all([
            client.get(`/projects/${p.gid}/sections`, { opt_fields: 'name' }).catch(() => ({ data: [] })),
            client.get(`/projects/${p.gid}/rules`).catch(() => ({ data: [] })),
            client.get('/tasks', {
              project: p.gid, limit: 30,
              opt_fields: 'name,assignee,due_on,completed,custom_fields,custom_fields.display_value'
            }).catch(() => ({ data: [] }))
          ]);
          return {
            gid: p.gid, name: p.name,
            sections: (sections.data || []).map(s => s.name),
            ruleCount: (rules.data || []).length,
            enabledRules: (rules.data || []).filter(r => r.enabled !== false).length,
            tasks: tasks.data || []
          };
        })
      );

      // ─── Scoring ───

      const findings = [];
      const blockers = [];
      const quickWins = [];

      // 1. Structure (0-20)
      const totalSections = projectDetails.reduce((sum, p) => sum + p.sections.length, 0);
      const avgSections = projectDetails.length ? totalSections / projectDetails.length : 0;
      const hasStagePatterns = projectDetails.some(p =>
        p.sections.some(s => /backlog|to.?do|in.?progress|review|done|complete|intake|draft|approved/i.test(s))
      );
      const hasTemplates = projectList.length > 10;

      let structureScore = 0;
      if (avgSections >= 4 && hasStagePatterns && (portfolioList.length > 0 || goalList.length > 0)) {
        structureScore = 17;
        if (hasTemplates) structureScore = 20;
      } else if (avgSections >= 3 && hasStagePatterns) {
        structureScore = 13;
      } else if (avgSections >= 2) {
        structureScore = 8;
        findings.push({ dimension: 'structure', finding: `Average ${avgSections.toFixed(1)} sections per project — consider adding workflow stages`, severity: 'medium' });
      } else {
        structureScore = 3;
        findings.push({ dimension: 'structure', finding: 'Projects have minimal section structure', severity: 'high' });
        quickWins.push('Add standard sections (Backlog, In Progress, Review, Done) to top projects');
      }

      // 2. Adoption (0-20)
      const allTasks = projectDetails.flatMap(p => p.tasks);
      const totalTasks = allTasks.length;
      const withAssignee = allTasks.filter(t => t.assignee).length;
      const withDueDate = allTasks.filter(t => t.due_on).length;
      const assigneePct = totalTasks ? Math.round((withAssignee / totalTasks) * 100) : 0;
      const dueDatePct = totalTasks ? Math.round((withDueDate / totalTasks) * 100) : 0;

      let adoptionScore = 0;
      if (assigneePct >= 85 && dueDatePct >= 70) {
        adoptionScore = 18;
      } else if (assigneePct >= 60 && dueDatePct >= 40) {
        adoptionScore = 12;
      } else if (assigneePct >= 30) {
        adoptionScore = 7;
        findings.push({ dimension: 'adoption', finding: `${assigneePct}% tasks have assignees, ${dueDatePct}% have due dates`, severity: 'medium' });
      } else {
        adoptionScore = 3;
        findings.push({ dimension: 'adoption', finding: `Only ${assigneePct}% tasks have assignees — low adoption`, severity: 'high' });
        blockers.push(`${100 - assigneePct}% of tasks have no assignee — fix before automating`);
      }
      if (dueDatePct < 50 && totalTasks > 10) {
        quickWins.push(`Add due dates to ${totalTasks - withDueDate} tasks missing them`);
      }

      // 3. Automation (0-20)
      const totalRules = projectDetails.reduce((sum, p) => sum + p.ruleCount, 0);
      const enabledRules = projectDetails.reduce((sum, p) => sum + p.enabledRules, 0);

      let automationScore = 0;
      if (totalRules >= 15) {
        automationScore = 17;
      } else if (totalRules >= 6) {
        automationScore = 12;
      } else if (totalRules >= 1) {
        automationScore = 6;
        findings.push({ dimension: 'automation', finding: `Only ${totalRules} rules across ${projectDetails.length} projects`, severity: 'medium' });
      } else {
        automationScore = 0;
        findings.push({ dimension: 'automation', finding: 'No automation rules configured', severity: 'high' });
        quickWins.push('Create basic rules for the 3 most active projects (auto-assign, move on complete)');
      }
      if (totalRules > 0 && enabledRules < totalRules) {
        findings.push({ dimension: 'automation', finding: `${totalRules - enabledRules} rules disabled`, severity: 'low' });
      }

      // 4. Integrations (0-20)
      const allCustomFields = projectList.flatMap(p =>
        (p.custom_field_settings || []).map(cfs => cfs.custom_field)
      ).filter(Boolean);
      const uniqueFieldNames = new Set(allCustomFields.map(cf => cf.name));
      const hasEnumFields = allCustomFields.some(cf => cf.type === 'enum' || cf.type === 'multi_enum');
      const fieldCount = uniqueFieldNames.size;

      let integrationsScore = 0;
      if (fieldCount >= 10 && hasEnumFields) {
        integrationsScore = 16;
      } else if (fieldCount >= 5) {
        integrationsScore = 11;
      } else if (fieldCount >= 1) {
        integrationsScore = 6;
        findings.push({ dimension: 'integrations', finding: `${fieldCount} unique custom fields — consider adding more for structured data`, severity: 'low' });
      } else {
        integrationsScore = 0;
        findings.push({ dimension: 'integrations', finding: 'No custom fields configured', severity: 'medium' });
        quickWins.push('Add custom fields: Priority, Status/Stage, Category to enable filtering and rules');
      }

      // 5. Governance (0-20)
      const publicProjects = projectList.filter(p => p.public).length;
      const privateProjects = projectList.filter(p => !p.public).length;
      const hasTeams = teamList.length >= 2;
      const hasOwners = projectList.filter(p => p.owner).length;
      const ownerPct = projectList.length ? Math.round((hasOwners / projectList.length) * 100) : 0;

      let governanceScore = 0;
      if (hasTeams && privateProjects > 0 && ownerPct >= 80) {
        governanceScore = 16;
        if (goalList.length > 0) governanceScore = 19;
      } else if (hasTeams && ownerPct >= 50) {
        governanceScore = 11;
      } else if (hasTeams || ownerPct >= 30) {
        governanceScore = 6;
      } else {
        governanceScore = 2;
        findings.push({ dimension: 'governance', finding: 'Minimal governance: few teams, most projects public, many without owners', severity: 'high' });
      }
      if (ownerPct < 70 && projectList.length > 5) {
        quickWins.push(`Assign owners to ${projectList.length - hasOwners} projects without them`);
      }

      // ─── Overall score & methodology ───

      const overall = structureScore + adoptionScore + automationScore + integrationsScore + governanceScore;

      let methodology;
      if (overall <= METHODOLOGY_THRESHOLDS.quick_start.max) {
        methodology = METHODOLOGY_THRESHOLDS.quick_start;
      } else if (overall <= METHODOLOGY_THRESHOLDS.hybrid.max) {
        methodology = METHODOLOGY_THRESHOLDS.hybrid;
      } else {
        methodology = METHODOLOGY_THRESHOLDS.enterprise;
      }

      return {
        workspace_gid: args.workspace_gid,
        scores: {
          structure: structureScore,
          adoption: adoptionScore,
          automation: automationScore,
          integrations: integrationsScore,
          governance: governanceScore
        },
        overall,
        methodology: methodology.description,
        team_size: methodology.team_size,
        estimated_duration: methodology.duration,
        data_points: {
          teams: teamList.length,
          projects: projectList.length,
          goals: goalList.length,
          portfolios: portfolioList.length,
          total_rules: totalRules,
          custom_fields: fieldCount,
          tasks_sampled: totalTasks,
          assignee_coverage: `${assigneePct}%`,
          due_date_coverage: `${dueDatePct}%`
        },
        findings,
        blockers,
        quick_wins: quickWins,
        next_steps: [
          'Run generate_fitgap_analysis with client requirements to classify gaps',
          'Run analyze_project_ai_readiness on specific projects for AI automation assessment',
          'Use detect_team_industry to identify applicable industry playbooks'
        ]
      };
    }
  },

  // ════════════════════════════════════════════════════════════
  // TOOL 2: generate_fitgap_analysis
  // ════════════════════════════════════════════════════════════

  {
    name: 'generate_fitgap_analysis',
    description: 'Generate a fit-gap analysis for an Asana implementation. Classifies each requirement as: N (native — Asana does it out of the box), C (configurable — achievable via rules/AI Studio), D (development — needs MCP tools or external agents), CP (process change — client must change their workflow). If no requirements are provided, infers them from workspace patterns. Returns classified requirements with effort estimates and MCP tools needed. Related: assess_asana_maturity for scoring first, generate_implementation_plan for the DVA.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace_gid: { type: 'string', description: 'Workspace GID to analyze current config' },
        project_gids: {
          type: 'array', items: { type: 'string' },
          description: 'Optional: specific project GIDs to analyze. If omitted, analyzes top 3 active projects.'
        },
        client_requirements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              requirement: { type: 'string' },
              priority: { type: 'string', enum: ['must', 'should', 'could', 'wont'] }
            },
            required: ['requirement']
          },
          description: 'Optional: client requirements from discovery. If omitted, infers from workspace patterns.'
        }
      },
      required: ['workspace_gid']
    },
    handler: async (args) => {
      // Get projects to analyze
      let projectGids = args.project_gids;
      if (!projectGids || projectGids.length === 0) {
        const projects = await client.get('/projects', {
          workspace: args.workspace_gid, limit: 5, archived: false,
          opt_fields: 'name,modified_at'
        });
        projectGids = (projects.data || [])
          .sort((a, b) => new Date(b.modified_at) - new Date(a.modified_at))
          .slice(0, 3)
          .map(p => p.gid);
      }

      // Parallel fetch project details
      const projectDetails = await Promise.all(
        projectGids.map(async (gid) => {
          const [project, sections, rules, tasks] = await Promise.all([
            client.get(`/projects/${gid}`, {
              opt_fields: 'name,custom_field_settings,custom_field_settings.custom_field,custom_field_settings.custom_field.name,custom_field_settings.custom_field.type'
            }),
            client.get(`/projects/${gid}/sections`, { opt_fields: 'name' }).catch(() => ({ data: [] })),
            client.get(`/projects/${gid}/rules`).catch(() => ({ data: [] })),
            client.get('/tasks', {
              project: gid, limit: 20,
              opt_fields: 'name,assignee,due_on,completed,tags,tags.name,custom_fields,custom_fields.name,custom_fields.display_value'
            }).catch(() => ({ data: [] }))
          ]);
          return {
            gid, name: project.data?.name,
            customFields: (project.data?.custom_field_settings || []).map(cfs => cfs.custom_field?.name).filter(Boolean),
            sections: (sections.data || []).map(s => s.name),
            ruleCount: (rules.data || []).length,
            tasks: tasks.data || []
          };
        })
      );

      // Infer requirements if not provided
      let requirements = args.client_requirements;
      if (!requirements || requirements.length === 0) {
        requirements = [];

        // Infer from workspace patterns
        const allSections = projectDetails.flatMap(p => p.sections);
        const allFields = projectDetails.flatMap(p => p.customFields);
        const allTasks = projectDetails.flatMap(p => p.tasks);
        const hasRules = projectDetails.some(p => p.ruleCount > 0);
        const hasAssignees = allTasks.filter(t => t.assignee).length > allTasks.length * 0.5;

        // Always infer these
        requirements.push({ requirement: 'Project structure with workflow stages', priority: 'must' });
        requirements.push({ requirement: 'Task assignment and ownership', priority: 'must' });
        requirements.push({ requirement: 'Due date tracking and visibility', priority: 'must' });

        if (allFields.length === 0) {
          requirements.push({ requirement: 'Custom fields for categorization and filtering', priority: 'should' });
        }
        if (!hasRules) {
          requirements.push({ requirement: 'Automation rules for repetitive actions', priority: 'should' });
          requirements.push({ requirement: 'Auto-assign tasks by type or section', priority: 'could' });
        }
        if (allSections.some(s => /review|approval/i.test(s))) {
          requirements.push({ requirement: 'Review/approval workflow automation', priority: 'should' });
        }
        requirements.push({ requirement: 'Weekly status reporting', priority: 'should' });
        requirements.push({ requirement: 'Onboarding new team members to project structure', priority: 'could' });

        if (allTasks.some(t => t.tags && t.tags.length > 0)) {
          requirements.push({ requirement: 'Tag-based categorization and filtering', priority: 'could' });
        }
      }

      // Classify each requirement
      const classified = requirements.map((req, idx) => {
        const text = req.requirement.toLowerCase();
        let classification, classificationLabel, how, effort, mcpTools, confidence;

        // Check native
        const isNative = [...NATIVE_CAPABILITIES].some(cap => text.includes(cap) || cap.includes(text.split(' ').slice(0, 3).join(' ')));
        // Check configurable
        const isConfigurable = [...CONFIGURABLE_CAPABILITIES].some(cap => text.includes(cap) || cap.includes(text.split(' ').slice(0, 3).join(' ')));

        if (isNative) {
          classification = 'N';
          classificationLabel = 'Native';
          how = `Available out of the box in Asana. Configure via project settings or task properties.`;
          effort = 'low';
          mcpTools = [];
          confidence = 'high';
        } else if (isConfigurable || /auto|rule|ai teammate|workflow|notify|route|assign auto/i.test(text)) {
          classification = 'C';
          classificationLabel = 'Configurable';
          if (/ai teammate|draft|brief|review|summary|status update|digest/i.test(text)) {
            how = `Configurable via AI Teammate in AI Studio. Create Teammate with behavior instructions matching this requirement.`;
            mcpTools = ['generate_teammate_blueprint', 'validate_ai_capability'];
          } else {
            how = `Configurable via Asana Rules or AI Studio workflow. Set trigger + action in project rules.`;
            mcpTools = ['create_rule', 'setup_kanban_workflow'];
          }
          effort = 'low';
          confidence = 'high';
        } else if (/sync|api|external|database|crm|salesforce|hubspot|web|scrape|email send/i.test(text)) {
          classification = 'D';
          classificationLabel = 'Development';
          how = `Requires external development: Claude Code agent, MCP integration, or third-party connector.`;
          effort = 'high';
          mcpTools = ['batch_api', 'attach_external_data'];
          confidence = 'medium';
        } else if (/change process|stop using|migrate|adopt|train|culture/i.test(text)) {
          classification = 'CP';
          classificationLabel = 'Process Change';
          how = `Requires the client to change their current workflow or adopt new practices.`;
          effort = 'medium';
          mcpTools = [];
          confidence = 'medium';
        } else {
          // Default: classify as configurable with medium confidence
          classification = 'C';
          classificationLabel = 'Configurable';
          how = `Likely achievable via Asana configuration (rules, custom fields, templates). Validate specifics during implementation.`;
          effort = 'medium';
          mcpTools = [];
          confidence = 'medium';
        }

        const baseline = EFFORT_BASELINES[classification === 'N' ? 'native' : classification === 'C' ? 'configurable' : classification === 'D' ? 'development' : 'process_change'];

        return {
          id: idx + 1,
          requirement: req.requirement,
          priority: req.priority || 'should',
          classification,
          classification_label: classificationLabel,
          how,
          effort,
          hours_estimate: baseline,
          mcp_tools_needed: mcpTools,
          confidence
        };
      });

      // Summary
      const summary = {
        native: classified.filter(r => r.classification === 'N').length,
        configurable: classified.filter(r => r.classification === 'C').length,
        development: classified.filter(r => r.classification === 'D').length,
        process_change: classified.filter(r => r.classification === 'CP').length,
        total: classified.length
      };

      // PERT estimation
      const totalLow = classified.reduce((sum, r) => sum + r.hours_estimate.low, 0);
      const totalExpected = classified.reduce((sum, r) => sum + r.hours_estimate.expected, 0);
      const totalHigh = classified.reduce((sum, r) => sum + r.hours_estimate.high, 0);

      return {
        workspace_gid: args.workspace_gid,
        projects_analyzed: projectDetails.map(p => ({ gid: p.gid, name: p.name })),
        requirements: classified,
        summary,
        hours_estimate: {
          optimistic: Math.round(totalLow),
          expected: Math.round(totalExpected),
          pessimistic: Math.round(totalHigh)
        },
        next_steps: [
          'Review and adjust classifications with the client',
          'Use generate_implementation_plan to create the DVA from these results',
          'Use estimate_automation_savings to calculate ROI for C and D items'
        ]
      };
    }
  },

  // ════════════════════════════════════════════════════════════
  // TOOL 3: generate_implementation_plan
  // ════════════════════════════════════════════════════════════

  {
    name: 'generate_implementation_plan',
    description: 'Generate a complete implementation plan (DVA — Documento de Visión y Alcance) for an Asana deployment. Produces: executive summary, scope definition, phased timeline, training plan, risk register, and investment estimate. Requires maturity assessment and optionally fit-gap results. Output is structured JSON ready to be rendered as a client-facing document. Related: assess_asana_maturity for scoring, generate_fitgap_analysis for requirement classification.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace_gid: { type: 'string', description: 'Workspace GID' },
        client_name: { type: 'string', description: 'Client organization name' },
        industry: { type: 'string', description: 'Client industry (e.g., marketing, operations, product, consulting)' },
        methodology: {
          type: 'string',
          enum: ['quick_start', 'hybrid', 'enterprise'],
          description: 'Methodology from assess_asana_maturity results'
        },
        fitgap_summary: {
          type: 'object',
          description: 'Optional: summary object from generate_fitgap_analysis output',
          properties: {
            native: { type: 'number' },
            configurable: { type: 'number' },
            development: { type: 'number' },
            process_change: { type: 'number' },
            total: { type: 'number' }
          }
        }
      },
      required: ['workspace_gid', 'client_name', 'industry', 'methodology']
    },
    handler: async (args) => {
      const { client_name, industry, methodology } = args;
      const fitgap = args.fitgap_summary || { native: 10, configurable: 5, development: 2, process_change: 1, total: 18 };

      // Fetch workspace context
      const [projects, teams] = await Promise.all([
        client.get('/projects', {
          workspace: args.workspace_gid, limit: 20, archived: false,
          opt_fields: 'name,team.name'
        }),
        client.get(`/organizations/${args.workspace_gid}/teams`, { limit: 20, opt_fields: 'name' })
          .catch(() => ({ data: [] }))
      ]);

      const projectCount = (projects.data || []).length;
      const teamCount = (teams.data || []).length;

      // Phase templates by methodology
      const phaseTemplates = {
        quick_start: [
          { name: 'Setup & Config', duration: '1 week', deliverables: ['Workspace structure', 'Custom fields', 'Project templates'], tools: ['create_project_with_structure', 'create_custom_field', 'create_section'] },
          { name: 'Training & Go-Live', duration: '1 week', deliverables: ['Team training sessions', 'User guides', 'Go-live support'], tools: [] }
        ],
        hybrid: [
          { name: 'Discovery & Planning', duration: '1 week', deliverables: ['Current state assessment', 'Gap analysis', 'Implementation plan'], tools: ['assess_asana_maturity', 'generate_fitgap_analysis'] },
          { name: 'Setup & Config', duration: '2 weeks', deliverables: ['Workspace structure', 'Custom fields', 'Project templates', 'Team permissions'], tools: ['create_project_with_structure', 'create_custom_field', 'create_section', 'add_project_members'] },
          { name: 'Automation & Rules', duration: '1 week', deliverables: ['Workflow rules', 'AI Studio rules', 'Kanban/sprint workflows'], tools: ['create_rule', 'setup_kanban_workflow', 'bulk_create_rules'] },
          { name: 'AI Teammates', duration: '2 weeks', deliverables: ['AI Teammate specs', 'Behavior testing', 'Key resource setup'], tools: ['generate_teammate_blueprint', 'validate_ai_capability'] },
          { name: 'Training & Go-Live', duration: '1 week', deliverables: ['Role-based training', 'Admin training', 'Go-live support', '2-week stabilization'], tools: [] }
        ],
        enterprise: [
          { name: 'Discovery & Assessment', duration: '2 weeks', deliverables: ['Stakeholder interviews', 'Current state assessment', 'Maturity scoring', 'Industry playbook selection'], tools: ['assess_asana_maturity', 'detect_team_industry'] },
          { name: 'Planning & Design', duration: '2 weeks', deliverables: ['Fit-gap analysis', 'Workspace architecture', 'Governance model', 'Integration plan'], tools: ['generate_fitgap_analysis'] },
          { name: 'Foundation Setup', duration: '2 weeks', deliverables: ['Workspace structure', 'Custom fields', 'Project templates', 'Team/permission setup', 'Portfolio structure', 'Goals hierarchy'], tools: ['create_project_with_structure', 'create_custom_field', 'create_portfolio', 'create_goal'] },
          { name: 'Automation & AI', duration: '3 weeks', deliverables: ['Workflow rules', 'AI Studio rules', 'AI Teammates', 'External integrations'], tools: ['bulk_create_rules', 'setup_kanban_workflow', 'generate_teammate_blueprint', 'create_webhook'] },
          { name: 'Data Migration', duration: '1 week', deliverables: ['Historical data import', 'Data validation', 'Mapping verification'], tools: ['bulk_create_tasks', 'bulk_update_tasks'] },
          { name: 'UAT & Training', duration: '2 weeks', deliverables: ['User acceptance testing', 'Role-based training', 'Admin training', 'Documentation'], tools: [] },
          { name: 'Go-Live & Stabilization', duration: '2 weeks', deliverables: ['Go-live support', 'Issue resolution', 'Performance monitoring', 'Post-go-live review'], tools: ['analyze_workspace_overview'] }
        ]
      };

      const phases = phaseTemplates[methodology] || phaseTemplates.hybrid;
      const totalDuration = phases.reduce((acc, p) => {
        const weeks = parseInt(p.duration) || 1;
        return acc + weeks;
      }, 0);

      // Hour estimation
      const baseHours = { quick_start: 40, hybrid: 120, enterprise: 300 };
      const complexityMultiplier = 1 + (fitgap.development * 0.15) + (fitgap.process_change * 0.1);
      const estimatedHours = Math.round(baseHours[methodology] * complexityMultiplier);

      // Training plan
      const trainingPlan = [
        { role: 'End Users', topics: ['Task management', 'Collaboration', 'My Tasks', 'Notifications'], hours: methodology === 'enterprise' ? 4 : 2 },
        { role: 'Project Managers', topics: ['Project setup', 'Custom fields', 'Status updates', 'Timeline', 'Portfolios'], hours: methodology === 'enterprise' ? 8 : 4 },
        { role: 'Administrators', topics: ['Workspace settings', 'Team management', 'Permissions', 'Rules', 'AI Studio', 'Integrations'], hours: methodology === 'enterprise' ? 12 : 6 }
      ];

      // Risk register
      const risks = [
        { risk: 'Low user adoption after go-live', probability: 'medium', impact: 'high', mitigation: 'Phased rollout with champion users, training before go-live' },
        { risk: 'Scope creep during implementation', probability: 'medium', impact: 'medium', mitigation: 'Change order process, scope freeze after planning phase' },
        { risk: 'Data migration quality issues', probability: methodology === 'enterprise' ? 'medium' : 'low', impact: 'high', mitigation: 'Data validation before import, dry-run migration, rollback plan' },
        { risk: 'Integration delays with third-party systems', probability: fitgap.development > 0 ? 'medium' : 'low', impact: 'medium', mitigation: 'Integration testing in parallel, fallback to manual process' },
        { risk: 'AI Teammate behavior misalignment', probability: fitgap.configurable > 3 ? 'medium' : 'low', impact: 'low', mitigation: 'Test with starter tasks, iterate behavior instructions, human review gates' }
      ];

      return {
        document_type: 'DVA',
        document_title: `Documento de Visión y Alcance — ${client_name}`,
        generated_date: new Date().toISOString().split('T')[0],
        executive_summary: `Implementation plan for ${client_name} (${industry}) using the ${methodology.replace('_', ' ')} methodology. The workspace has ${projectCount} active projects across ${teamCount} teams. The fit-gap analysis identified ${fitgap.total} requirements: ${fitgap.native} native, ${fitgap.configurable} configurable, ${fitgap.development} requiring development, and ${fitgap.process_change} process changes. Estimated duration: ${totalDuration} weeks.`,
        scope: {
          in_scope: [
            'Workspace structure and project template setup',
            `${fitgap.native + fitgap.configurable} requirements (native + configurable)`,
            'Automation rules and AI Studio configuration',
            fitgap.development > 0 ? `${fitgap.development} custom integrations via MCP/agents` : null,
            'Role-based training for end users, PMs, and admins',
            'Go-live support and stabilization period'
          ].filter(Boolean),
          out_of_scope: [
            'Third-party software licensing',
            'Client internal change management beyond training',
            'Historical data beyond agreed migration scope',
            'Custom mobile app development',
            'Ongoing managed services (separate SOW)'
          ],
          assumptions: [
            'Client provides timely access to workspace and stakeholders',
            'Client has an active Asana subscription at required tier',
            'Key decision-makers available for weekly check-ins',
            'Client team completes assigned pre-work (cleanup, naming) on schedule'
          ]
        },
        phases,
        total_duration_weeks: totalDuration,
        training_plan: trainingPlan,
        risk_register: risks,
        investment: {
          estimated_hours: estimatedHours,
          hours_range: { low: Math.round(estimatedHours * 0.8), high: Math.round(estimatedHours * 1.3) },
          note: 'Final hours depend on client readiness, scope changes, and complexity discovered during implementation.'
        },
        next_steps: [
          'Review DVA with client stakeholders',
          'Confirm scope and get sign-off',
          'Use estimate_automation_savings to quantify automation ROI for the client',
          'Begin Phase 1 execution using MCP tools listed in each phase'
        ]
      };
    }
  },

  // ════════════════════════════════════════════════════════════
  // TOOL 4: estimate_automation_savings
  // ════════════════════════════════════════════════════════════

  {
    name: 'estimate_automation_savings',
    description: 'Estimate time savings from automation recommendations for an Asana workspace. Produces directional estimates (ranges, not absolutes) with confidence levels and stated assumptions. If no recommendations are provided, analyzes the workspace and generates them. Output includes hours saved per recommendation, yearly totals, and FTE equivalents. These are planning estimates, not financial commitments. Related: analyze_project_ai_readiness for AI-specific analysis, generate_fitgap_analysis for requirement classification.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace_gid: { type: 'string', description: 'Workspace GID to analyze' },
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string', enum: ['ai_teammate', 'ai_studio_rule', 'claude_code_agent'] },
              category: { type: 'string', description: 'Sub-category (e.g., brief_writer, routing, data_sync)' },
              frequency_per_week: { type: 'number', description: 'How many times per week this runs' }
            },
            required: ['name', 'type']
          },
          description: 'Optional: recommendations from advisor tools. If omitted, auto-detects from workspace.'
        }
      },
      required: ['workspace_gid']
    },
    handler: async (args) => {
      let recommendations = args.recommendations;

      // Auto-detect if no recommendations provided
      if (!recommendations || recommendations.length === 0) {
        const projects = await client.get('/projects', {
          workspace: args.workspace_gid, limit: 5, archived: false,
          opt_fields: 'name,modified_at'
        });
        const topProjects = (projects.data || [])
          .sort((a, b) => new Date(b.modified_at) - new Date(a.modified_at))
          .slice(0, 3);

        // Analyze top projects for patterns
        const projectAnalyses = await Promise.all(
          topProjects.map(async (p) => {
            const [sections, rules, tasks] = await Promise.all([
              client.get(`/projects/${p.gid}/sections`, { opt_fields: 'name' }).catch(() => ({ data: [] })),
              client.get(`/projects/${p.gid}/rules`).catch(() => ({ data: [] })),
              client.get('/tasks', {
                project: p.gid, limit: 30,
                opt_fields: 'name,assignee,due_on,completed,created_at,completed_at'
              }).catch(() => ({ data: [] }))
            ]);

            const taskList = tasks.data || [];
            const sectionNames = (sections.data || []).map(s => s.name);
            const ruleCount = (rules.data || []).length;
            const completedTasks = taskList.filter(t => t.completed);
            const unassigned = taskList.filter(t => !t.assignee);
            const overdue = taskList.filter(t => t.due_on && !t.completed && new Date(t.due_on) < new Date());

            return {
              name: p.name, gid: p.gid,
              taskCount: taskList.length,
              completedCount: completedTasks.length,
              unassignedCount: unassigned.length,
              overdueCount: overdue.length,
              sectionCount: sectionNames.length,
              ruleCount,
              hasStages: sectionNames.some(s => /review|done|complete|in.?progress/i.test(s))
            };
          })
        );

        // Generate recommendations based on patterns
        recommendations = [];

        const totalTasks = projectAnalyses.reduce((sum, p) => sum + p.taskCount, 0);
        const totalRules = projectAnalyses.reduce((sum, p) => sum + p.ruleCount, 0);
        const hasStages = projectAnalyses.some(p => p.hasStages);

        if (totalTasks > 20) {
          recommendations.push({ name: 'Weekly Status Digest', type: 'ai_teammate', category: 'digest_writer', frequency_per_week: 1 });
        }
        if (hasStages) {
          recommendations.push({ name: 'Auto-assign on section move', type: 'ai_studio_rule', category: 'routing', frequency_per_week: Math.round(totalTasks * 0.3) });
        }
        if (totalRules === 0 && totalTasks > 10) {
          recommendations.push({ name: 'Auto-complete notification', type: 'ai_studio_rule', category: 'notification', frequency_per_week: Math.round(totalTasks * 0.2) });
        }
        if (projectAnalyses.some(p => p.unassignedCount > 5)) {
          recommendations.push({ name: 'Intake Task Router', type: 'ai_teammate', category: 'intake_processor', frequency_per_week: 5 });
        }
        if (totalTasks > 30) {
          recommendations.push({ name: 'Brief Drafter for new tasks', type: 'ai_teammate', category: 'brief_writer', frequency_per_week: 3 });
        }
      }

      // Calculate savings for each recommendation
      const estimates = recommendations.map(rec => {
        const baselines = SAVINGS_BASELINES[rec.type];
        const category = rec.category || Object.keys(baselines)[0];
        const baseline = baselines[category] || { low: 0.5, high: 1.5, basis: 'per occurrence' };
        const frequency = rec.frequency_per_week || 3;

        const weeklyLow = baseline.low * frequency;
        const weeklyHigh = baseline.high * frequency;

        return {
          name: rec.name,
          type: rec.type,
          category: category,
          frequency_per_week: frequency,
          hours_saved_weekly: { low: Math.round(weeklyLow * 10) / 10, high: Math.round(weeklyHigh * 10) / 10 },
          hours_saved_yearly: { low: Math.round(weeklyLow * 52), high: Math.round(weeklyHigh * 52) },
          confidence: frequency >= 5 ? 'high' : frequency >= 2 ? 'medium' : 'low',
          basis: `${frequency}x/week × ${baseline.low}-${baseline.high} hrs ${baseline.basis}`,
          assumptions: [`Frequency of ${frequency}/week continues`, 'Team adopts the automation within 2 weeks of deployment']
        };
      });

      const totalYearlyLow = estimates.reduce((sum, e) => sum + e.hours_saved_yearly.low, 0);
      const totalYearlyHigh = estimates.reduce((sum, e) => sum + e.hours_saved_yearly.high, 0);

      return {
        workspace_gid: args.workspace_gid,
        estimates,
        totals: {
          hours_saved_yearly: { low: totalYearlyLow, high: totalYearlyHigh },
          equivalent_fte: {
            low: Math.round((totalYearlyLow / 2080) * 100) / 100,
            high: Math.round((totalYearlyHigh / 2080) * 100) / 100
          }
        },
        disclaimer: 'Directional estimates for planning purposes. Based on workspace activity patterns and industry baselines, not time studies. Actual savings depend on team adoption, task complexity, and workflow consistency.',
        next_steps: [
          'Validate frequency assumptions with client stakeholders',
          'Use generate_implementation_plan to create the DVA with these savings as justification',
          'Revisit estimates 30 days post-deployment with actual usage data'
        ]
      };
    }
  }
];
