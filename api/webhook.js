import { createClient } from "@supabase/supabase-js";

// ── SUPABASE ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── SYSTEM PROMPT ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres Roberto, setter de ventas de Asesoría Makeover — consultoría de estilo y armario para hombres.

Estás respondiendo por Instagram DM. Tu misión es cualificar leads y agendar llamadas de ventas siguiendo el Sistema de Prospección Inbound Norma.

PRODUCTO: programa personalizado de estilo y armario para hombres
ENLACE DE AGENDADO: https://api.leadconnectorhq.com/widget/bookings/modamasculinatips

## LAS 8 FASES DEL SISTEMA:

FASE 1 — APERTURA: Primer contacto. No parecer venta. Prometer valor. Una pregunta abierta.
FASE 2 — CONTEXTO PRESENTE: Entender su situación actual. Solo preguntas abiertas (qué, cómo, cuánto). Nunca sí/no.
FASE 3 — DIAGNÓSTICO DEL DOLOR: Articular obstáculo principal, cuánto lleva con él, qué ha intentado.
FASE 4 — ESTADO DESEADO: Conectar dolor con lo que quiere lograr. Plano emocional, no racional.
FASE 5 — CUALIFICACIÓN ECONÓMICA: Solo si hay señales claras de que no puede permitírselo.
FASE 6 — PITCH DE LLAMADA: Proponer sesión de 40 minutos con valor propio. Terminar SIEMPRE con "¿Te parece bien?" — NUNCA preguntar disponibilidad.
FASE 7 — ENLACE DE AGENDADO: En cuanto confirme → mandar enlace inmediatamente + pedir confirmación + escasez suave.
FASE 8 — TRIAGE POST-AGENDADO: Confirmar, detectar red flags, recordatorio el día de la llamada.

## FOLLOW-UPS — adapta el mensaje según tiempo sin respuesta:
- "1h sin responder" → muy breve, informal, como si lo acabaras de ver
- "8h sin responder" → check-in natural, sin presión
- "24h sin responder" → nuevo ángulo del dolor, más directo
- "último intento" → cierre con puerta abierta, sin presión

## REGLAS DE ORO:
- UNA sola pregunta por mensaje. Nunca dos.
- No ofrecer soluciones antes de tiempo.
- No proponer llamada sin dolor + estado deseado claros.
- Si pregunta precio → redirigir a la llamada.
- Si dice "solo curiosidad" o "por ahora ideas" → profundizar dolor.
- Usar su propio vocabulario.
- Tono: cercano, directo, masculino. Como un amigo que de verdad le importa ayudar.
- Empatía real pero sin exagerar. Si el lead dice algo con peso → acusa recibo en una frase antes de la pregunta.
- Mensajes cortos. Máximo 2-3 líneas. Esto es Instagram DM, no email.
- Nunca empieces con "¡Hola!" si ya estáis en conversación.
- Cero exclamaciones vacías: nada de "¡Genial!", "¡Perfecto!", "¡Claro que sí!".
- Si el lead está frustrado o desmotivado → valida primero, pregunta después.
- Si responde con poco → sigue tirando del hilo con naturalidad.
- NUNCA menciones que eres una IA. Eres Roberto.

## SONAR HUMANO:
- Varía la longitud de los mensajes.
- Usa expresiones coloquiales: "mira", "oye", "la verdad es que", "entiendo".
- No uses listas con guiones o números. Todo en texto corrido.
- Si el lead escribe informal → tú también. Si escribe más formal → adapta.

## SEÑALES DE PAUSA:
- El lead está listo para el pitch (dolor claro + estado deseado claro)
- El lead hace una objeción seria (precio, tiempo, dudas)
- El lead pide hablar con una persona real
- El lead parece molesto o a punto de irse
- Llevas más de 10 mensajes sin avanzar de fase

## FORMATO DE RESPUESTA:

Conversación normal → SOLO el mensaje de texto listo para enviar, sin comillas ni explicaciones.

Señal de pausa → JSON exacto:
{"pausa":true,"motivo":"descripción breve","mensaje_sugerido":"mensaje para que Roberto revise","fase":"FASE X"}

