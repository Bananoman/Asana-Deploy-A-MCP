# Asana MCP Server — Motor del Asana Wizard

> Este documento explica cómo el Asana MCP Server alimenta al Asana Wizard
> de OdooWizard. Léelo antes de desarrollar el wizard o modificar los
> methodology tools del MCP.

---

## Qué es qué

| Pieza | Dónde vive | Qué hace |
|-------|-----------|----------|
| **Asana Wizard** | OdooWizard (webapp ID=22 en Odoo) | UI para el consultor: formularios de scoring, discovery, fit-gap, propuesta |
| **Asana MCP Server** | Este repo (`Asana-Deploy-A-MCP/`) | Motor de ejecución: 246 API tools + 5 advisor tools + 4 methodology tools + 5 prompts + 2 resources |
| **Knowledge Base** | `skills/asana-ai-advisor/references/` | Capacidades de AI Teammates, playbooks por industria, formato de specs |

El wizard NO llama al MCP directamente (por ahora). El puente es el consultor
usando Claude Code/Desktop con el MCP conectado.

```
Consultor abre Asana Wizard en Odoo
        ↓
Completa scoring, discovery, fit-gap en el wizard
        ↓
Wizard genera prompts de implementación
        ↓
Consultor abre Claude con Asana MCP conectado
        ↓
Claude ejecuta los prompts contra el workspace del cliente
        ↓
Resultados se documentan en el wizard
```

---

## Flujo de consultoría → Tools del MCP

Cada fase del wizard tiene tools y prompts correspondientes en el MCP:

### Fase 1: Scoring (Madurez)

**En el wizard:** El consultor evalúa al cliente en 5 dimensiones.

**En el MCP:**
```
Tool:   assess_asana_maturity
Input:  { workspace_gid: "123456" }
Output: {
  scores: { structure, adoption, automation, integrations, governance },
  overall: 0-100,
  methodology: "quick_start" | "hybrid" | "enterprise",
  team_size, estimated_duration, findings, blockers, quick_wins
}
```

**Prompt equivalente:** `asana_discovery_session` (orquesta scoring + overview + readiness + industry detection en secuencia)

**Cómo conectar:** El wizard puede pre-llenar su formulario de scoring con los datos del tool. El `overall` score mapea directo a la metodología del wizard.

| Score MCP | Metodología wizard |
|-----------|-------------------|
| 0-35 | Quick Start |
| 36-65 | Hybrid |
| 66-100 | Enterprise |

### Fase 2: Discovery (Levantamiento técnico)

**En el wizard:** Cuestionarios por módulo/área, upload de docs, notas del CRM.

**En el MCP:**
```
Tool:   analyze_workspace_overview
Input:  { workspace_gid: "123456" }
Output: { teams, projects by team, most active projects, recommendations }

Tool:   analyze_project_ai_readiness
Input:  { project_gid: "789" }
Output: { scores (4 dimensiones), task_statistics, detected_industry, recommendations }

Tool:   detect_team_industry
Input:  { project_gid: "789" }
Output: { industry_matches ranked, recommended_teammates, rules, avoid }
```

**Prompt equivalente:** `asana_discovery_session` ejecuta los 3 tools en secuencia y produce un reporte de discovery completo.

**Cómo conectar:** Los hallazgos del MCP alimentan las respuestas del cuestionario del wizard. El wizard puede importar el JSON del MCP y mapear findings → preguntas respondidas.

### Fase 3: Fit-Gap Analysis

**En el wizard:** Clasificación de requerimientos como N1/N2/N3/CP (notación Odoo).

**En el MCP:**
```
Tool:   generate_fitgap_analysis
Input:  {
  workspace_gid: "123456",
  client_requirements: [
    { requirement: "Auto-assign tasks by type", priority: "must" },
    { requirement: "Sync with Salesforce", priority: "should" }
  ]
}
Output: {
  requirements: [{ id, requirement, priority, classification, how, effort, hours_estimate, mcp_tools_needed }],
  summary: { native, configurable, development, process_change },
  hours_estimate: { optimistic, expected, pessimistic }
}
```

**Prompt equivalente:** `asana_fitgap_analysis` — produce la matriz en formato tabla.

