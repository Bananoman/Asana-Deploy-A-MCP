# Playbook — Demos & Documentos de Asana

> **Referencia canónica**: cómo se ejecuta un demo de Asana de principio a fin, qué archivos se producen, qué skills se usan en cada paso.
> **Última actualización**: 2026-05-15 · Basado en los demos Jorge Romero (Favorita), Itaipú, Luminis Health, Liverpool.

---

## Estructura canónica de carpeta por demo

Cada cliente tiene su propia carpeta en `demos/<cliente-slug>/` con esta estructura. Si falta alguno de estos archivos, el demo está incompleto:

| # | Archivo | Propósito | Cuándo se genera |
|---|---|---|---|
| 1 | `CLAUDE.md` | Reglas de proyecto: cliente, industria, objetivo, demo space, branding, reglas | Fase 1 — al recibir brief |
| 2 | `brief.md` | Fuente original (email, transcript, llamada) en texto plano | Fase 1 |
| 3 | `research.md` | Investigación de empresa, industria, regulaciones, madurez digital, precedentes | Fase 2 |
| 4 | `PROGRESS.md` | Tracker de estado: preparación, mock data, rehearsal, post-demo | Fase 1 (vive todo el ciclo) |
| 5 | `roadmap.md` + `roadmap.html` | Roadmap técnico: secciones, custom fields, reglas, Script Actions, AI flows | Fase 3 |
| 6 | `presentacion-intro-demo.html` | Slide deck de apertura (5–10 slides, brand Asana coral) | Fase 6 |
| 7 | `cheat-sheet.html` | Guía de demo en vivo: pasos, prompts, atajos, qué decir | Fase 6 |
| 8 | `guia-de-demo.html` | Walkthrough narrativo más extenso para el demo en vivo | Fase 6 |
| 9 | `guia-de-pruebas.html` | Guía de pruebas pre-demo: validar que todo funciona | Fase 6 |
| 10 | `propuesta-comercial.html` | Propuesta comercial post-demo (brand Asana o partner) | Fase 9 |
| 11 | `handoff-notes.html` | Notas para sales handoff: insights, objeciones, próximos pasos | Fase 9 |
| (opcional) | `scripts/` | Carpeta con Script Actions (JS) si aplican | Fase 5 |
| (opcional) | `assets/` | Logos cliente, screenshots, recursos | Fase 1+ |
| (opcional) | `.env` | `ASANA_DEMO_TOKEN` del workspace de demo | Fase 1 |

---

## Las 10 fases del demo

### Fase 1 — Recepción de brief (30–60 min)

**Trigger**: email, llamada, BPMN, mensaje de un AE de Asana, o transcript de discovery.

**Acciones:**
1. Crear carpeta `demos/<cliente-slug>/`
2. Copiar el brief crudo a `brief.md` (sin reformatear)
3. Generar `CLAUDE.md` con identidad del cliente
4. Inicializar `PROGRESS.md` con checklist
5. Confirmar destino del demo workspace (Xmarts MCP `asana_xma` por default, o uno dedicado)

**Skills:**
- 🔑 **`/demo-planner`** — el skill principal para esta fase, define alcance y estructura
- `/scaffold-docs` enterprise — si el demo es grande y necesita estructura completa de docs

**MCPs:**
- `asana_xma` o `asana-ecol` (workspace destino)

---

### Fase 2 — Investigación del cliente (1–2 hr)

**Acciones:**
1. Investigar empresa: tamaño, mercados, stack, madurez digital
2. Investigar industria: regulaciones, retos típicos, precedentes
3. Investigar contacto si es identificable
4. Cruzar contra prior demos del mismo sector (vault)
5. Output: `research.md` con fuentes citadas

**Skills:**
- 🔑 **`/company-current-gtm-analysis`** — análisis 360° de la empresa
- `/customer-discovery` — clientes y posicionamiento
- `/sales-call-prep` — si hay reunión previa
- `/vault-query "industria X demos prior"` — buscar precedentes en el vault
- `/tech-stack-teardown` — si el stack tecnológico es crítico (ej. SAP integraciones)

**Bash/Web:** WebFetch + WebSearch a discreción

---

### Fase 3 — Diseño del demo / Roadmap técnico (2–4 hr)

**Acciones:**
1. Identificar el "caso de uso estrella" del cliente
2. Mapear su proceso a Asana Work Graph (sections, custom fields, rules)
3. Definir qué features destacar: AI Studio, AI Teammates, Script Actions, Goals, Portfolios
4. Documentar limitaciones conocidas con workarounds honestos
5. Output: `roadmap.md` (markdown técnico) + `roadmap.html` (versión presentable)

