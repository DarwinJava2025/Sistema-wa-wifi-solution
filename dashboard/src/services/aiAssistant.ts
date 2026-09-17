// AI Assistant, LLM Engine & Conversation Memory Service for OpenWA Dashboard

export type AiRoleType = 'support' | 'sales' | 'customer_care' | 'billing' | 'custom';
export type LlmProviderType = 'groq' | 'openai' | 'gemini' | 'openrouter' | 'ollama' | 'offline';

export interface LlmConfig {
  provider: LlmProviderType;
  apiKey: string;
  model: string;
  baseUrl?: string; // For Ollama / local or custom proxy
  temperature: number;
  memoryEnabled: boolean; // Retain customer details, ticket ID, quotes across conversation
}

export interface ConversationMemory {
  customerName?: string;
  ticketId?: string;
  interestedPlan?: string;
  zoneAddress?: string;
  currentStage?: string;
  notes?: string[];
  lastSummary?: string;
  updatedAt: string;
}

export interface BusinessSchedule {
  enabled: boolean;
  days: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startHour: string; // '08:00'
  endHour: string; // '18:00'
  outOfHoursMode: 'custom_message' | 'ai_away_response' | 'disabled';
  outOfHoursMessage: string;
}

export interface KnowledgeDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  isPriceList?: boolean; // Tagged as official price list / catalog
  content: string; // Parsed text or CSV content
}

export interface KnowledgeUrl {
  id: string;
  url: string;
  title?: string;
  content?: string;
  addedAt: string;
}

export type TriggerIntentType = 'greeting' | 'balance' | 'plans' | 'support' | 'custom' | 'agent';

export interface TemplateTriggerButton {
  text: string;
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  value: string;
}

export interface TemplateTriggerMapping {
  id: string;
  enabled: boolean;
  name: string; // e.g. "👋 Saludo de Bienvenida"
  intentType: TriggerIntentType;
  keywords: string[]; // e.g. ["hola", "buenos dias", "menu"]
  roleAffiliation?: AiRoleType | 'all';
  templateId?: string;
  templateName: string;
  headerType: 'none' | 'text' | 'image' | 'video' | 'audio' | 'document';
  headerText?: string;
  mediaUrl?: string;
  body: string;
  footer?: string;
  buttons?: TemplateTriggerButton[];
  action: 'send_template' | 'ai_hybrid';
  dynamicAiMatch?: boolean; // When true, AI semantically triggers template even without exact keyword
}

export interface ChatAiConfig {
  chatId: string;
  sessionId: string;
  enabled: boolean;
  autoPilot: boolean; // Auto-reply on incoming messages
  role: AiRoleType;
  customRoleName?: string; // If role === 'custom', the custom name
  businessName: string;
  businessContext: string; // Info about products, services, pricing, FAQs
  customRolePrompt?: string; // Additional prompt directives / specific instructions
  documents?: KnowledgeDocument[]; // Attached files / price lists
  urls?: KnowledgeUrl[]; // Attached web URLs / catalogs
  templateTriggers?: TemplateTriggerMapping[]; // Affiliated templates & trigger mappings
  llmConfig?: LlmConfig; // LLM Provider settings
  schedule: BusinessSchedule;
  updatedAt: string;
}

export interface AiRoleDefinition {
  id: AiRoleType;
  name: string;
  icon: string;
  badgeColor: string;
  description: string;
  samplePrompt: string;
  defaultPrompt: string;
}

export const DEFAULT_API_KEYS: Record<LlmProviderType, string> = {
  openai: '',
  gemini: '',
  groq: '',
  openrouter: '',
  ollama: '',
  offline: '',
};

export const DEFAULT_LLM_CONFIG: LlmConfig = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
  baseUrl: '',
  temperature: 0.7,
  memoryEnabled: true,
};

export const LLM_PROVIDERS: Record<LlmProviderType, { name: string; defaultModel: string; defaultUrl: string; placeholder: string; desc: string }> = {
  openai: {
    name: '🤖 OpenAI ChatGPT (GPT-4o / GPT-4o-mini)',
    defaultModel: 'gpt-4o-mini',
    defaultUrl: 'https://api.openai.com/v1/chat/completions',
    placeholder: 'sk-svcacct-... / sk-proj-...',
    desc: 'El estándar de la industria en razonamiento y adherencia estricta a roles comerciales y técnicos.',
  },
  gemini: {
    name: '✨ Google Gemini (Gemini 2.0 / 1.5 Flash)',
    defaultModel: 'gemini-1.5-flash',
    defaultUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    placeholder: 'AQ.... / AIzaSy...',
    desc: 'Excelente capacidad de lectura profunda de documentos extensos, tarifas y precios.',
  },
  groq: {
    name: '⚡ Groq (Llama 3.3 / Mixtral - Ultra Rápido)',
    defaultModel: 'llama-3.3-70b-versatile',
    defaultUrl: 'https://api.groq.com/openai/v1/chat/completions',
    placeholder: 'gsk_...',
    desc: 'Velocidad instantánea (<1s por respuesta) y alta precisión conversacional.',
  },
  openrouter: {
    name: '🌐 OpenRouter (DeepSeek R1 / Claude / Llama)',
    defaultModel: 'deepseek/deepseek-chat',
    defaultUrl: 'https://openrouter.ai/api/v1/chat/completions',
    placeholder: 'sk-or-v1-...',
    desc: 'Acceso a cientos de modelos de IA con una sola clave de API.',
  },
  ollama: {
    name: '🖥️ Ollama / Servidor Local (Privado / Sin Costo)',
    defaultModel: 'llama3:latest',
    defaultUrl: 'http://localhost:11434/v1/chat/completions',
    placeholder: 'opcional si es local',
    desc: 'Ejecuta modelos 100% privados y gratuitos en tu propio servidor.',
  },
  offline: {
    name: '🧠 Motor Autónomo Integrado (Sin API Key)',
    defaultModel: 'openwa-neural-engine',
    defaultUrl: '',
    placeholder: 'No requiere clave',
    desc: 'Motor heurístico que funciona offline y sigue roles estrictamente.',
  },
};