**Mapeo de clasificaciones:**

| MCP | Wizard (Odoo) | Significado |
|-----|--------------|-------------|
| N (Native) | N1 | Asana lo hace out-of-the-box |
| C (Configurable) | N2 | Se logra con rules/AI Studio |
| D (Development) | N3 | Requiere MCP tools o agente externo |
| CP (Process Change) | CP | El cliente cambia su proceso |

### Fase 4: Propuesta (DVA)

**En el wizard:** Documento de Visión y Alcance auto-generado.

**En el MCP:**
```
Tool:   generate_implementation_plan
Input:  {
  workspace_gid: "123456",
  client_name: "Café Oaxaca",
  industry: "operations",
  methodology: "hybrid",
  fitgap_summary: { native: 12, configurable: 5, development: 2, process_change: 1, total: 20 }
}
Output: {
  document_type: "DVA",
  executive_summary, scope, phases, training_plan, risk_register, investment
}
```

**Prompt equivalente:** `asana_implementation_plan` — formatea el DVA como markdown listo para el cliente.

**Cómo conectar:** El wizard genera el DVA llamando al endpoint de Odoo que internamente usa el output de este tool. El `fitgap_summary` viene de la fase anterior.

### Fase 5: Ejecución

**En el wizard:** Tracking de implementación, configuración en vivo.

**En el MCP:** Los 246 API tools ejecutan la implementación:

| Tarea de implementación | MCP Tools |
|------------------------|-----------|
| Crear estructura de proyectos | `create_project_with_structure`, `create_section` |
| Configurar custom fields | `create_custom_field`, `create_enum_custom_field` |
| Montar reglas de automatización | `create_rule`, `setup_kanban_workflow`, `bulk_create_rules` |
| Crear AI Teammates | `generate_teammate_blueprint`, `validate_ai_capability` |
| Migrar datos | `bulk_create_tasks`, `bulk_update_tasks` |
| Configurar portfolios y goals | `create_portfolio`, `create_goal` |
| Setup webhooks | `create_webhook` |

### Post-implementación

**En el MCP:**
```
Tool:   estimate_automation_savings
Input:  { workspace_gid: "123456" }
Output: { estimates (per recommendation), totals (yearly hours, FTE equivalent), disclaimer }
```

**Prompt equivalente:** `asana_automation_planner` — plan completo con tiers y ROI.
**Prompt de monitoreo:** `asana_health_check` — auditoría periódica.

---

## MCP Prompts disponibles para el wizard

Los prompts son invocables desde Claude Code/Desktop. Cada uno orquesta
múltiples tools en un flujo estructurado:

| Prompt | Fase del wizard | Output |
|--------|----------------|--------|
| `asana_discovery_session` | Scoring + Discovery | Reporte de discovery completo |
| `asana_fitgap_analysis` | Fit-Gap | Matriz fit-gap con horas |
| `asana_implementation_plan` | Propuesta | DVA formateado |
| `asana_health_check` | Post-go-live | Auditoría con health score |
| `asana_automation_planner` | Discovery + Propuesta | Plan de automatización con ROI |

## MCP Resources disponibles

Resources son datos read-only que Claude jala como contexto:

| URI | Qué retorna |
|-----|------------|
| `asana://workspace/{gid}/overview` | Teams, project counts, actividad, custom fields |
| `asana://workspace/{gid}/projects` | Lista completa de proyectos con metadata |

---

## Datos que fluyen del MCP al wizard

El wizard puede consumir estos JSONs para pre-llenar sus formularios:

### 1. Scoring → Formulario de madurez
```json
// assess_asana_maturity output → wizard scoring page
{
  "scores": { "structure": 14, "adoption": 11, ... },
  "overall": 51,
  "methodology": "hybrid"
}
```
Mapear: `overall` → slider del wizard, `methodology` → selector automático.

### 2. Fit-Gap → Tabla de requerimientos
```json
// generate_fitgap_analysis output → wizard fitgap page
{
  "requirements": [
    { "id": 1, "requirement": "...", "classification": "C", "priority": "must", "hours_estimate": {...} }
  ],
  "summary": { "native": 12, "configurable": 5, ... }
}
```
Mapear: cada `requirement` → fila en la tabla del wizard. `classification` → dropdown N1/N2/N3/CP.

