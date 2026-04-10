# Demo: Jorge Romero — Product Recall Clase I

## Cliente
- **Empresa**: Empresa alimentaria (Ecuador)
- **Industria**: Alimentaria / Food Safety
- **Tamano**: Mediana-grande (operacion multinacional, 9 departamentos)
- **Contacto**: Jorge Romero

## Objetivo de la Demo
Demostrar como Asana puede modelar y gestionar un proceso de Product Recall Clase I por contaminante microbiologico, con 9 departamentos trabajando en paralelo, SLAs regulatorios multinacionales, escalamiento automatico y reporteria ejecutiva consolidada para el Comite de Crisis.

## Funciones de Asana a Destacar
- Sections como fases del proceso (6 fases)
- Custom Fields para departamentos, clasificacion de recall, jurisdicciones, SLAs
- Rules para escalamiento automatico por SLAs y condiciones
- AI Studio para clasificacion y triage
- Project Templates para replicar el proceso ante diferentes contaminantes
- War Room / Comite de Crisis como proyecto transversal
- Forms para reporte de incidencias
- Dashboards para vista ejecutiva consolidada

## Limitaciones Conocidas
- Subprocesos con ciclo de vida independiente: Asana no tiene subprocess nativo — modelar como subtasks o proyectos vinculados
- SLA timers con countdown: no hay timer nativo — usar due dates + rules de escalamiento
- Gateways BPMN (paralelos, exclusivos, inclusivos): no hay logica boolean compleja — usar rules simples + multi-homing
- Sincronizacion de hilos paralelos: usar dependencias + milestone como sync point

## Demo Space
- **Workspace**: Demo space Asana
- **Token**: en .env (ASANA_DEMO_TOKEN)

## Reglas de Trabajo
1. Todo en espanol con branding del cliente
2. Mock data realista — nombres de departamentos, contaminantes, jurisdicciones reales
3. Validar factibilidad antes de prometer — usar validation-checklist.md
4. Consultar roadmap.md para la estructura completa
