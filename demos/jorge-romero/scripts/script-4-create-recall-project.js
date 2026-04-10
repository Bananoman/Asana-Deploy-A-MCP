/**
 * Script Action 4: Crear proyecto de recall desde template + agregar a portafolio
 *
 * Trigger: Tarea movida a seccion "Clase I — Recall Activado" o "Clase II — Recall Parcial"
 * Proyecto: Triage de Incidentes — Seguridad Alimentaria
 *
 * Comportamiento:
 * 1. Lee los datos del incidente (subsidiaria, producto, contaminante, lote)
 * 2. Instancia el proyecto desde el template de Recall
 * 3. Agrega el nuevo proyecto al portafolio "Recalls Activos"
 * 4. Agrega comentario en la tarea de triage con link al nuevo proyecto
 *
 * In Scope: project_gid, workspace_gid, task_gid, log(), *ApiInstance
 */
async function run() {
  try {
    // ===================== CONFIGURATION =====================
    // Template GID del proyecto Recall
    const RECALL_TEMPLATE_GID = '1213995294433587';
    // Portafolio "Recalls Activos"
    const PORTFOLIO_ACTIVOS_GID = '1213996017548451';
    // Secciones que disparan este script
    const CLASE_I_SECTION = '1213995483808911';
    const CLASE_II_SECTION = '1214017957253030';
    // Custom fields del Triage
    const SUBSIDIARIA_FIELD_GID = '1213995629895644';
    const PRODUCTO_FIELD_GID = '1213995337389913';
    const CONTAMINANTE_FIELD_GID = '1213995294769451';
    const CLASIFICACION_FIELD_GID = '1213986378342655';
    // ==========================================================

    log('Script 4 iniciado - Crear proyecto de recall');

    // 1. Leer la tarea del triage
    const taskResp = await tasksApiInstance.getTask(task_gid, {
      opt_fields: 'name,notes,memberships.section.gid,custom_fields,custom_fields.gid,custom_fields.enum_value,custom_fields.enum_value.name,custom_fields.display_value'
    });

    const task = taskResp.data;
    log('Incidente: ' + task.name);

    // 2. Verificar que esta en la seccion correcta
    const inCorrectSection = task.memberships && task.memberships.some(function(m) {
      return m.section && (m.section.gid === CLASE_I_SECTION || m.section.gid === CLASE_II_SECTION);
    });

    if (!inCorrectSection) {
      log('Tarea no esta en seccion Clase I o II. Saliendo.');
      return;
    }

    // 3. Extraer datos del incidente para el nombre del proyecto
    var subsidiaria = '';
    var producto = '';
    var contaminante = '';
    var clasificacion = '';

    if (task.custom_fields) {
      for (var i = 0; i < task.custom_fields.length; i++) {
        var f = task.custom_fields[i];
        if (f.gid === SUBSIDIARIA_FIELD_GID && f.enum_value) subsidiaria = f.enum_value.name;
        if (f.gid === PRODUCTO_FIELD_GID && f.enum_value) producto = f.enum_value.name;
        if (f.gid === CONTAMINANTE_FIELD_GID && f.enum_value) contaminante = f.enum_value.name;
        if (f.gid === CLASIFICACION_FIELD_GID && f.enum_value) clasificacion = f.enum_value.name;
      }
    }

    // Extraer numero de lote del nombre de la tarea (busca "Lote X-XXXX-XXXX")
    var lote = 'Sin lote';
    var loteMatch = task.name.match(/Lote\s+([A-Z0-9\-]+)/i);
    if (loteMatch) lote = loteMatch[1];

    // Construir nombre del proyecto
    var claseLabel = clasificacion.indexOf('Clase I') >= 0 ? 'Clase I' : 'Clase II';
    var projectName = 'Recall ' + claseLabel + ' - ' + contaminante + ' - ' + producto + ' - Lote ' + lote;

    log('Nombre del proyecto: ' + projectName);

    // 4. Verificar que no exista ya un proyecto con ese nombre (evitar duplicados)
    var existingSubtasks = await tasksApiInstance.getSubtasksForTask(task_gid, {
      opt_fields: 'name',
      limit: 10
    });

    if (existingSubtasks.data) {
      var alreadyCreated = existingSubtasks.data.some(function(s) {
        return s.name && s.name.indexOf('Proyecto de recall creado') >= 0;
      });
      if (alreadyCreated) {
        log('Ya se creo un proyecto para este incidente. No se duplica.');
        return;
      }
    }

    // 5. Instanciar proyecto desde template
    log('Creando proyecto desde template...');
    log('Template GID: ' + RECALL_TEMPLATE_GID);
    log('Project name: ' + projectName);

    var instantiateResp;
    try {
      // Intentar firma: body FIRST, then GID (como update/create methods)
      instantiateResp = await projectTemplatesApiInstance.instantiateProject(
        { data: { name: projectName } },
        RECALL_TEMPLATE_GID
      );
    } catch (e1) {
      log('Firma 1 fallo: ' + e1.message + ' - Intentando firma alternativa...');
      try {
        // Intentar firma alternativa: GID first, opts con body
        instantiateResp = await projectTemplatesApiInstance.instantiateProject(
          RECALL_TEMPLATE_GID,
          { body: { data: { name: projectName } } }
        );
      } catch (e2) {
        log('Firma 2 fallo: ' + e2.message + ' - Intentando firma 3...');
        // Intentar firma 3: solo opts
        instantiateResp = await projectTemplatesApiInstance.instantiateProject(
          RECALL_TEMPLATE_GID,
          { data: { name: projectName } }
        );
      }
    }

    // instantiateProject returns a Job, need to poll for completion
    var jobGid = instantiateResp.data.gid;
    log('Job creado: ' + jobGid + ' - Esperando finalizacion...');

    // 6. Poll job until complete (max 15 intentos x 1s = 15s)
    var newProjectGid = null;
    for (var attempt = 0; attempt < 15; attempt++) {
      var jobResp = await jobsApiInstance.getJob(jobGid, {});
      var status = jobResp.data.status;
      log('Job status: ' + status + ' (intento ' + (attempt + 1) + ')');

      if (status === 'succeeded') {
        newProjectGid = jobResp.data.new_project && jobResp.data.new_project.gid;
        break;
      }
      if (status === 'failed') {
        log('ERROR: Job fallo al crear proyecto');
        return;
      }
      // Busy wait 1 segundo
      var waitEnd = Date.now() + 1000;
      while (Date.now() < waitEnd) { /* busy wait */ }
    }

    if (!newProjectGid) {
      log('ERROR: Timeout esperando que el proyecto se cree');
      return;
    }

    log('Proyecto creado: ' + newProjectGid);

    // 7. Agregar al portafolio "Recalls Activos"
    await portfoliosApiInstance.addItemForPortfolio(
      { data: { item: newProjectGid } },
      PORTFOLIO_ACTIVOS_GID
    );
    log('Proyecto agregado al portafolio Recalls Activos');

    // 8. Agregar comentario en la tarea de triage + subtarea de tracking
    await Promise.all([
      storiesApiInstance.createStoryForTask(
        {
          data: {
            text: 'RECALL ACTIVADO - Proyecto creado automaticamente: ' + projectName + ' (GID: ' + newProjectGid + '). Agregado al portafolio Recalls Activos.'
          }
        },
        task_gid
      ),
      tasksApiInstance.createSubtaskForTask(
        {
          data: {
            name: 'Proyecto de recall creado: ' + projectName,
            notes: 'Proyecto GID: ' + newProjectGid + '\nCreado desde template: ' + RECALL_TEMPLATE_GID + '\nPortafolio: Recalls Activos\n\nCreado automaticamente via Script Action 4.',
            completed: true
          }
        },
        task_gid
      )
    ]);

    log('Comentario y subtarea de tracking creados');
    log('Script 4 completado exitosamente');

  } catch (e) {
    log('Error critico: ' + e.message);
    if (e.response && e.response.body) {
      log('API: ' + JSON.stringify(e.response.body));
    }
  }
}

run();
