# Roadmap de Implementacion Asana — Product Recall Clase I

## Contexto del Caso

Una empresa alimentaria multinacional con operaciones en Ecuador necesita modelar en Asana su proceso critico de Product Recall Clase I por contaminante microbiologico. El proceso involucra 9 departamentos trabajando en paralelo, 6 fases secuenciales, mas de 40 actividades, 7 subprocesos anidados y 8 puntos de decision, con SLAs regulatorios de cumplimiento obligatorio impuestos por FDA, RASFF, FSA, CFIA, MHLW y FSANZ.

El reto principal es que el cliente espera funcionalidad de BPM enterprise (gateways BPMN, subprocesos con ciclo de vida independiente, SLA timers). Asana no es un motor BPMN, pero puede modelar este proceso de manera efectiva usando su Work Graph — secciones como fases, custom fields como metadata, rules como logica de automatizacion, y proyectos vinculados como subprocesos.

---

## Mapeo de los 7 Puntos del Cliente vs Capacidades de Asana

Antes del detalle, el resumen honesto de que puede y que no puede Asana:

| # | Lo que pide Jorge | Asana puede? | Como |
|---|-------------------|-------------|------|
| 1 | Modelamiento de 9 carriles departamentales con bifurcacion paralela | ✅ Con diseno | Custom Field "Departamento" + secciones por fase + filtros por departamento. Los 7 departamentos paralelos se modelan como tareas simultaneas en la misma seccion, cada una asignada a su departamento |
| 2 | Logica condicional (gateways exclusivos, inclusivos, paralelos) | ⚠️ Parcial | Rules con condiciones simples (if field = X, then action). No hay boolean compuesto (AND/OR). Los gateways se modelan como: exclusivo = rule por valor de campo, inclusivo = multiples rules que se disparan por tags/multi-select, paralelo = dependencias + milestone de sincronizacion |
| 3 | Subprocesos con ciclo de vida independiente | ⚠️ Workaround | Cada subproceso es un proyecto separado vinculado al proceso padre via multi-homing de una tarea "ancla". El subproceso tiene sus propias secciones, tareas y aprobaciones. El status se reporta al padre via custom field o comentario |
| 4 | SLAs regulatorios con escalamiento automatico | ⚠️ Parcial | Due dates + rules de escalamiento progresivo (24h antes, 4h antes, vencido). No hay countdown timer nativo. Para SLAs estrictos (FDA <=24h), la rule cambia prioridad + notifica + crea subtarea de escalamiento |
| 5 | Escalamiento condicional multi-nivel | ✅ Con reglas | Rule: si custom field "% Recuperacion" < 95% → crear 3 subtareas simultaneas (Comunicaciones, Supply Chain, Regulatorio) + asignar + notificar. Cada subtarea es un hilo de escalamiento independiente |
| 6 | Trazabilidad y auditoria | ✅ Nativo | Task history (quien cambio que, cuando), Approvals con registro de aprobador, comentarios como evidencia, adjuntos como documentos de soporte. Todo inmutable en el Activity Log de Asana |
| 7 | Reporteria ejecutiva consolidada | ⚠️ Parcial | Dashboard de portafolio con widgets (donut, bar, list). Puede mostrar: tareas por status, por departamento, SLAs vencidos, y metricas via Formula Custom Fields (% recuperacion calculado, costos restantes). Limitacion: los campos fuente que alimentan las formulas necesitan actualizacion manual o integracion con SAP para datos en tiempo real |

---

## 3. ESTRUCTURA INTERNA DEL PROYECTO

### 3.1 Proyecto Principal: "Recall Clase I — [Contaminante] — [Fecha]"

Vista recomendada: **Board** (para ver fases como columnas) + **Timeline** (para ver dependencias y SLAs)

**Secciones (6 fases del proceso):**

