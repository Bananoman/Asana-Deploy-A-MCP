/**
 * Script Action: Sincronizacion subproceso → proceso padre
 *
 * Trigger: Regla en proyecto subproceso → "Tarea marcada como completada"
 * Comportamiento: Cuando se completa la ultima tarea del subproceso,
 * actualiza la tarea ancla en el proceso padre y agrega comentario.
 *
 * Configuracion: Reemplazar los GIDs de la seccion CONFIGURATION
 * con los valores reales del workspace del cliente.
 *
 * In Scope: project_gid, workspace_gid, task_gid, log(), *ApiInstance
 */
async function run() {
  try {
    // ===================== CONFIGURATION =====================
    // GID del proyecto padre donde esta la tarea ancla
    const PARENT_PROJECT_GID = '1213986423006166';
    // Custom field "Fase del Proceso"
    const FASE_FIELD_GID = '1213986423378908';
    // Enum option "Cierre"
    const FASE_CIERRE_GID = '1213986423378914';
    // Texto que identifica la tarea ancla en el proyecto padre
    const ANCHOR_TASK_KEYWORD = '[Logistica]';
    // ==========================================================

    log(`Script iniciado — tarea completada: ${task_gid}`);
    log(`Verificando si todas las tareas del subproceso estan completadas...`);

    // 1. Obtener todas las tareas del subproceso actual
    const tasksResponse = await tasksApiInstance.getTasksForProject(project_gid, {
      opt_fields: 'name,completed',
      limit: 100
    });

    if (!tasksResponse.data) {
      log('Error: No se pudieron obtener las tareas del subproceso');
      return;
    }

    const allTasks = tasksResponse.data;
    const incompleteTasks = allTasks.filter(t => !t.completed);

    log(`Total tareas: ${allTasks.length}, Incompletas: ${incompleteTasks.length}`);

    // 2. Si hay tareas incompletas, no hacer nada
    if (incompleteTasks.length > 0) {
      log(`Aun hay ${incompleteTasks.length} tarea(s) pendiente(s). No se actualiza el padre.`);
      incompleteTasks.forEach(t => log(`  - Pendiente: ${t.name}`));
      return;
    }

    log('Todas las tareas completadas. Buscando tarea ancla en proyecto padre...');

    // 3. Buscar la tarea ancla en el proyecto padre
    const parentTasksResponse = await tasksApiInstance.getTasksForProject(PARENT_PROJECT_GID, {
      opt_fields: 'name,gid,completed,custom_fields',
      limit: 100
    });

    if (!parentTasksResponse.data) {
      log('Error: No se pudieron obtener las tareas del proyecto padre');
      return;
    }

    const anchorTask = parentTasksResponse.data.find(
      t => t.name && t.name.includes(ANCHOR_TASK_KEYWORD)
    );

    if (!anchorTask) {
      log(`Error: No se encontro tarea ancla con keyword "${ANCHOR_TASK_KEYWORD}" en proyecto padre`);
      return;
    }

    log(`Tarea ancla encontrada: "${anchorTask.name}" (${anchorTask.gid})`);

    // 4. Actualizar custom field y agregar comentario en paralelo
    await Promise.all([
      // Actualizar campo "Fase del Proceso" a "Cierre"
      tasksApiInstance.updateTask({
        data: {
          custom_fields: {
            [FASE_FIELD_GID]: FASE_CIERRE_GID
          }
        }
      }, anchorTask.gid),

      // Agregar comentario de confirmacion
      storiesApiInstance.createStoryForTask({
        data: {
          text: `Subproceso completado automaticamente.\n\nTodas las tareas del subproceso "${project_gid}" han sido finalizadas. La fase se actualizo a "Cierre".\n\nActualizado via Script Action.`
        }
      }, anchorTask.gid)
    ]);

    log(`Tarea ancla actualizada: Fase → Cierre + comentario agregado`);
    log('Script completado exitosamente.');

  } catch (e) {
    log(`Error critico: ${e.message}`);
    if (e.response && e.response.body) {
      log(`API Response: ${JSON.stringify(e.response.body)}`);
    }
  }
}

run();