**Skills:**
- 🔑 **`/demo-planner`** — diseño de demos por industria con playbooks predefinidos
- 🔑 **`/asana-demo-playbook`** — patrones WOW moments, AI Teammate patterns, seed-data
- `/asana-expert` — qué se puede y qué no en Asana
- `/asana-ai-advisor` — recomendar AI Teammates específicos
- `/asana-script-actions` — si requiere automatización custom JS
- `/asana-implementation` — para implementaciones enterprise grandes

**Regla de oro:** validar factibilidad ANTES de prometer. Asana NO es BPMN motor.

---

### Fase 4 — Validación técnica (1–2 hr)

**Acciones:**
1. Para cada feature prometido: ¿existe en el plan que tiene el cliente?
2. Para cada Script Action: ¿es Enterprise/Enterprise+?
3. Para cada AI feature: ¿está GA o beta?
4. Documentar workarounds para gaps
5. Update `PROGRESS.md` con `validation-checklist.md` integrado o aparte

**Skills:**
- 🔑 **`/asana-mcp-master`** — routing decision tree para ~220 tools
- `/asana-expert` — capacidades y límites confirmados

**Referencias:**
- `~/Documents/MCP Asana/AI Teammate Script Actions.pdf`
- `reference_asana_ai_groundtruth_may2026.md` en memoria
- `mcp__xmarts_docs__search_docs({product:"asana"})` para docs oficiales

---

### Fase 5 — Setup del workspace + mock data (3–6 hr)

**Acciones:**
1. Crear estructura en el demo workspace (proyectos, secciones, custom fields)
2. Cargar mock data realista (nombres, fechas, departamentos del cliente)
3. Configurar reglas, Script Actions, AI Studio flows
4. Crear AI Teammates si aplica
5. Validar que todo se ve bien antes del demo

**Skills:**
- 🔑 **`/asana-mcp-master`** — para saber qué tool usar
- `/asana-script-actions` — escribir JS de Script Actions
- `/asana-ai-advisor` — generar blueprint de AI Teammate

**MCPs (operaciones masivas):**
- `mcp__asana_xma__create_project_with_structure`
- `mcp__asana_xma__bulk_create_tasks` (max 50 por call)
- `mcp__asana_xma__create_rule` / `bulk_create_rules`
- `mcp__asana_xma__create_custom_field` / `create_enum_custom_field`
- `mcp__asana_xma__generate_teammate_blueprint`

**Regla:** mock data en español con branding del cliente. Nada genérico.

---

### Fase 6 — Generación de materiales (2–4 hr)

**Acciones:**
Generar los 4 HTML clave:
1. `presentacion-intro-demo.html` — 5–10 slides apertura
2. `cheat-sheet.html` — guía live: qué hacer paso a paso
3. `guia-de-demo.html` — walkthrough narrativo del demo
4. `guia-de-pruebas.html` — pruebas pre-demo

**Skills:**
- 🔑 **`/create-html-slides`** — para `presentacion-intro-demo.html`
- 🔑 **`/asana-demo-playbook`** — patrones de cheat sheet (Script Actions, AI moments)
- `/create-html-carousel` — si hay carousel para LinkedIn

**Brand tokens (canónicos):**
- Coral oficial: `#690031` (Dark Coral del portal oficial Asana)
- Fondo coral light: `#FFEAEC`
- NO usar `#FF584A` como fondo (off-brand)
- Fuente: Inter o Helvetica Neue
- Referencias: `Create_docs/Xmarts-Doc/docs/ASANA-TOKENS-FOR-HTML.md`

---

### Fase 7 — Rehearsal (1–2 hr)

**Acciones:**
1. Correr el demo end-to-end siguiendo el cheat sheet
2. Cronometrar (típico: 30–45 min)
3. Validar que Script Actions disparan correctamente
4. Validar que AI Teammates responden a tiempo
5. Ajustar prompts, datos o pasos según se vea
6. Marcar `PROGRESS.md` → rehearsal completado

**Skills:**
- `/verification-before-completion` — checklist de "todo funciona" antes de claim done
- `/asana-demo-playbook` — checklist de qué validar

---

### Fase 8 — Entrega del demo (en vivo, 30–60 min)

**Acciones:**
1. Compartir pantalla + presentación intro (5 min)
2. Walkthrough del demo (20–30 min) siguiendo cheat sheet
3. Q&A (10–15 min)
4. Capturar objeciones, preguntas técnicas, áreas de interés
5. Mencionar próximos pasos (propuesta en X días)

**Reglas duras:**
- No prometer features que no estén en el plan del cliente
- No criticar competidores (Monday, Wrike, JIG) — use ARC framework
- Reconocer fortalezas de la competencia → +33% trust

---

### Fase 9 — Propuesta + Handoff (2–4 hr)