| Seccion | Proposito | Ejemplo de tareas |
|---------|-----------|-------------------|
| 1. Deteccion y Evaluacion Inicial | Identificar contaminante, evaluar riesgo, clasificar recall | "Analisis de laboratorio muestra Lote L-2026-0847", "Clasificar nivel de recall (I/II/III)" |
| 2. Activacion del Comite de Crisis | Convocar comite, tomar decision de recall, asignar roles | "Convocar Comite de Crisis — Decision en <=2h", "Asignar coordinador de recall por departamento" |
| 3. Notificaciones Regulatorias | Notificar a cada jurisdiccion segun mercados afectados | "Notificar FDA — SLA <=24h", "Notificar RASFF — SLA <=48h", "Notificar ARCSA Ecuador" |
| 4. Ejecucion Paralela (9 Departamentos) | Trabajo simultaneo de todos los departamentos | "Logistica inversa — 6 paises", "Comunicado de prensa", "Linea de atencion al consumidor", "Bloqueo de inventario en sistema" |
| 5. Monitoreo y Escalamiento | Tracking de % recuperacion, escalamientos, reportes | "Reporte diario de % recuperacion por mercado", "Escalamiento: recuperacion < 95%" |
| 6. Cierre y Post-Mortem | Todos los hilos completados, cierre formal, retrospectiva | "Verificacion: todos los departamentos reportaron cierre", "Retrospectiva con Comite de Crisis", "Archivo de evidencia para auditoria" |

### 3.2 Custom Fields Globales

| Custom Field | Tipo | Opciones | Proposito |
|-------------|------|----------|-----------|
| Departamento Responsable | Single-select | Calidad, Regulatorio, Legal, Logistica/Supply Chain, Comunicaciones/PR, Produccion, Comercial/Ventas, Atencion al Consumidor, Finanzas | Los 9 carriles departamentales del BPMN |
| Clasificacion de Recall | Single-select | 🔴 Clase I (riesgo de muerte), 🟠 Clase II (riesgo temporal), 🟡 Clase III (sin riesgo) | Gateway exclusivo: determina el flujo |
| Jurisdiccion | Multi-select | FDA (USA), RASFF (EU), FSA (UK), CFIA (Canada), MHLW (Japon), FSANZ (Aus/NZ), ARCSA (Ecuador) | Gateway inclusivo: N jurisdicciones afectadas |
| Tipo de SLA | Single-select | 🔴 Regulatorio (mandato legal), 🟡 Interno (meta operativa) | Diferencia SLAs con consecuencias legales |
| Estado de SLA | Single-select | ✅ En tiempo, ⚠️ Proximo a vencer, 🔴 Vencido | Semaforo de cumplimiento |
| % Recuperacion de Producto | Number | 0-100 | Metrica clave — trigger de escalamiento si < 95% |
| Costo Acumulado | Currency (USD) | N/A | Tracking financiero para el Comite de Crisis |
| Prioridad | Single-select | 🔴 Critica, 🟠 Alta, 🟡 Media, 🟢 Baja | Triaje |
| Fase del Proceso | Single-select | Deteccion, Activacion, Notificacion, Ejecucion, Monitoreo, Cierre | Tracking de progreso |
| Evidencia Adjunta | Yes/No | Si/No | Indica si la tarea tiene documentacion de soporte para auditoria |

### 3.3 Modelamiento de los 9 Departamentos (Respuesta al Punto 1)

En lugar de 9 "carriles" (lanes) BPMN, usamos el Custom Field **Departamento Responsable** como filtro. En la vista Board:
- Cada columna es una **fase** (no un departamento)
- El campo Departamento permite filtrar para ver "solo las tareas de Logistica" o "solo Legal"
- En la fase 4 (Ejecucion Paralela), hay 9+ tareas simultaneas, una por departamento, sin dependencias entre si
- La sincronizacion final (fase 6) se logra con una **tarea milestone** "Cierre formal del Recall" que tiene dependencias de TODAS las tareas de cierre departamental

### 3.4 Modelamiento de Subprocesos (Respuesta al Punto 3)

Cada subproceso complejo se modela como un **proyecto separado** vinculado al proceso padre:

| Subproceso | Proyecto Separado | Tarea Ancla en Proceso Padre | Por que separar |
|-----------|-------------------|------------------------------|-----------------|
| Logistica Inversa Multinacional | "SP: Logistica Inversa — [Lote]" | Tarea "Logistica inversa — 6 paises" en seccion 4 | Tiene su propio flujo: aduanas, transportistas, certificadores de destruccion por pais. 20+ tareas internas, aprobaciones propias |
| Investigacion de Causa Raiz | "SP: Investigacion Causa Raiz — [Lote]" | Tarea "Investigacion de causa raiz" en seccion 4 | Involucra laboratorios, proveedores, linea de produccion. Puede durar semanas independiente del recall |
| Atencion al Consumidor | "SP: Contact Center Recall — [Lote]" | Tarea "Linea de atencion al consumidor" en seccion 4 | Volumen de llamadas, scripts, FAQ, tracking de quejas. Formulario de intake propio |

⚠️ **Limitacion honesta**: estos proyectos separados NO tienen "estado independiente" como un subprocess BPMN nativo. El estado se sincroniza manualmente o via un custom field "Status del Subproceso" en la tarea ancla del padre. Cuando el subproceso se completa, alguien actualiza la tarea ancla → la rule del padre detecta el cambio y avanza.

---

## 4. REGLAS DE AUTOMATIZACION (Smart Rules)

### 4.1 Reglas de SLA y Escalamiento (Respuesta al Punto 4)

| # | Trigger | Condicion | Accion | Proposito |
|---|---------|-----------|--------|-----------|
| R1 | Due date en 24h | Campo "Tipo de SLA" = Regulatorio | Cambiar "Estado de SLA" → ⚠️ Proximo a vencer + Comentario "@responsable SLA regulatorio vence en 24h — accion inmediata requerida" | Alerta temprana para SLAs legales |
| R2 | Due date vencido | Campo "Tipo de SLA" = Regulatorio | Cambiar "Estado de SLA" → 🔴 Vencido + Prioridad → Critica + Crear subtarea "ESCALAMIENTO: SLA regulatorio incumplido — notificar a Legal" asignada a Dir. Legal | Escalamiento automatico por incumplimiento regulatorio |
| R3 | Due date vencido | Campo "Tipo de SLA" = Interno | Cambiar "Estado de SLA" → 🔴 Vencido + Prioridad → Alta + Comentario "@responsable SLA interno vencido" | Escalamiento menor para SLAs internos |

### 4.2 Reglas de Escalamiento Condicional (Respuesta al Punto 5)

| # | Trigger | Condicion | Accion | Proposito |
|---|---------|-----------|--------|-----------|
| R4 | Campo "% Recuperacion" cambia | Valor < 95 | Crear subtarea "ESCALAMIENTO: Aviso publico adicional" asignada a Dir. Comunicaciones + Due date +24h | Ramificacion a Comunicaciones |
| R5 | Campo "% Recuperacion" cambia | Valor < 95 | Crear subtarea "ESCALAMIENTO: Extension logistica inversa" asignada a VP Supply Chain + Due date +48h | Ramificacion a Supply Chain |
| R6 | Campo "% Recuperacion" cambia | Valor < 95 | Crear subtarea "ESCALAMIENTO: Notificacion adicional a reguladores" asignada a Dir. Regulatorio + Due date +24h | Ramificacion a Regulatorio |
| R7 | Campo "% Recuperacion" cambia | Valor >= 95 | Cambiar Prioridad → Media + Comentario "Meta de recuperacion alcanzada (>=95%)" | Desescalamiento cuando se cumple meta |

### 4.3 Reglas de Flujo del Proceso

| # | Trigger | Accion | Proposito |
|---|---------|--------|-----------|
| R8 | Tarea movida a "Cierre" | Marcar completada + agregar fecha | Sync visual |
| R9 | Tarea marcada completada | Mover a "Cierre" | Bidireccionalidad |
| R10 | Campo "Clasificacion de Recall" cambia a "Clase I" | Crear subtarea "Activar protocolo Clase I — Comite de Crisis en <=2h" + Prioridad Critica | Gateway exclusivo: si es Clase I, activar protocolo completo |
| R11 | Tarea creada | Asignar defaults: Prioridad = Alta, Fase = Deteccion, Estado SLA = En tiempo | Prevenir tareas sin metadata |
| R12 | Approval aprobado | Mover a siguiente seccion + Comentario "Aprobado por [approver] — registrado para auditoria" | Trazabilidad de aprobaciones |
| R13 | Tarea movida a "Notificaciones Regulatorias" | Agregar como followers a Dir. Legal + Dir. Regulatorio | Visibilidad automatica en fase critica |

