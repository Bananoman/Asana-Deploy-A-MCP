/**
 * Workspace Advisor - AI Readiness Analysis, Capability Validation & Blueprint Generation
 *
 * Combines live Asana workspace data with knowledge of AI Teammate capabilities,
 * industry playbooks, and spec formats to provide intelligent automation advisory.
 *
 * Tools:
 * - analyze_workspace_overview: High-level workspace scan for AI planning
 * - analyze_project_ai_readiness: Deep project analysis with scoring and recommendations
 * - detect_team_industry: Auto-detect which industry playbook matches a team/project
 * - validate_ai_capability: Check if a proposed behavior is feasible for AI Teammates
 * - generate_teammate_blueprint: Generate a complete, copy-paste-ready AI Teammate spec
 *
 * @module workspace-advisor
 */

// ─── AI Teammate hard constraints (from asana-ai-capabilities.md, March 2026) ───

const AI_TEAMMATE_CAN = [
  'read tasks, projects, sections, comments, assignees, custom field values',
  'create tasks and subtasks (on tasks it created)',
  'edit task titles, descriptions, assignees, due dates on work it handles',
  'mark tasks complete',
  'add comments',
  'update existing custom field values',
  'add task to a project (sometimes with approval)',
  'add or remove task collaborators (with approval)',
  'assign tasks or subtasks (with approval when required)',
  'delete tasks (with approval if not creator)',
  'create projects',
  'create or update sections',
  'create files via Google Drive, SharePoint, OneDrive (using triggering user auth)',
  'search external files (docs, slides, sheets, images, PDFs) when both user and Teammate have access',
  'create or edit linked Google Docs or Sheets',
  'store memories from work performed (respecting permissions)'
];

const AI_TEAMMATE_CANNOT = [
  { capability: 'browse the live web', alternative: 'Use a Claude Code agent or hybrid approach for web research' },
  { capability: 'call external APIs', alternative: 'Use a Claude Code agent to fetch data and push results into Asana tasks' },
  { capability: 'read/write external databases or CRMs', alternative: 'Use a Claude Code agent for CRM sync, then hand off to Teammate in Asana' },
  { capability: 'create custom fields', alternative: 'Use create_custom_field MCP tool, then Teammate can read/update the field' },
  { capability: 'remove a task from a project', alternative: 'Use remove_task_from_project MCP tool or manual process' },
  { capability: 'create dependencies between tasks', alternative: 'Use add_task_dependents MCP tool' },
  { capability: 'perform bulk updates across many tasks', alternative: 'Use bulk_update_tasks MCP tool' },
  { capability: 'create milestones or goals', alternative: 'Use create_goal or create_task with resource_subtype=milestone MCP tools' },
  { capability: 'create dashboards or charts', alternative: 'Use Asana UI or export data via MCP for external visualization' },
  { capability: 'send messages outside task workflow', alternative: 'Teammate can draft; human or external agent sends' },
  { capability: 'add/remove users from teams or projects', alternative: 'Use add_user_to_team or add_project_members MCP tools' },
  { capability: 'attach files directly to tasks', alternative: 'Can link to created files; use upload_attachment MCP tool for direct attach' },
  { capability: 'generate images or PDFs', alternative: 'Use a Claude Code agent to generate, then attach via MCP' },
  { capability: 'continuously monitor or poll for changes', alternative: 'Must be invoked by task assignment, @mention, or workflow trigger' },
  { capability: 'bypass permissions', alternative: 'Teammate must be explicitly added to private projects' }
];

// ─── Industry playbook patterns (from industry-playbooks.md) ───

