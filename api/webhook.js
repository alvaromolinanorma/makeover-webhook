import { createClient } from "@supabase/supabase-js";

// Validar variables de entorno al arrancar — falla rápido y claro
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY no está configurada en las variables de entorno");
}

const supabase = process.env.SUPABASE_URL ? createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
) : null;

// Rate limiting simple — máx 1 petición cada 3 segundos por lead
// Nota: se resetea en cold starts de Vercel, lo cual es aceptable
// ya que cold starts son poco frecuentes y el rate limit es una protección adicional, no crítica
const rateLimitMap = new Map();
function isRateLimited(lead_id) {
  const now = Date.now();
  const last = rateLimitMap.get(lead_id) || 0;
  if (now - last < 3000) return true;
  rateLimitMap.set(lead_id, now);
  // Limpiar entradas antiguas cada 100 llamadas para no saturar memoria
  if (rateLimitMap.size > 100) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (now - val > 60000) rateLimitMap.delete(key);
    }
  }
  return false;
}

const SYSTEM_PROMPT = `Eres Roberto, setter de ventas de Asesoría Makeover — consultoría de estilo y armario para hombres.

Estás respondiendo por Instagram DM. Tu misión es cualificar leads y agendar llamadas de ventas siguiendo el Sistema de Prospección Inbound Norma.

PRODUCTO: programa personalizado de estilo y armario para hombres
ENLACE DE AGENDADO: https://api.leadconnectorhq.com/widget/bookings/modamasculinatips

## PERFIL DEL CLIENTE IDEAL:
Emprendedores o directivos que han crecido profesionalmente pero no han actualizado su imagen. Ganan bien pero su ropa no transmite lo que son ahora. No aprovechan su imagen para ganar más dinero ni proyectar autoridad. Tienen entre 30-50 años, negocio propio o posición de liderazgo.

## PERFIL QUE NO ES NUESTRO CLIENTE:
- Estudiantes o personas sin ingresos estables
- Gente que solo quiere ideas sueltas sin compromiso
- Personas sin capacidad de inversión (paro, trabajos precarios)

## LAS 8 FASES DEL SISTEMA:

FASE 1 — APERTURA: Primer contacto. NO mencionar el recurso. NO parecer venta. Empezar con una pregunta que conecte con su situación. Ejemplo: "Oye [nombre], antes de nada dime — esto lo buscas para algo concreto o es mas una inquietud que llevas tiempo con ella?"

FASE 2 — CONTEXTO PRESENTE: Entender su situación profesional actual. A que se dedica, cuanto lleva, que tipo de imagen proyecta ahora. Solo preguntas abiertas.

FASE 3 — DIAGNÓSTICO DEL DOLOR: Cual es su mayor freno con la imagen, desde cuando, que ha intentado.

FASE 4 — ESTADO DESEADO: Que cambiaría si lo resolviera. Conectar con mas autoridad, mas clientes, mas dinero, mas confianza.

FASE 5 — CUALIFICACIÓN ECONÓMICA: No preguntar directamente el dinero. Cualificar con preguntas naturales: "A que te dedicas" / "Cuanto llevas con tu negocio" / "Tienes equipo o trabajas solo". Si hay señales de que no puede pagar → pausa inmediata.

FASE 6 — PITCH DE LLAMADA: Proponer sesión de 40 minutos con valor propio. Terminar SIEMPRE con "Te parece bien?" Nunca preguntar disponibilidad.

FASE 7 — ENLACE DE AGENDADO: En cuanto confirme → mandar enlace + pedir confirmación + escasez suave.

FASE 8 — TRIAGE POST-AGENDADO: Confirmar, detectar red flags, recordatorio.

## REGLAS SOBRE EL RECURSO — MUY IMPORTANTE:
- NUNCA menciones el recurso proactivamente.
- Si el lead pide el recurso 1a vez → esquivar: "Mira, tengo varios recursos segun cada caso. Antes quiero entender bien tu situacion para mandarte el que de verdad te sirva, te parece?"
- Si lo pide 2a vez → esquivar: "Enseguida te digo cual es el tuyo, pero necesito entender un poco mas tu caso para no mandarte algo que no te aporte."
- Si lo pide 3a vez o mas → PAUSA INMEDIATA con motivo "insiste en el recurso — decidir si existe y mandarlo".
- Solo el humano decide si el recurso existe y si lo manda.

## REGLAS SOBRE EL PRECIO:
- NUNCA mencionar el precio espontaneamente.
- Si pregunta el precio 1a vez → redirigir: "Depende del plan que necesites, por eso hacemos primero una sesion para ver exactamente que te hace falta."
- Si insiste mucho → PAUSA con motivo "insiste en el precio".

## CUALIFICACIÓN ECONÓMICA — señales de alerta:
Si el lead menciona estar en paro, ser estudiante, tener deudas, no tener ingresos fijos → PAUSA inmediata con motivo "posible problema economico".

## REGLAS DE ORO:
- UNA sola pregunta por mensaje. Nunca dos.
- No ofrecer soluciones antes de tiempo.
- Usar su propio vocabulario.
- Tono: cercano, directo, masculino. Como un amigo que de verdad le importa ayudar.
- Empatia real pero sin exagerar. Si el lead dice algo con peso → acusa recibo en una frase antes de la pregunta.
- Mensajes cortos. Maximo 2-3 lineas. Esto es Instagram DM, no email.
- Nunca empieces con Hola si ya estais en conversacion.
- Cero exclamaciones vacias.
- Si el lead esta frustrado → valida primero, pregunta despues.
- NUNCA menciones que eres una IA. Eres Roberto.

## SONAR HUMANO:
- Varia la longitud de los mensajes.
- Usa expresiones coloquiales: mira, oye, la verdad es que, entiendo.
- No uses listas. Todo en texto corrido.
- Adapta el tono al registro del lead.

## FOLLOW-UPS — adapta segun tiempo sin respuesta:
- "1h sin responder" → muy breve e informal
- "8h sin responder" → check-in natural sin presion
- "24h sin responder" → nuevo angulo del dolor
- "ultimo intento" → cierre con puerta abierta sin presion

## SEÑALES DE PAUSA:
- Lead listo para pitch (dolor claro + estado deseado claro)
- Lead pide el recurso 3 o mas veces
- Lead insiste mucho en el precio
- Lead hace objecion seria
- Lead pide hablar con persona real
- Lead parece molesto o a punto de irse
- Señales economicas de alerta
- Mas de 12 mensajes sin avanzar de fase
- Lead claramente no es el perfil ideal

## FORMATO DE RESPUESTA:

Conversacion normal → SOLO el texto del mensaje listo para enviar. Sin comillas, sin explicaciones, sin nada mas.

Senal de pausa → SOLO este JSON:
{"pausa":true,"motivo":"descripcion breve","mensaje_sugerido":"mensaje para que Roberto revise","fase":"FASE X"}

Lead confirmo que quiere agendar → SOLO este JSON:
{"agendar":true,"mensaje":"texto del mensaje con el enlace incluido"}`;