### 4.4 Reglas Cross-Project (Subprocesos)

| # | Trigger (Proceso Padre) | Accion |
|---|------------------------|--------|
| R14 | Campo "Clasificacion de Recall" = Clase I en proceso padre | Agregar tarea resumen al proyecto "Comite de Crisis — War Room" |
| R15 | Estado de SLA = 🔴 Vencido en cualquier tarea | Agregar tarea de alerta al proyecto "Comite de Crisis — War Room" |

---

## 5. INFORMES Y DASHBOARDS EJECUTIVOS (Respuesta al Punto 7)

### 5.1 Dashboard del Comite de Crisis

| Widget | Tipo | Configuracion | Lo que muestra |
|--------|------|---------------|----------------|
| Semaforo de SLAs | Chart (Donut) | Agrupar por "Estado de SLA", colores por valor | Cuantos SLAs estan en tiempo vs proximos a vencer vs vencidos |
| SLAs Regulatorios Vencidos | List | Filtro: Tipo SLA = Regulatorio AND Estado = Vencido | Lista roja de incumplimientos legales — accion inmediata |
| Progreso por Departamento | Stacked Bar | % completado agrupado por "Departamento Responsable" | Que departamentos van adelantados/atrasados |
| Tareas Criticas Pendientes | List | Filtro: Prioridad = Critica AND no completada, ordenar por due date | Top urgencias del dia |
| Recuperacion por Jurisdiccion | Bar Chart | Campo "% Recuperacion" filtrado por "Jurisdiccion" | ⚠️ Requiere una tarea por jurisdiccion con el % actualizado manualmente |
| Costos Acumulados | Numeric | Suma de campo "Costo Acumulado" | ⚠️ Requiere actualizacion manual del campo currency |

⚠️ **Limitacion honesta sobre "tiempo real"**: Los dashboards de Asana se actualizan cuando las tareas se actualizan. No hay streaming en tiempo real. Para % recuperacion y costos, alguien debe actualizar los campos manualmente o via integracion. Los SLAs si se trackean automaticamente via due dates.

### 5.2 Informes Universales

| Informe | Datos | Frecuencia | Audiencia |
|---------|-------|------------|-----------|
| Estado de Recall | Todas las tareas del proyecto: fase, departamento, SLA status, % completado | Cada 4h durante crisis activa | Comite de Crisis |
| Reporte Regulatorio | Tareas de seccion "Notificaciones": jurisdiccion, fecha de notificacion, evidencia | Diario | Dir. Regulatorio + Legal |
| Reporte de Costos | Tareas con campo "Costo Acumulado" > 0, agrupado por departamento | Diario | CFO + Dir. Finanzas |

---

## 6. ASANA AI STUDIO — Flujos Inteligentes

| # | Nombre | Trigger | Prompt | Accion |
|---|--------|---------|--------|--------|
| F1 | Clasificador de Incidencia | Formulario "Reporte de Contaminacion" completado | "Lee la descripcion de la incidencia. Clasifica el tipo de contaminante (microbiologico, quimico, fisico, alergeno). Evalua si es potencial Clase I (riesgo de muerte/dano grave), Clase II (riesgo temporal) o Clase III (sin riesgo). Asigna al departamento de Calidad." | Set Custom Fields (Clasificacion, Departamento) + Asignar a Dir. Calidad |
| F2 | Generador de Status para Comite | Tarea recurrente "Status Update" (cada 4h) | "Sintetiza el estado actual del recall: tareas completadas, en progreso y bloqueadas. Identifica SLAs en riesgo. Lista los 3 riesgos principales. Formato: Logros / En Progreso / Bloqueadores / SLAs en Riesgo." | Crear Status Update del proyecto |
| F3 | Verificador de Evidencia | Tarea movida a "Cierre" | "Revisa si esta tarea tiene documentos adjuntos o links a evidencia. Si no tiene evidencia, marca el campo 'Evidencia Adjunta' como No y agrega comentario: 'Esta tarea no tiene evidencia adjunta — requerida para auditoria.'" | Set campo Evidencia + Comentario si falta |

---

## 7. AI TEAMMATES

