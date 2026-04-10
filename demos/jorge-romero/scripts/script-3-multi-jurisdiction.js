/**
 * Script Action: Generador de notificaciones multi-jurisdiccion
 *
 * Trigger: Regla → "Tarea anadida a seccion Notificaciones Regulatorias"
 * Comportamiento: Lee el campo multi-enum "Jurisdiccion" y crea una
 * subtarea de notificacion por cada jurisdiccion seleccionada, con
 * SLA especifico segun el regulador.
 *
 * Esto modela el "gateway inclusivo" del BPMN: multiples caminos
 * se activan segun las jurisdicciones afectadas.
 *
 * Configuracion: Reemplazar los GIDs de la seccion CONFIGURATION.
 *
 * In Scope: project_gid, workspace_gid, task_gid, log(), *ApiInstance
 */
async function run() {
  try {
    // ===================== CONFIGURATION =====================
    // Custom field "Jurisdiccion" (multi-enum)
    const JURISDICTION_FIELD_GID = '1213986355488023';
    // Custom field "Tipo de SLA"
    const SLA_TYPE_FIELD_GID = '1213986423408741';
    const SLA_TYPE_REGULATORIO_GID = '1213986423408742';
    // Custom field "Estado de SLA"
    const SLA_STATUS_FIELD_GID = '1213986386240817';
    const SLA_STATUS_EN_TIEMPO_GID = '1213986386240818';
    // Custom field "Departamento Responsable"
    const DEPT_FIELD_GID = '1213986186376767';
    const DEPT_REGULATORIO_GID = '1213986186376769';
    // Custom field "Prioridad Recall"
    const PRIORITY_FIELD_GID = '1213986378365787';
    const PRIORITY_CRITICA_GID = '1213986378365788';

    // Mapeo de jurisdiccion enum_option GID → nombre + SLA en horas
    const JURISDICTION_MAP = {
      '1213986355488024': { name: 'FDA (USA)',        sla_hours: 24 },
      '1213986355488025': { name: 'RASFF (EU)',       sla_hours: 48 },
      '1213986355488026': { name: 'FSA (UK)',         sla_hours: 48 },
      '1213986355488027': { name: 'CFIA (Canada)',    sla_hours: 48 },
      '1213986355488028': { name: 'MHLW (Japon)',     sla_hours: 72 },
      '1213986355488029': { name: 'FSANZ (Aus/NZ)',   sla_hours: 72 },
      '1213986355488030': { name: 'ARCSA (Ecuador)',  sla_hours: 24 }
    };
    // ==========================================================

    log(`Script iniciado — tarea: ${task_gid}`);

    // 1. Leer la tarea y su campo multi-enum Jurisdiccion
    const taskResponse = await tasksApiInstance.getTask(task_gid, {
      opt_fields: 'name,custom_fields,custom_fields.gid,custom_fields.multi_enum_values,custom_fields.multi_enum_values.gid,custom_fields.multi_enum_values.name'
    });

    if (!taskResponse.data) {
      log('Error: No se pudo leer la tarea');
      return;
    }

    const task = taskResponse.data;
    log(`Tarea: "${task.name}"`);

    // 2. Obtener las jurisdicciones seleccionadas
    const jurisdictionField = task.custom_fields.find(f => f.gid === JURISDICTION_FIELD_GID);

    if (!jurisdictionField || !jurisdictionField.multi_enum_values || jurisdictionField.multi_enum_values.length === 0) {
      log('No hay jurisdicciones seleccionadas en el campo "Jurisdiccion". Saliendo.');
      return;
    }

    const selectedJurisdictions = jurisdictionField.multi_enum_values;
    log(`Jurisdicciones seleccionadas: ${selectedJurisdictions.map(j => j.name).join(', ')}`);

    // 3. Verificar que no existan subtareas de notificacion previas
    const subtasksResponse = await tasksApiInstance.getSubtasksForTask(task_gid, {
      opt_fields: 'name',
      limit: 50
    });

    if (subtasksResponse.data) {
      const existingNotifications = subtasksResponse.data.filter(
        s => s.name && s.name.startsWith('Notificar ')
      );
      if (existingNotifications.length > 0) {
        log(`Ya existen ${existingNotifications.length} subtarea(s) de notificacion. No se duplican.`);
        return;
      }
    }

    // 4. Calcular due dates y crear subtareas en paralelo
    const now = new Date();

    const subtaskPromises = selectedJurisdictions.map(jurisdiction => {
      const config = JURISDICTION_MAP[jurisdiction.gid];

      if (!config) {
        log(`Jurisdiccion desconocida: ${jurisdiction.name} (${jurisdiction.gid}). Saltando.`);
        return null;
      }

      // Calcular due date segun SLA
      const dueDate = new Date(now.getTime() + config.sla_hours * 60 * 60 * 1000);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      log(`Creando: Notificar ${config.name} — SLA ${config.sla_hours}h — Due: ${dueDateStr}`);

      return tasksApiInstance.createSubtaskForTask({
        data: {
          name: `Notificar ${config.name} - SLA ${config.sla_hours}h (REGULATORIO)`,
          notes: 'Notificacion regulatoria obligatoria. Jurisdiccion: ' + config.name + '. SLA: ' + config.sla_hours + ' horas desde la activacion del recall. Fecha limite: ' + dueDateStr + '. Este es un mandato legal. El incumplimiento puede resultar en sanciones regulatorias.',
          due_on: dueDateStr,
          custom_fields: {
            [SLA_TYPE_FIELD_GID]: SLA_TYPE_REGULATORIO_GID,
            [SLA_STATUS_FIELD_GID]: SLA_STATUS_EN_TIEMPO_GID,
            [DEPT_FIELD_GID]: DEPT_REGULATORIO_GID,
            [PRIORITY_FIELD_GID]: PRIORITY_CRITICA_GID
          }
        }
      }, task_gid);
    }).filter(p => p !== null);

    const results = await Promise.all(subtaskPromises);
    log(`${results.length} subtarea(s) de notificacion creadas.`);

    // 5. Agregar comentario resumen
    const jurisdictionList = selectedJurisdictions
      .map(j => {
        const config = JURISDICTION_MAP[j.gid];
        return config ? `- ${config.name}: SLA ≤${config.sla_hours}h` : `- ${j.name}: SLA no definido`;
      })
      .join('\n');

    await storiesApiInstance.createStoryForTask({
      data: {
        text: `NOTIFICACIONES REGULATORIAS GENERADAS\n\nSe crearon ${results.length} subtarea(s) de notificacion para las siguientes jurisdicciones:\n\n${jurisdictionList}\n\nCada subtarea tiene su fecha limite calculada segun el SLA del regulador correspondiente.\n\nGenerado automaticamente via Script Action.`
      }
    }, task_gid);

    log('Comentario resumen agregado.');
    log('Script completado exitosamente.');

  } catch (e) {
    log(`Error critico: ${e.message}`);
    if (e.response && e.response.body) {
      log(`API Response: ${JSON.stringify(e.response.body)}`);
    }
  }
}

run();
