# Asana MCP Server — Guía de Uso para el Asana Wizard

> Guía práctica para consultores de Xmarts que usan el Asana MCP
> desde Claude Code/Desktop para implementar Asana en clientes.
>
> MCP Server v3.0.0 | 247 tools | 6 prompts | 2 resources
>
> Última actualización: 2026-03-29

---

## Requisitos previos

1. **Node.js 18+** instalado
2. **Claude Code o Claude Desktop** configurado
3. **Token de Asana** del workspace del cliente (PAT)
4. **Repo clonado:**
   ```bash
   git clone https://github.com/Bananoman/Asana-Deploy-A-MCP.git
   cd Asana-Deploy-A-MCP && npm install
   ```

## Configuración

### Para Claude Code

Crear `.mcp.json` en tu directorio de trabajo:

```json
{
  "mcpServers": {
    "asana": {
      "command": "node",
      "args": ["/ruta/a/Asana-Deploy-A-MCP/src/server.js"],
      "env": {
        "ASANA_TOKEN": "TOKEN_DEL_CLIENTE",
        "ASANA_TOOL_MODE": "efficient",
        "ASANA_RESPONSE_MODE": "compact"
      }
    }
  }
}
```

### Para Claude Desktop

Editar `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "asana": {
      "command": "node",
      "args": ["/ruta/a/Asana-Deploy-A-MCP/src/server.js"],
      "env": {
        "ASANA_TOKEN": "TOKEN_DEL_CLIENTE"
      }
    }
  }
}
```

### Variables de entorno opcionales

| Variable | Valores | Default | Qué hace |
|----------|---------|---------|----------|
| `ASANA_TOOL_MODE` | full / efficient / minimal | efficient | efficient: 19 tools eager, 228 deferred (~5K tokens init) |
| `ASANA_DOMAINS` | all / workspace,tasks,... | all | Filtra por categoría de tools |
| `ASANA_RESPONSE_MODE` | full / compact | full | compact: elimina campos nulos, trunca notas |
| `ASANA_READ_ONLY` | true / false | false | Solo carga tools de lectura (104 tools) |

---

## Flujo de consultoría (5 fases)

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ SCORING  │ →  │DISCOVERY │ →  │ FIT-GAP  │ →  │PROPOSAL  │ →  │EXECUTION │
│          │    │          │    │          │    │          │    │          │
│ Madurez  │    │ Levanta- │    │ Clasifi- │    │ DVA +    │    │ Configu- │
│ 0-100    │    │ miento   │    │ cación   │    │ ROI      │    │ ración   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

---

## Fase 1: Scoring (Madurez)

### Opción A: Prompt completo (recomendado para primera vez)

Escribe en Claude:

> Usa el prompt `asana_discovery_session` con workspace_gid="TU_WORKSPACE_GID"

Esto ejecuta en secuencia: maturity scoring → workspace overview → AI readiness → industry detection.

### Opción B: Tool directo

> Ejecuta `assess_asana_maturity` con workspace_gid="TU_WORKSPACE_GID"

**Output que recibes:**

```
Scores:
  Structure:    14/20
  Adoption:     11/20
  Automation:    6/20
  Integrations:  8/20
  Governance:   12/20
  ─────────────────
  Overall:      51/100

Methodology:  Hybrid (1-3 months, 3-5 consultants)

Blockers:
  - 42% of tasks have no assignee

Quick Wins:
  - Add due dates to 156 tasks
  - Create rules for 3 most active projects
```

**Qué hacer con el resultado:**
1. Presenta los scores al cliente
2. Acuerda la metodología (Quick Start / Hybrid / Enterprise)
3. Documenta blockers que deben resolverse antes de implementar

---

## Fase 2: Discovery (Levantamiento)

### Opción A: Prompt guiado

> Usa el prompt `asana_discovery_session` con workspace_gid="TU_GID" y client_name="Café Oaxaca"

### Opción B: Tools individuales

1. **Estructura del workspace:**
   > Ejecuta `analyze_workspace_overview` con workspace_gid="TU_GID"

2. **AI readiness por proyecto:**
   > Ejecuta `analyze_project_ai_readiness` con project_gid="GID_DEL_PROYECTO"

3. **Industria del cliente:**
   > Ejecuta `detect_team_industry` con project_gid="GID_DEL_PROYECTO"

**Qué hacer con el resultado:**
1. Revisa la estructura de teams y projects con el cliente
2. Identifica los proyectos más activos para análisis profundo
3. Confirma la industria detectada (o corrígela manualmente)
4. Documenta requerimientos del cliente