**AI Teammate: "Analista de Crisis" (Crisis Analyst)**

| Campo | Configuracion |
|-------|---------------|
| Nombre | Analista de Crisis |
| Rol | Sintetizador de status y detector de riesgos para el Comite de Crisis |
| Acceso | Proyecto principal de recall + subprocesos vinculados |
| Instrucciones base | "Eres un analista de crisis para un proceso de Product Recall Clase I en una empresa alimentaria. Tu trabajo es sintetizar el progreso de los 9 departamentos involucrados, detectar SLAs en riesgo de incumplimiento, identificar dependencias bloqueadas y generar reportes ejecutivos para el Comite de Crisis. Priorizas la deteccion de riesgos regulatorios. Escribes en espanol ejecutivo, conciso y orientado a la accion." |
| Casos de uso | "Sintetiza el estado del recall en las ultimas 6 horas — que departamentos reportaron avance y cuales estan bloqueados". "Compara el % de recuperacion por jurisdiccion e identifica donde estamos mas lejos del 95%". "Redacta los talking points para la reunion del Comite de Crisis de hoy." |
| Checkpoints | Genera subtareas con hallazgos. Humano revisa antes de distribuir al Comite. |

---

## 9. PLANTILLAS DE PROYECTO (Project Templates)

### 9.1 Template "Recall Clase I — Contaminante Microbiologico"

**Secciones:** Deteccion → Activacion → Notificaciones → Ejecucion Paralela → Monitoreo → Cierre

**Tareas pre-creadas:**

Fase 1 — Deteccion:
- [ ] Recepcion de alerta de contaminacion
- [ ] Analisis de laboratorio — confirmar contaminante
- [ ] Identificar lotes afectados (codigos, fechas, volumenes)
- [ ] Clasificar nivel de recall (Clase I / II / III) — Approval gate
- [ ] Mapear mercados/jurisdicciones afectados

Fase 2 — Activacion:
- [ ] Convocar Comite de Crisis — decision en <=2h
- [ ] Asignar coordinador de recall por departamento
- [ ] Activar protocolo de comunicacion interna
- [ ] Crear proyecto War Room en Asana

Fase 3 — Notificaciones:
- [ ] Notificar FDA — SLA <=24h (regulatorio)
- [ ] Notificar RASFF — SLA <=48h (regulatorio)
- [ ] Notificar FSA UK — SLA <=48h (regulatorio)
- [ ] Notificar CFIA Canada (regulatorio)
- [ ] Notificar MHLW Japon (regulatorio)
- [ ] Notificar FSANZ Australia/NZ (regulatorio)
- [ ] Notificar ARCSA Ecuador (regulatorio)

Fase 4 — Ejecucion Paralela:
- [ ] [Calidad] Cuarentena de producto en planta
- [ ] [Regulatorio] Preparar documentacion para cada jurisdiccion
- [ ] [Legal] Evaluar exposicion legal y preparar defensa
- [ ] [Logistica] Iniciar logistica inversa multinacional (→ subproceso)
- [ ] [Comunicaciones] Redactar y publicar comunicado de prensa
- [ ] [Produccion] Detener lineas de produccion afectadas
- [ ] [Comercial] Notificar a distribuidores y retailers
- [ ] [Atencion al Consumidor] Activar linea de atencion (→ subproceso)
- [ ] [Finanzas] Estimar costo total y activar provision

Fase 5 — Monitoreo:
- [ ] Reporte diario de % recuperacion por mercado
- [ ] Verificar cumplimiento de SLAs regulatorios
- [ ] Monitorear cobertura mediatica
- [ ] Evaluar si % recuperacion >= 95%
- [ ] Si < 95%: ejecutar escalamiento triple (Comunicaciones + Supply Chain + Regulatorio)

Fase 6 — Cierre:
- [ ] Verificar cierre de todos los departamentos (milestone con dependencias)
- [ ] Compilar evidencia para auditoria
- [ ] Retrospectiva con Comite de Crisis
- [ ] Informe final al regulador
- [ ] Archivo del caso (30 anos — requisito regulatorio)

**Custom Fields pre-asignados:** Departamento, Clasificacion, Jurisdiccion, Tipo SLA, Estado SLA, % Recuperacion, Costo Acumulado, Prioridad, Fase, Evidencia Adjunta