Lead confirmó que quiere agendar → JSON exacto:
{"agendar":true,"mensaje":"mensaje con el enlace de agendado"}`;

// ── HUMANIZACIÓN ──────────────────────────────────────────────────────────────
function humanize(text) {
  if (text.trim().startsWith("{")) return text;
  let result = text;
  if (Math.random() < 0.2) result = result.replace(/¿/g, "").replace(/¡/g, "");
  if (Math.random() < 0.15) result = result.replace(/\.$/, "");
  if (Math.random() < 0.1 && !result.endsWith("?")) result = result + "...";
  return result;
}

// ── DELAY HUMANO ──────────────────────────────────────────────────────────────
function calcDelay(text) {
  const words = text.split(" ").length;
  const base = 15000 + Math.random() * 10000;
  const typing = words * 1000 * (0.8 + Math.random() * 0.4);
  return Math.min(Math.round(base + typing), 55000);
}

// ── PARSEAR JSON DE CLAUDE ────────────────────────────────────────────────────
function parseClaude(text) {
  try { const m = text.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch {}
  return null;
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { mensaje, fuente, nombre, instagram_id } = req.body;
    if (!mensaje) return res.status(400).json({ error: "Falta el campo 'mensaje'" });

    const lead_id = instagram_id || nombre || "desconocido";

    // ── 1. OBTENER O CREAR LEAD EN SUPABASE ───────────────────────────────────
    let { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("instagram_id", lead_id)
      .single();

    if (!lead) {
      const { data: newLead } = await supabase
        .from("leads")
        .insert({
          instagram_id: lead_id,
          nombre: nombre || "Desconocido",
          fuente: fuente || "directo",
          estado: "nuevo",
          fase_actual: 1,
        })
        .select()
        .single();
      lead = newLead;
    }

    // ── 2. OBTENER HISTORIAL DE MENSAJES ──────────────────────────────────────
    const { data: mensajes } = await supabase
      .from("mensajes")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: true })
      .limit(30);

    // ── 3. GUARDAR MENSAJE DEL LEAD ───────────────────────────────────────────
    await supabase.from("mensajes").insert({
      lead_id: lead.id,
      rol: "lead",
      texto: mensaje,
    });

    // ── 4. CONSTRUIR HISTORIAL PARA CLAUDE ────────────────────────────────────
    const messages = (mensajes || []).map((m) => ({
      role: m.rol === "roberto" ? "assistant" : "user",
      content: m.texto,
    }));

    // Añadir contexto de fuente solo en el primer mensaje
    let textoUsuario = mensaje;
    if (!mensajes || mensajes.length === 0) {
      if (fuente) textoUsuario = `[Lead llegó desde: ${fuente}]\n\nMensaje: ${mensaje}`;
    }
    messages.push({ role: "user", content: textoUsuario });

    // ── 5. LLAMAR A CLAUDE ────────────────────────────────────────────────────
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const texto = data.content?.find((b) => b.type === "text")?.text || "";

    // ── 6. PROCESAR RESPUESTA ─────────────────────────────────────────────────
    const parsed = parseClaude(texto);

    // PAUSA — necesita humano
    if (parsed?.pausa) {
      // Guardar mensaje sugerido
      await supabase.from("mensajes").insert({
        lead_id: lead.id,
        rol: "roberto",
        texto: parsed.mensaje_sugerido,
        es_sugerido: true,
      });
      // Actualizar estado del lead
      await supabase.from("leads").update({
        estado: "revision_humana",
        fase_actual: parseInt(parsed.fase?.replace(/\D/g, "") || lead.fase_actual),
        ultimo_mensaje: new Date().toISOString(),
      }).eq("id", lead.id);

      return res.status(200).json({
        tipo: "pausa",
        motivo: parsed.motivo,
        mensaje_sugerido: humanize(parsed.mensaje_sugerido),
        fase: parsed.fase,
        accion: "notificar_setter",
        delay_ms: 0,
      });
    }

    // AGENDAR
    if (parsed?.agendar) {
      const mensajeHuman = humanize(parsed.mensaje);
      await supabase.from("mensajes").insert({
        lead_id: lead.id,
        rol: "roberto",
        texto: mensajeHuman,
      });
      await supabase.from("leads").update({
        estado: "calendario_enviado",
        fase_actual: 7,
        ultimo_mensaje: new Date().toISOString(),
      }).eq("id", lead.id);

      return res.status(200).json({
        tipo: "agendar",
        mensaje: mensajeHuman,
        accion: "enviar_y_notificar",
        delay_ms: calcDelay(mensajeHuman),
      });
    }

    // RESPUESTA NORMAL
    const mensajeHuman = humanize(texto.trim());
    await supabase.from("mensajes").insert({
      lead_id: lead.id,
      rol: "roberto",
      texto: mensajeHuman,
    });
    await supabase.from("leads").update({
      estado: "en_conversacion",
      ultimo_mensaje: new Date().toISOString(),
    }).eq("id", lead.id);

    return res.status(200).json({
      tipo: "respuesta",
      mensaje: mensajeHuman,
      accion: "enviar",
      delay_ms: calcDelay(mensajeHuman),
    });

  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: err.message });
  }
}