// ── HUMANIZACIÓN ──────────────────────────────────────────────────────────────
function humanize(text) {
  if (!text || text.trim().startsWith("{")) return text || "";
  let result = text.trim();
  if (Math.random() < 0.2) result = result.replace(/^¿/, "").replace(/^¡/, ""); // solo al inicio del mensaje
  if (Math.random() < 0.15) result = result.replace(/\.$/, "");
  if (Math.random() < 0.1 && !result.endsWith("?") && !result.endsWith("!")) result += "...";
  return result;
}

// ── DELAY HUMANO ──────────────────────────────────────────────────────────────
function calcDelay(text) {
  try {
    if (!text || typeof text !== "string") return 20000;
    const words = Math.max(text.trim().split(/\s+/).length, 1);
    const base = 15000 + Math.random() * 10000;
    const typing = words * 1000 * (0.8 + Math.random() * 0.4);
    const result = Math.min(Math.round(base + typing), 55000);
    return isNaN(result) ? 20000 : result; // fallback si NaN
  } catch {
    return 20000;
  }
}

// ── PARSEAR JSON DE CLAUDE ────────────────────────────────────────────────────
function parseClaude(text) {
  if (!text) return null;
  try { const m = text.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch {}
  return null;
}

// ── SANITIZAR HISTORIAL ───────────────────────────────────────────────────────
// La API de Claude exige que los roles alternen user/assistant
// y que el primer mensaje sea siempre user
function sanitizeMessages(messages) {
  if (!messages || messages.length === 0) return [];
  const result = [];
  for (const msg of messages) {
    if (result.length === 0) {
      result.push(msg);
    } else {
      const last = result[result.length - 1];
      if (last.role === msg.role) {
        result[result.length - 1] = { ...last, content: last.content + "\n" + msg.content };
      } else {
        result.push(msg);
      }
    }
  }
  if (result.length > 0 && result[0].role === "assistant") result.shift();
  return result;
}

// ── NOTIFICACIÓN TELEGRAM ────────────────────────────────────────────────────
// Avisa a Roberto cuando un lead necesita atención humana
async function notificarTelegram(motivo, nombre, fase, mensajeSugerido) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return; // si no está configurado, ignorar silenciosamente

  const texto = [
    "🔔 *LEAD NECESITA ATENCIÓN*",
    "",
    `👤 *Lead:* ${nombre || "Desconocido"}`,
    `📍 *Fase:* ${fase || "—"}`,
    `⚠ *Motivo:* ${motivo}`,
    "",
    `💬 *Mensaje sugerido:*`,
    `_${mensajeSugerido || "—"}_`,
  ].join("
");

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: texto,
        parse_mode: "Markdown",
      }),
    });
  } catch (err) {
    console.error("Error enviando Telegram:", err.message);
  }
}