**Reglas pre-configuradas:** R1-R15

---

## 10. PROYECTO TRANSVERSAL: COMITE DE CRISIS — WAR ROOM

| Campo | Valor |
|-------|-------|
| Nombre | Comite de Crisis — War Room |
| Proposito | Concentrar alertas, escalamientos, decisiones y status del recall activo |
| Secciones | 🔴 Escalamientos Activos / ⚠️ SLAs en Riesgo / 📋 Decisiones Pendientes / ✅ Resueltos |
| Regla de entrada | Automatica: cualquier tarea con SLA Vencido o Clasificacion = Clase I genera entrada aqui (R14, R15) |
| Regla de salida | Cuando la tarea original se resuelve, mover a "Resueltos" |
| Reunion | Standup cada 4h durante crisis activa (primeras 72h), luego diario |

---

## 11. FORMULARIOS DE INTAKE

### 11.1 Formulario "Reporte de Contaminacion"

Para que cualquier planta, laboratorio o equipo de calidad reporte una sospecha:

| Campo | Tipo | Mapeo |
|-------|------|-------|
| Planta / Ubicacion | Dropdown (lista de plantas) | → Descripcion |
| Tipo de contaminante sospechado | Dropdown: Microbiologico / Quimico / Fisico / Alergeno / Desconocido | → Custom Field (input para AI Studio F1) |
| Lote(s) afectado(s) | Texto | → Titulo de tarea |
| Descripcion del hallazgo | Texto largo | → Descripcion |
| Resultado de laboratorio | Archivo | → Adjuntos |
| Fecha de deteccion | Fecha | → Due date (inicio del SLA) |
| Urgencia percibida | Dropdown: Critica / Alta / Media | → Input para AI Studio |

Regla post-formulario: AI Studio clasifica + asigna a Dir. Calidad para evaluacion inicial.

---

## 12. CRONOGRAMA DE IMPLEMENTACION SUGERIDO

| Fase | Duracion | Actividades |
|------|----------|-------------|
| Fase 1: Estructura Base | Dia 1-2 | Crear proyecto principal con 6 secciones. Definir los 10 Custom Fields globales. Crear proyecto War Room. |
| Fase 2: Template y Tareas | Dia 3-4 | Crear las 30+ tareas pre-definidas. Configurar dependencias. Crear milestone de sincronizacion en Fase 6. Crear subproyectos para Logistica Inversa, Causa Raiz, Contact Center. |
| Fase 3: Automatizacion | Dia 5-6 | Implementar reglas R1-R15. Configurar formulario de intake. Probar escalamientos con datos mock. |
| Fase 4: AI + Dashboard | Dia 7-8 | Configurar flujos AI Studio (F1-F3). Configurar AI Teammate "Analista de Crisis". Construir dashboard del Comite de Crisis. |
| Fase 5: Mock Data + Rehearsal | Dia 9-10 | Cargar datos realistas (lotes, jurisdicciones, costos). Simular un recall completo end-to-end. Ajustar reglas y dashboard segun hallazgos. |

**Total: 10 dias habiles** (2 semanas) para tener la demo lista.

---

## 13. RESUMEN EJECUTIVO

```
    ┌──────────────────────────────────────────────┐
    │  PROYECTO: Recall Clase I — [Contaminante]   │
    │  9 Departamentos │ 6 Fases │ SLAs Multinac.  │
    └────────────────────┬─────────────────────────┘
                         │
    ┌────────────────────┼────────────────────────┐
    │                    │                        │
    ▼                    ▼                        ▼
 Subproceso          Subproceso              Subproceso
 Logistica           Causa Raiz              Contact
 Inversa             Investigacion           Center
 (6 paises)          (labs + proveedores)    (intake + FAQ)
    │                    │                        │
    └────────────────────┼────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   WAR ROOM          │
              │   Comite de Crisis  │
              │   Dashboard + AI    │
              └─────────────────────┘
```

