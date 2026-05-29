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

// ─── Implementation subtasks by methodology (77 total) ───
// Classification: A = fully automated, PA = partially automated, M = manual

const IMPLEMENTATION_SUBTASKS = {
  scoring: [
    { id: 'S1', name: 'Run maturity assessment', methodologies: ['quick_start', 'hybrid', 'enterprise'], type: 'A', tool: 'assess_asana_maturity', args: { workspace_gid: '{workspace_gid}' }, hours: 0.25, dependencies: [] },
    { id: 'S2', name: 'Review 5-dimension scores', methodologies: ['quick_start', 'hybrid', 'enterprise'], type: 'PA', tool: 'assess_asana_maturity', manual_steps: ['Present scores to client', 'Discuss each dimension', 'Identify areas of agreement/disagreement'], hours: 1, dependencies: ['S1'] },
    { id: 'S3', name: 'Confirm methodology', methodologies: ['quick_start', 'hybrid', 'enterprise'], type: 'M', manual_steps: ['Present score and recommended methodology to sponsor', 'Discuss budget and timeline constraints', 'Agree on Quick Start / Hybrid / Enterprise', 'Document decision and rationale'], hours: 0.5, dependencies: ['S2'] },
    { id: 'S4', name: 'Document quick wins', methodologies: ['quick_start', 'hybrid', 'enterprise'], type: 'PA', tool: 'assess_asana_maturity', manual_steps: ['Review quick_wins[] from tool output', 'Prioritize with client by effort vs impact', 'Assign owners for each quick win'], hours: 0.5, dependencies: ['S1'] },
    { id: 'S5', name: 'Stakeholder interviews', methodologies: ['enterprise'], type: 'M', manual_steps: ['Identify 4-8 key stakeholders across departments', 'Schedule 30min interviews with each', 'Questions: pain points, priorities, expectations, current tools, resistance areas', 'Document findings per stakeholder', 'Synthesize into common themes and conflicts'], hours: 8, dependencies: ['S3'] },
    { id: 'S6', name: 'Document blockers & risks', methodologies: ['hybrid', 'enterprise'], type: 'PA', tool: 'assess_asana_maturity', manual_steps: ['Review blockers[] from tool output', 'Add business-specific risks (budget, timeline, change resistance, dependencies)', 'Classify each as: must-resolve-before-start vs monitor-during'], hours: 1, dependencies: ['S1'] },
  ],
  discovery: [
    { id: 'D1', name: 'Core module questionnaire (5Q)', methodologies: ['quick_start'], type: 'PA', prompt: 'asana_discovery_session', manual_steps: ['Run prompt to generate questions', 'Conduct interview with client (30-45min)', 'Document answers in wizard'], hours: 1.5, dependencies: ['S3'] },
    { id: 'D2', name: 'Standard questionnaire (7Q)', methodologies: ['hybrid'], type: 'PA', prompt: 'asana_discovery_session', manual_steps: ['Run prompt to generate questions adapted to maturity score', 'Conduct 2-3 interview sessions (45min each)', 'Document answers and follow-up items'], hours: 3, dependencies: ['S3'] },
    { id: 'D3', name: 'Deep questionnaire (12Q)', methodologies: ['enterprise'], type: 'PA', prompt: 'asana_discovery_session', manual_steps: ['Run prompt with depth=deep', 'Conduct 4-6 interview sessions across departments', 'Cross-reference answers for consistency', 'Flag contradictions for resolution'], hours: 8, dependencies: ['S3', 'S5'] },
    { id: 'D4', name: 'Client document upload + analysis', methodologies: ['quick_start', 'hybrid', 'enterprise'], type: 'PA', manual_steps: ['Request SOPs, process docs, org charts from client', 'Upload to wizard for AI analysis', 'Review AI-extracted insights', 'Flag gaps in documentation'], hours: 2, dependencies: ['S3'] },
    { id: 'D5', name: 'Process mapping workshops', methodologies: ['hybrid', 'enterprise'], type: 'M', manual_steps: ['Prepare Miro/whiteboard with swim lanes', 'For each key process: map trigger → steps → handoffs → output', 'Identify bottlenecks, manual steps, approval gates', 'Document as-is vs to-be state', 'Take photos/screenshots and attach to Asana tasks'], hours: 4, dependencies: ['D2'] },
    { id: 'D6', name: 'Integration inventory', methodologies: ['enterprise'], type: 'PA', tool: 'analyze_workspace_overview', manual_steps: ['Review MCP output for existing webhooks and external data', 'Interview IT team about: CRM, email, calendar, file storage, analytics tools', 'Document each integration: direction (in/out/bidirectional), frequency, data volume, owner'], hours: 3, dependencies: ['D3'] },
    { id: 'D7', name: 'Data quality assessment', methodologies: ['enterprise'], type: 'M', manual_steps: ['Export 100 representative tasks from top 3 projects', 'Audit: empty required fields, inconsistent naming, duplicates, orphaned tasks', 'Score data quality 0-100 using checklist', 'Document cleanup requirements before migration', 'Estimate hours for data cleanup'], hours: 3, dependencies: ['D3'] },
    { id: 'D8', name: 'Validate requirements', methodologies: ['quick_start', 'hybrid'], type: 'PA', manual_steps: ['Compile discovery findings into requirements list', 'Schedule 30min validation session with stakeholders', 'Walk through each requirement: confirm, modify, or remove', 'Get verbal sign-off on final requirements list'], hours: 1, dependencies: ['D1'] },
    { id: 'D9', name: 'Validate across departments', methodologies: ['enterprise'], type: 'M', manual_steps: ['Schedule cross-departmental session (60-90min)', 'Present consolidated requirements from all interviews', 'Identify conflicts in priorities between departments', 'Facilitate resolution with sponsor as tiebreaker', 'Document agreed priorities and deferred items'], hours: 3, dependencies: ['D3', 'D6'] },
  ],
  fitgap: [
    { id: 'F1', name: 'Run fit-gap analysis', methodologies: ['quick_start', 'hybrid', 'enterprise'], type: 'A', tool: 'generate_fitgap_analysis', args: { workspace_gid: '{workspace_gid}' }, hours: 0.25, dependencies: ['D8'] },
    { id: 'F2', name: 'Review N/C/D/CP classifications', methodologies: ['quick_start', 'hybrid', 'enterprise'], type: 'PA', tool: 'generate_fitgap_analysis', manual_steps: ['Review each classification with client', 'Adjust where client has domain expertise that changes classification', 'Document rationale for any changes'], hours: 1.5, dependencies: ['F1'] },
    { id: 'F3', name: 'Prioritize with MoSCoW', methodologies: ['hybrid', 'enterprise'], type: 'M', manual_steps: ['For each requirement, ask sponsor: Must / Should / Could / Wont', 'Must: business cannot operate without it', 'Should: important but workaround exists', 'Could: nice to have, implement if time allows', 'Wont: agreed to defer to future phase', 'Document justification for each Must item'], hours: 2, dependencies: ['F2'] },
    { id: 'F4', name: 'Technical feasibility review', methodologies: ['enterprise'], type: 'PA', tool: 'validate_ai_capability', manual_steps: ['Run validate_ai_capability for each C and D item', 'For D items: assess integration complexity (API docs, auth, data mapping)', 'For red flags: document alternative approaches', 'Estimate revised hours for complex D items'], hours: 3, dependencies: ['F2'] },
    { id: 'F5', name: 'Client scope sign-off', methodologies: ['quick_start', 'hybrid', 'enterprise'], type: 'M', manual_steps: ['Prepare fit-gap matrix document (from tool output)', 'Present to sponsor and key stakeholders', 'Walk through each D and CP item and confirm', 'Document what is IN and OUT of scope', 'Get written sign-off (email or digital signature)', 'Archive signed scope document'], hours: 1, dependencies: ['F2'] },
    { id: 'F6', name: 'Business impact scoring', methodologies: ['enterprise'], type: 'M', manual_steps: ['For each D and CP item, estimate: revenue impact (H/M/L), risk if not done (H/M/L), urgency (H/M/L)', 'Create weighted score: revenue×3 + risk×2 + urgency×1', 'Rank items by weighted score', 'Present to sponsor for final prioritization'], hours: 2, dependencies: ['F3', 'F4'] },
  ],
  proposal: [
    { id: 'P1', name: 'Generate DVA', methodologies: ['quick_start', 'hybrid', 'enterprise'], type: 'A', tool: 'generate_implementation_plan', args: { workspace_gid: '{workspace_gid}', client_name: '{client_name}', industry: '{industry}', methodology: '{methodology}' }, hours: 0.25, dependencies: ['F5'] },
    { id: 'P2', name: 'Estimate hours', methodologies: ['quick_start'], type: 'A', tool: 'generate_implementation_plan', hours: 0, dependencies: ['P1'] },
    { id: 'P3', name: 'Run savings estimate', methodologies: ['hybrid', 'enterprise'], type: 'A', tool: 'estimate_automation_savings', args: { workspace_gid: '{workspace_gid}' }, hours: 0.25, dependencies: ['F1'] },
    { id: 'P4', name: 'Risk register generation', methodologies: ['enterprise'], type: 'A', tool: 'generate_implementation_plan', hours: 0, dependencies: ['P1'] },
    { id: 'P5', name: 'Training plan per role', methodologies: ['enterprise'], type: 'A', tool: 'generate_implementation_plan', hours: 0, dependencies: ['P1'] },
    { id: 'P6', name: 'Review timeline', methodologies: ['hybrid', 'enterprise'], type: 'PA', tool: 'generate_implementation_plan', manual_steps: ['Review phases[] from DVA output', 'Check client team availability for each phase', 'Adjust durations for holidays, vacations, competing projects', 'Add buffer for identified risks'], hours: 1, dependencies: ['P1'] },
    { id: 'P7', name: 'Present to sponsor', methodologies: ['hybrid'], type: 'M', manual_steps: ['Prepare 60min presentation', 'Deck: maturity score → top gaps → implementation plan → ROI → investment', 'Include comparison: cost of doing nothing vs cost of implementation', 'Address likely objections (timeline, disruption, adoption)', 'End with clear ask: approval + PO'], hours: 2, dependencies: ['P1', 'P3'] },
    { id: 'P8', name: 'Executive presentation', methodologies: ['enterprise'], type: 'M', manual_steps: ['Prepare executive deck (15 slides max)', 'Cover: business vision, strategic alignment, implementation approach, risk mitigation, investment, ROI', 'Include industry benchmarks if available', 'Rehearse with internal team before presenting', 'Schedule 45min with C-suite sponsor'], hours: 4, dependencies: ['P1', 'P3'] },
    { id: 'P9', name: 'Contract negotiation', methodologies: ['enterprise'], type: 'M', manual_steps: ['Draft SOW from DVA output', 'Include: scope freeze clause, change order process (rate + approval), SLAs for response time', 'Define payment milestones tied to phase completions', 'Review with legal (both sides)', 'Negotiate terms and finalize'], hours: 4, dependencies: ['P8'] },
    { id: 'P10', name: 'Get sign-off + PO', methodologies: ['quick_start', 'hybrid', 'enterprise'], type: 'M', manual_steps: ['Send final DVA + SOW to client', 'Follow up within 48h if no response', 'Obtain PO number or signed contract', 'Archive in project folder', 'Trigger implementation kickoff'], hours: 0.5, dependencies: ['P1'] },
  ],
  execution: [
    { id: 'E1', name: 'Setup workspace/account', methodologies: ['quick_start'], type: 'A', tool: 'create_project_with_structure', args: { workspace_gid: '{workspace_gid}' }, hours: 1, dependencies: ['P10'] },
    { id: 'E2', name: 'Quick Wins sprint', methodologies: ['hybrid', 'enterprise'], type: 'PA', tool: 'assess_asana_maturity', manual_steps: ['Execute quick_wins[] from maturity assessment', 'Use MCP tools: create_rule, bulk_update_tasks, create_custom_field', 'Verify each win with client within 48h', 'Document before/after for ROI reporting'], hours: 4, dependencies: ['P10'] },
    { id: 'E3', name: 'Foundation phase (structure + governance)', methodologies: ['enterprise'], type: 'PA', tools: ['create_project_with_structure', 'add_project_members', 'create_custom_field'], manual_steps: ['Configure team permissions in Asana UI (admin console)', 'Set up naming conventions document', 'Configure project privacy settings', 'Create portfolio structure for leadership view'], hours: 8, dependencies: ['E2'] },
    { id: 'E4', name: 'Configure core features', methodologies: ['quick_start'], type: 'PA', tools: ['create_custom_field', 'create_section', 'create_tag'], manual_steps: ['Configure views (board/list/timeline) in Asana UI', 'Set up dashboard widgets in UI', 'Configure notification preferences'], hours: 2, dependencies: ['E1'] },
    { id: 'E5', name: 'Phase 1 Core setup', methodologies: ['hybrid'], type: 'PA', tools: ['create_project', 'create_section', 'create_custom_field', 'add_project_members'], manual_steps: ['Configure project views and layouts in Asana UI', 'Set up team-level settings', 'Import existing project templates if available'], hours: 4, dependencies: ['E2'] },
    { id: 'E6', name: 'Phase 2 Advanced config', methodologies: ['hybrid'], type: 'PA', tools: ['setup_kanban_workflow', 'create_rule', 'bulk_create_rules'], manual_steps: ['Test each rule by triggering it manually', 'Refine rule conditions for edge cases in UI', 'Document all rules created for client admin guide'], hours: 4, dependencies: ['E5'] },
    { id: 'E7', name: 'Configuration phase', methodologies: ['enterprise'], type: 'PA', tools: ['bulk_create_rules', 'setup_kanban_workflow', 'create_custom_field'], manual_steps: ['Test each rule and workflow end-to-end', 'Handle edge cases not covered by standard rules', 'Configure approval workflows in Asana UI', 'Set up custom field dependencies'], hours: 8, dependencies: ['E3'] },
    { id: 'E8', name: 'Integration setup', methodologies: ['hybrid'], type: 'PA', tools: ['create_webhook', 'attach_external_data'], manual_steps: ['Configure receiving endpoint for webhooks', 'Set up OAuth for third-party apps', 'Test bidirectional data flow', 'Document integration architecture'], hours: 4, dependencies: ['E6'] },
    { id: 'E9', name: 'Integration phase', methodologies: ['enterprise'], type: 'PA', tools: ['create_webhook', 'attach_external_data', 'batch_api'], manual_steps: ['Develop webhook receivers for each integration', 'Configure OAuth and API keys for third-party systems', 'Build data mapping between systems', 'Test sync in staging environment', 'Document error handling and retry logic'], hours: 16, dependencies: ['E7'] },
    { id: 'E10', name: 'AI Teammates setup', methodologies: ['hybrid', 'enterprise'], type: 'A', tools: ['generate_teammate_blueprint', 'validate_ai_capability'], manual_steps: ['Copy-paste behavior instructions into AI Studio', 'Attach key resources (SOPs, templates, examples)', 'Test with a starter task', 'Iterate behavior instructions based on output quality'], hours: 4, dependencies: ['E6'] },
    { id: 'E11', name: 'Data migration', methodologies: ['enterprise'], type: 'PA', tools: ['bulk_create_tasks', 'bulk_update_tasks'], manual_steps: ['Prepare data in CSV/JSON format', 'Run dry-run import on test project', 'Validate imported data (field mapping, assignees, dates)', 'Fix data quality issues', 'Run production import', 'Verify post-import counts and integrity'], hours: 8, dependencies: ['E7'] },
    { id: 'E12', name: 'Training sessions', methodologies: ['quick_start', 'hybrid', 'enterprise'], type: 'M', manual_steps: ['Prepare training materials by role (End User: 2h, PM: 4-8h, Admin: 6-12h)', 'Schedule sessions: 1) Demo walkthrough 2) Hands-on exercises 3) Q&A', 'Record sessions for future reference', 'Create quick-reference guides (1-pager per role)', 'Set up internal wiki/docs page'], hours: { quick_start: 2, hybrid: 8, enterprise: 16 }, dependencies: ['E4'] },
    { id: 'E13', name: 'UAT & validation', methodologies: ['hybrid'], type: 'M', manual_steps: ['Create test plan: 1 test case per N/C requirement', 'Client team executes test cases', 'Document results: pass/fail/blocked', 'Fix failed items', 'Re-test until all pass', 'Get UAT sign-off from project sponsor'], hours: 4, dependencies: ['E6'] },
    { id: 'E14', name: 'UAT per department', methodologies: ['enterprise'], type: 'M', manual_steps: ['Create department-specific test plans', 'Each department tests their workflows independently', 'Consolidate feedback across departments', 'Prioritize fixes: P1 (blocks go-live) vs P2 (post-go-live)', 'Fix P1 items and re-test', 'Get department-level sign-offs'], hours: 12, dependencies: ['E7', 'E9'] },
    { id: 'E15', name: 'Pilot rollout', methodologies: ['enterprise'], type: 'M', manual_steps: ['Select 1 champion team (most enthusiastic, best data quality)', 'Deploy to champion team only', 'Monitor for 1 week: daily check-ins, issue tracking', 'Document lessons learned', 'Adjust configuration based on feedback', 'Validate metrics: adoption rate, task completion, rule triggers'], hours: 8, dependencies: ['E14'] },
    { id: 'E16', name: 'Full rollout', methodologies: ['enterprise'], type: 'M', manual_steps: ['Communicate go-live to all teams (email + Slack/Teams)', 'Provide access to training materials and quick-reference guides', 'Staff help desk for first week (dedicated Slack channel or office hours)', 'Monitor adoption metrics daily for first 2 weeks'], hours: 4, dependencies: ['E15'] },
    { id: 'E17', name: 'Optimization & fine-tuning', methodologies: ['enterprise'], type: 'PA', prompt: 'asana_health_check', manual_steps: ['Run health check 2 weeks post-go-live', 'Review findings with client admin', 'Adjust rules and workflows based on actual usage patterns', 'Optimize custom fields based on what users actually fill in'], hours: 4, dependencies: ['E16'] },
    { id: 'E18', name: 'Go-live & handoff', methodologies: ['quick_start', 'hybrid'], type: 'PA', prompt: 'asana_health_check', manual_steps: ['Run final health check to validate state', 'Prepare handoff document: what was configured, admin credentials, support contacts', 'Schedule 30min handoff call with client admin', 'Transfer ownership of all projects to client'], hours: 2, dependencies: ['E12'] },
    { id: 'E19', name: 'Hypercare (2-4 weeks)', methodologies: ['hybrid', 'enterprise'], type: 'M', manual_steps: ['Define SLA: P1 critical (4h response), P2 important (8h), P3 minor (24h)', 'Set up support channel (email or Slack)', 'Weekly check-in with sponsor (15min)', 'Track issues and resolutions', 'Escalate recurring issues to implementation team'], hours: 4, dependencies: ['E18'] },
    { id: 'E20', name: 'Formal handoff', methodologies: ['enterprise'], type: 'M', manual_steps: ['Prepare closure document: scope delivered, issues resolved, outstanding items', 'Knowledge transfer session with client admin team (60min)', 'Transition from implementation support to ongoing support (separate SOW if applicable)', 'Archive project in Completed Implementations', 'Get final sign-off from sponsor', 'Schedule 30/60/90 day check-in for adoption review'], hours: 2, dependencies: ['E19'] },
  ]
};