// ── SUPABASE HELPERS ──────────────────────────────────────────────────────────
async function getOrCreateLead(lead_id, nombre, fuente) {
  // BUG FIX: .single() lanza error si no existe — usar maybeSingle() en su lugar
  const { data: lead } = await supabase
    .from("leads").select("*").eq("instagram_id", lead_id).maybeSingle();

  if (lead) return lead;

  const { data: newLead, error } = await supabase
    .from("leads").insert({
      instagram_id: lead_id,
      nombre: nombre || "Desconocido",
      fuente: fuente || "directo",
      estado: "nuevo",
      fase_actual: 1,
    }).select().single();

  if (error) throw new Error("Error creando lead: " + error.message);
  return newLead;
}

async function getHistory(leadId) {
  const { data, error } = await supabase
    .from("mensajes").select("rol, texto")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true })
    .limit(20); // BUG FIX: bajado de 30 a 20 — guardamos los más recientes para no saturar contexto
  if (error) throw new Error("Error obteniendo historial: " + error.message);
  return data || [];
}

async function saveMessage(leadId, rol, texto, esSugerido = false) {
  const { error } = await supabase.from("mensajes").insert({
    lead_id: leadId, rol, texto, es_sugerido: esSugerido,
  });
  if (error) console.error("Error guardando mensaje:", error.message);
}