const INDUSTRY_PLAYBOOKS = {
  executive_search: {
    name: 'Executive Search / Recruiting',
    keywords: ['candidate', 'search', 'recruit', 'hiring', 'interview', 'reference', 'pipeline', 'sourcing', 'offer', 'placement', 'talent', 'headhunt', 'job opening', 'applicant'],
    section_patterns: ['pipeline', 'screening', 'interview', 'offer', 'placed', 'sourcing', 'shortlist'],
    field_patterns: ['stage', 'candidate', 'salary', 'location', 'client', 'position'],
    teammates: [
      { name: 'Search Brief Drafter', trigger: 'intake task', output: 'structured search brief', impact: 'Saves 30-45 min per search by standardizing brief format' },
      { name: 'Weekly Search Update Writer', trigger: 'recurring weekly task', output: 'client-ready status update draft', impact: 'Saves 1-2 hours weekly on status reporting' },
      { name: 'Interview Prep Packager', trigger: 'candidate moves to interview stage', output: 'prep notes and open questions', impact: 'Ensures consistent interview prep in 10 min vs 30 min' },
      { name: 'Reference Question Builder', trigger: 'candidate moves to reference stage', output: 'structured question set', impact: 'Standardizes reference checks, saves 20 min per candidate' },
      { name: 'Search Debrief Analyst', trigger: 'closeout task', output: 'lessons learned and reusable notes', impact: 'Captures institutional knowledge that typically gets lost' }
    ],
    rules: ['assign follow-up owner based on search stage', 'create weekly status task every Friday', 'flag candidates with no activity for 7+ days'],
    avoid: ['fully autonomous pipeline creation without stable project template']
  },
  marketing: {
    name: 'Marketing / Content',
    keywords: ['campaign', 'content', 'social media', 'email', 'brand', 'creative', 'launch', 'seo', 'blog', 'newsletter', 'ads', 'marketing', 'copy', 'design brief'],
    section_patterns: ['ideation', 'draft', 'review', 'approved', 'published', 'live', 'briefing', 'production'],
    field_patterns: ['channel', 'campaign', 'audience', 'budget', 'launch date', 'content type'],
    teammates: [
      { name: 'Campaign Brief Writer', trigger: 'intake notes task', output: 'structured campaign brief', impact: 'Saves 45 min per campaign, ensures consistent scope capture' },
      { name: 'Content Review Partner', trigger: 'draft task ready for review', output: 'clarity, messaging, and CTA review', impact: 'Catches 80% of common issues before human review' },
      { name: 'Launch Readiness Reviewer', trigger: 'pre-launch task', output: 'risks, missing owners, and gaps checklist', impact: 'Prevents launch delays from forgotten dependencies' },
      { name: 'Performance Debrief Writer', trigger: 'campaign closeout task', output: 'learnings and next-step summary', impact: 'Captures post-campaign insights that inform future strategy' },
      { name: 'Content Gap Synthesizer', trigger: 'recurring review task', output: 'missing themes or asset gaps', impact: 'Identifies content calendar gaps 2-3 weeks earlier' }
    ],
    rules: ['route content requests by type', 'move to review when draft is complete', 'remind when calendar gaps appear within 2 weeks'],
    avoid: ['SEO research (needs web access)', 'competitor content monitoring (needs web access)']
  },
  operations: {
    name: 'Operations / Process',
    keywords: ['ops', 'process', 'sop', 'onboarding', 'vendor', 'procurement', 'compliance', 'policy', 'procedure', 'workflow', 'operations', 'audit', 'checklist', 'quality'],
    section_patterns: ['intake', 'processing', 'verification', 'complete', 'pending', 'approved', 'escalated'],
    field_patterns: ['priority', 'category', 'department', 'status', 'owner', 'due date', 'risk level'],
    teammates: [
      { name: 'SOP Drafter', trigger: 'rough process notes task', output: 'structured SOP document', impact: 'Saves 1-2 hours per SOP, ensures consistent documentation' },
      { name: 'Weekly Ops Briefer', trigger: 'recurring weekly task', output: 'cross-project digest', impact: 'Saves 1-2 hours weekly consolidating updates across projects' },
      { name: 'Risk Reviewer', trigger: 'project audit task', output: 'risks and mitigation suggestions', impact: 'Catches risks 1-2 weeks earlier than manual review' },
      { name: 'Onboarding Plan Drafter', trigger: 'new hire task', output: '30-60-90 day plan draft', impact: 'Standardizes onboarding, saves 2 hours per new hire' },
      { name: 'Vendor Review Packager', trigger: 'comparison task', output: 'structured summary and decision criteria', impact: 'Saves 1-2 hours per vendor evaluation' }
    ],
    rules: ['escalate overdue work after threshold', 'create renewal review tasks before contract dates', 'route inbound ops tasks by category'],
    avoid: ['fully autonomous process changes without human approval']
  },
  product: {
    name: 'Product / Engineering',
    keywords: ['sprint', 'feature', 'bug', 'spec', 'prd', 'release', 'backlog', 'epic', 'story', 'user story', 'ticket', 'jira', 'agile', 'scrum', 'kanban', 'deploy', 'qa', 'testing', 'retro'],
    section_patterns: ['backlog', 'sprint', 'in progress', 'review', 'qa', 'testing', 'done', 'deployed', 'blocked', 'icebox'],
    field_patterns: ['priority', 'severity', 'sprint', 'story points', 'component', 'type', 'release', 'environment'],
    teammates: [
      { name: 'Spec Reviewer', trigger: 'PRD or spec task', output: 'missing details, dependencies, and questions', impact: 'Catches spec gaps before development starts, saves rework cycles' },
      { name: 'Sprint Risk Reviewer', trigger: 'recurring sprint task', output: 'blockers and at-risk work summary', impact: 'Surfaces risks 2-3 days earlier than standup alone' },
      { name: 'Bug Triage Summarizer', trigger: 'bug review task', output: 'likely duplicates, severity notes, and next-step draft', impact: 'Saves 20-30 min per triage session' },
      { name: 'Release Notes Drafter', trigger: 'release closeout task', output: 'user-facing release summary', impact: 'Saves 1-2 hours per release cycle' },
      { name: 'Retro Synthesizer', trigger: 'retro input task', output: 'themes, wins, and follow-ups', impact: 'Ensures retro insights become actionable, not forgotten' },
      { name: 'Stakeholder Update Writer', trigger: 'milestone review task', output: 'concise status summary', impact: 'Saves 30-45 min per stakeholder update' }
    ],
    rules: ['move new bugs into triage', 'assign P1 items to on-call owner', 'create QA follow-up when dev task completed'],
    avoid: ['dependency creation via Teammate', 'milestone creation via Teammate', 'bulk rescheduling via Teammate']
  },
  client_services: {
    name: 'Client Services / Agency',
    keywords: ['client', 'account', 'deliverable', 'sow', 'statement of work', 'milestone', 'invoice', 'scope', 'retainer', 'agency', 'project management', 'service', 'proposal'],
    section_patterns: ['discovery', 'kickoff', 'in progress', 'delivery', 'review', 'invoicing', 'closed'],
    field_patterns: ['client', 'budget', 'scope', 'phase', 'billing status', 'contract value'],
    teammates: [
      { name: 'SOW Drafter', trigger: 'scope notes task', output: 'statement of work draft', impact: 'Saves 1-2 hours per SOW, ensures consistent structure' },
      { name: 'Client Update Writer', trigger: 'recurring weekly task', output: 'polished weekly update draft', impact: 'Saves 45-60 min per client per week' },
      { name: 'Kickoff Packager', trigger: 'kickoff task', output: 'agenda, questions, and checklist', impact: 'Ensures consistent kickoff prep in 15 min vs 1 hour' },
      { name: 'Scope Gap Reviewer', trigger: 'audit task', output: 'likely scope creep and missing approvals', impact: 'Catches scope issues before they become budget overruns' },
      { name: 'Debrief Analyst', trigger: 'closeout task', output: 'lessons learned and reusable notes', impact: 'Captures reusable IP that typically gets lost between engagements' }
    ],
    rules: ['alert account manager on budget/timeline risk', 'create invoice milestone review tasks before billing', 'move deliverables to pending approval when complete'],
    avoid: ['auto-sending client communications', 'auto-approving scope changes']
  },
  consulting: {
    name: 'Professional Services / Consulting',
    keywords: ['engagement', 'consulting', 'advisory', 'strategy', 'recommendation', 'assessment', 'framework', 'workshop', 'implementation', 'transformation', 'analysis'],
    section_patterns: ['planning', 'discovery', 'analysis', 'recommendation', 'implementation', 'closeout'],
    field_patterns: ['engagement', 'workstream', 'phase', 'deliverable type', 'client', 'practice area'],
    teammates: [
      { name: 'Engagement Brief Builder', trigger: 'intake notes task', output: 'structured engagement brief', impact: 'Standardizes engagement start, saves 1-2 hours per project' },
      { name: 'Deliverable Reviewer', trigger: 'review task', output: 'scope alignment and missing elements', impact: 'Catches deliverable gaps before client review' },
      { name: 'Weekly Portfolio Synthesizer', trigger: 'recurring weekly task', output: 'cross-engagement summary', impact: 'Saves 2+ hours weekly for practice leads' },
      { name: 'Knowledge Capture Drafter', trigger: 'closeout task', output: 'reusable IP notes', impact: 'Ensures institutional knowledge survives project end' },
      { name: 'Proposal Structure Writer', trigger: 'opportunity task', output: 'proposal outline draft', impact: 'Saves 1-2 hours per proposal, ensures consistent structure' }
    ],
    rules: ['create milestone review before deadlines', 'route tasks by workstream', 'flag deliverables approaching due date without owner'],
    avoid: ['auto-generating client-facing deliverables without review', 'pricing or fee estimation']
  }
};

// ─── Trigger type definitions ───