module.exports = (client) => [

  // ════════════════════════════════════════════════════════════
  // TOOL 0: generate_implementation_template
  // ════════════════════════════════════════════════════════════

  {
    name: 'generate_implementation_template',
    description: 'Generate a complete implementation template with subtasks classified as Automated (A), Partially Automated (PA), or Manual (M). Each subtask includes: MCP tool or prompt to execute, pre-filled arguments, manual step-by-step instructions, estimated hours, and dependencies. The template is methodology-specific (quick_start/hybrid/enterprise) and can be consumed by the Asana Wizard UI or the ClickUp MCP to create tracking tasks. Use after assess_asana_maturity determines the methodology. Related: assess_asana_maturity for scoring, generate_implementation_plan for the client-facing DVA.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace_gid: { type: 'string', description: 'Client workspace GID (used to pre-fill tool arguments)' },
        methodology: { type: 'string', enum: ['quick_start', 'hybrid', 'enterprise'], description: 'Methodology from assess_asana_maturity results' },
        client_name: { type: 'string', description: 'Client name (for DVA generation step)' },
        industry: { type: 'string', description: 'Client industry (for playbook matching)' }
      },
      required: ['workspace_gid', 'methodology']
    },
    handler: async (args) => {
      const { workspace_gid, methodology, client_name, industry } = args;

      // Filter subtasks for the selected methodology
      const phases = {};
      for (const [phaseName, subtasks] of Object.entries(IMPLEMENTATION_SUBTASKS)) {
        const filtered = subtasks
          .filter(s => s.methodologies.includes(methodology))
          .map(s => {
            const entry = {
              id: s.id,
              name: s.name,
              type: s.type,
              type_label: s.type === 'A' ? 'Automated' : s.type === 'PA' ? 'Partially Automated' : 'Manual',
              hours_estimate: typeof s.hours === 'object' ? s.hours[methodology] : s.hours,
              dependencies: s.dependencies
            };

            // Add tool/prompt info
            if (s.tool) {
              entry.mcp_tool = s.tool;
              entry.mcp_args = s.args
                ? Object.fromEntries(Object.entries(s.args).map(([k, v]) => [k, v.replace('{workspace_gid}', workspace_gid).replace('{client_name}', client_name || 'Client').replace('{industry}', industry || 'general').replace('{methodology}', methodology)]))
                : { workspace_gid };
            }
            if (s.tools) {
              entry.mcp_tools = s.tools;
            }
            if (s.prompt) {
              entry.mcp_prompt = s.prompt;
              entry.mcp_prompt_args = { workspace_gid };
            }
            if (s.manual_steps) {
              entry.manual_steps = s.manual_steps;
            }

            return entry;
          });

        if (filtered.length > 0) {
          phases[phaseName] = filtered;
        }
      }

      // Summary stats
      const allSubtasks = Object.values(phases).flat();
      const automated = allSubtasks.filter(s => s.type === 'A');
      const partial = allSubtasks.filter(s => s.type === 'PA');
      const manual = allSubtasks.filter(s => s.type === 'M');
      const totalHours = allSubtasks.reduce((sum, s) => sum + (s.hours_estimate || 0), 0);

      return {
        methodology,
        methodology_label: METHODOLOGY_THRESHOLDS[methodology]?.description || methodology,
        client: client_name || null,
        industry: industry || null,
        workspace_gid,
        phases,
        summary: {
          total_subtasks: allSubtasks.length,
          automated: automated.length,
          partially_automated: partial.length,
          manual: manual.length,
          automation_coverage: `${Math.round(((automated.length + partial.length * 0.5) / allSubtasks.length) * 100)}%`,
          total_hours_estimate: Math.round(totalHours)
        },
        usage_note: 'Each subtask with type=A or type=PA includes mcp_tool or mcp_prompt with pre-filled arguments. Execute them in dependency order. Manual subtasks include step-by-step instructions for the consultant.',
        next_steps: [
          'Execute subtasks in dependency order (S1 → S2 → ... → E20)',
          'For A items: call the MCP tool directly with provided args',
          'For PA items: call the MCP tool, then follow manual_steps to refine',
          'For M items: follow manual_steps guide',
          'Use generate_implementation_plan to create the client-facing DVA'
        ]
      };
    }
  },

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

      // Parallel fetch: sections + task samples for top projects.
      // NOTE: rules are intentionally NOT fetched — Asana exposes no endpoint to list a
      // project's rules, so automation is scored as "not measurable" below (never a fake 0).
      const projectDetails = await Promise.all(
        sortedProjects.map(async (p) => {
          const [sections, tasks] = await Promise.all([
            client.get(`/projects/${p.gid}/sections`, { opt_fields: 'name' }).catch(() => ({ data: [] })),
            client.get('/tasks', {
              project: p.gid, limit: 30,
              opt_fields: 'name,assignee,due_on,completed,custom_fields,custom_fields.display_value'
            }).catch(() => ({ data: [] }))
          ]);
          return {
            gid: p.gid, name: p.name,
            sections: (sections.data || []).map(s => s.name),
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

      // 3. Automation (0-20) — see note below. Scored after governance so it can be
      //    imputed from the other measured dimensions (Asana exposes no rules endpoint).

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

      // 3. Automation (0-20) — NOT measurable via the Asana API.
      // Asana exposes no endpoint to list a project's rules, so we cannot know how
      // automated the workspace is. Rather than report a misleading 0 (which would
      // both assert a false fact and drag down the overall), impute the dimension as
      // the average of the four measured dimensions and flag it as unmeasured.
      const automationMeasurable = false;
      const automationScore = Math.round((structureScore + adoptionScore + integrationsScore + governanceScore) / 4);
      findings.push({
        dimension: 'automation',
        finding: 'Automation is not measurable via the Asana API (no public endpoint lists rules). Score imputed from the other dimensions — verify rules directly in the Asana UI (Project ▸ Customize ▸ Rules).',
        severity: 'info'
      });

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
          automation_measurable: automationMeasurable,
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
          total_rules: null,
          rules_note: 'Not measurable — Asana exposes no API endpoint to list rules. Verify in the Asana UI.',
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
          // Rules are not fetched — Asana exposes no endpoint to list them.
          const [project, sections, tasks] = await Promise.all([
            client.get(`/projects/${gid}`, {
              opt_fields: 'name,custom_field_settings,custom_field_settings.custom_field,custom_field_settings.custom_field.name,custom_field_settings.custom_field.type'
            }),
            client.get(`/projects/${gid}/sections`, { opt_fields: 'name' }).catch(() => ({ data: [] })),
            client.get('/tasks', {
              project: gid, limit: 20,
              opt_fields: 'name,assignee,due_on,completed,tags,tags.name,custom_fields,custom_fields.name,custom_fields.display_value'
            }).catch(() => ({ data: [] }))
          ]);
          return {
            gid, name: project.data?.name,
            customFields: (project.data?.custom_field_settings || []).map(cfs => cfs.custom_field?.name).filter(Boolean),
            sections: (sections.data || []).map(s => s.name),
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
        const hasAssignees = allTasks.filter(t => t.assignee).length > allTasks.length * 0.5;

        // Always infer these
        requirements.push({ requirement: 'Project structure with workflow stages', priority: 'must' });
        requirements.push({ requirement: 'Task assignment and ownership', priority: 'must' });
        requirements.push({ requirement: 'Due date tracking and visibility', priority: 'must' });

        if (allFields.length === 0) {
          requirements.push({ requirement: 'Custom fields for categorization and filtering', priority: 'should' });
        }
        // Rules can't be read via API, so automation needs are always inferred (verify in UI).
        requirements.push({ requirement: 'Automation rules for repetitive actions', priority: 'should' });
        requirements.push({ requirement: 'Auto-assign tasks by type or section', priority: 'could' });
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
            // Rules are not fetched — Asana exposes no endpoint to list them.
            const [sections, tasks] = await Promise.all([
              client.get(`/projects/${p.gid}/sections`, { opt_fields: 'name' }).catch(() => ({ data: [] })),
              client.get('/tasks', {
                project: p.gid, limit: 30,
                opt_fields: 'name,assignee,due_on,completed,created_at,completed_at'
              }).catch(() => ({ data: [] }))
            ]);

            const taskList = tasks.data || [];
            const sectionNames = (sections.data || []).map(s => s.name);
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
              hasStages: sectionNames.some(s => /review|done|complete|in.?progress/i.test(s))
            };
          })
        );

        // Generate recommendations based on patterns
        recommendations = [];

        const totalTasks = projectAnalyses.reduce((sum, p) => sum + p.taskCount, 0);
        const hasStages = projectAnalyses.some(p => p.hasStages);

        if (totalTasks > 20) {
          recommendations.push({ name: 'Weekly Status Digest', type: 'ai_teammate', category: 'digest_writer', frequency_per_week: 1 });
        }
        if (hasStages) {
          recommendations.push({ name: 'Auto-assign on section move', type: 'ai_studio_rule', category: 'routing', frequency_per_week: Math.round(totalTasks * 0.3) });
        }
        if (totalTasks > 10) {
          // Rules can't be read via API; recommend based on task volume (verify existing rules in UI).
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