---

## Fase 3: Fit-Gap Analysis

### Con requerimientos del discovery

> Ejecuta `generate_fitgap_analysis` con:
> - workspace_gid: "TU_GID"
> - client_requirements: [
>     {"requirement": "Auto-asignar tareas por tipo", "priority": "must"},
>     {"requirement": "Reporte semanal de status", "priority": "should"},
>     {"requirement": "Sync con Salesforce", "priority": "could"}
>   ]

### Sin requerimientos (auto-detección)

> Ejecuta `generate_fitgap_analysis` con workspace_gid="TU_GID"

El tool infiere requerimientos de los patrones del workspace.

**Output que recibes:**

```
| # | Requerimiento              | Prioridad | Clasificación | Cómo                    | Horas |
|---|---------------------------|-----------|---------------|-------------------------|-------|
| 1 | Auto-asignar por tipo     | must      | C (Config)    | AI Studio rule          | 1.5h  |
| 2 | Reporte semanal de status | should    | C (Config)    | AI Teammate             | 1.5h  |
| 3 | Sync con Salesforce       | could     | D (Desarrollo)| Claude Code agent       | 5h    |

Summary: 12 Native, 5 Configurable, 2 Development, 1 Process Change
Hours: Optimistic 20h / Expected 35h / Pessimistic 55h
```

**Clasificaciones:**

| Código | Significado | Ejemplo |
|--------|------------|---------|
| **N** (Native) | Asana lo hace out-of-the-box | Crear tareas, asignar, due dates |
| **C** (Configurable) | Lograble con rules o AI Studio | Auto-assign, workflows, AI Teammates |
| **D** (Development) | Requiere MCP tools o agente externo | API sync, web research |
| **CP** (Process Change) | El cliente debe cambiar su proceso | Dejar Excel, adoptar Asana |

---

## Fase 4: Propuesta (DVA + ROI)

### Generar ambos entregables a la vez

> Usa el prompt `asana_generate_deliverables` con:
> - workspace_gid: "TU_GID"
> - client_name: "Café Oaxaca"
> - industry: "operations"

Esto genera:
1. **Implementation Template** — Checklist del consultor con subtasks clasificados [A]/[PA]/[M]
2. **DVA** — Documento de Visión y Alcance para el cliente
3. **ROI** — Estimación de ahorro en horas/año

### Generar solo el DVA

> Ejecuta `generate_implementation_plan` con:
> - workspace_gid: "TU_GID"
> - client_name: "Café Oaxaca"
> - industry: "operations"
> - methodology: "hybrid"

### Generar solo el template de implementación

> Ejecuta `generate_implementation_template` con:
> - workspace_gid: "TU_GID"
> - methodology: "hybrid"
> - client_name: "Café Oaxaca"
> - industry: "operations"

**Output del template (ejemplo Hybrid, 27 subtasks):**

```
Phase: Scoring
  [A]  Run maturity assessment          → assess_asana_maturity(workspace_gid)     0.25h
  [PA] Review 5-dimension scores        → assess_asana_maturity + presentar        1h
  [M]  Confirm methodology              → Presentar al sponsor, acordar            0.5h
  [PA] Document quick wins              → quick_wins[] del tool + priorizar        0.5h
  [PA] Document blockers & risks        → blockers[] del tool + agregar negocio    1h

Phase: Discovery
  [PA] Standard questionnaire (7Q)      → asana_discovery_session prompt           3h
  [PA] Client document upload           → Subir docs al wizard                     2h
  [M]  Process mapping workshops        → Miro/whiteboard, mapear procesos         4h
  [PA] Validate requirements            → Revisar con stakeholders                 1h

... (continúa para Fit-Gap, Proposal, Execution)

Summary: 5 Auto (19%) | 13 Parcial (48%) | 9 Manual (33%)
Total: ~60 horas estimadas
```

### Generar solo la estimación de ROI

> Ejecuta `estimate_automation_savings` con workspace_gid="TU_GID"

```
| Recomendación              | Tipo          | Ahorro/año     | Confianza |
|---------------------------|---------------|----------------|-----------|
| Weekly Status Digest      | AI Teammate   | 52-130 hrs     | high      |
| Auto-assign on move       | AI Studio     | 16-47 hrs      | medium    |
| Intake Task Router        | AI Teammate   | 78-208 hrs     | high      |

Total: 320-650 hrs/año (~0.15-0.31 FTE)
```

---

## Fase 5: Ejecución