const TRIGGER_TYPES = {
  intake: { label: 'Intake / New Work', asana_trigger: 'Task created or assigned in intake section', example: 'New task in "Intake" project' },
  recurring: { label: 'Recurring / Periodic', asana_trigger: 'Recurring task due date arrives', example: 'Weekly "Status Update" task auto-created every Friday' },
  stage_change: { label: 'Stage / Section Change', asana_trigger: 'Task moved to a specific section', example: 'Task moved to "Review" section' },
  closeout: { label: 'Closeout / Completion', asana_trigger: 'Task completed or moved to "Done"', example: 'Task marked complete in project' },
  review: { label: 'Review / Audit', asana_trigger: 'Task assigned for review or @mention', example: 'Teammate @mentioned in spec task comment' },
  assignment: { label: 'Assignment', asana_trigger: 'Task assigned to the AI Teammate', example: 'Task assigned to "Brief Writer" Teammate' }
};

// ─── Output format templates ───

const OUTPUT_TEMPLATES = {
  brief: { label: 'Structured Brief', sections: ['Objective', 'Background', 'Scope', 'Requirements', 'Timeline', 'Assumptions', 'Open Questions'] },
  summary: { label: 'Status Summary', sections: ['Status Overview', 'Completed This Period', 'In Progress', 'Risks & Blockers', 'Next Steps', 'Owners Needed'] },
  checklist: { label: 'Checklist / Prep Pack', sections: ['Prerequisites', 'Checklist Items', 'Key Questions', 'Documents Needed', 'Attendees / Stakeholders'] },
  debrief: { label: 'Debrief / Lessons Learned', sections: ['Summary', 'What Went Well', 'What Could Improve', 'Key Learnings', 'Reusable Patterns', 'Follow-Up Actions'] },
  review: { label: 'Gap / Risk Review', sections: ['Scope Review', 'Gaps Identified', 'Risks', 'Dependencies', 'Recommendations', 'Priority Actions'] },
  draft: { label: 'Document Draft', sections: ['Title', 'Executive Summary', 'Body Sections', 'Appendix / References'] }
};


