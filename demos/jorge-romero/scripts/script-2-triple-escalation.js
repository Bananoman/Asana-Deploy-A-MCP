/**
 * Script Action: Escalamiento triple cuando % recuperacion < 95%
 *
 * Trigger: Regla → "Custom field cambia" (% Recuperacion de Producto)
 * Comportamiento: Si el % es menor a 95, crea 3 subtareas de escalamiento
 * asignadas a Comunicaciones, Supply Chain y Regulatorio.
 * Incluye check para no duplicar escalamientos.
 *
 * Configuracion: Reemplazar los GIDs de la seccion CONFIGURATION.
 *
 * In Scope: project_gid, workspace_gid, task_gid, log(), *ApiInstance
 */
async function run() {
  try {
    // ===================== CONFIGURATION =====================
    // Custom field "% Recuperacion de Producto"
    const RECOVERY_FIELD_GID = '1213986386281851';
    // Umbral de escalamiento
    const THRESHOLD = 95;
    // Custom field "Departamento Responsable"
    const DEPT_FIELD_GID = '1213986186376767';
    // Enum options de Departamento
    const DEPT_COMUNICACIONES_GID = '1213986186376772';
    const DEPT_LOGISTICA_GID = '1213986186376771';
    const DEPT_REGULATORIO_GID = '1213986186376769';
    // Custom field "Prioridad Recall"
    const PRIORITY_FIELD_GID = '1213986378365787';
    const PRIORITY_CRITICA_GID = '1213986378365788';
    // Prefijo para detectar si ya se escalo (evitar duplicados)
    const ESCALATION_PREFIX = 'ESCALAMIENTO:';
    // ==========================================================

    log(`Script iniciado — evaluando tarea: ${task_gid}`);

    // 1. Leer la tarea que disparo la regla
    const taskResponse = await tasksApiInstance.getTask(task_gid, {
      opt_fields: 'name,custom_fields,custom_fields.gid,custom_fields.number_value'
    });

    if (!taskResponse.data) {
      log('Error: No se pudo leer la tarea');
      return;
    }

    const task = taskResponse.data;
    log(`Tarea: "${task.name}"`);

    // 2. Obtener el valor del campo % Recuperacion
    const recoveryField = task.custom_fields.find(f => f.gid === RECOVERY_FIELD_GID);

    if (!recoveryField) {
      log('Campo "% Recuperacion" no encontrado en esta tarea. Saliendo.');
      return;
    }

    const recoveryValue = recoveryField.number_value;
    log(`% Recuperacion actual: ${recoveryValue}%`);

    // 3. Verificar si esta por debajo del umbral
    if (recoveryValue === null || recoveryValue >= THRESHOLD) {
      log(`Recuperacion en ${recoveryValue}% (umbral: ${THRESHOLD}%). No se requiere escalamiento.`);
      return;
    }

    log(`ALERTA: Recuperacion ${recoveryValue}% < ${THRESHOLD}%. Iniciando escalamiento triple...`);

    // 4. Verificar que no existan escalamientos previos (evitar duplicados)
    const subtasksResponse = await tasksApiInstance.getSubtasksForTask(task_gid, {
      opt_fields: 'name',
      limit: 50
    });

    if (subtasksResponse.data) {
      const existingEscalations = subtasksResponse.data.filter(
        s => s.name && s.name.startsWith(ESCALATION_PREFIX)
      );
      if (existingEscalations.length > 0) {
        log(`Ya existen ${existingEscalations.length} escalamiento(s) previo(s). No se duplican.`);
        existingEscalations.forEach(s => log(`  - ${s.name}`));
        return;
      }
    }

    // 5. Calcular due dates (+24h y +48h desde ahora)
    const now = new Date();
    const due24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const due48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 6. Crear 3 subtareas de escalamiento en paralelo
    const escalations = [
      {
        name: `${ESCALATION_PREFIX} Aviso publico adicional — recuperacion al ${recoveryValue}%`,
        notes: `Escalamiento automatico: el porcentaje de recuperacion (${recoveryValue}%) esta por debajo del umbral del ${THRESHOLD}%.\n\nAccion requerida: Emitir aviso publico adicional en medios y canales de comunicacion para ampliar el alcance del recall.`,
        dept: DEPT_COMUNICACIONES_GID,
        due: due24h
      },
      {
        name: `${ESCALATION_PREFIX} Extension logistica inversa — recuperacion al ${recoveryValue}%`,
        notes: `Escalamiento automatico: el porcentaje de recuperacion (${recoveryValue}%) esta por debajo del umbral del ${THRESHOLD}%.\n\nAccion requerida: Ampliar la operacion de logistica inversa. Contactar distribuidores adicionales, ampliar puntos de recoleccion, extender plazos de retorno.`,
        dept: DEPT_LOGISTICA_GID,
        due: due48h
      },
      {
        name: `${ESCALATION_PREFIX} Notificacion adicional a reguladores — recuperacion al ${recoveryValue}%`,
        notes: `Escalamiento automatico: el porcentaje de recuperacion (${recoveryValue}%) esta por debajo del umbral del ${THRESHOLD}%.\n\nAccion requerida: Notificar a los reguladores (FDA, RASFF, ARCSA, etc.) que el recall no ha alcanzado el objetivo de recuperacion. Preparar plan de accion correctiva.`,
        dept: DEPT_REGULATORIO_GID,
        due: due24h
      }
    ];

    await Promise.all(escalations.map(esc =>
      tasksApiInstance.createSubtaskForTask({
        data: {
          name: esc.name,
          notes: esc.notes,
          due_on: esc.due,
          custom_fields: {
            [DEPT_FIELD_GID]: esc.dept,
            [PRIORITY_FIELD_GID]: PRIORITY_CRITICA_GID
          }
        }
      }, task_gid)
    ));

    log('3 subtareas de escalamiento creadas exitosamente.');

    // 7. Agregar comentario de alerta
    await storiesApiInstance.createStoryForTask({
      data: {
        text: `ESCALAMIENTO AUTOMATICO ACTIVADO\n\nEl porcentaje de recuperacion de producto es ${recoveryValue}% (por debajo del umbral del ${THRESHOLD}%).\n\nSe crearon 3 subtareas de escalamiento:\n1. Comunicaciones — Aviso publico adicional (due: ${due24h})\n2. Supply Chain — Extension logistica inversa (due: ${due48h})\n3. Regulatorio — Notificacion a reguladores (due: ${due24h})\n\nAccion inmediata requerida por los 3 departamentos.`
      }
    }, task_gid);

    log('Comentario de alerta agregado.');
    log('Script completado exitosamente.');

  } catch (e) {
    log(`Error critico: ${e.message}`);
    if (e.response && e.response.body) {
      log(`API Response: ${JSON.stringify(e.response.body)}`);
    }
  }
}

run();