export const AI_ROLES: Record<AiRoleType, AiRoleDefinition> = {
  support: {
    id: 'support',
    name: 'Soporte Técnico',
    icon: '🛠️',
    badgeColor: '#0ea5e9',
    description: 'Diagnóstico paso a paso de incidencias, seguimiento de caso con Ticket, pruebas de router y resolución técnica.',
    samplePrompt: 'Diagnostica problemas de conexión WiFi, reinicio de equipos, luces de ONT y genera ticket de seguimiento.',
    defaultPrompt: `Eres un Ingeniero Especialista en Soporte Técnico de nivel 1 y 2. Tu misión es dar seguimiento riguroso al caso del cliente, diagnosticar el problema y guiarlo paso a paso sin perder la personalidad técnica y servicial.
Directrices Clave:
1. MANTÉN SIEMPRE EL TICKET DE SEGUIMIENTO: Si ya se generó un [Ticket #ST-XXXX], menciónalo y úsalo durante toda la conversación. Si no existe, genera uno nuevo.
2. RECUERDA EL CONTEXTO PREVIO: Si el cliente ya te dijo su nombre, el problema o el estado de sus luces, NO se lo vuelvas a preguntar. Continúa desde el paso en el que van.
3. DIAGNÓSTICO PASO A PASO:
   - Paso 1: Reinicio de router/ONT por 30 segundos.
   - Paso 2: Pregunta el estado exacto de las luces (Power, PON, LOS, LAN, WiFi).
   - Paso 3: Si LOS está roja o intermitente, es corte de fibra -> solicita datos del titular y dirección para despachar cuadrilla técnica.
4. Mantén un tono paciente, empático, altamente estructurado y técnico.`,
  },
  sales: {
    id: 'sales',
    name: 'Ventas y Cotizaciones',
    icon: '💼',
    badgeColor: '#10b981',
    description: 'Asesor comercial enfocado en entender necesidades, presentar planes con precios y cerrar la venta de inmediato.',
    samplePrompt: 'Presenta paquetes de internet/fibra, cotizaciones, promociones y solicita datos para agendar instalación.',
    defaultPrompt: `Eres un Ejecutivo de Ventas de alto rendimiento y cerrador de negocios. Tu objetivo es asesorar, cautivar y concretar la contratación o compra de forma ágil y persuasiva sin salir de tu personaje vendedor.
Directrices Clave:
1. CONSULTA SIEMPRE LAS TARIFAS REALES: Cita los planes y precios exactos según los archivos de tarifas y contexto del negocio adjunto.
2. SEGUIMIENTO DE COTIZACIONES: Si el cliente ya preguntó por un plan o dijo su zona, recuerda sus datos y enfócate en el siguiente paso de la venta.
3. PERSUASIÓN Y CIERRE: No seas un simple contestador; después de dar el precio o la información, pregunta la zona para validar cobertura y solicita los datos para agendar la instalación esta misma semana.
4. CIERRA EL CONTRATO: Solicita Nombre, Cédula, Dirección exacta y Teléfono de contacto para formalizar el pedido.`,
  },
  customer_care: {
    id: 'customer_care',
    name: 'Atención al Cliente',
    icon: '🤝',
    badgeColor: '#8b5cf6',
    description: 'Orientación general, bienvenida, ubicación de oficinas, horarios, estados de solicitudes y dudas frecuentes.',
    samplePrompt: 'Atiende consultas generales de usuarios, horarios de atención, sedes y transferencias a operadores.',
    defaultPrompt: `Eres un Representante de Atención al Cliente y Experiencia de Usuario. Tu misión es brindar respuestas rápidas, cálidas y precisas a cualquier duda general sobre la empresa.
Directrices Clave:
1. Responde siempre con máxima cortesía, empatía y calidez.
2. Recuerda el nombre del cliente y los trámites previos que haya mencionado.
3. Proporciona información verificada y concisa sobre sucursales, horarios, URLs y documentos de políticas.
4. Si el usuario necesita otra área especializada (Ventas o Soporte), oríentalo o transfiérelo amablemente.`,
  },
  billing: {
    id: 'billing',
    name: 'Cobranzas y Facturación',
    icon: '💳',
    badgeColor: '#f59e0b',
    description: 'Consulta de saldos, métodos de pago (Pago Móvil, Zelle, transferencias), recepción de comprobantes y reconexión.',
    samplePrompt: 'Informa sobre métodos de pago aceptados, cuentas bancarias, verificación de comprobantes y fechas de corte.',
    defaultPrompt: `Eres un Asistente de Cobranzas y Facturación. Tu objetivo es asistir a los usuarios con dudas sobre sus pagos, métodos de recaudación y facturas de manera clara y formal.
Directrices Clave:
1. Sé formal, claro, respetuoso y comprensivo.
2. Proporciona los métodos de pago disponibles (cuentas bancarias, pago móvil, transferencias, Zelle, efectivo).
3. Consulta archivos de tarifas o precios si se requiere aclarar montos mensuales.
4. Instruye al cliente sobre cómo enviar su comprobante de pago (referencia, monto, cédula del titular) para acreditación inmediata.
5. Si el servicio está suspendido por falta de pago, explica el proceso de reconexión automática tras reportar el pago.`,
  },
  custom: {
    id: 'custom',
    name: 'Otro / Personalizado',
    icon: '✏️',
    badgeColor: '#ec4899',
    description: 'Define tu propio rol con nombre personalizado, instrucciones únicas, reglas y prompt a la medida.',
    samplePrompt: 'Escribe el nombre del rol y describe detalladamente cómo debe responder y actuar el asistente.',
    defaultPrompt: `Eres un asistente virtual especializado. Sigue rigurosamente las instrucciones del negocio, consulta los documentos, precios y URLs adjuntos, recuerda el contexto de la conversación y responde de forma útil, precisa y concisa en español.`,
  },
};

export const DEFAULT_SCHEDULE: BusinessSchedule = {
  enabled: true,
  days: [1, 2, 3, 4, 5], // Monday - Friday
  startHour: '08:00',
  endHour: '18:00',
  outOfHoursMode: 'custom_message',
  outOfHoursMessage:
    '¡Hola! En este momento nos encontramos fuera de nuestro horario de atención comercial (Lunes a Viernes de 8:00 a 18:00). Tu mensaje ha quedado registrado y te atenderemos tan pronto iniciemos jornada.',
};

const CHAT_STORAGE_KEY = 'openwa_ai_chat_configs';
const SESSION_STORAGE_KEY = 'openwa_ai_session_configs';
const GLOBAL_LLM_STORAGE_KEY = 'openwa_ai_global_llm_config';
const CONVERSATION_MEMORY_KEY = 'openwa_ai_conv_memories';

/** Get global LLM settings */
export function getGlobalLlmConfig(): LlmConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_LLM_CONFIG };
  try {
    const raw = localStorage.getItem(GLOBAL_LLM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const provider: LlmProviderType = parsed.provider || 'openai';
      return {
        ...DEFAULT_LLM_CONFIG,
        ...parsed,
        apiKey: parsed.apiKey || DEFAULT_API_KEYS[provider] || DEFAULT_LLM_CONFIG.apiKey,
      };
    }
  } catch {}
  return { ...DEFAULT_LLM_CONFIG };
}

/** Save global LLM settings */
export function saveGlobalLlmConfig(config: LlmConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GLOBAL_LLM_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save global LLM config:', err);
  }
}

