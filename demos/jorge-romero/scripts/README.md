# Script Actions — Product Recall Clase I

## Que son

3 scripts de Asana Script Actions (Node.js serverless) que automatizan los gaps
del proceso de Product Recall que no se pueden resolver con reglas nativas.

## Requisitos

- Asana Enterprise o Enterprise+
- App "Scripts by Asana" instalada en el workspace
- El usuario que configura las reglas debe tener acceso a todos los proyectos involucrados

## Como instalar un script

1. Abrir el proyecto en Asana
2. Ir a Customize > Rules > Create custom rule
3. Configurar el trigger (ver tabla abajo)
4. En "Do this...", seleccionar External actions > Run script
5. Si es la primera vez, conectar con "Scripts by Asana"
6. Pegar el script completo en el editor
7. Reemplazar los GIDs de la seccion CONFIGURATION con los valores reales
8. Click "Publish rule"

## Los 3 scripts

| # | Script | Trigger | Proyecto donde se instala |
|---|--------|---------|--------------------------|
| 1 | script-1-sync-subprocess.js | Tarea marcada como completada | Proyecto subproceso (Logistica Inversa) |
| 2 | script-2-triple-escalation.js | Custom field "% Recuperacion" cambia | Proyecto principal de recall |
| 3 | script-3-multi-jurisdiction.js | Tarea anadida a seccion "Notificaciones Regulatorias" | Proyecto principal de recall |

## Como encontrar GIDs

- **Workspace GID**: Abrir Asana, ver URL: `https://app.asana.com/0/{workspace_gid}/...`
- **Project GID**: Abrir proyecto, ver URL: `https://app.asana.com/0/{project_gid}/...`
- **Custom Field GID**: Customize > Custom Fields > click en el campo > ver URL
- **Enum Option GID**: Requiere API call o Script Action de consulta

## Como probar

1. Crear una tarea de prueba en el proyecto correspondiente
2. Disparar el trigger (completar tarea, cambiar campo, mover a seccion)
3. Verificar logs: Customize > Rules > seleccionar la regla > Run script > Run history
4. Verificar que se crearon las subtareas/comentarios esperados

## Constraints del runtime

- Timeout: ~20 segundos
- Solo puede llamar la API de Asana (no APIs externas)
- Limite de script: 100,000 caracteres
- Limite de logs: 5,000 caracteres
- No setTimeout/clearTimeout disponible
- Usar Promise.all() para llamadas paralelas
- Para UPDATE/CREATE: body PRIMERO, luego GID
- Para GET/READ: GID primero, luego options

## Troubleshooting

| Error | Causa probable | Solucion |
|-------|---------------|----------|
| "Cannot read properties of undefined (reading 'hasOwnProperty')" | Orden de argumentos incorrecto en update/create | Poner body {data: {...}} PRIMERO, luego el GID |
| "Not Found" / 404 | GID incorrecto o sin acceso | Verificar GIDs y permisos del usuario |
| Script timeout | Demasiadas API calls secuenciales | Usar Promise.all() para paralelizar |
| Custom field no se actualiza | Usando nombre del campo en vez de GID | Usar GID del campo como key en custom_fields |
| Enum no se setea | Usando nombre de opcion en vez de GID | Usar GID del enum_option como value |
