# Prompts para AI Teammate "Script Actions Writer"

## Como funciona

El AI Teammate "Script Actions Writer" genera codigo de Script Actions bajo demanda.
Le asignas una tarea con la descripcion de lo que necesitas y genera el script
listo para copy-paste en el editor de Asana.

## Patron de tarea

**Titulo**: "Genera script action: [descripcion corta del comportamiento]"

**Descripcion**: Incluir siempre:
1. Que trigger dispara el script
2. Que debe leer (campos, tareas, proyectos) con GIDs
3. Que debe hacer (crear, actualizar, comentar) con GIDs de destino
4. Constraints especificos (timeout, no duplicar, etc.)
5. Formato de log messages esperado

## Prompts listos para el caso de Product Recall

### Prompt 1: Sincronizacion de subproceso

```
Genera script action: Cuando se complete la ultima tarea del subproceso de
Logistica Inversa, actualiza la tarea ancla en el proyecto padre.

Trigger: "Tarea marcada como completada" en el proyecto subproceso.

Comportamiento:
1. Lee todas las tareas del proyecto actual (project_gid)
2. Verifica si TODAS estan completadas
3. Si si, busca en el proyecto padre (GID: 1213987895366096) la tarea
   cuyo nombre contiene "[Logistica]"
4. Actualiza el custom field "Fase del Proceso" (GID: 1213987856127368)
   al valor "Cierre" (enum GID: 1213987856127374)
5. Agrega un comentario confirmando que el subproceso esta completado

Constraints:
- Usa opt_fields en todos los queries para minimizar payload
- Usa Promise.all() donde sea posible
- No debe fallar si la tarea ancla no se encuentra (log error y salir)
- Debe quedarse dentro de 20 segundos de ejecucion
```

### Prompt 2: Escalamiento triple

```
Genera script action: Cuando el campo "% Recuperacion de Producto" cambie
y el valor sea menor a 95%, crea 3 subtareas de escalamiento.

Trigger: "Custom field cambia" en campo "% Recuperacion" (GID: 1213987896496580)

Comportamiento:
1. Lee la tarea actual y obtiene el valor de % Recuperacion
2. Si el valor es >= 95 o null, no hacer nada
3. Si < 95, verificar que no existan subtareas previas que empiecen con
   "ESCALAMIENTO:" (evitar duplicados)
4. Crear 3 subtareas en paralelo con Promise.all():
   a) "ESCALAMIENTO: Aviso publico adicional — recuperacion al X%"
      - Departamento: Comunicaciones (GID: 1213987829142573)
      - Due: +24h
   b) "ESCALAMIENTO: Extension logistica inversa — recuperacion al X%"
      - Departamento: Logistica (GID: 1213987829142572)
      - Due: +48h
   c) "ESCALAMIENTO: Notificacion adicional a reguladores — recuperacion al X%"
      - Departamento: Regulatorio (GID: 1213987829142570)
      - Due: +24h
5. Todas las subtareas con Prioridad = Critica (GID: 1213987888360503)
6. Agregar comentario de alerta listando las 3 acciones

Custom fields GIDs:
- Departamento: 1213987829142568
- Prioridad: 1213987888360502
```

### Prompt 3: Notificaciones multi-jurisdiccion

```
Genera script action: Cuando una tarea se mueva a la seccion
"Notificaciones Regulatorias", lee el campo multi-enum "Jurisdiccion"
y crea una subtarea de notificacion por cada jurisdiccion seleccionada.

Trigger: "Tarea anadida a seccion" (GID seccion: 1213987855207281)

Comportamiento:
1. Lee la tarea y obtiene los valores del campo multi-enum
   "Jurisdiccion" (GID: 1213987896451603)
2. Para cada jurisdiccion seleccionada, crea una subtarea con:
   - Nombre: "Notificar [nombre jurisdiccion] — SLA <=Xh (REGULATORIO)"
   - Due date: calculado segun SLA del regulador
   - Custom fields: Tipo SLA = Regulatorio, Estado SLA = En tiempo,
     Departamento = Regulatorio, Prioridad = Critica
3. Verificar que no existan subtareas "Notificar ..." previas
4. Agregar comentario resumen listando todas las jurisdicciones

SLAs por jurisdiccion:
- FDA (USA) GID 1213987896451604: 24h
- RASFF (EU) GID 1213987896451605: 48h
- FSA (UK) GID 1213987896451606: 48h
- CFIA (Canada) GID 1213987896451607: 48h
- MHLW (Japon) GID 1213987896451608: 72h
- FSANZ (Aus/NZ) GID 1213987896451609: 72h
- ARCSA (Ecuador) GID 1213987896451610: 24h

Custom fields GIDs:
- Tipo SLA: 1213987969580888 (Regulatorio: 1213987969580889)
- Estado SLA: 1213987856217001 (En tiempo: 1213987856217002)
- Departamento: 1213987829142568 (Regulatorio: 1213987829142570)
- Prioridad: 1213987888360502 (Critica: 1213987888360503)
```

## Prompts adicionales que podrias necesitar

### Verificador de evidencia para auditoria
```
Genera script action: Cuando una tarea se mueva a la seccion "Cierre",
verifica si tiene archivos adjuntos. Si no tiene ninguno, agrega un
comentario de alerta diciendo que la tarea necesita evidencia documental
para cumplir con requisitos de auditoria regulatoria.
```

### Calculador de costos acumulados
```
Genera script action: Cuando se actualice el custom field "Costo" en
cualquier tarea del proyecto, suma todos los valores del campo "Costo"
de todas las tareas y actualiza el campo "Costo Acumulado" en la tarea
"Reporte diario" del proyecto.
```

### Detector de SLAs proximos a vencer
```
Genera script action: Ejecutar via scheduled trigger cada 4 horas.
Lee todas las tareas del proyecto que tengan "Tipo de SLA = Regulatorio"
y "Estado de SLA = En tiempo". Para cada una, calcula si faltan menos de
6 horas para el due date. Si si, cambia "Estado de SLA" a "Proximo a vencer"
y agrega comentario de alerta.
```