/** Get conversation memory for a specific chat */
export function getConversationMemory(sessionId: string, chatId: string): ConversationMemory {
  if (typeof window === 'undefined') return { updatedAt: new Date().toISOString() };
  try {
    const raw = localStorage.getItem(CONVERSATION_MEMORY_KEY);
    const memories = raw ? JSON.parse(raw) : {};
    const key = `${sessionId}:${chatId}`;
    return memories[key] || { updatedAt: new Date().toISOString() };
  } catch {
    return { updatedAt: new Date().toISOString() };
  }
}

/** Save conversation memory for a specific chat */
export function saveConversationMemory(sessionId: string, chatId: string, memory: ConversationMemory): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(CONVERSATION_MEMORY_KEY);
    const memories = raw ? JSON.parse(raw) : {};
    const key = `${sessionId}:${chatId}`;
    memories[key] = {
      ...memory,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(CONVERSATION_MEMORY_KEY, JSON.stringify(memories));
  } catch (err) {
    console.error('Failed to save conversation memory:', err);
  }
}

/** Analyze conversation messages to extract and update memory (Customer Name, Ticket ID, Plan, Address) */
export function updateMemoryFromDialogue(
  sessionId: string,
  chatId: string,
  messages: Array<{ body: string; fromMe?: boolean }>,
  role: AiRoleType,
): ConversationMemory {
  const currentMemory = getConversationMemory(sessionId, chatId);
  const updated: ConversationMemory = { ...currentMemory };

  messages.forEach(m => {
    const text = m.body || '';

    // Extract Ticket if present in assistant message
    if (m.fromMe) {
      const ticketMatch = text.match(/\[Ticket\s*#?(ST-\d+)\]/i);
      if (ticketMatch) {
        updated.ticketId = ticketMatch[1];
      }
    }

    // Extract Customer Name
    if (!m.fromMe) {
      const nameMatch = text.match(/(?:me llamo|mi nombre es|soy)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ]+(?:\s+[a-zA-ZáéíóúÁÉÍÓÚñÑ]+)?)/i);
      if (nameMatch) {
        updated.customerName = nameMatch[1].trim();
      }

      // Extract Address / Zone
      const zoneMatch = text.match(/(?:vivo en|mi direccion es|direccion:|sector|calle|urbanizacion|urb|barrio)\s+([a-zA-Z0-9\s,#\.-]+)/i);
      if (zoneMatch && zoneMatch[1].length > 4) {
        updated.zoneAddress = zoneMatch[1].trim();
      }

      // Extract Plan
      const planMatch = text.match(/(?:plan|megas|paquete)\s*(?:de)?\s*(\d+\s*m(?:egas|bps)?|hogar|gamer|pro|corporativo)/i);
      if (planMatch) {
        updated.interestedPlan = planMatch[0].trim();
      }
    }
  });

  // If role is support and no ticket exists yet, create one
  if (role === 'support' && !updated.ticketId) {
    updated.ticketId = `ST-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  saveConversationMemory(sessionId, chatId, updated);
  return updated;
}

/** Get all stored chat AI configurations */
export function getAllAiChatConfigs(): Record<string, ChatAiConfig> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getDefaultTemplateTriggers(_role?: AiRoleType): TemplateTriggerMapping[] {
  return [
    {
      id: 'trig_greeting',
      enabled: true,
      name: '👋 Saludo & Bienvenida Automática',
      intentType: 'greeting',
      keywords: ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'saludos', 'inicio', 'menu', 'hi', 'hey'],
      roleAffiliation: 'all',
      templateName: 'Bienvenida Oficial WiFi Solution',
      headerType: 'image',
      headerText: '👋 ¡BIENVENIDO A WIFI SOLUTION!',
      mediaUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop',
      body: '¡Hola {{cliente}}! Gracias por comunicarte con *{{empresa}}* 🚀.\n\nSomos tu proveedor de Fibra Óptica simétrica y conectividad de alta velocidad. ¿En qué podemos orientarte el día de hoy?\n\nSelecciona una opción o escribe tu consulta directamente:',
      footer: 'WiFi Solution Pro • Atención al Cliente',
      buttons: [
        { text: '💳 Consultar Saldo / Pagar', type: 'QUICK_REPLY', value: 'SALDO' },
        { text: '🚀 Planes de Fibra', type: 'QUICK_REPLY', value: 'PLANES' },
        { text: '🛠️ Soporte Técnico', type: 'QUICK_REPLY', value: 'SOPORTE' },
      ],
      action: 'send_template',
      dynamicAiMatch: true,
    },
    {
      id: 'trig_balance',
      enabled: true,
      name: '💳 Consulta de Saldo & Facturación',
      intentType: 'balance',
      keywords: ['saldo', 'deuda', 'factura', 'pagar', 'recibo', 'cuenta', 'cuanto debo', 'corte', 'mensualidad', 'pago', 'bancaribe', 'pago movil'],
      roleAffiliation: 'billing',
      templateName: 'Estado de Cuenta y Pago Móvil',
      headerType: 'text',
      headerText: '💳 ESTADO DE CUENTA & FACTURACIÓN',
      body: 'Estimado(a) *{{cliente}}*, te informamos el estado de tu suscripción en *{{empresa}}*:\n\n📄 *ID Contrato:* #{{contrato}}\n💰 *Saldo al día:* ${{saldo}} USD\n📅 *Fecha de vencimiento:* {{fecha}}\n📊 *Plan:* Fibra Óptica 100 Mbps Simétrica\n\n💳 *Cuentas Bancarias:* Pago Móvil Bancaribe (0114), Banesco y Zelle.',
      footer: 'Departamento de Cobranzas • WiFi Solution',
      buttons: [
        { text: '📝 Reportar Pago', type: 'QUICK_REPLY', value: 'REPORTAR_PAGO' },
        { text: '🏦 Ver Cuentas Bancarias', type: 'QUICK_REPLY', value: 'CUENTAS' },
        { text: '👤 Hablar con Cobranzas', type: 'QUICK_REPLY', value: 'ASESOR_PAGO' },
      ],
      action: 'send_template',
      dynamicAiMatch: true,
    },
    {
      id: 'trig_plans',
      enabled: true,
      name: '⚡ Planes & Tarifas de Internet Fibra',
      intentType: 'plans',
      keywords: ['planes', 'precios', 'costo', 'fibra', 'megas', 'promocion', 'contratar', 'velocidad', 'oferta', 'cuanto cuesta', 'tarifas'],
      roleAffiliation: 'sales',
      templateName: 'Catálogo de Planes Fibra Óptica',
      headerType: 'image',
      headerText: '🚀 PLANES DE FIBRA ÓPTICA DEDICADA',
      mediaUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop',
      body: '¡Conéctate a la máxima velocidad con *{{empresa}}*!\n\n🔥 *Nuestros Planes Simétricos:* \n• ⚡ *Plan Básico 50 Mbps:* $25/mes\n• 🚀 *Plan Plus 100 Mbps:* $35/mes *(¡Más Popular!)*\n• ⚡ *Plan Turbo 200 Mbps:* $50/mes\n• 🏢 *Plan Empresarial 500 Mbps:* $90/mes\n\n🎁 *Incluye:* Router WiFi doble banda Gigabit + Instalación express en 24h.',
      footer: 'Ventas & Contrataciones • WiFi Solution',
      buttons: [
        { text: '✅ Solicitar Instalación', type: 'QUICK_REPLY', value: 'CONTRATAR' },
        { text: '📍 Consultar Cobertura', type: 'QUICK_REPLY', value: 'COBERTURA' },
        { text: '💬 Hablar con Ventas', type: 'QUICK_REPLY', value: 'VENTAS' },
      ],
      action: 'send_template',
      dynamicAiMatch: true,
    },
    {
      id: 'trig_support',
      enabled: true,
      name: '🛠️ Soporte Técnico & Reporte de Fallas',
      intentType: 'support',
      keywords: ['soporte', 'falla', 'sin internet', 'lento', 'averia', 'luz roja', 'router', 'problema', 'los', 'pon', 'caido', 'no conecta', 'intermitente'],
      roleAffiliation: 'support',
      templateName: 'Diagnóstico Técnico y Ticket de Falla',
      headerType: 'text',
      headerText: '🛠️ CENTRO DE ASISTENCIA TÉCNICA',
      body: 'Hola {{cliente}}, hemos abierto el seguimiento de tu caso bajo el número **[Ticket #{{ticket}}]** en *{{empresa}}*.\n\nPor favor realiza esta prueba de 30 segundos:\n1. 🔌 Desconecta el módem de la corriente por 30 segundos.\n2. 💡 Revisa si la luz *LOS* está en rojo (corte de fibra) o *PON* parpadeando.\n\n¿Qué luces observas en tu router?',
      footer: 'Soporte Técnico 24/7 • WiFi Solution',
      buttons: [
        { text: '🚨 Luz Roja LOS', type: 'QUICK_REPLY', value: 'LUZ_ROJA' },
        { text: '🐢 Lentitud en WiFi', type: 'QUICK_REPLY', value: 'LENTITUD' },
        { text: '👨‍🔧 Solicitar Cuadrilla', type: 'QUICK_REPLY', value: 'TECNICO' },
      ],
      action: 'send_template',
      dynamicAiMatch: true,
    },
    {
      id: 'trig_agent',
      enabled: true,
      name: '👤 Transferencia a Asesor Humano',
      intentType: 'agent',
      keywords: ['asesor', 'humano', 'operador', 'agente', 'persona', 'atencion humana', 'asistencia personalizada', 'hablar con alguien'],
      roleAffiliation: 'all',
      templateName: 'Transferencia a Operador Humano',
      headerType: 'text',
      headerText: '👤 ATENCIÓN HUMANA PERSONALIZADA',
      body: 'Entendido {{cliente}}. Te estamos transfiriendo de inmediato con un ejecutivo de atención al cliente de *{{empresa}}*.\n\nUn asesor humano tomará el control de esta conversación en breves minutos.',
      footer: 'Mesa de Asistencia • WiFi Solution',
      buttons: [
        { text: '⏳ Esperar Asesor', type: 'QUICK_REPLY', value: 'ESPERAR' },
        { text: '🔙 Volver al Menú', type: 'QUICK_REPLY', value: 'MENU' },
      ],
      action: 'send_template',
      dynamicAiMatch: true,
    },
  ];
}

/** Check if incoming message matches any affiliated template trigger */
export function findMatchingTemplateTrigger(
  query: string,
  triggers: TemplateTriggerMapping[],
  memory?: ConversationMemory,
  config?: ChatAiConfig,
): { trigger: TemplateTriggerMapping; formattedText: string } | null {
  if (!triggers || triggers.length === 0) return null;
  const q = query.toLowerCase().trim();

  for (const trig of triggers) {
    if (!trig.enabled) continue;

    const keywordMatch = trig.keywords.some(kw => {
      const cleanKw = kw.toLowerCase().trim();
      if (!cleanKw) return false;
      const regex = new RegExp(`\\b${cleanKw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      return regex.test(q) || q === cleanKw || (cleanKw.length > 4 && q.includes(cleanKw));
    });

    let dynamicMatch = false;
    if (trig.dynamicAiMatch) {
      if (trig.intentType === 'greeting' && (q.startsWith('hola') || q.startsWith('buenas') || q.startsWith('buenos') || q === 'hi' || q === 'hey' || q === 'menu')) {
        dynamicMatch = true;
      } else if (trig.intentType === 'balance' && (q.includes('saldo') || q.includes('debo') || q.includes('deuda') || q.includes('factura') || q.includes('pagar') || q.includes('corte'))) {
        dynamicMatch = true;
      } else if (trig.intentType === 'plans' && (q.includes('plan') || q.includes('precio') || q.includes('costo') || q.includes('megas') || q.includes('fibra') || q.includes('tarifa'))) {
        dynamicMatch = true;
      } else if (trig.intentType === 'support' && (q.includes('soporte') || q.includes('falla') || q.includes('lento') || q.includes('caido') || q.includes('sin internet') || q.includes('luz roja'))) {
        dynamicMatch = true;
      } else if (trig.intentType === 'agent' && (q.includes('asesor') || q.includes('humano') || q.includes('operador') || q.includes('persona'))) {
        dynamicMatch = true;
      }
    }

    if (keywordMatch || dynamicMatch) {
      const bizName = config?.businessName || 'WiFi Solution Pro';
      const clientName = memory?.customerName || 'Estimado(a) Cliente';
      const ticketId = memory?.ticketId || `${Math.floor(1000 + Math.random() * 9000)}`;
      const todayDate = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

      let formattedBody = trig.body
        .replace(/\{\{cliente\}\}/gi, clientName)
        .replace(/\{\{nombre\}\}/gi, clientName)
        .replace(/\{\{empresa\}\}/gi, bizName)
        .replace(/\{\{ticket\}\}/gi, ticketId)
        .replace(/\{\{saldo\}\}/gi, '25.00')
        .replace(/\{\{fecha\}\}/gi, todayDate)
        .replace(/\{\{contrato\}\}/gi, 'CT-88421')
        .replace(/\{\{cedula\}\}/gi, 'V-19.845.120')
        .replace(/\{\{plan\}\}/gi, 'Fibra 100 Mbps');

      let fullMessage = '';
      if (trig.headerType === 'image' && trig.mediaUrl) {
        fullMessage += `[🖼️ Imagen: ${trig.headerText || 'Encabezado'}]\n\n`;
      } else if (trig.headerType === 'video' && trig.mediaUrl) {
        fullMessage += `[🎬 Video: ${trig.headerText || 'Video'}]\n\n`;
      } else if (trig.headerType === 'audio' && trig.mediaUrl) {
        fullMessage += `[🎵 Audio]\n\n`;
      } else if (trig.headerType === 'document' && trig.mediaUrl) {
        fullMessage += `[📄 Documento: ${trig.headerText || 'Archivo PDF'}]\n\n`;
      } else if (trig.headerType === 'text' && trig.headerText) {
        fullMessage += `*${trig.headerText}*\n\n`;
      }

      fullMessage += formattedBody;

      if (trig.footer) {
        fullMessage += `\n\n_${trig.footer}_`;
      }

      if (trig.buttons && trig.buttons.length > 0) {
        fullMessage += '\n\n🔘 *Opciones Rápidas:*';
        trig.buttons.forEach((btn, idx) => {
          fullMessage += `\n[${idx + 1}] ${btn.text}`;
        });
      }

      return { trigger: trig, formattedText: fullMessage };
    }
  }

  return null;
}

/** Get all stored session AI configurations */
export function getAllSessionAiConfigs(): Record<string, ChatAiConfig> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Get AI configuration for a whole Session */
export function getSessionAiConfig(sessionId: string): ChatAiConfig {
  const configs = getAllSessionAiConfigs();
  const globalLlm = getGlobalLlmConfig();

  if (configs[sessionId]) {
    const c = configs[sessionId];
    return {
      ...c,
      documents: c.documents || [],
      urls: c.urls || [],
      templateTriggers: c.templateTriggers && c.templateTriggers.length > 0 ? c.templateTriggers : getDefaultTemplateTriggers(c.role),
      llmConfig: c.llmConfig || globalLlm,
    };
  }

  return {
    chatId: '*',
    sessionId,
    enabled: false,
    autoPilot: false,
    role: 'support',
    customRoleName: '',
    businessName: 'WiFi Solution Pro',
    businessContext: 'Proveedor de internet de alta velocidad por fibra óptica, planes residenciales y corporativos, soporte técnico 24/7.',
    customRolePrompt: '',
    documents: [],
    urls: [],
    templateTriggers: getDefaultTemplateTriggers('support'),
    llmConfig: globalLlm,
    schedule: { ...DEFAULT_SCHEDULE },
    updatedAt: new Date().toISOString(),
  };
}

/** Save AI configuration for a whole Session */
export function saveSessionAiConfig(config: ChatAiConfig): void {
  if (typeof window === 'undefined') return;
  try {
    const configs = getAllSessionAiConfigs();
    configs[config.sessionId] = {
      ...config,
      chatId: '*',
      documents: config.documents || [],
      urls: config.urls || [],
      templateTriggers: config.templateTriggers || getDefaultTemplateTriggers(config.role),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(configs));
  } catch (err) {
    console.error('Failed to save session AI config:', err);
  }
}

/** Get effective AI config */
export function getEffectiveAiConfig(sessionId: string, chatId?: string): ChatAiConfig {
  if (chatId && chatId !== '*') {
    const chatConfigs = getAllAiChatConfigs();
    const key = `${sessionId}:${chatId}`;
    if (chatConfigs[key] && chatConfigs[key].enabled) {
      const c = chatConfigs[key];
      return {
        ...c,
        documents: c.documents || [],
        urls: c.urls || [],
        llmConfig: c.llmConfig || getGlobalLlmConfig(),
      };
    }
  }
  return getSessionAiConfig(sessionId);
}

/** Get AI configuration for a specific chat */
export function getChatAiConfig(sessionId: string, chatId: string): ChatAiConfig {
  const configs = getAllAiChatConfigs();
  const key = `${sessionId}:${chatId}`;
  if (configs[key]) {
    const c = configs[key];
    return {
      ...c,
      documents: c.documents || [],
      urls: c.urls || [],
      llmConfig: c.llmConfig || getGlobalLlmConfig(),
    };
  }

  const sessionConfig = getSessionAiConfig(sessionId);
  return {
    ...sessionConfig,
    chatId,
    sessionId,
    documents: [...(sessionConfig.documents || [])],
    urls: [...(sessionConfig.urls || [])],
  };
}

/** Save AI configuration for a specific chat */
export function saveChatAiConfig(config: ChatAiConfig): void {
  if (typeof window === 'undefined') return;
  try {
    const configs = getAllAiChatConfigs();
    const key = `${config.sessionId}:${config.chatId}`;
    configs[key] = {
      ...config,
      documents: config.documents || [],
      urls: config.urls || [],
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(configs));
  } catch (err) {
    console.error('Failed to save chat AI config:', err);
  }
}

/** Check if current time is within business hours */
export function isWithinBusinessHours(schedule: BusinessSchedule): {
  isWithin: boolean;
  currentDayName: string;
  currentTimeStr: string;
} {
  const now = new Date();
  const currentDay = now.getDay();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${hours}:${minutes}`;

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const currentDayName = dayNames[currentDay] || '';

  if (!schedule.enabled) {
    return { isWithin: true, currentDayName, currentTimeStr };
  }

  const isDayAllowed = schedule.days.includes(currentDay);
  if (!isDayAllowed) {
    return { isWithin: false, currentDayName, currentTimeStr };
  }

  const isTimeAllowed = currentTimeStr >= schedule.startHour && currentTimeStr <= schedule.endHour;
  return { isWithin: isTimeAllowed, currentDayName, currentTimeStr };
}

/** Helper to format attached knowledge documents and URLs for the AI prompt */
export function buildKnowledgeContext(config: ChatAiConfig): string {
  const parts: string[] = [];

  // Attached files & price lists
  if (config.documents && config.documents.length > 0) {
    parts.push('=== ARCHIVOS Y DOCUMENTOS ADJUNTOS ===');
    config.documents.forEach((doc, idx) => {
      const tag = doc.isPriceList ? ' [LISTA DE PRECIOS OFICIAL]' : '';
      parts.push(`--- Documento #${idx + 1}: ${doc.name}${tag} ---`);
      parts.push(doc.content.slice(0, 4000));
    });
  }

  // Attached web URLs
  if (config.urls && config.urls.length > 0) {
    parts.push('=== ENLACES Y SITIOS WEB REFERENCIADOS ===');
    config.urls.forEach((u, idx) => {
      parts.push(`--- Enlace #${idx + 1}: ${u.title || u.url} ---`);
      parts.push(`URL: ${u.url}`);
      if (u.content) {
        parts.push(u.content.slice(0, 2000));
      }
    });
  }

  return parts.join('\n\n');
}