**Acciones:**
1. Generar `propuesta-comercial.html` con scope, deliverables, inversión
2. Generar `handoff-notes.html` para el AE de Asana:
   - Resumen del cliente, dolor, fit
   - Objeciones surgidas
   - Próximos pasos comprometidos
   - Riesgos y oportunidades
3. Subir a Drive o share con el AE
4. Update `PROGRESS.md` → post-demo done

**Skills:**
- 🔑 Brand visual partner — para propuestas que vienen de Xmarts: usar tokens del `/Volumes/Crucial X10/Dev/Proyectos/Create_docs/Consultorias/` (purple AttraversIAmo `#6C3CE1` o Asana coral `#690031` según destinatario)
- `/email-drafting` — para email de envío de la propuesta
- `/feature-launch-playbook` — si se va a anunciar algo internamente
- Convertir a PDF: imprimir desde Chrome con `@page A4 portrait`

**Ancla de pricing (May 2026):**
- Asana Professional Services directo: **USD $222/hr** (oficial)
- Partner senior LATAM retail: **$85–$140 USD/hr**
- Wholesale partner-to-partner LATAM: **$40–$110 USD/hr**

---

### Fase 10 — Cristalización post-demo

**Acciones:**
1. Documentar 1–3 learnings que aplican a otros demos
2. Si descubriste un AI Teammate pattern reusable → vault
3. Si descubriste un Script Action template → vault
4. Si encontraste un bug en el MCP → reportar en repo Bananoman
5. Cerrar `PROGRESS.md` → "Demo cerrado, learnings cristalizados"

**Skills:**
- 🔑 **`/vault-crystallize`** — distill session learnings al vault cross-project
- `/vault-lint` — chequeo semanal de salud del vault

---

## Cheat sheet — qué skill llamar según pedido del usuario

| Usuario dice… | Skill primario |
|---|---|
| "Tengo un brief nuevo de cliente X" | `/demo-planner` |
| "Investiga la empresa" | `/company-current-gtm-analysis` o `/sales-call-prep` |
| "Diseña el demo" | `/demo-planner` + `/asana-demo-playbook` |
| "¿Asana puede hacer X?" | `/asana-expert` o `mcp__xmarts_docs__search_docs` |
| "Crea Script Actions" | `/asana-script-actions` |
| "Crea AI Teammate para X" | `/asana-ai-advisor` |
| "Carga mock data" | `/asana-mcp-master` → `bulk_create_tasks` |
| "Genera la presentación intro" | `/create-html-slides` |
| "Genera el cheat sheet" | `/asana-demo-playbook` |
| "Genera la propuesta comercial" | Brand visual partner + templates Consultorias |
| "Envía propuesta por email" | `/email-drafting` |
| "Guarda lo aprendido del demo" | `/vault-crystallize` |

---

## MCPs en este proyecto

| MCP | Workspace | Cuándo |
|---|---|---|
| `asana_xma` | Xmarts (Rubén) | Default para todo |
| `asana-ecol` | Partner Ecol Cómputo | Cuando el demo viene de ese canal |
| `xmarts_docs` | Docs oficiales Asana/Odoo/etc | Validar features/APIs antes de prometer |

**OJO**: cualquier MCP de Asana nuevo (otro partner): pedir nombre antes y usar formato `asana_<tag>` o `asana-<tag>`. Nunca `asana` solo.

---

## Anti-patterns explícitos

- ❌ Prometer features Enterprise+ a cliente con plan Business sin advertencia
- ❌ Mock data en inglés cuando el cliente es LATAM
- ❌ Demo sin rehearsal completo (Script Actions fallan en vivo)
- ❌ Brand tokens hechos a ojo (siempre desde `ASANA-TOKENS-FOR-HTML.md`)
- ❌ Propuesta sin disclaimer de licencias del plan
- ❌ Criticar competidores por nombre
- ❌ Hacer demo sin cargar el contexto del cliente al MCP correcto
- ❌ Cerrar el demo sin `/vault-crystallize` si hubo learning real

---

## Plantilla de PROGRESS.md inicial

```markdown
# Demo <Cliente> — Estado

## Estado Actual
- **Fase**: Preparacion
- **Ultimo cambio**: <fecha>

## Preparacion
- [ ] Brief recibido y documentado
- [ ] Investigacion de empresa completada
- [ ] Alcance definido
- [ ] Roadmap generado
- [ ] Validacion tecnica completada
- [ ] Demo space personalizado (espanol + branding)
- [ ] Mock data cargada
- [ ] Rehearsal completado

## Post-Demo
- [ ] Feedback del cliente documentado
- [ ] Handoff notes escritas
- [ ] Propuesta enviada (si aplica)
- [ ] Learnings cristalizados al vault
```
