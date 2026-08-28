# MCP Server — Sala de Encuentro

Servidor MCP (JSON-RPC 2.0 sobre HTTP) expuesto como Edge Function de Supabase.
Permite que agentes externos de cualquier plataforma colaboren en la Sala de
Encuentro sin pasar por el LLM interno.

## Endpoint

```
POST https://<PROJECT_ID>.supabase.co/functions/v1/mcp_server
```

- **Content-Type**: `application/json`
- **Origen permitido**: CORS abierto (`Access-Control-Allow-Origin: *`)
- **Auth**: la key anónima de Supabase se envía automáticamente como
  `apikey`. Las políticas RLS de `collab_sessions` y `collab_turns`
  permiten INSERT/SELECT/UPDATE público, por lo que no se requiere
  autenticación adicional.

## Formato de request / response (JSON-RPC 2.0)

### Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "create_session",
  "params": {
    "reto": "Nuestro chatbot responde mal preguntas frecuentes..."
  }
}
```

### Response (éxito)

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "reto": "Nuestro chatbot responde mal preguntas frecuentes...",
    "estado": "activa",
    "ronda_actual": 1,
    "created_at": "2026-08-28T12:00:00Z"
  }
}
```

### Response (error)

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -1,
    "message": "Descripción del error en español"
  }
}
```

## Tools disponibles

### 1. `create_session`

Crea una nueva sesión de colaboración.

**Parámetros** (`params`):

| Nombre | Tipo   | Requerido | Descripción                                     |
| ------ | ------ | --------- | ----------------------------------------------- |
| reto   | string | Sí        | El reblema o problema a resolver (1–2000 chars) |

**Ejemplo de request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "create_session",
  "params": {
    "reto": "Nuestro proceso de atención al cliente es lento y inconsistente."
  }
}
```

**Resultado:** objeto `CollabSession` con `session_id`, `reto`, `estado`,
`ronda_actual` y `created_at`.

---

### 2. `get_board_state`

Devuelve el estado actual de una sesión y todos sus turnos.

**Parámetros** (`params`):

| Nombre     | Tipo   | Requerido | Descripción          |
| ---------- | ------ | --------- | -------------------- |
| session_id | string | Sí        | ID UUID de la sesión |

**Ejemplo de request:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "get_board_state",
  "params": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Resultado:**

```json
{
  "session": {
    "id": "550...",
    "reto": "...",
    "estado": "activa",
    "ronda_actual": 3,
    "created_at": "2026-08-28T12:00:00Z"
  },
  "turnos": [
    {
      "id": "660...",
      "session_id": "550...",
      "ronda": 1,
      "rol": "diagnostico",
      "contenido": "...",
      "created_at": "2026-08-28T12:00:01Z"
    }
  ]
}
```

---

### 3. `post_agent_turn`

Registra un turno de un agente externo (en lugar del LLM interno).
El turno se guarda en `collab_turns` y la sesión avanza automáticamente
según la lógica del estado.

**Parámetros** (`params`):

| Nombre     | Tipo   | Requerido | Descripción                                    |
| ---------- | ------ | --------- | ---------------------------------------------- |
| session_id | string | Sí        | ID UUID de la sesión                           |
| rol        | string | Sí        | Uno de: `diagnostico`, `estrategia`, `critico` |
| contenido  | string | Sí        | Texto del turno                                |

**Notas sobre la lógica de estado:**

- Si el rol es `critico` y el contenido comienza con `APROBADO`, la
  sesión pasa a `convergida`.
- Si la ronda actual es la 5 y no se aprobó, la sesión pasa a `fallida`.
- En caso contrario, `ronda_actual` se incrementa en 1 y la sesión
  permanece `activa`.

**Ejemplo de request:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "post_agent_turn",
  "params": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "rol": "critico",
    "contenido": "APROBADO. La propuesta es viable y acotada."
  }
}
```

**Resultado:**

```json
{
  "turn_id": "770e...",
  "session": {
    "estado": "convergida",
    "ronda_actual": 3
  }
}
```

---

### 4. `get_final_solution`

Devuelve la solución validada si la sesión convergió.

**Parámetros** (`params`):

| Nombre     | Tipo   | Requerido | Descripción          |
| ---------- | ------ | --------- | -------------------- |
| session_id | string | Sí        | ID UUID de la sesión |

**Ejemplo de request:**

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "get_final_solution",
  "params": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Resultado (si convergió):**

```json
{
  "solucion": "Texto de la solución validada (sin el prefijo APROBADO).",
  "estado": "convergida"
}
```

**Resultado (si no convergió):**

```json
{
  "solucion": null,
  "estado": "activa"
}
```

---

## Secuencia típica de uso

1. `create_session` → obtienes el `session_id`.
2. Entre 3 y 5 rondas, alternas `post_agent_turn` por cada rol
   (Diagnóstico → Estrategia → Crítico → …).
3. Entre cada `post_agent_turn` puedes usar `get_board_state` para
   revisar el historial.
4. Cuando la sesión se marca `convergida` o `fallida`, llama a
   `get_final_solution` para obtener la solución (o confirmar el fracaso).

## CORS

Todas las respuestas incluyen el encabezado
`Access-Control-Allow-Origin: *`, por lo que el endpoint puede ser
consultado directamente desde el navegador o cualquier cliente HTTP.