### Validar antes de construir AI Teammates

> Ejecuta `validate_ai_capability` con:
> - proposed_behavior: "Cuando se crea un bug, buscar bugs similares en GitHub, resumir hallazgos, y crear subtasks"

Resultado: Green flags (lo que sí puede), Yellow flags (con caveats), Red flags (no puede + alternativa).

### Generar spec de AI Teammate

> Ejecuta `generate_teammate_blueprint` con:
> - industry: "operations"
> - teammate_index: 0
> - trigger_type: "intake"
> - output_type: "brief"

Resultado: Spec copy-paste-ready para AI Studio con behavior instructions, trigger config, test case.

### Configurar workspace con MCP tools

Ejemplos de ejecución directa:

```
# Crear proyecto con estructura
create_project_with_structure({
  workspace_gid: "TU_GID",
  name: "Marketing Campaigns",
  sections: ["Intake", "Planning", "In Progress", "Review", "Published"]
})

# Crear custom fields
create_custom_field({
  workspace_gid: "TU_GID",
  name: "Campaign Type",
  resource_subtype: "enum",
  enum_options: [
    { name: "Email", color: "blue" },
    { name: "Social", color: "green" },
    { name: "Paid Ads", color: "red" }
  ]
})

# Montar workflow kanban
setup_kanban_workflow({
  project_gid: "PROJECT_GID",
  todo_section_gid: "...",
  doing_section_gid: "...",
  done_section_gid: "..."
})

# Crear reglas en bulk
bulk_create_rules({
  project_gid: "PROJECT_GID",
  rules: [
    { name: "Auto-assign bugs", trigger_type: "task_added_to_section", ... },
    { name: "Notify on overdue", trigger_type: "task_overdue", ... }
  ]
})
```

### Health check post-go-live

> Usa el prompt `asana_health_check` con workspace_gid="TU_GID"

---

## Referencia rápida de prompts

| Prompt | Cuándo usarlo | Qué produce |
|--------|--------------|-------------|
| `asana_discovery_session` | Inicio del engagement | Reporte de discovery completo |
| `asana_fitgap_analysis` | Después del discovery | Matriz fit-gap con horas |
| `asana_implementation_plan` | Para generar la propuesta | DVA formateado para el cliente |
| `asana_health_check` | Post-go-live o auditoría | Health score + recomendaciones |
| `asana_automation_planner` | Para planear automatización | Plan con tiers + ROI |
| `asana_generate_deliverables` | Para generar todo de una | Template + DVA + ROI |

## Referencia rápida de tools clave

| Tool | Fase | Qué hace |
|------|------|----------|
| `assess_asana_maturity` | Scoring | Score 0-100, recomienda metodología |
| `analyze_workspace_overview` | Discovery | Snapshot del workspace |
| `analyze_project_ai_readiness` | Discovery | Readiness de un proyecto para AI |
| `detect_team_industry` | Discovery | Detecta industria y playbook |
| `generate_fitgap_analysis` | Fit-Gap | Clasifica requerimientos N/C/D/CP |
| `validate_ai_capability` | Fit-Gap | Valida factibilidad de AI Teammate |
| `generate_implementation_template` | Proposal | Checklist del consultor (A/PA/M) |
| `generate_implementation_plan` | Proposal | DVA para el cliente |
| `estimate_automation_savings` | Proposal | ROI en horas/año |
| `generate_teammate_blueprint` | Ejecución | Spec copy-paste para AI Studio |
| `get_asana_guide` | Cualquiera | Referencia de API, formatos, límites |

## Guía de referencia del API

Si necesitas consultar formatos, límites, o capacidades:

> Ejecuta `get_asana_guide` con topic="all"

Topics disponibles: `data_model`, `formats`, `rate_limits`, `plan_requirements`, `api_limitations`, `opt_fields`, `ai_teammates`, `prebuilt_teammates`

## Tips para consultores

1. **Siempre empieza con scoring** — `assess_asana_maturity` te da el contexto que necesitas
2. **Usa compact mode** — `ASANA_RESPONSE_MODE=compact` reduce tokens 50-70%
3. **Read-only primero** — `ASANA_READ_ONLY=true` para explorar sin riesgo
4. **Valida antes de construir** — `validate_ai_capability` antes de `generate_teammate_blueprint`
5. **Un prompt para todo** — `asana_generate_deliverables` genera ambos entregables en un flujo
6. **Revisa prebuilt teammates** — `get_asana_guide` topic="prebuilt_teammates" antes de crear custom