### 3. DVA → Documento de propuesta
```json
// generate_implementation_plan output → wizard proposal page
{
  "executive_summary": "...",
  "phases": [...],
  "training_plan": [...],
  "investment": { "estimated_hours": 120, "hours_range": { "low": 96, "high": 156 } }
}
```
Mapear: `phases` → timeline del wizard, `investment` → calculadora de precios.

### 4. Savings → ROI calculator
```json
// estimate_automation_savings output → wizard ROI page
{
  "totals": {
    "hours_saved_yearly": { "low": 320, "high": 650 },
    "equivalent_fte": { "low": 0.15, "high": 0.31 }
  }
}
```
Mapear: totals → gráfico de ROI del wizard.

---

## Configuración del MCP para el wizard

```json
// .mcp.json para el consultor
{
  "mcpServers": {
    "asana": {
      "command": "node",
      "args": ["/path/to/Asana-Deploy-A-MCP/src/server.js"],
      "env": {
        "ASANA_TOKEN": "TOKEN_DEL_CLIENTE",
        "ASANA_TOOL_MODE": "efficient",
        "ASANA_RESPONSE_MODE": "compact"
      }
    }
  }
}
```

Para cada cliente, el consultor cambia `ASANA_TOKEN` al PAT del workspace del cliente.

---

## Inventario completo del MCP (v3.0.0)

| Categoría | Count | Ejemplos |
|-----------|-------|----------|
| Workspace | 26 | list_workspaces, get_user, create_team |
| Projects | 35 | create_project, list_sections, duplicate_project |
| Tasks | 39 | create_task, search_tasks, add_task_comment |
| Portfolio | 15 | create_portfolio, create_allocation |
| Goals | 18 | create_goal, add_supporting_goal_relationship |
| Automation | 33 | create_rule, setup_kanban_workflow, create_webhook |
| Reporting | 3 | get_audit_log_events, create_organization_export |
| Collaboration | 16 | create_status_update, add_reaction, create_tag |
| Advanced | 51 | batch_api, bulk_create_tasks, custom_fields |
| **Advisor** | **5** | analyze_workspace_overview, validate_ai_capability |
| **Methodology** | **4** | assess_asana_maturity, generate_fitgap_analysis |
| **Guide** | **1** | get_asana_guide (9 topics incl. prebuilt_teammates) |
| **Prompts** | **5** | asana_discovery_session, asana_health_check |
| **Resources** | **2** | workspace overview, workspace projects |

---

## Para el desarrollador del wizard

Cuando estés construyendo el Asana Wizard en OdooWizard:

1. **Scoring page:** Llama `assess_asana_maturity` y usa el output para pre-llenar el formulario
2. **Discovery page:** Usa `asana_discovery_session` prompt o llama los advisor tools individuales
3. **Fit-Gap page:** Llama `generate_fitgap_analysis` con los requerimientos del discovery
4. **Proposal page:** Llama `generate_implementation_plan` con los resultados del fit-gap
5. **ROI page:** Llama `estimate_automation_savings` para justificar la inversión
6. **Health check page:** Usa `asana_health_check` prompt para auditorías post-go-live

Cada tool retorna JSON estructurado que puedes mapear directamente a los componentes React del wizard.

---

## Referencia cruzada

| Documento | Ubicación |
|-----------|----------|
| CLAUDE.md del MCP | `MCP Asana/CLAUDE.md` |
| Design spec v3 | `MCP Asana/docs/specs/2026-03-28-asana-mcp-v3-design.md` |
| Wizard-MCP Architecture (general) | `OdooWizard/docs/shared/WIZARD-MCP-ARCHITECTURE.md` |
| AI Teammate capabilities | `Asana-Deploy-A-MCP/skills/asana-ai-advisor/references/asana-ai-capabilities.md` |
| Industry playbooks | `Asana-Deploy-A-MCP/skills/asana-ai-advisor/references/industry-playbooks.md` |
| Metodología de implementación | `OdooWizard/METODOLOGIA-IMPLEMENTACION-ODOO.md` |