async function updateLead(leadId, updates) {
  const { error } = await supabase.from("leads")
    .update({ ...updates, ultimo_mensaje: new Date().toISOString() })
    .eq("id", leadId);
  if (error) console.error("Error actualizando lead:", error.message);
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS — solo permitir orígenes conocidos
  const allowedOrigins = ["https://manychat.com", "https://app.manychat.com"];
  const origin = req.headers.origin || "";
  if (allowedOrigins.includes(origin) || !origin) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Body no es JSON válido" });
  }

  try {
    const { mensaje, fuente, nombre, instagram_id, historial } = body || {};

    if (!mensaje || typeof mensaje !== "string" || !mensaje.trim()) {
      return res.status(400).json({ error: "Falta el campo mensaje o está vacío" });
    }

    // BUG FIX: si no hay instagram_id ni nombre, generar ID único temporal
    // para evitar que todos los leads anónimos compartan el mismo registro
    // Sanitizar lead_id — evitar strings vacíos y caracteres problemáticos
    const rawId = ((instagram_id && instagram_id.trim()) || (nombre && nombre.trim()) || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const lead_id = rawId ? rawId.replace(/[^a-zA-Z0-9_\-@.áéíóúüñÁÉÍÓÚÜÑ ]/g, "").slice(0, 100) : `anon_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Rate limiting
    if (isRateLimited(lead_id)) {
      return res.status(429).json({ error: "Demasiadas peticiones. Espera unos segundos." });
    }

    let messages = [];
    let leadDbId = null;
    let isFirstMessage = false;

    // ── CON SUPABASE ──────────────────────────────────────────────────────────
    if (supabase) {
      try {
        const lead = await getOrCreateLead(lead_id, nombre, fuente);
        leadDbId = lead.id;
        const historialDb = await getHistory(leadDbId);
        isFirstMessage = historialDb.length === 0;
        await saveMessage(leadDbId, "lead", mensaje.trim());
        messages = historialDb.map((m) => ({
          role: m.rol === "roberto" ? "assistant" : "user",
          content: m.texto,
        }));
      } catch (dbErr) {
        // Si Supabase falla → degradar a modo sin memoria en vez de bloquear al lead
        console.error("Supabase no disponible, modo sin memoria:", dbErr.message);
        leadDbId = null;
        isFirstMessage = true;
        messages = [];
      }

    // ── SIN SUPABASE ──────────────────────────────────────────────────────────
    } else if (historial && Array.isArray(historial)) {
      isFirstMessage = historial.length === 0;
      // Validar cada item del historial antes de usarlo
      messages = historial
        .filter((m) => m && typeof m.rol === "string" && typeof m.texto === "string" && m.texto.trim())
        .map((m) => ({
          role: m.rol === "roberto" ? "assistant" : "user",
          content: m.texto.trim(),
        }));
    } else {
      isFirstMessage = true;
    }

    // BUG FIX: añadir contexto de fuente en primer mensaje independientemente
    // de si hay historial o no — antes solo se añadía si messages.length === 0
    let textoUsuario = mensaje.trim();
    if (isFirstMessage) {
      const contexto = [];
      if (fuente) contexto.push(`[Lead llegó desde: ${fuente}]`);
      if (nombre) contexto.push(`[Nombre del lead: ${nombre}]`);
      if (body.profesion) contexto.push(`[Profesión que indicó: ${body.profesion}]`);
      if (body.num_mensajes_previos) contexto.push(`[Ya había interactuado antes: ${body.num_mensajes_previos} mensajes anteriores]`);
      if (body.comentario_original) contexto.push(`[Su comentario original en el reel/historia: "${body.comentario_original}"]`);
      if (contexto.length > 0) {
        textoUsuario = contexto.join("\n") + "\n\nPrimer mensaje: " + mensaje.trim();
      }
    }
    messages.push({ role: "user", content: textoUsuario });
    messages = sanitizeMessages(messages);

    // Si no hay mensajes válidos tras sanitizar, crear uno mínimo
    if (messages.length === 0) {
      messages = [{ role: "user", content: mensaje.trim() }];
    }

    // ── LLAMAR A CLAUDE ───────────────────────────────────────────────────────
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s — margen antes del límite de Vercel
    let claudeRes;
    try {
      claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 300, // Instagram DM: máximo ~2000 chars, 300 tokens es suficiente y evita respuestas largas
          system: SYSTEM_PROMPT,
          messages,
        }),
      });
    } catch (fetchErr) {
      if (fetchErr.name === "AbortError") throw new Error("Claude tardó demasiado — intenta de nuevo");
      throw fetchErr;
    } finally {
      clearTimeout(timeout);
    }

    const claudeData = await claudeRes.json();
    if (claudeData.error) throw new Error(claudeData.error.message);

    const texto = claudeData.content?.find((b) => b.type === "text")?.text || "";
    if (!texto) throw new Error("Claude no devolvió respuesta");

    const parsed = parseClaude(texto);

    // ── PAUSA ─────────────────────────────────────────────────────────────────
    if (parsed?.pausa) {
      const msgSugerido = humanize(parsed.mensaje_sugerido || "");
      if (supabase && leadDbId) {
        await saveMessage(leadDbId, "roberto", msgSugerido, true);
        await updateLead(leadDbId, { estado: "revision_humana" });
      }
      // Notificar a Roberto por Telegram
      await notificarTelegram(
        parsed.motivo || "Requiere revisión humana",
        nombre || instagram_id,
        parsed.fase,
        msgSugerido
      );

      return res.status(200).json({
        tipo: "pausa",
        motivo: parsed.motivo || "Requiere revisión humana",
        mensaje_sugerido: msgSugerido,
        fase: parsed.fase || "",
        accion: "notificar_setter",
        delay_ms: 0,
      });
    }

    // ── AGENDAR ───────────────────────────────────────────────────────────────
    if (parsed?.agendar) {
      const msgFinal = humanize(parsed.mensaje || "");
      if (supabase && leadDbId) {
        await saveMessage(leadDbId, "roberto", msgFinal);
        await updateLead(leadDbId, { estado: "calendario_enviado", fase_actual: 7 });
      }
      return res.status(200).json({
        tipo: "agendar",
        mensaje: msgFinal,
        accion: "enviar_y_notificar",
        delay_ms: calcDelay(msgFinal),
      });
    }

    // ── RESPUESTA NORMAL ──────────────────────────────────────────────────────
    const msgFinal = humanize(texto.trim());
    if (!msgFinal || !msgFinal.trim()) throw new Error("Respuesta vacía de Claude");
    if (supabase && leadDbId) {
      await saveMessage(leadDbId, "roberto", msgFinal);
      await updateLead(leadDbId, { estado: "en_conversacion" });
    }

    return res.status(200).json({
      tipo: "respuesta",
      mensaje: msgFinal,
      accion: "enviar",
      delay_ms: calcDelay(msgFinal),
    });

  } catch (err) {
    console.error(`Webhook error [lead:${body?.instagram_id || "unknown"}]:`, err.message, err.stack?.split("\n")[1] || "");
    return res.status(500).json({ error: err.message || "Error interno del servidor" });
  }
}
