# Makeover Webhook — Agente IA para Instagram DMs

## Protecciones anti-ban incluidas
- Delay humano automático — el webhook devuelve delay_ms, ManyChat espera ese tiempo antes de enviar
- Humanización del texto — variaciones naturales aleatorias, nunca dos mensajes iguales
- Longitud variable — Claude varía la longitud por instrucción
- Tono adaptativo — si el lead escribe informal, el agente también

## Despliegue en Vercel

1. Crea repo GitHub: makeover-webhook
2. Sube los archivos: api/webhook.js, vercel.json, package.json
3. Importa en vercel.com → Environment Variables: ANTHROPIC_API_KEY
4. URL resultante: https://makeover-webhook.vercel.app/api/webhook

## Flujo en ManyChat (en orden)

1. Trigger (keyword / reel / historia)
2. Añadir etiqueta: "IA activa"
3. Realizar solicitud externa → webhook
4. Smart Delay → {{webhook_response.delay_ms}} ms  ← CRITICO ANTI-BAN
5. Condición según {{webhook_response.tipo}}:
   - "respuesta"  → Enviar {{webhook_response.mensaje}}
   - "pausa"      → Etiqueta "Revisión humana" + quitar "IA activa" + notificar Roberto
   - "agendar"    → Enviar {{webhook_response.mensaje}} + etiqueta "Calendario enviado"

## Body del HTTP Request

{
  "mensaje": "{{last_input_text}}",
  "nombre": "{{first_name}}",
  "fuente": "NOMBRE_DEL_REEL_O_HISTORIA",
  "historial": []
}

## Etiquetas a crear en ManyChat
- IA activa
- Revisión humana
- Calendario enviado
- Agendó
- Cerrado

## Follow-ups en ManyChat (4 toques)

TOQUE 1 — 1h sin respuesta:
- Smart Delay: 1 hora
- HTTP Request al webhook con: "mensaje": "el lead lleva 1h sin responder"

TOQUE 2 — 8h sin respuesta:
- Smart Delay: 8 horas desde el toque 1
- HTTP Request al webhook con: "mensaje": "el lead lleva 8h sin responder"

TOQUE 3 — 24h sin respuesta:
- Smart Delay: 24 horas desde el toque 2
- HTTP Request al webhook con: "mensaje": "el lead lleva 24h sin responder"

TOQUE 4 — 12h sin respuesta (último intento):
- Smart Delay: 12 horas desde el toque 3
- HTTP Request al webhook con: "mensaje": "el lead lleva 3 días sin responder, último intento"
- Después de enviar → añadir etiqueta "Cerrado" → parar secuencia

IMPORTANTE: En cada toque, si el lead responde en cualquier momento → cancelar la secuencia de follow-ups y volver al flujo normal del agente.

## Costes
- Cada mensaje: ~$0.002-0.005
- 100 conversaciones completas al mes: ~$2-5