module.exports = (client) => [

  // ════════════════════════════════════════════════════════════
  // TOOL 1: analyze_project_ai_readiness (improved)
  // ════════════════════════════════════════════════════════════

  {
    name: 'analyze_project_ai_readiness',
    description: 'Analyze a project for AI automation readiness. Inspects sections, tasks, custom fields, rules, and task patterns to score the project across 4 dimensions: workflow structure, context quality, automation maturity, and repeatability. Returns a readiness report with scores, detected patterns, and prioritized recommendations for AI Teammates, AI Studio rules, or process fixes. Also auto-detects which industry playbook best matches the project. This tool reads data only — it makes no changes. Related: detect_team_industry for industry matching, validate_ai_capability to check specific ideas, generate_teammate_blueprint for full specs.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'The project GID to analyze' },
        include_task_sample: { type: 'boolean', description: 'Sample recent tasks for pattern analysis (default: true). Set false for faster results on large projects.' },
        sample_size: { type: 'number', description: 'Number of tasks to sample (default: 20, max: 50)' }
      },
      required: ['project_gid']
    },
    handler: async (args) => {
      const includeTasks = args.include_task_sample !== false;
      const sampleSize = Math.min(args.sample_size || 20, 50);

      // Parallel fetch: project, sections, rules, and tasks all at once
      const [project, sections, rules, tasksResult] = await Promise.all([
        client.get(`/projects/${args.project_gid}`, {
          opt_fields: 'name,color,notes,public,archived,created_at,modified_at,owner,owner.name,team,team.name,custom_field_settings,custom_field_settings.custom_field,custom_field_settings.custom_field.name,custom_field_settings.custom_field.type,custom_field_settings.custom_field.enum_options'
        }),
        client.get(`/projects/${args.project_gid}/sections`, { opt_fields: 'name' }),
        client.get(`/projects/${args.project_gid}/rules`).catch(() => ({ data: [] })),
        includeTasks
          ? client.get('/tasks', {
              project: args.project_gid, limit: sampleSize,
              opt_fields: 'name,assignee,assignee.name,due_on,completed,completed_at,created_at,custom_fields,custom_fields.name,custom_fields.display_value,resource_subtype,num_subtasks,tags,tags.name'
            }).catch(e => ({ data: [], error: e.message }))
          : Promise.resolve(null)
      ]);

      let taskSample = [];
      let taskStats = {};
      if (includeTasks && tasksResult) {
        if (tasksResult.error) {
          taskStats = { error: 'Could not sample tasks: ' + tasksResult.error };
        } else {
          taskSample = tasksResult.data || [];

          const completed = taskSample.filter(t => t.completed);
          const withAssignee = taskSample.filter(t => t.assignee);
          const withDueDate = taskSample.filter(t => t.due_on);
          const withSubtasks = taskSample.filter(t => t.num_subtasks > 0);
          const withTags = taskSample.filter(t => t.tags && t.tags.length > 0);
          const withCustomFields = taskSample.filter(t =>
            t.custom_fields && t.custom_fields.some(cf => cf.display_value)
          );

          // Name pattern detection
          const namePatterns = {};
          taskSample.forEach(t => {
            const prefix = t.name.split(/[\s\-:]/g).slice(0, 2).join(' ').toLowerCase().trim();
            if (prefix.length > 3) namePatterns[prefix] = (namePatterns[prefix] || 0) + 1;
          });

          taskStats = {
            total_sampled: taskSample.length,
            completed: completed.length,
            with_assignee: withAssignee.length,
            with_due_date: withDueDate.length,
            with_subtasks: withSubtasks.length,
            with_tags: withTags.length,
            with_custom_fields_filled: withCustomFields.length,
            assignee_coverage_pct: taskSample.length ? Math.round((withAssignee.length / taskSample.length) * 100) : 0,
            due_date_coverage_pct: taskSample.length ? Math.round((withDueDate.length / taskSample.length) * 100) : 0,
            custom_field_usage_pct: taskSample.length ? Math.round((withCustomFields.length / taskSample.length) * 100) : 0,
            repetitive_patterns: Object.entries(namePatterns)
              .filter(([, count]) => count >= 2)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([pattern, count]) => ({ pattern, count }))
          };
        }
      }

      // 5. Scoring
      const sectionNames = (sections.data || []).map(s => s.name);
      const customFields = (project.data?.custom_field_settings || []).map(cfs => ({
        name: cfs.custom_field?.name, type: cfs.custom_field?.type,
        has_options: cfs.custom_field?.enum_options?.length > 0
      }));
      const ruleCount = (rules.data || []).length;
      const enabledRules = (rules.data || []).filter(r => r.enabled !== false).length;

      const scores = {};
      const hasMultipleSections = sectionNames.length >= 3;
      const hasStageKeywords = sectionNames.some(s =>
        /backlog|to.?do|in.?progress|review|done|complete|pending|blocked|testing|qa|deploy|intake|draft|approved|live|discovery|delivery/i.test(s)
      );
      scores.workflow_structure = hasMultipleSections && hasStageKeywords ? 90
        : hasMultipleSections ? 60 : sectionNames.length >= 2 ? 40 : 20;

      scores.context_quality = taskStats.assignee_coverage_pct != null
        ? Math.round((taskStats.assignee_coverage_pct + taskStats.due_date_coverage_pct + (taskStats.custom_field_usage_pct || 0)) / 3) : 0;

      scores.automation_maturity = ruleCount >= 5 ? 80 : ruleCount >= 2 ? 50 : ruleCount >= 1 ? 30 : 0;

      const repetitiveCount = taskStats.repetitive_patterns?.length || 0;
      scores.repeatability = repetitiveCount >= 5 ? 90 : repetitiveCount >= 3 ? 70 : repetitiveCount >= 1 ? 40 : 10;

      scores.overall = Math.round(
        (scores.workflow_structure * 0.3) + (scores.context_quality * 0.25) +
        (scores.automation_maturity * 0.15) + (scores.repeatability * 0.3)
      );

      // 6. Auto-detect industry
      const allText = [
        project.data?.name || '',
        ...sectionNames,
        ...customFields.map(cf => cf.name || ''),
        ...taskSample.slice(0, 10).map(t => t.name || '')
      ].join(' ').toLowerCase();

      const industryScores = {};
      for (const [key, playbook] of Object.entries(INDUSTRY_PLAYBOOKS)) {
        let score = 0;
        playbook.keywords.forEach(kw => { if (allText.includes(kw)) score += 3; });
        playbook.section_patterns.forEach(sp => {
          if (sectionNames.some(s => s.toLowerCase().includes(sp))) score += 5;
        });
        playbook.field_patterns.forEach(fp => {
          if (customFields.some(cf => (cf.name || '').toLowerCase().includes(fp))) score += 4;
        });
        if (score > 0) industryScores[key] = { name: playbook.name, score, confidence: score >= 15 ? 'high' : score >= 8 ? 'medium' : 'low' };
      }
      const detectedIndustry = Object.entries(industryScores).sort((a, b) => b[1].score - a[1].score)[0];

      // 7. Recommendations
      const recommendations = [];

      if (scores.workflow_structure < 50) {
        recommendations.push({
          type: 'process_fix', priority: 'high', title: 'Define clear workflow stages',
          detail: 'Project needs well-defined sections (e.g., Backlog, In Progress, Review, Done) before AI automation can be effective.',
          tool_to_use: 'setup_project_workflow or create_section'
        });
      }
      if (scores.context_quality < 40) {
        recommendations.push({
          type: 'process_fix', priority: 'high', title: 'Improve task hygiene',
          detail: `Only ${taskStats.assignee_coverage_pct || 0}% tasks have assignees and ${taskStats.due_date_coverage_pct || 0}% have due dates. AI needs structured context.`,
          tool_to_use: 'bulk_update_tasks'
        });
      }
      if (customFields.length === 0) {
        recommendations.push({
          type: 'process_fix', priority: 'medium', title: 'Add custom fields',
          detail: 'No custom fields found. Fields like status/priority/category enable AI Studio rules and smarter Teammate analysis.',
          tool_to_use: 'create_custom_field'
        });
      }
      if (scores.workflow_structure >= 50 && ruleCount === 0) {
        recommendations.push({
          type: 'ai_studio_rule', priority: 'high', title: 'Add basic automation rules',
          detail: 'Good structure but no automation. Start with: auto-assign on move, auto-complete on Done, notify on stage changes.',
          tool_to_use: 'setup_kanban_workflow or create_rule'
        });
      }
      if (repetitiveCount >= 3 && scores.context_quality >= 40) {
        recommendations.push({
          type: 'ai_teammate', priority: 'high', title: 'AI Teammate for repetitive patterns',
          detail: `Detected ${repetitiveCount} repetitive patterns. A Teammate could draft structured outputs for these. Top patterns: ${(taskStats.repetitive_patterns || []).slice(0, 3).map(p => `"${p.pattern}" (${p.count}x)`).join(', ')}.`,
          asana_capability: 'Supported — AI Teammates can read tasks and create drafts triggered by assignment or @mention.',
          next_step: 'Use generate_teammate_blueprint to create a full spec for this.'
        });
      }
      if (scores.overall >= 60) {
        recommendations.push({
          type: 'ai_teammate', priority: 'medium', title: 'Status synthesis Teammate',
          detail: 'Project readiness is high enough for a Teammate that generates weekly status updates from recent task activity.',
          asana_capability: 'Supported — Teammates can read project history and draft status on recurring tasks.',
          next_step: 'Use generate_teammate_blueprint with output_type=summary'
        });
      }

      // Add industry-specific recommendations
      if (detectedIndustry) {
        const playbook = INDUSTRY_PLAYBOOKS[detectedIndustry[0]];
        const topTeammate = playbook.teammates[0];
        recommendations.push({
          type: 'ai_teammate', priority: 'high',
          title: `[${playbook.name}] ${topTeammate.name}`,
          detail: `Industry match: ${playbook.name}. Best first Teammate: "${topTeammate.name}" — ${topTeammate.trigger} → ${topTeammate.output}. ${topTeammate.impact}.`,
          next_step: `Use generate_teammate_blueprint with industry="${detectedIndustry[0]}" and teammate_index=0`
        });
      }

      // Warnings
      const warnings = [];
      if (project.data?.public === false) {
        warnings.push('Project is PRIVATE — AI Teammate must be explicitly added as a member.');
      }
      warnings.push('AI Teammates cannot: browse web, call external APIs, create custom fields/dependencies, bulk-update, or generate images.');
      warnings.push('API rules do NOT fire on API-initiated changes — only UI changes trigger them.');

      return {
        project: {
          name: project.data?.name, gid: args.project_gid,
          owner: project.data?.owner?.name, team: project.data?.team?.name,
          is_public: project.data?.public, sections: sectionNames,
          custom_fields: customFields, existing_rules: ruleCount, enabled_rules: enabledRules
        },
        scores,
        task_statistics: taskStats,
        detected_industry: detectedIndustry ? { key: detectedIndustry[0], ...detectedIndustry[1] } : null,
        recommendations,
        warnings,
        readiness_summary: scores.overall >= 70
          ? 'READY — Project has strong structure and patterns for AI automation.'
          : scores.overall >= 40
            ? 'PARTIALLY READY — Some process improvements needed before AI will be effective.'
            : 'NOT READY — Focus on workflow structure and task hygiene first.',
        next_steps: [
          'Use validate_ai_capability to check specific automation ideas against AI Teammate limits.',
          'Use generate_teammate_blueprint to create copy-paste-ready specs for recommended Teammates.',
          'Use detect_team_industry for more detailed industry playbook matching.'
        ]
      };
    }
  },

  // ════════════════════════════════════════════════════════════
  // TOOL 2: analyze_workspace_overview
  // ════════════════════════════════════════════════════════════

  {
    name: 'analyze_workspace_overview',
    description: 'Get a high-level overview of workspace structure for AI planning. Lists all teams, counts projects per team, and identifies the most active projects. Use this as the starting point when analyzing a workspace for AI Teammate and automation opportunities. Returns team structure, project counts, and suggestions for which projects to analyze deeper. This tool reads data only. Related: analyze_project_ai_readiness for deep project analysis, detect_team_industry for industry matching.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace_gid: { type: 'string', description: 'The workspace GID to analyze' },
        include_archived: { type: 'boolean', description: 'Include archived projects (default: false)' }
      },
      required: ['workspace_gid']
    },
    handler: async (args) => {
      // Parallel fetch: teams + projects
      const [teams, projects] = await Promise.all([
        client.get(`/organizations/${args.workspace_gid}/teams`, { limit: 100, opt_fields: 'name' })
          .catch(() => ({ data: [] })),
        client.get('/projects', {
          workspace: args.workspace_gid, limit: 100, archived: args.include_archived || false,
          opt_fields: 'name,team,team.name,public,modified_at,owner,owner.name,custom_field_settings'
        })
      ]);
      const projectList = projects.data || [];

      const byTeam = {};
      projectList.forEach(p => {
        const teamName = p.team?.name || '(No team)';
        if (!byTeam[teamName]) byTeam[teamName] = [];
        byTeam[teamName].push({
          gid: p.gid, name: p.name, is_public: p.public, modified_at: p.modified_at,
          owner: p.owner?.name, has_custom_fields: (p.custom_field_settings || []).length > 0
        });
      });
      Object.values(byTeam).forEach(ps => ps.sort((a, b) => new Date(b.modified_at) - new Date(a.modified_at)));

      const recentProjects = [...projectList]
        .sort((a, b) => new Date(b.modified_at) - new Date(a.modified_at))
        .slice(0, 5)
        .map(p => ({ gid: p.gid, name: p.name, team: p.team?.name, modified_at: p.modified_at }));

      return {
        workspace_gid: args.workspace_gid,
        summary: {
          total_teams: (teams.data || []).length, total_projects: projectList.length,
          projects_with_custom_fields: projectList.filter(p => (p.custom_field_settings || []).length > 0).length,
          public_projects: projectList.filter(p => p.public).length,
          private_projects: projectList.filter(p => !p.public).length
        },
        teams_and_projects: byTeam,
        recommended_for_deep_analysis: recentProjects,
        next_step: 'Use analyze_project_ai_readiness on the recommended projects for a detailed AI-readiness assessment.'
      };
    }
  },

  // ════════════════════════════════════════════════════════════
  // TOOL 3: detect_team_industry (NEW)
  // ════════════════════════════════════════════════════════════

  {
    name: 'detect_team_industry',
    description: 'Auto-detect which industry playbook best matches a project or team based on project names, section names, custom field names, and task name patterns. Returns ranked industry matches with confidence scores and recommended AI Teammates for the top match. Available industries: executive_search, marketing, operations, product, client_services, consulting. Use this to determine the best starting playbook before generating Teammate blueprints. Related: analyze_project_ai_readiness for full readiness analysis, generate_teammate_blueprint to create specs.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID to analyze for industry detection' },
        additional_context: { type: 'string', description: 'Optional: describe what the team does to improve detection accuracy (e.g., "we\'re a recruiting firm focused on executive placement")' }
      },
      required: ['project_gid']
    },
    handler: async (args) => {
      // Parallel fetch: project, sections, tasks
      const [project, sections, tasks] = await Promise.all([
        client.get(`/projects/${args.project_gid}`, {
          opt_fields: 'name,notes,team,team.name,custom_field_settings,custom_field_settings.custom_field,custom_field_settings.custom_field.name'
        }),
        client.get(`/projects/${args.project_gid}/sections`, { opt_fields: 'name' }),
        client.get('/tasks', {
          project: args.project_gid, limit: 15,
          opt_fields: 'name,tags,tags.name'
        })
      ]);

      const sectionNames = (sections.data || []).map(s => s.name);
      const customFieldNames = (project.data?.custom_field_settings || []).map(cfs => cfs.custom_field?.name || '');
      const taskNames = (tasks.data || []).map(t => t.name);
      const tagNames = (tasks.data || []).flatMap(t => (t.tags || []).map(tag => tag.name));

      const allText = [
        project.data?.name || '', project.data?.notes || '',
        project.data?.team?.name || '', args.additional_context || '',
        ...sectionNames, ...customFieldNames, ...taskNames, ...tagNames
      ].join(' ').toLowerCase();

      const results = [];
      for (const [key, playbook] of Object.entries(INDUSTRY_PLAYBOOKS)) {
        let score = 0;
        const matchedSignals = [];

        playbook.keywords.forEach(kw => {
          if (allText.includes(kw)) { score += 3; matchedSignals.push(`keyword: "${kw}"`); }
        });
        playbook.section_patterns.forEach(sp => {
          if (sectionNames.some(s => s.toLowerCase().includes(sp))) { score += 5; matchedSignals.push(`section: "${sp}"`); }
        });
        playbook.field_patterns.forEach(fp => {
          if (customFieldNames.some(cf => cf.toLowerCase().includes(fp))) { score += 4; matchedSignals.push(`field: "${fp}"`); }
        });

        if (score > 0) {
          results.push({
            industry: key,
            name: playbook.name,
            score,
            confidence: score >= 15 ? 'high' : score >= 8 ? 'medium' : 'low',
            matched_signals: matchedSignals.slice(0, 10),
            recommended_teammates: playbook.teammates.slice(0, 3).map((t, i) => ({
              index: i, name: t.name, trigger: t.trigger, output: t.output, impact: t.impact
            })),
            recommended_rules: playbook.rules,
            avoid: playbook.avoid
          });
        }
      }

      results.sort((a, b) => b.score - a.score);

      return {
        project: { gid: args.project_gid, name: project.data?.name, team: project.data?.team?.name },
        analyzed_signals: { sections: sectionNames, custom_fields: customFieldNames, sample_tasks: taskNames.length, tags: [...new Set(tagNames)] },
        industry_matches: results,
        best_match: results[0] || null,
        no_match_suggestion: results.length === 0
          ? 'No strong industry match detected. Provide additional_context describing what the team does, or use analyze_project_ai_readiness for a general assessment.'
          : null,
        next_step: results[0]
          ? `Use generate_teammate_blueprint with industry="${results[0].industry}" and teammate_index=0 to create a full spec for "${results[0].recommended_teammates[0]?.name}".`
          : 'Use analyze_project_ai_readiness for a general readiness assessment.'
      };
    }
  },

  // ════════════════════════════════════════════════════════════
  // TOOL 4: validate_ai_capability (NEW)
  // ════════════════════════════════════════════════════════════

  {
    name: 'validate_ai_capability',
    description: 'Validate whether a proposed AI Teammate behavior is feasible given current Asana AI Teammate capabilities. Takes a plain-text description of what you want the Teammate to do and checks it against known capabilities and hard limitations. Returns green flags (supported), yellow flags (supported with caveats), and red flags (not possible today) with alternatives for each blocker. Use this BEFORE building or recommending any AI Teammate to avoid wasted effort. Related: generate_teammate_blueprint to create specs for validated ideas, analyze_project_ai_readiness for project assessment.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        proposed_behavior: { type: 'string', description: 'Plain-text description of what you want the AI Teammate to do. Example: "When a new bug is filed, research similar bugs on GitHub, summarize the findings, and create subtasks for the fix"' },
        project_gid: { type: 'string', description: 'Optional: project GID to check access model (public vs private)' }
      },
      required: ['proposed_behavior']
    },
    handler: async (args) => {
      const text = args.proposed_behavior.toLowerCase();

      const green = [];
      const yellow = [];
      const red = [];

      // Check against CAN DO list
      const canDoChecks = [
        { patterns: ['read task', 'review task', 'look at task', 'check task', 'inspect task', 'analyze task'], capability: 'Read tasks, projects, sections, comments' },
        { patterns: ['create task', 'make task', 'add task', 'new task'], capability: 'Create tasks' },
        { patterns: ['create subtask', 'add subtask'], capability: 'Create subtasks (on tasks it created)' },
        { patterns: ['comment', 'add comment', 'post comment', 'reply', 'respond'], capability: 'Add comments to tasks' },
        { patterns: ['assign', 'reassign', 'set assignee'], capability: 'Assign tasks (with approval when required)' },
        { patterns: ['complete', 'mark done', 'mark complete', 'close task'], capability: 'Mark tasks complete' },
        { patterns: ['draft', 'write', 'generate', 'create brief', 'create summary', 'summarize', 'synthesize'], capability: 'Draft briefs, summaries, reviews, and structured outputs' },
        { patterns: ['update field', 'set field', 'change field', 'update custom field', 'set status'], capability: 'Update existing custom field values' },
        { patterns: ['google doc', 'google sheet', 'create doc', 'create spreadsheet', 'linked doc'], capability: 'Create/edit linked Google Docs or Sheets' },
        { patterns: ['search file', 'search doc', 'find document', 'look up file'], capability: 'Search external files (when both user and Teammate have access)' },
        { patterns: ['section', 'create section', 'update section', 'move section'], capability: 'Create or update sections' },
        { patterns: ['create project', 'new project', 'set up project'], capability: 'Create projects' },
        { patterns: ['remember', 'recall', 'learn from', 'memory', 'past work'], capability: 'Store memories from work performed (respecting permissions)' }
      ];

      canDoChecks.forEach(check => {
        if (check.patterns.some(p => text.includes(p))) {
          green.push({ capability: check.capability, status: 'SUPPORTED' });
        }
      });

      // Check against CANNOT DO list (red flags)
      const cannotDoChecks = [
        { patterns: ['browse web', 'web search', 'google search', 'search online', 'research online', 'scrape', 'crawl', 'fetch url', 'visit website', 'check website', 'look up online', 'internet'], item: AI_TEAMMATE_CANNOT[0] },
        { patterns: ['api call', 'call api', 'external api', 'rest api', 'webhook call', 'http request', 'fetch data from'], item: AI_TEAMMATE_CANNOT[1] },
        { patterns: ['database', 'crm', 'salesforce', 'hubspot', 'sql', 'postgres', 'mongo', 'sync data', 'pull from crm', 'update crm'], item: AI_TEAMMATE_CANNOT[2] },
        { patterns: ['create custom field', 'add custom field', 'new field', 'define field'], item: AI_TEAMMATE_CANNOT[3] },
        { patterns: ['remove from project', 'unlink from project', 'detach from project'], item: AI_TEAMMATE_CANNOT[4] },
        { patterns: ['create dependency', 'add dependency', 'depends on', 'blocked by', 'blocking'], item: AI_TEAMMATE_CANNOT[5] },
        { patterns: ['bulk update', 'mass update', 'update all tasks', 'batch update', 'update hundreds', 'update dozens'], item: AI_TEAMMATE_CANNOT[6] },
        { patterns: ['create milestone', 'add milestone', 'create goal', 'set goal', 'create okr'], item: AI_TEAMMATE_CANNOT[7] },
        { patterns: ['create dashboard', 'create chart', 'build report', 'create graph', 'visualization'], item: AI_TEAMMATE_CANNOT[8] },
        { patterns: ['send email', 'send message', 'send slack', 'notify via email', 'send notification outside'], item: AI_TEAMMATE_CANNOT[9] },
        { patterns: ['add user to team', 'remove user', 'manage team members', 'add member to project'], item: AI_TEAMMATE_CANNOT[10] },
        { patterns: ['attach file', 'upload file', 'add attachment'], item: AI_TEAMMATE_CANNOT[11] },
        { patterns: ['generate image', 'create pdf', 'create image', 'design', 'make pdf'], item: AI_TEAMMATE_CANNOT[12] },
        { patterns: ['monitor', 'poll', 'watch for changes', 'continuously check', 'real-time', 'listen for'], item: AI_TEAMMATE_CANNOT[13] }
      ];

      cannotDoChecks.forEach(check => {
        if (check.patterns.some(p => text.includes(p))) {
          red.push({
            capability: check.item.capability,
            status: 'NOT SUPPORTED',
            alternative: check.item.alternative
          });
        }
      });

      // Yellow flag checks (caveats)
      if (text.includes('private') || text.includes('restricted') || text.includes('confidential')) {
        yellow.push({
          capability: 'Access to private work',
          status: 'SUPPORTED WITH CAVEATS',
          caveat: 'Teammate must be explicitly added as a member to private projects/tasks. Third-party file access uses the triggering user\'s tokens.'
        });
      }
      if (text.includes('schedule') || text.includes('recurring') || text.includes('every week') || text.includes('every day') || text.includes('periodic')) {
        yellow.push({
          capability: 'Scheduled/recurring execution',
          status: 'SUPPORTED WITH CAVEATS',
          caveat: 'Teammates cannot poll or self-trigger. Use a recurring task (created via create_recurring_tasks) to trigger the Teammate on a schedule.'
        });
      }
      if (text.includes('approve') || text.includes('publish') || text.includes('send to client') || text.includes('finalize')) {
        yellow.push({
          capability: 'Approval/publishing actions',
          status: 'SUPPORTED WITH CAVEATS',
          caveat: 'Teammates should DRAFT, not auto-publish. A human must review and approve final output. Set a clear human review boundary.'
        });
      }
      if (text.includes('multiple project') || text.includes('cross-project') || text.includes('across projects')) {
        yellow.push({
          capability: 'Cross-project work',
          status: 'SUPPORTED WITH CAVEATS',
          caveat: 'Teammate can access multiple projects IF explicitly added to each. Cross-project memory works only for accessible projects.'
        });
      }

      // Check project access model if provided
      let accessWarning = null;
      if (args.project_gid) {
        try {
          const proj = await client.get(`/projects/${args.project_gid}`, { opt_fields: 'name,public' });
          if (proj.data?.public === false) {
            accessWarning = `Project "${proj.data.name}" is PRIVATE. The AI Teammate must be explicitly added as a member before it can access any tasks.`;
          }
        } catch (e) { /* ignore */ }
      }

      const feasible = red.length === 0;
      const feasibleWithCaveats = red.length === 0 && yellow.length > 0;

      return {
        proposed_behavior: args.proposed_behavior,
        verdict: feasible
          ? (feasibleWithCaveats ? 'FEASIBLE WITH CAVEATS' : 'FULLY FEASIBLE')
          : (green.length > 0 ? 'PARTIALLY FEASIBLE — some capabilities blocked' : 'NOT FEASIBLE'),
        green_flags: green,
        yellow_flags: yellow,
        red_flags: red,
        access_warning: accessWarning,
        suggestion: red.length > 0
          ? `${red.length} capability(ies) are not supported by AI Teammates. Consider a HYBRID approach: use a Claude Code agent for blocked capabilities (${red.map(r => r.capability).join(', ')}), then hand off results to an AI Teammate in Asana for the collaborative parts.`
          : null,
        next_step: feasible
          ? 'Use generate_teammate_blueprint to create a full, copy-paste-ready spec for this Teammate.'
          : 'Revise the proposed behavior to avoid red-flagged capabilities, or design a hybrid approach.'
      };
    }
  },

  // ════════════════════════════════════════════════════════════
  // TOOL 5: generate_teammate_blueprint (NEW)
  // ════════════════════════════════════════════════════════════

  {
    name: 'generate_teammate_blueprint',
    description: 'Generate a complete, copy-paste-ready AI Teammate specification for Asana AI Studio. Produces: teammate name, behavior instructions (ready to paste into Asana), trigger configuration, scope and access requirements, key resources to attach, human review boundary, build steps, test case, and expected impact. Can generate from: (1) an industry playbook + teammate index, (2) a custom description, or (3) project analysis. The behavior instructions are structured but include [CUSTOMIZE] markers where human judgment is needed. Related: validate_ai_capability to check feasibility first, detect_team_industry to find the right playbook, analyze_project_ai_readiness for project context.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID for context (sections, fields, team name). Recommended for better specs.' },
        industry: {
          type: 'string', description: 'Industry playbook to use. Use detect_team_industry to find the best match.',
          enum: ['executive_search', 'marketing', 'operations', 'product', 'client_services', 'consulting']
        },
        teammate_index: { type: 'number', description: 'Index of the teammate from the industry playbook (0-based). Use detect_team_industry to see available options.' },
        custom_name: { type: 'string', description: 'Custom teammate name (overrides playbook). Use when building a non-playbook teammate.' },
        custom_description: { type: 'string', description: 'Custom description of what the teammate should do. Use when building a non-playbook teammate.' },
        trigger_type: {
          type: 'string', description: 'How the teammate gets triggered.',
          enum: ['intake', 'recurring', 'stage_change', 'closeout', 'review', 'assignment']
        },
        output_type: {
          type: 'string', description: 'What format the teammate produces.',
          enum: ['brief', 'summary', 'checklist', 'debrief', 'review', 'draft']
        },
        tier: { type: 'number', description: 'Priority tier (1=build first, 2=build next, 3=build later). Default: 1', enum: [1, 2, 3] }
      },
      required: []
    },
    handler: async (args) => {
      // Resolve teammate details from playbook or custom input
      let teammateName, teammateDescription, triggerLabel, outputLabel, impact;
      let playbookSource = null;

      if (args.industry && INDUSTRY_PLAYBOOKS[args.industry]) {
        const playbook = INDUSTRY_PLAYBOOKS[args.industry];
        const idx = args.teammate_index || 0;
        const tm = playbook.teammates[Math.min(idx, playbook.teammates.length - 1)];
        teammateName = args.custom_name || tm.name;
        teammateDescription = args.custom_description || `${tm.trigger} → ${tm.output}`;
        impact = tm.impact;
        playbookSource = playbook.name;

        // Infer trigger and output types from playbook
        if (!args.trigger_type) {
          if (tm.trigger.includes('intake') || tm.trigger.includes('new')) args.trigger_type = 'intake';
          else if (tm.trigger.includes('recurring') || tm.trigger.includes('weekly')) args.trigger_type = 'recurring';
          else if (tm.trigger.includes('stage') || tm.trigger.includes('moves to') || tm.trigger.includes('moved to')) args.trigger_type = 'stage_change';
          else if (tm.trigger.includes('closeout') || tm.trigger.includes('completion')) args.trigger_type = 'closeout';
          else if (tm.trigger.includes('review') || tm.trigger.includes('audit')) args.trigger_type = 'review';
          else args.trigger_type = 'assignment';
        }
        if (!args.output_type) {
          if (tm.output.includes('brief') || tm.output.includes('structured')) args.output_type = 'brief';
          else if (tm.output.includes('summary') || tm.output.includes('update') || tm.output.includes('digest')) args.output_type = 'summary';
          else if (tm.output.includes('checklist') || tm.output.includes('prep') || tm.output.includes('pack')) args.output_type = 'checklist';
          else if (tm.output.includes('debrief') || tm.output.includes('lessons')) args.output_type = 'debrief';
          else if (tm.output.includes('review') || tm.output.includes('gap') || tm.output.includes('risk')) args.output_type = 'review';
          else args.output_type = 'draft';
        }
      } else {
        teammateName = args.custom_name || 'AI Teammate';
        teammateDescription = args.custom_description || 'Custom AI Teammate';
        impact = '[CUSTOMIZE: estimate time saved per occurrence]';
      }

      const trigger = TRIGGER_TYPES[args.trigger_type || 'assignment'];
      const output = OUTPUT_TEMPLATES[args.output_type || 'brief'];
      const tier = args.tier || 1;

      // Get project context if available
      let projectContext = null;
      if (args.project_gid) {
        try {
          const proj = await client.get(`/projects/${args.project_gid}`, {
            opt_fields: 'name,public,team,team.name,custom_field_settings,custom_field_settings.custom_field,custom_field_settings.custom_field.name'
          });
          const secs = await client.get(`/projects/${args.project_gid}/sections`, { opt_fields: 'name' });
          projectContext = {
            name: proj.data?.name,
            team: proj.data?.team?.name,
            is_public: proj.data?.public,
            sections: (secs.data || []).map(s => s.name),
            custom_fields: (proj.data?.custom_field_settings || []).map(cfs => cfs.custom_field?.name)
          };
        } catch (e) { /* ignore */ }
      }

      const projectName = projectContext?.name || '[YOUR PROJECT]';
      const teamName = projectContext?.team || '[YOUR TEAM]';
      const sectionList = projectContext?.sections?.join(', ') || '[YOUR SECTIONS]';

      // Generate behavior instructions
      const behaviorInstructions = `You are a ${teammateName} for the ${teamName} team.

ROLE: You help the team by producing ${output.label.toLowerCase()} outputs when assigned work or @mentioned.

WHEN TRIGGERED:
- Read the task description, comments, and any linked files carefully
- Review relevant context from the project "${projectName}" (sections: ${sectionList})
${projectContext?.custom_fields?.length ? `- Check custom fields: ${projectContext.custom_fields.join(', ')}` : '- [CUSTOMIZE: list custom fields to check]'}

OUTPUT FORMAT:
Produce a ${output.label} with these sections:
${output.sections.map((s, i) => `${i + 1}. ${s}`).join('\n')}

TONE:
- Professional and concise
- [CUSTOMIZE: specify formal/casual, technical level, audience]

CONSTRAINTS:
- Only use information available in the task, project, and attached files
- Do NOT make up data or statistics
- Do NOT make decisions that require human judgment — flag them as "Needs Decision"
- [CUSTOMIZE: add team-specific constraints]

WHEN UNCLEAR:
- If the task description is too vague, add a comment asking for: [CUSTOMIZE: specify what to ask for]
- If required information is missing, create a partial output and clearly mark gaps

WHAT NOT TO DO:
- Do not send external communications
- Do not modify other tasks without explicit instruction
- Do not assume access to private projects you haven't been added to
- [CUSTOMIZE: add team-specific restrictions]`;

      // Build the full spec
      const spec = {
        teammate_name: teammateName,
        tool: 'Asana AI Teammate',
        priority: `Tier ${tier}`,
        industry_playbook: playbookSource || 'Custom',

        why_this_tool: `This work involves collaborative, visible drafting of ${output.label.toLowerCase()} outputs where multiple team members benefit from seeing the result. The main inputs live in Asana tasks and comments. A human will review the output before acting on it.`,

        what_it_does: teammateDescription,

        trigger: {
          type: trigger.label,
          asana_trigger: trigger.asana_trigger,
          example: trigger.example,
          starter_task: `Create a task in "${projectName}" titled "[CUSTOMIZE: task title]" and assign to this Teammate`
        },

        scope_and_access: {
          team: teamName,
          projects_to_access: [projectName],
          is_private: projectContext ? !projectContext.is_public : null,
          private_access_note: projectContext && !projectContext.is_public
            ? 'This project is PRIVATE. You must add the AI Teammate as a project member before it can access tasks.'
            : 'Project is public to domain — Teammate can access by default.',
          connected_tools: '[CUSTOMIZE: Google Drive / SharePoint / OneDrive / none]',
          who_can_manage: '[CUSTOMIZE: roles or users who manage this Teammate]'
        },

        behavior_instructions: behaviorInstructions,
        behavior_instructions_note: 'Copy-paste the behavior_instructions field directly into the Asana AI Studio "Behavior" field. Replace all [CUSTOMIZE] markers with your team-specific values.',

        key_resources: [
          '[CUSTOMIZE: link to templates or exemplar outputs]',
          '[CUSTOMIZE: link to SOPs or process docs]',
          '[CUSTOMIZE: link to style guides or glossaries]',
          'Tip: if a new team member should read it on day one, it\'s a good key resource'
        ],

        human_review_boundary: [
          `Human must review and approve all ${output.label.toLowerCase()} outputs before they are shared externally or acted upon`,
          'Teammate can mark work as "Ready for Review" but should NOT auto-publish or send to clients',
          '[CUSTOMIZE: add specific approval gates for your team]'
        ],

        failure_modes: [
          `Insufficient context: if intake/trigger task lacks detail, output will be generic — fix by requiring structured input`,
          'Access issues: if project is private and Teammate not added, it will fail silently',
          'Stale key resources: if attached docs are outdated, output will reference old information',
          '[CUSTOMIZE: add team-specific failure modes]'
        ],

        build_steps: [
          '1. Go to Asana AI Studio → Create new Teammate',
          `2. Name: "${teammateName}"`,
          `3. Add to team: "${teamName}"`,
          projectContext && !projectContext.is_public ? `4. Add Teammate as member to project "${projectName}" (it's private)` : `4. Verify Teammate can access project "${projectName}" (public)`,
          '5. Paste the behavior_instructions into the Behavior field',
          '6. Attach key resources (templates, SOPs, examples)',
          '7. Set trigger configuration as specified above',
          '8. Run the test case below to validate'
        ],

        test_case: {
          input: `Create a task in "${projectName}" with a realistic ${trigger.label.toLowerCase()} description. Include typical details your team would provide.`,
          expected_output: `${output.label} with all ${output.sections.length} sections populated: ${output.sections.join(', ')}. No blank sections. Language is clear and actionable.`,
          pass_criteria: [
            `All ${output.sections.length} sections are present and populated`,
            'No fabricated data or statistics',
            'Unclear items are flagged as "Needs Decision" rather than assumed',
            'Tone matches team standards',
            'Output is actionable (someone can act on it without asking clarifying questions)'
          ]
        },

        expected_impact: impact,

        quality_checklist: {
          tool_choice_justified: true,
          access_requirements_explicit: true,
          behavior_instructions_written: true,
          key_resources_specific: false, // needs human to fill [CUSTOMIZE]
          trigger_concrete: true,
          human_review_boundary_stated: true,
          test_case_specific: true,
          expected_impact_specific: !!impact && !impact.includes('[CUSTOMIZE]')
        },

        customize_markers_remaining: behaviorInstructions.split('[CUSTOMIZE').length - 1,
        note: 'This blueprint is ~70% ready. Search for [CUSTOMIZE] markers and replace them with your team-specific values. The behavior_instructions can be pasted directly into Asana AI Studio once customized.'
      };

      return spec;
    }
  }
];
