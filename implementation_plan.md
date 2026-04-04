# Plan de Arquitectura: "Living Personality" en SQLite

¡Tenés toda la razón! Guardarlo en SQLite es infinitamente superior: centraliza los datos, evita problemas de lecturas simultáneas con JSON y te deja cruzar datos con SQL si algún día querés hacer analítica avanzada. 

Vamos a usar la base de datos `vortice_cognitivo.db` como el **Cerebro Único**.

## Evolución de la Base de Datos

Vamos a crear una **nueva tabla** en tu archivo SQLite existente llamada `memoria_perfiles`. Esta tabla actuará como el "expediente vivo" de cada perfil.

#### Estructura de la Tabla `memoria_perfiles`:
- `perfil` (TEXT, Primary Key): "Gonzalo", "Pareja", etc.
- `contexto_narrativo` (TEXT): El párrafo vivo escrito por la IA (ej: *"Gonzalo está bajando 10kg, ayer nadó 1hr y comió 1800 cal. Viene motivado."*)
- `historial_chat_resumido` (TEXT): Los puntos clave de las últimas 5 charlas.
- `fecha_actualizacion` (DATETIME): Cuándo la IA generó este resumen por última vez.

## Arquitectura de Código (Módulos Separados)

Al separar los archivos de Python, el código te va a quedar profesional e inquebrantable. Moveremos el código, *no* los datos, a carpetas:

```text
entrenador-ia/
├── app.py                     (Archivo principal ultraliviano, solo carga la UI base)
├── core/
│   ├── database.py            (Conexión a SQLite y queries limpias)
│   └── ai.py                  (Comunicaciones puras con Ollama/Llava)
├── personality/               (Lógica del Cerebro)
│   ├── motor_memoria.py       (Consulta la BD y actualiza `memoria_perfiles` usando Llama3)
│   └── prompt_builder.py      (Inyecta tu perfil, tu meta y tu SQLite en el input del Coach antes de chatear)
└── tabs/                      (Interfaces de Usuario limpias)
    ├── tab_chat.py
    ├── tab_nutricion.py
    └── tab_actividad.py       (Con el nuevo input libre para Apple Watch / Salud iOS)
```

## Flujo del Nuevo "Coach Automático"

1. **Carga Libre de Actividad (Apple Watch):** En *Actividad*, pegás los datos crudos *"Natación, 60min, 400kcal"*. El motor de IA extrae esos valores y los inyecta transparentemente en tu SQLite (`eventos`).
2. **Síntesis Nocturna/Autosave:** Cada vez que abrís el chat, el `motor_memoria.py` mira tu tabla de eventos y, si cambió, le pide a la IA: *"Actualizá en un párrafo el contexto de Gonzalo"*. Ese texto se pisa y se guarda en tu SQLite (`memoria_perfiles`). 
3. **El Chat Perfecto:** Cuando le escribís *"Hola, ¿me das un consejo?"*, la app extrae el `contexto_narrativo` almacenado en SQLite y se lo mete invisible al Coach. El bot te responderá: *"¡Manso, Gonza! Vi que ayer nadaste 60 minutos, hoy te convendría..."*.

## Aprobación Final

> [!IMPORTANT]
> Esta arquitectura garantiza centralización total de datos en tu SQLite e independiza visualmente y funcionalmente tu código Python. ¿Te damos inicio formal a la **Ejecución (Fase de Refactor)** con esta estrategia basada en Base de Datos?
