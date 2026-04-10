# Investigacion — Jorge Romero

## Fecha de investigacion
2026-04-08

## Empresa
- **Que hace**: Empresa alimentaria (nombre no especificado en el brief)
- **Tamano**: No especificado — por la complejidad del proceso (9 departamentos, operacion multinacional en 6+ paises, multiples reguladores), se infiere empresa mediana-grande
- **Mercados**: Multinacional — opera en jurisdicciones de FDA (USA), RASFF (EU), FSA (UK), CFIA (Canada), MHLW (Japon), FSANZ (Australia/NZ)
- **Stack tecnologico**: No especificado

## Contexto Competitivo
- **Retos de industria**: Product recalls en alimentos son costosos y de alto riesgo reputacional. Class I (contaminante microbiologico) es el nivel mas critico — probabilidad razonable de dano grave o muerte
- **Regulaciones**: 
  - Ecuador: ARCSA (Agencia Nacional de Regulacion, Control y Vigilancia Sanitaria) bajo Ministerio de Salud Publica. Usa estandares Codex Alimentarius + INEN
  - Internacional: FDA (21 CFR 7.40-7.59), RASFF (EU Regulation 178/2002), FSA (UK Food Safety Act), CFIA (Canadian Food Inspection Agency), MHLW (Japan), FSANZ (Australia/NZ)
- **Precedente relevante**: Caso WanaBana/Austrofoods (2023-2024) — contaminacion intencional de plomo en applesauce fabricado en Ecuador, investigacion FDA + ARCSA

## Madurez Digital
- **PM tools actuales**: No especificado
- **Indicadores de madurez**: El cliente envio un BPMN 2.0 del proceso — sugiere familiaridad con modelamiento de procesos y madurez operativa alta
- **Expectativas**: Busca funcionalidad de BPM enterprise (subprocesos con ciclo de vida independiente, gateways paralelos, SLA timers) — expectativas que exceden las capacidades nativas de un PM tool

## Caso de Uso Especifico
- **Proceso**: Product Recall Clase I por contaminante microbiologico
- **Complejidad**: 9 departamentos, 6 fases, 40+ actividades, 7 subprocesos anidados, 8 decisiones
- **SLAs criticos**: Notificacion FDA <=24h (mandato legal)
- **Estandar de industria**: BPMN 2.0 con gateways exclusivos, inclusivos y paralelos
- **Benchmark de exito**: 95% de recuperacion de producto

## Fuentes
- https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-7/subpart-C (FDA recall regulations)
- https://assyro.com/blog/fda-recalls-guide (FDA Class I guide)
- https://www.digicomply.com/food-regulatory-bodies-standards-and-authorities/ecuador (ARCSA info)
- https://www.foodsafetynews.com/2023/12/officials-in-ecuador-continue-investigation-into-lead-tainted-applesauce-shipped-to-u-s/ (Precedente WanaBana)