/** Find relevant price information from attached documents */
export function extractPricesFromKnowledge(_query: string, config: ChatAiConfig): string | null {
  if (!config.documents || config.documents.length === 0) return null;

  const priceDocs = config.documents.filter(
    d => d.isPriceList || /precio|tarifa|costo|\$|usd|bs|plan/i.test(d.name + ' ' + d.content),
  );

  if (priceDocs.length === 0) return null;

  const results: string[] = [];
  priceDocs.forEach(doc => {
    results.push(`📊 **Precios disponibles según el archivo *"${doc.name}"*:**\n${doc.content.trim()}`);
  });

  return results.join('\n\n');
}

/** Call external LLM (OpenAI, Gemini, Groq, OpenRouter, Ollama) */
async function callLlmChatApi(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  llm: LlmConfig,
): Promise<string | null> {
  const provider = llm.provider;
  if (provider === 'offline') return null;

  const apiKey = (llm.apiKey || '').trim() || DEFAULT_API_KEYS[provider] || '';

  // 1. Google Gemini Provider
  if (provider === 'gemini') {
    const geminiModel = (llm.model || 'gemini-1.5-flash').trim();

    // A. Direct Google Gemini generateContent API
    if (apiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const geminiContents = messages
          .filter(m => m.role !== 'system')
          .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          }));

        if (geminiContents.length === 0) {
          geminiContents.push({ role: 'user', parts: [{ text: 'Hola' }] });
        }

        const geminiBody = {
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: geminiContents,
          generationConfig: {
            temperature: llm.temperature ?? 0.7,
            maxOutputTokens: 800,
          },
        };

        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiBody),
        });

        if (res.ok) {
          const data = await res.json();
          const textParts = data.candidates?.[0]?.content?.parts;
          if (textParts && Array.isArray(textParts) && textParts.length > 0) {
            const text = textParts.map((p: any) => p.text || '').join('').trim();
            if (text) return text;
          }
        } else {
          console.warn(`Gemini native call status ${res.status}:`, await res.text().catch(() => ''));
        }
      } catch (err) {
        console.warn('Gemini native fetch error:', err);
      }
    }

    // B. Gemini OpenAI-compatible endpoint fallback
    try {
      const compatUrl = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`;
      const res = await fetch(compatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: geminiModel,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          temperature: llm.temperature ?? 0.7,
          max_tokens: 800,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content.trim();
      }
    } catch (err) {
      console.warn('Gemini OpenAI compat fetch error:', err);
    }
    return null;
  }

  // 2. OpenAI ChatGPT, Groq, OpenRouter, Ollama
  const providerInfo = LLM_PROVIDERS[provider] || LLM_PROVIDERS.openai;
  const endpoint = llm.baseUrl?.trim() || providerInfo.defaultUrl;
  const model = llm.model?.trim() || providerInfo.defaultModel;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const body = {
    model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    temperature: llm.temperature ?? 0.7,
    max_tokens: 800,
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) return content.trim();
    } else {
      console.warn(`LLM call failed (${res.status}):`, await res.text().catch(() => ''));
    }
  } catch (err) {
    console.warn('LLM fetch error:', err);
  }

  return null;
}

/** Generate intelligent AI response connected to LLM with persistent personality & conversation memory */
export async function generateAiChatResponse(
  messages: Array<{ body: string; fromMe?: boolean; type?: string }>,
  config: ChatAiConfig,
): Promise<string> {
  const { isWithin } = isWithinBusinessHours(config.schedule);

  // If outside business hours and outOfHoursMode is custom_message, return the away message
  if (!isWithin && config.schedule.enabled && config.schedule.outOfHoursMode === 'custom_message') {
    return config.schedule.outOfHoursMessage || DEFAULT_SCHEDULE.outOfHoursMessage;
  }

  const roleDef = AI_ROLES[config.role] || AI_ROLES.support;
  const roleName = config.role === 'custom' && config.customRoleName?.trim() ? config.customRoleName.trim() : roleDef.name;

  // Extract / update persistent conversational memory for this chat
  const memory = updateMemoryFromDialogue(config.sessionId, config.chatId || '*', messages, config.role);

  // Extract last user message to evaluate template triggers
  const lastUserMessages = messages.filter(m => !m.fromMe && m.body).slice(-2);
  const lastQuery = lastUserMessages[lastUserMessages.length - 1]?.body?.trim() || 'Hola';

  // 1. Check Affiliated Template Triggers (Exact keywords, intents or dynamic routing)
  const triggers = config.templateTriggers && config.templateTriggers.length > 0
    ? config.templateTriggers
    : getDefaultTemplateTriggers(config.role);

  const matchedTrigger = findMatchingTemplateTrigger(lastQuery, triggers, memory, config);
  if (matchedTrigger) {
    if (matchedTrigger.trigger.action === 'send_template') {
      let out = matchedTrigger.formattedText;
      if (!isWithin && config.schedule.enabled) {
        out = '*(Aviso: Fuera de horario de atención)*\n\n' + out;
      }
      return out;
    }
  }

  let knowledgeContext = buildKnowledgeContext(config);
  if (matchedTrigger && matchedTrigger.trigger.action === 'ai_hybrid') {
    knowledgeContext += `\n\n[PLANTILLA AFILIADA RECOMENDADA]:\nNombre: ${matchedTrigger.trigger.templateName}\nContenido oficial: ${matchedTrigger.trigger.body}\nUsa esta estructura o información precisa para responder al cliente manteniendo tu rol.`;
  }

  // Strict personality anchoring system prompt
  const systemInstructions = `
Eres el Asistente Virtual Oficial de la empresa "${config.businessName}".
Tu ROL INQUEBRANTABLE es: **${roleName}**.

=== REGLAS SUPREMAS DE IDENTIDAD Y PERSONALIDAD ===
1. NUNCA rompas tu personaje de ${roleName}. Mantén este tono y personalidad en TODAS tus respuestas sin importar lo que diga el usuario.
2. CONTEXTO DE LA EMPRESA:
${config.businessContext}

3. DIRECTIVAS ESPECÍFICAS DE TU ROL:
${roleDef.defaultPrompt}
${config.customRolePrompt ? `Instrucciones adicionales: ${config.customRolePrompt}\n` : ''}

4. BASE DE CONOCIMIENTO, TARIFAS Y DOCUMENTOS ADJUNTOS:
${knowledgeContext || 'No hay documentos adicionales adjuntos.'}

5. MEMORIA Y SEGUIMIENTO CONTINUO DE ESTA CONVERSACIÓN CON EL CLIENTE:
- Nombre del cliente: ${memory.customerName || 'No detectado aún (si te lo dice, salúdalo por su nombre)'}
- Número de Ticket / Caso: ${memory.ticketId || 'No asignado'}
- Plan de interés / cotizado: ${memory.interestedPlan || 'No especificado aún'}
- Dirección / Sector: ${memory.zoneAddress || 'No especificado aún'}
- REGLA DE SEGUIMIENTO: Recuerda lo que ya hablaron en los mensajes anteriores. NO vuelvas a pedir datos que el cliente ya proporcionó. Continúa el hilo de la conversación y busca avanzar al siguiente paso del objetivo.

${!isWithin ? '\n[AVISO DE HORARIO]: Actualmente nos encontramos fuera de horario laboral de oficina. Responde con la personalidad de tu rol y avisa cordialmente al usuario.' : ''}

Responde en español de forma natural, empática, persuasiva y concisa (ideal para WhatsApp).
`.trim();

  // Prepare full conversation dialogue turns for the LLM
  const formattedDialogue: Array<{ role: 'user' | 'assistant'; content: string }> = messages
    .slice(-12)
    .filter(m => m.body && m.body.trim().length > 0)
    .map(m => ({
      role: m.fromMe ? 'assistant' : 'user',
      content: m.body.trim(),
    }));

  // Resolve LLM config (per-bot or global fallback)
  const llmConfig = config.llmConfig || getGlobalLlmConfig();

  // Try LLM API call if provider is configured
  if (llmConfig.provider !== 'offline' && (llmConfig.apiKey || llmConfig.provider === 'ollama')) {
    const llmResponse = await callLlmChatApi(systemInstructions, formattedDialogue, llmConfig);
    if (llmResponse) {
      return llmResponse;
    }
  }

  // Fallback: Built-in Smart Neural Generator with Memory Tracking
  return buildSmartRoleResponse(lastQuery, config, isWithin, memory);
}

/** Built-in smart contextual response generator by role, memory & knowledge sources */
function buildSmartRoleResponse(
  query: string,
  config: ChatAiConfig,
  isWithin: boolean,
  memory: ConversationMemory,
): string {
  const q = query.toLowerCase();
  const biz = config.businessName || 'WiFi Solution Pro';
  const role = config.role;
  const roleDef = AI_ROLES[role] || AI_ROLES.support;
  const roleName = role === 'custom' && config.customRoleName?.trim() ? config.customRoleName.trim() : roleDef.name;
  const clientGreeting = memory.customerName ? ` ${memory.customerName}` : '';
  const ticketRef = memory.ticketId ? `[Ticket #${memory.ticketId}]` : `[Ticket #ST-${Math.floor(1000 + Math.random() * 9000)}]`;

  let header = '';
  if (!isWithin && config.schedule.enabled) {
    header = '*(Aviso: Fuera de horario de atención)*\n\n';
  }

  // Check if user is asking about prices and we have attached price documents/lists
  const isAskingPrice = /precio|costo|cuanto|cuánto|tarifa|planes|paquete|cotiza|valor/i.test(q);
  const priceKnowledge = isAskingPrice ? extractPricesFromKnowledge(query, config) : null;

  // If price files are attached and user asks about prices:
  if (isAskingPrice && priceKnowledge) {
    if (role === 'sales') {
      return `${header}🔥 **¡Lista de Precios y Planes Disponibles - ${biz}!**\n\n${priceKnowledge}\n\n📍 **${clientGreeting ? `${clientGreeting}, ¿en qué zona te encuentras?` : '¿En qué zona o dirección te encuentras?'}** Indícanos tu ubicación para verificar cobertura y coordinar tu instalación de inmediato con precio congelado. 🚀`;
    }
    return `${header}📋 **Tarifas y Precios Disponibles - ${biz}:**\n\n${priceKnowledge}\n\n¿Deseas contratar alguno de estos planes o consultar alguna duda adicional? Te atiende tu asesor de **${roleName}**.`;
  }

  // Check if user is asking for general documentation / FAQs and we have attached docs
  if (config.documents && config.documents.length > 0) {
    for (const doc of config.documents) {
      if (!doc.isPriceList) {
        const docWords = doc.content.toLowerCase().split(/\s+/);
        const matches = docWords.some(w => w.length > 4 && q.includes(w));
        if (matches && (q.includes('como') || q.includes('requisito') || q.includes('manual') || q.includes('guia') || q.includes('politica') || q.includes('servicio'))) {
          return `${header}📄 **Información según nuestro documento *"${doc.name}"*:**\n\n${doc.content.slice(0, 500)}...\n\n¿Necesitas mayor detalle sobre este tema? Estoy a tu disposición.`;
        }
      }
    }
  }

  // Check if we have attached URLs
  if (config.urls && config.urls.length > 0 && (q.includes('pagina') || q.includes('web') || q.includes('link') || q.includes('enlace') || q.includes('catalogo') || q.includes('sitio'))) {
    const urlsList = config.urls.map(u => `• **${u.title || 'Enlace Oficial'}:** ${u.url}`).join('\n');
    return `${header}🌐 **Enlaces y Recursos Oficiales - ${biz}:**\n\n${urlsList}\n\nAllí encontrarás nuestro catálogo completo y más información actualizada.`;
  }

  // Greetings
  if (q.includes('hola') || q.includes('buenos') || q.includes('buenas') || q === 'hi' || q === 'buenas tardes' || q === 'buenos dias') {
    switch (role) {
      case 'support':
        return `${header}¡Hola${clientGreeting}! 👋 Te saluda el área de **Soporte Técnico Especializado** de ${biz}.\n\nHe abierto un número de seguimiento para tu caso: **${ticketRef}**.\n\n¿Qué falla o inconveniente estás experimentando con tu servicio de internet? Cuéntame para diagnosticarlo y resolverlo paso a paso.`;
      case 'sales':
        return `${header}¡Hola${clientGreeting}! Bienvenido a ${biz} 🚀.\n\nSoy tu **Asesor de Ventas y Contrataciones**. ¿Estás interesado en contratar nuestro servicio de Fibra Óptica de ultra velocidad, cambiarte de plan o conocer nuestras promociones con instalación express?`;
      case 'customer_care':
        return `${header}¡Hola${clientGreeting}! Es un gusto saludarte. Te damos una cordial bienvenida a ${biz}.\n\n¿En qué podemos orientarte hoy? Estamos a tu disposición para información general, trámites o solicitudes.`;
      case 'billing':
        return `${header}¡Hola${clientGreeting}! Te comunicas con el departamento de **Cobranzas y Facturación** de ${biz}.\n\n¿Deseas consultar tu saldo actual, conocer las cuentas para pagar o reportar un comprobante de transferencia?`;
      case 'custom':
      default:
        return `${header}¡Hola${clientGreeting}! Bienvenido a **${biz}**. Te atiende tu **${roleName}**.\n\n${config.businessContext ? `${config.businessContext}\n\n` : ''}¿En qué puedo ayudarte el día de hoy?`;
    }
  }

  // 1. Role: Soporte Técnico (With Ticket Memory)
  if (role === 'support') {
    if (q.includes('lento') || q.includes('velocidad') || q.includes('caido') || q.includes('internet') || q.includes('wifi') || q.includes('falla') || q.includes('sin señal') || q.includes('no conecta')) {
      return `${header}📋 **[Seguimiento de Caso - ${ticketRef}]**
Vamos a resolver la falla de conectividad de inmediato${clientGreeting ? `, ${clientGreeting}` : ''}. Por favor sigue estos pasos de verificación:

1. 🔌 **Reinicio de ONT/Router:** Desconecta el cable de energía eléctrica de tu router por **30 segundos** y vuelve a conectarlo.
2. 💡 **Estado de las Luces:**
   • **PON:** ¿Está en verde fijo o parpadea?
   • **LOS:** ¿Está apagada o encendida en color rojo?
3. 📶 **Prueba de conexión:** Intenta conectarte por cable de red o desconéctate y vuelve a ingresar la clave WiFi.

👉 Por favor indícame cómo se encuentran las luces de tu equipo para emitir el reporte y enviar asistencia técnica si es necesario.`;
    }

    if (q.includes('roja') || q.includes('los') || q.includes('rojo') || q.includes('corte') || q.includes('parpadea')) {
      return `${header}🚨 **Alerta de Fibra Óptica - Caso ${ticketRef}:**
Si la luz **LOS está en rojo** o parpadeando, indica que no está llegando el haz de luz de fibra óptica hasta tu domicilio (posible desconexión o corte en la línea externa).

Por favor facilítanos:
1. 📝 **Nombre y Cédula del Titular${memory.customerName ? ` (Titular: ${memory.customerName})` : ''}.**
2. 📍 **Dirección exacta o punto de referencia${memory.zoneAddress ? ` (${memory.zoneAddress})` : ''}.**
3. 📞 **Número de teléfono de contacto alternativo.**

Asignaremos una **cuadrilla técnica de guardia** bajo el reporte **${ticketRef}** para validar tu tramo de fibra prioritariamente.`;
    }
  }

  // 2. Role: Ventas y Cotizaciones
  if (role === 'sales') {
    if (q.includes('precio') || q.includes('plan') || q.includes('costo') || q.includes('cuanto') || q.includes('megas') || q.includes('paquete') || q.includes('promocion') || q.includes('instalacion') || q.includes('oferta')) {
      return `${header}🔥 **¡Planes de Internet Fibra Óptica Simétrica ${biz}!**
Disfruta de la mejor conexión sin caídas, baja latencia para juegos y descargas ilimitadas:

🚀 **Nuestros Planes Disponibles:**
• **Plan Hogar Básico:** 50 Mbps ➔ Ideal para streaming HD y redes sociales ($25/mes).
• **Plan Familiar Pro (⭐ Más Vendido):** 100 Mbps ➔ Múltiples pantallas 4K, teletrabajo y videoconferencias ($35/mes).
• **Plan Ultra Gamer / Empresas:** 200 Mbps a 500 Mbps ➔ Máxima velocidad simétrica y soporte VIP ($50/mes).

🎁 **¡Promoción Activa!** Instalación con descuento especial y router Gigabit de alta potencia incluido.

📍 **¿En qué sector, calle o urbanización te encuentras?** Dinos tu zona para verificar disponibilidad técnica y agendar tu instalación de inmediato.`;
    }

    if (q.includes('sector') || q.includes('zona') || q.includes('calle') || q.includes('direccion') || q.includes('urb') || q.includes('barrio') || q.includes('ciudad') || q.includes('vivo en')) {
      return `${header}✅ **¡Excelente! Contamos con cobertura en tu zona.**

Podemos programar tu instalación técnica esta misma semana. Para reservarte el cupo de instalación y congelar el precio de la promoción:

1. 👤 **Nombre Completo:**
2. 🆔 **Cédula / RIF:**
3. 📍 **Dirección exacta de instalación:**
4. 🚀 **Plan elegido (50M, 100M o 200M+):**

¿Te gustaría que agendemos tu fecha de instalación hoy mismo?`;
    }

    if (q.includes('si') || q.includes('me interesa') || q.includes('quiero') || q.includes('contratar') || q.includes('agendar')) {
      return `${header}🎯 **¡Perfecto! Vamos a formalizar tu solicitud.**
Por favor compártenos tu nombre, cédula, dirección y número de teléfono. Un asesor de contrataciones se comunicará contigo de inmediato para coordinar la hora de llegada de nuestros técnicos. ¡Bienvenido a la mejor velocidad! 🚀`;
    }
  }

  // 3. Role: Cobranzas y Facturación
  if (role === 'billing') {
    if (q.includes('pagar') || q.includes('pago') || q.includes('transferencia') || q.includes('banco') || q.includes('cuenta') || q.includes('factura') || q.includes('pago movil') || q.includes('zelle') || q.includes('corte') || q.includes('reconexion')) {
      return `${header}💳 **Canales Oficiales de Pago - ${biz}:**

Disponemos de los siguientes métodos para tu comodidad:
• 📱 **Pago Móvil:** Banco Banesco / Mercantil / Provincial | Teléfono registrado.
• 🏦 **Transferencia Bancaria Nacional:** Cuentas corrientes a nombre de la empresa.
• 💵 **Zelle / Divisas Efectivo:** Solicita las coordenadas vigentes por este canal.

📤 **Reporte de Pago:**
Una vez transferido, envíanos por aquí:
1. Comprobante o número de referencia (captura).
2. Cédula del titular del servicio.

*La reconexión o acreditación se procesa de forma automática tras registrar el reporte.*`;
    }
  }

  // 4. Role: Atención al Cliente
  if (role === 'customer_care') {
    if (q.includes('horario') || q.includes('direccion') || q.includes('oficina') || q.includes('donde') || q.includes('sede') || q.includes('atencion')) {
      return `${header}🏢 **Horarios y Oficinas de Atención - ${biz}:**
• ⏰ **Horario de Oficina:** Lunes a Viernes de ${config.schedule.startHour} a ${config.schedule.endHour} y Sábados de 08:30 a 13:00.
• 📍 **Sede Principal:** Centro de Atención Comercial y Técnica.
• 💬 **Atención Digital:** WhatsApp y canales en línea 24/7.

¿Deseas realizar alguna solicitud especial o necesitas que te comuniquemos con un asesor humano?`;
    }
  }

  // 5. Custom Role / Fallback
  if (role === 'custom' && config.customRolePrompt) {
    return `${header}Hola${clientGreeting}, como **${roleName}** en **${biz}**:

He recibido tu mensaje: *"${query}"*.

${config.businessContext ? `📌 Información: ${config.businessContext}\n\n` : ''}${config.customRolePrompt ? `⚡ Directiva: ${config.customRolePrompt}\n\n` : ''}¿Hay algo específico en lo que te pueda colaborar?`;
  }

  return `${header}Gracias por comunicarte con **${biz}**${clientGreeting ? `, ${clientGreeting}` : ''}. Te atiende tu asesor de **${roleName}**.

He registrado tu consulta: *"${query}"*.

${config.businessContext ? `📌 **Información:** ${config.businessContext}\n\n` : ''}Si deseas asistencia directa con un operador humano o información específica, indícanoslo y te atenderemos con gusto.`;
}
