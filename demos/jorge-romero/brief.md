# Brief — Jorge Romero

## Fuente
Email

## Fecha de recepcion
2026-04-08

## Contenido Original

Estimado Jose,

Te adjunto el diagrama BPMN 2.0 de un proceso corporativo critico: el Retiro de Producto Alimentario (Product Recall Clase I) por contaminante microbiologico. Este proceso involucra 9 departamentos trabajando en paralelo, 6 fases, mas de 40 actividades, 7 subprocesos anidados y 8 decisiones, con SLAs regulatorios de cumplimiento obligatorio impuestos por autoridades como FDA, RASFF, FSA, CFIA, MHLW y FSANZ.

Lo que esperaria ver en la demo:

1. Modelamiento del proceso completo: Como Asana representaria este flujo de trabajo con sus 9 carriles departamentales, incluyendo la logica de bifurcacion paralela donde 7 departamentos trabajan simultaneamente tras la activacion del Comite de Crisis, y la sincronizacion final donde TODOS los hilos deben completarse antes del cierre formal.

2. Logica condicional: Como se implementa nativamente un esquema de decision exclusivo que determina si el recall es Clase I o no, una decision inclusiva que dispara notificaciones a N jurisdicciones segun los mercados afectados, y una decision paralela que sincroniza la finalizacion de multiples departamentos.

3. Subprocesos con ciclo de vida independiente: Como Asana gestiona un subproceso como "Logistica inversa multinacional" que tiene su propio flujo interno (aduanas, transportistas, certificadores de destruccion en 6 paises), con estado independiente, aprobaciones internas y reporte de completitud al proceso padre.

4. SLAs regulatorios con escalamiento automatico: Como la plataforma garantiza que una tarea como "Notificar FDA <=24h" dispare alertas de escalamiento progresivo cuando el plazo se acerca, y como se diferencia un SLA interno de un mandato regulatorio con consecuencias legales.

5. Escalamiento condicional multi-nivel: Si el porcentaje de recuperacion de producto no alcanza el 95%, el proceso debe escalar simultaneamente a Comunicaciones (aviso publico adicional), Supply Chain (extension de logistica inversa) y Asuntos Regulatorios (notificacion al regulador). Necesito ver como Asana maneja este tipo de escalamiento condicional con ramificacion a multiples departamentos.

6. Trazabilidad y auditoria: Como Asana preserva la integridad del registro de decisiones (quien aprobo que, cuando y con que evidencia), considerando que este tipo de proceso esta sujeto a auditoria regulatoria y potencial litigio legal.

7. Reporteria ejecutiva consolidada: Como el Comite de Crisis visualiza en un solo dashboard: porcentaje de producto recuperado por mercado, costos acumulados vs. provision, estatus de SLAs regulatorios por jurisdiccion, y metricas de atencion al consumidor, todo en tiempo real y sin depender de herramientas externas.

Saludos,
Jorge Romero