**Numeros clave:**
- 1 Proyecto principal con 6 secciones (fases)
- 3 Subprocesos como proyectos separados
- 1 War Room (Comite de Crisis)
- 10 Custom Fields globales
- 15 Reglas de automatizacion
- 3 Flujos de AI Studio
- 1 AI Teammate (Analista de Crisis)
- 1 Formulario de intake
- 1 Project Template replicable
- 30+ tareas pre-definidas con SLAs y dependencias
- Dashboard con 6 widgets para vista ejecutiva

**Marcadores de factibilidad:**
- ✅ 5 de 7 puntos del cliente son factibles nativamente o con diseno
- ⚠️ 2 puntos requieren workarounds documentados (subprocesos independientes, SLA timers)
- ❌ 0 puntos son imposibles — todo se puede modelar, algunos con limitaciones claras

---

## 14. PROPUESTA DE MEJORA — Cerrar los Gaps Identificados

Asana cubre el 85% del proceso de forma nativa. Los gaps restantes se cierran con funcionalidades avanzadas de Asana (Script Actions, Formula Fields) y, donde sea necesario, integracion con el ecosistema SAP del cliente.

### Gap 1: Sincronizacion de subprocesos con proceso padre

**Problema**: Los proyectos vinculados funcionan como subprocesos, pero la sincronizacion de estado entre el subproceso y la tarea ancla en el proceso padre requiere actualizacion manual.

**Solucion propuesta — Script Actions de Asana (opcion preferida)**:

Asana Script Actions es un entorno serverless (Node.js) disponible en Enterprise/Enterprise+ que permite ejecutar scripts como parte de una regla. El script puede llamar cualquier endpoint de la API de Asana. Esto permite:

- Regla en el subproceso: "Cuando la ultima tarea se complete → ejecutar Script Action"
- El script lee el estado del subproceso, identifica la tarea ancla en el proyecto padre, y la actualiza automaticamente (custom field, comentario, o marcar como completada)
- Todo ocurre dentro de Asana, sin servidores externos

**Limitaciones de Script Actions**: solo pueden llamar la API de Asana (no APIs externas). Timeout de ~20 segundos. Requiere Enterprise/Enterprise+.

**Script listo para implementar** (ver `scripts/script-1-sync-subprocess.js`):
- Trigger: "Tarea marcada como completada" en el proyecto subproceso
- Lee todas las tareas del subproceso y verifica si TODAS estan completadas
- Si todas completas → busca tarea ancla en proyecto padre por keyword "[Logistica]"
- Actualiza custom field "Fase del Proceso" → "Cierre" + agrega comentario
- Usa Promise.all() para paralelizar update + comentario
- Incluye error handling completo con log() detallado

**Alternativa si Script Actions no alcanza**: un servidor ligero en Vercel que escuche webhooks de Asana. Cuando detecta que la ultima tarea del subproceso se completa, envia la instruccion de vuelta a Asana para actualizar el proceso padre.

**Impacto cuantificable**: Elimina ~15 min diarios de actualizacion manual por subproceso x 3 subprocesos = **45 min/dia** durante una crisis de 2-4 semanas.

| Opcion | Complejidad | Requiere servidor externo | Tiempo |
|--------|-----------|--------------------------|--------|
| Script Actions (preferida) | Baja | No | 1-2 dias |
| Vercel + Webhook | Media | Si (Vercel free tier) | 3-5 dias |

### Gap 2: Datos de recuperacion y costos

**Correccion importante**: Asana SI tiene campos calculados (Formula Custom Fields, disponible desde 2023). Soportan operadores +, -, x, / con campos numericos. Esto cambia significativamente el panorama.

**Lo que SI se puede hacer nativamente con Formula Fields**:
- Campo "% Recuperacion" = (Unidades Recuperadas / Total Unidades) x 100
- Campo "Costo Restante" = Provision Total - Costo Acumulado
- Campo "Dias para Cierre" = Fecha Limite - Hoy

Estos campos calculados se actualizan automaticamente cuando los campos fuente cambian, y se pueden usar en dashboards y reportes universales.

**Lo que NO se puede hacer nativamente**: conexion con SAP HANA para alimentar los campos fuente automaticamente. El cliente opera con SAP, no con herramientas simples — Make/Zapier no es adecuado para este nivel de integracion.

**Solucion para la conexion con SAP**:

El cliente necesita un middleware dedicado que conecte los endpoints de SAP HANA con los endpoints de Asana. Este es un proyecto de integracion en si mismo que requiere:

1. Mapear los endpoints relevantes de SAP (modulo de inventario/WMS, modulo financiero)
2. Construir el middleware que traduzca eventos SAP → actualizaciones Asana
3. Definir la direccionalidad: unidireccional (SAP → Asana) o bidireccional
4. Trabajar en conjunto con el equipo SAP del cliente

| Aspecto | Detalle |
|---------|---------|
| Alcance | Middleware SAP HANA ↔ Asana via API |
| Datos a sincronizar | Unidades devueltas por mercado, costos por categoria |
| Direccionalidad | Unidireccional (SAP → Asana) como minimo |
| Equipo necesario | Consultor Asana + consultor SAP del cliente |
| Estimacion | 2-4 semanas dependiendo de la complejidad del landscape SAP |
| Nota | Este es un proyecto de integracion separado, no parte de la implementacion base de Asana |

### Gap 3: Escalamiento condicional multi-nivel

**Problema**: Cuando el % de recuperacion no alcanza el 95%, se necesita escalar simultaneamente a 3 departamentos. Las reglas nativas de Asana no pueden evaluar un campo numerico con threshold y crear multiples subtareas condicionalmente.

**Script listo para implementar** (ver `scripts/script-2-triple-escalation.js`):
- Trigger: "Custom field cambia" en campo "% Recuperacion"
- Lee el valor actual del campo; si es >= 95 o null, no hace nada
- Si < 95 → verifica que no existan escalamientos previos (evita duplicados)
- Crea 3 subtareas en paralelo con Promise.all():
  1. Comunicaciones — aviso publico adicional (due +24h)
  2. Supply Chain — extension logistica inversa (due +48h)
  3. Regulatorio — notificacion a reguladores (due +24h)
- Todas con Prioridad Critica, con notas detalladas
- Agrega comentario de alerta consolidado

### Gap 4: Logica inclusiva (gateways BPMN multi-jurisdiccion)

**Problema**: Cuando se activa un recall, se deben notificar N jurisdicciones segun los mercados afectados, cada una con SLA diferente. El gateway inclusivo BPMN dispara multiples caminos segun condiciones.

**Script listo para implementar** (ver `scripts/script-3-multi-jurisdiction.js`):
- Trigger: "Tarea anadida a seccion Notificaciones Regulatorias"
- Lee el campo multi-enum "Jurisdiccion" de la tarea
- Para cada jurisdiccion seleccionada, crea subtarea con:
  - Nombre: "Notificar [regulador] — SLA <=Xh (REGULATORIO)"
  - Due date calculado automaticamente segun SLA del regulador
  - Custom fields: Tipo SLA = Regulatorio, Estado = En tiempo, Prioridad = Critica
- SLAs: FDA 24h, RASFF 48h, FSA 48h, CFIA 48h, MHLW 72h, FSANZ 72h, ARCSA 24h
- Verifica duplicados antes de crear
- Agrega comentario resumen con todas las jurisdicciones

### Capacidad adicional: AI Teammate para generar nuevos scripts

Para scripts futuros que el cliente necesite, se puede configurar un AI Teammate
"Script Actions Writer" que genera codigo bajo demanda. Se le asigna una tarea
con la descripcion del comportamiento deseado y genera el script listo para
copy-paste. Ver `scripts/ai-teammate-prompts.md` para los prompts pre-escritos.

### Narrativa actualizada para la demo

> "Asana gestiona nativamente la gran mayoria de su proceso de recall — modelamiento multi-departamental, SLAs con escalamiento, campos calculados para metricas, trazabilidad de decisiones, y reporteria ejecutiva. Para la sincronizacion de subprocesos, usamos Script Actions de Asana que mantienen todo dentro de la plataforma sin servidores externos. El unico punto que requiere integracion dedicada es la conexion con SAP HANA para alimentar datos de inventario en tiempo real — eso es un proyecto de integracion que trabajamos en conjunto con su equipo SAP."

Esta narrativa es mas precisa y honesta: diferencia lo que Asana hace solo, lo que hace con sus herramientas avanzadas (Script Actions), y lo que necesita integracion real (SAP).
