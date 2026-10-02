// API Endpoints Integration Service for WhatsApp Automation & Dynamic Queries

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ApiEndpointParam {
  key: string;
  value: string;
  description?: string;
}

export interface ApiEndpointHeader {
  key: string;
  value: string;
}

export interface ApiEndpointConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  roleAffiliation?: string; // 'all' | 'billing' | 'support' | 'sales' | 'customer_care'
  keywords: string[]; // e.g. ["saldo", "deuda", "factura", "cuanto debo", "balance", "pagar"]
  method: HttpMethod;
  url: string; // e.g. "https://api.miempresa.com/v1/clientes/{phone}/saldo" or "https://api.miempresa.com/v1/saldo"
  headers: ApiEndpointHeader[];
  bodyType?: 'none' | 'json' | 'form';
  bodyContent?: string; // e.g. '{"phone": "{phone}", "cedula": "{cedula}"}'
  queryParams?: ApiEndpointParam[];
  timeoutMs?: number; // default 8000ms
  
  // Response handling
  responseTemplate: string; // WhatsApp formatted template with variables e.g. "💳 *Hola {cliente_nombre}*...\nSaldo: ${saldo}"
  fallbackMessage: string; // Message sent when API returns 404, 500 or error
  
  // Interactive WhatsApp buttons (poll options)
  buttons?: Array<{ text: string; value: string }>;
  
  // Simulation / Mock response for testing or offline demo
  mockResponseJson?: string;
  enableMockFallback?: boolean;

  // Stats
  totalExecutions?: number;
  lastExecutedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'openwa_custom_api_endpoints';

export const DEFAULT_ENDPOINTS: ApiEndpointConfig[] = [
  {
    id: 'ep_billing_balance',
    name: '💳 Consulta de Saldo y Facturación',
    description: 'Consulta el saldo pendiente, fecha de corte y estatus del servicio de internet del cliente.',
    enabled: true,
    roleAffiliation: 'billing',
    keywords: ['saldo', 'deuda', 'cuanto debo', 'mi factura', 'facturacion', 'factura', 'estado de cuenta', 'balance', 'debo', 'corte'],
    method: 'GET',
    url: 'https://api.wifisolutionpro.com/v1/billing/balance?phone={phone}&cedula={cedula}',
    headers: [
      { key: 'Accept', value: 'application/json' },
      { key: 'X-API-Key', value: 'wsp_live_99a8b7c6d5e4f3' },
    ],
    bodyType: 'none',
    queryParams: [
      { key: 'phone', value: '{phone}', description: 'Número de WhatsApp del cliente' },
      { key: 'cedula', value: '{cedula}', description: 'Cédula o DNI extraído' },
    ],
    timeoutMs: 8000,
    responseTemplate: `💳 *Estado de Cuenta - {empresa}* 🌐
Hola *{cliente_nombre}*, aquí tienes el detalle de tu servicio de internet:

• 👤 *Titular:* {cliente_nombre}
• 🆔 *Cédula / Contrato:* {cedula_cliente}
• 📦 *Plan Contratado:* {plan_nombre} ({plan_velocidad})
• 💰 *Saldo Pendiente:* *${'{saldo_pendiente}'} USD* (Bs. {saldo_bs})
• 📅 *Fecha de Vencimiento / Corte:* {fecha_corte}
• ⚡ *Estatus del Servicio:* {estatus_servicio}

👉 *Para reportar tu pago:* Envía el comprobante con la palabra *PAGAR*.
Si necesitas prórroga o asistencia técnica, responde a este chat.`,
    fallbackMessage: `⚠️ *No logramos encontrar un servicio activo* asociado a tu número *{phone}* o cédula en nuestra base de datos.

Por favor indícanos tu número de *Cédula de Identidad* o *Código de Contrato* para verificar tu cuenta manualmente con un asesor de Cobranzas.`,
    buttons: [
      { text: '💳 Reportar Pago', value: 'PAGAR' },
      { text: '📋 Métodos de Pago', value: 'METODOS_PAGO' },
      { text: '👨‍💼 Hablar con Asesor', value: 'ASESOR' },
    ],
    enableMockFallback: true,
    mockResponseJson: JSON.stringify(
      {
        status: 'success',
        data: {
          cliente_nombre: 'Carlos Mendoza',
          cedula_cliente: 'V-18.452.910',
          plan_nombre: 'Plan Familiar Fibra Pro',
          plan_velocidad: '100 Mbps Simétricos',
          saldo_pendiente: '35.00',
          saldo_bs: '1,470.00',
          fecha_corte: '25 de este mes',
          estatus_servicio: '🟢 Activo (Al Día)',
          direccion: 'Av. Las Palmas, Qta. Los Rosales',
        },
      },
      null,
      2,
    ),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ep_network_status',
    name: '📶 Diagnóstico de Conexión ONT / Fibra',
    description: 'Valida la potencia óptica (dBm), estado de la ONT y tráfico en tiempo real en la OLT.',
    enabled: true,
    roleAffiliation: 'support',
    keywords: ['estado del servicio', 'estado conexion', 'diagnostico', 'potencia', 'ont', 'olt', 'falla de internet', 'verificar linea'],
    method: 'GET',
    url: 'https://api.wifisolutionpro.com/v1/network/ont-status?phone={phone}',
    headers: [
      { key: 'Accept', value: 'application/json' },
      { key: 'Authorization', value: 'Bearer wsp_token_sec_8841' },
    ],
    bodyType: 'none',
    timeoutMs: 8000,
    responseTemplate: `🛠️ *Diagnóstico Técnico de Red - {empresa}* 🌐
Resultado de verificación automática para tu línea:

• 🔌 *Equipo ONT:* {ont_modelo} (MAC: {ont_mac})
• 💡 *Potencia Óptica Recibida:* *{potencia_dbm} dBm* ({calidad_senal})
• 📊 *Estado Operativo:* {estado_ont}
• 🌐 *IP Asignada:* {ip_publica}
• ⏱️ *Tiempo en Línea:* {uptime}

{recomendacion_tecnica}`,
    fallbackMessage: `⚠️ No se pudo realizar el diagnóstico automático en este momento. Por favor verifica que tu módem/router esté encendido y con la luz PON en verde.`,
    buttons: [
      { text: '🔄 Reiniciar Router', value: 'REINICIAR_MODEM' },
      { text: '🚨 Reportar Falla Técnica', value: 'FALLA_LOS' },
    ],
    enableMockFallback: true,
    mockResponseJson: JSON.stringify(
      {
        status: 'success',
        data: {
          ont_modelo: 'Huawei HG8546M Gigabit',
          ont_mac: 'E4:68:A3:21:9B:40',
          potencia_dbm: '-19.45',
          calidad_senal: '🟢 Óptima (-15 a -24 dBm)',
          estado_ont: '🟢 Online / Sincronizado',
          ip_publica: '190.202.88.114',
          uptime: '14 días, 6 horas',
          recomendacion_tecnica: '✅ El tramo de fibra óptica y niveles de luz están dentro del rango óptimo. Si experimentas lentitud, verifica que no tengas descargas masivas o reinicia el WiFi.',
        },
      },
      null,
      2,
    ),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ep_support_tickets',
    name: '🎫 Consulta de Tickets de Soporte',
    description: 'Consulta el estatus de reportes técnicos o visitas domiciliarias activas.',
    enabled: true,
    roleAffiliation: 'support',
    keywords: ['ticket', 'mi reporte', 'estatus ticket', 'estado reporte', 'cuadrilla', 'cuando vienen'],
    method: 'GET',
    url: 'https://api.wifisolutionpro.com/v1/support/tickets?phone={phone}',
    headers: [{ key: 'Accept', value: 'application/json' }],
    bodyType: 'none',
    timeoutMs: 8000,
    responseTemplate: `🎫 *Seguimiento de Reporte Técnico - {empresa}*
Información de tu ticket más reciente:

• 📋 *Ticket N°:* #{ticket_id}
• 📅 *Fecha de Apertura:* {ticket_fecha}
• 🚨 *Motivo:* {ticket_motivo}
• ⚡ *Estatus:* *{ticket_estatus}*
• 👷 *Cuadrilla Asignada:* {ticket_tecnico}
• ⏰ *Horario Estimado:* {ticket_horario}

Te mantendremos notificado cuando la cuadrilla esté en camino a tu domicilio.`,
    fallbackMessage: `ℹ️ No encontramos tickets de soporte abiertos asociados a tu número de teléfono. Si presentas alguna falla de conexión, descríbenosla para generar tu reporte de inmediato.`,
    buttons: [
      { text: '➕ Abrir Nuevo Ticket', value: 'NUEVO_REPORTE' },
      { text: '👨‍💼 Contactar Soporte', value: 'SOPORTE_HUMANO' },
    ],
    enableMockFallback: true,
    mockResponseJson: JSON.stringify(
      {
        status: 'success',
        data: {
          ticket_id: 'ST-9482',
          ticket_fecha: 'Hoy, 10:15 AM',
          ticket_motivo: 'Atenuación de señal / luz LOS roja',
          ticket_estatus: '🟡 En Ruta / Asignado',
          ticket_tecnico: 'Cuadrilla 4 (Téc. Roberto Gómez)',
          ticket_horario: 'Hoy entre 2:00 PM y 4:30 PM',
        },
      },
      null,
      2,
    ),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ep_report_payment',
    name: '📝 Registro de Reporte de Pago',
    description: 'Registra un pago móvil o transferencia directamente en el sistema de facturación.',
    enabled: true,
    roleAffiliation: 'billing',
    keywords: ['reportar pago', 'pague', 'listo el pago', 'ya transferi', 'comprobante de pago', 'referencia'],
    method: 'POST',
    url: 'https://api.wifisolutionpro.com/v1/payments/report',
    headers: [
      { key: 'Content-Type', value: 'application/json' },
      { key: 'Accept', value: 'application/json' },
    ],
    bodyType: 'json',
    bodyContent: JSON.stringify(
      {
        phone: '{phone}',
        cedula: '{cedula}',
        referencia: '{referencia}',
        banco: '{banco}',
        monto: '{monto}',
        raw_message: '{query}',
      },
      null,
      2,
    ),
    timeoutMs: 8000,
    responseTemplate: `✅ *¡Reporte de Pago Registrado con Éxito! - {empresa}* 💳

• 📋 *N° de Confirmación:* #{recibo_id}
• 🆔 *Cédula:* {cedula}
• 🔢 *Referencia:* {referencia}
• 💰 *Monto Reportado:* {monto}
• ⏳ *Estatus:* *{estatus_pago}*

Nuestro sistema automatizado valida la transacción en minutos. Una vez confirmada por el banco, se actualizará tu saldo y recibirás tu factura digital. ¡Muchas gracias por tu pago!`,
    fallbackMessage: `⚠️ Recibimos tu reporte de pago. Un operador de cobranzas validará la referencia a la brevedad posible.`,
    buttons: [
      { text: '💳 Consultar Saldo', value: 'SALDO' },
      { text: '📄 Solicitar Factura', value: 'FACTURA' },
    ],
    enableMockFallback: true,
    mockResponseJson: JSON.stringify(
      {
        status: 'success',
        data: {
          recibo_id: 'REC-88301',
          cedula: 'V-18452910',
          referencia: '74829104',
          monto: '$35.00 USD / Bs. 1,470.00',
          estatus_pago: '🟢 Verificado Automáticamente',
        },
      },
      null,
      2,
    ),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function getCustomApiEndpoints(): ApiEndpointConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ENDPOINTS));
      return DEFAULT_ENDPOINTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_ENDPOINTS;
  } catch {
    return DEFAULT_ENDPOINTS;
  }
}

export function saveCustomApiEndpoints(endpoints: ApiEndpointConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(endpoints));
  } catch (err) {
    console.error('[API Endpoints Service] Error saving endpoints to localStorage', err);
  }
}

export function saveOrUpdateEndpoint(endpoint: ApiEndpointConfig): ApiEndpointConfig[] {
  const all = getCustomApiEndpoints();
  const index = all.findIndex(e => e.id === endpoint.id);
  let updated: ApiEndpointConfig[];
  if (index >= 0) {
    updated = [...all];
    updated[index] = { ...endpoint, updatedAt: new Date().toISOString() };
  } else {
    updated = [{ ...endpoint, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...all];
  }
  saveCustomApiEndpoints(updated);
  return updated;
}

export function deleteEndpoint(endpointId: string): ApiEndpointConfig[] {
  const all = getCustomApiEndpoints();
  const filtered = all.filter(e => e.id !== endpointId);
  saveCustomApiEndpoints(filtered);
  return filtered;
}

export function toggleEndpointEnabled(endpointId: string, enabled: boolean): ApiEndpointConfig[] {
  const all = getCustomApiEndpoints();
  const updated = all.map(e => (e.id === endpointId ? { ...e, enabled, updatedAt: new Date().toISOString() } : e));
  saveCustomApiEndpoints(updated);
  return updated;
}

// Extraction helpers for variables from message & context
export interface ExtractedQueryContext {
  phone: string; // e.g. "584121234567"
  cleanPhone: string; // e.g. "04121234567" or "4121234567"
  chatId: string; // e.g. "584121234567@c.us"
  query: string; // User raw text
  cedula: string; // Extracted V-12345678 or numbers
  referencia: string; // Extracted bank ref
  monto: string; // Extracted amount
  banco: string; // Extracted bank
  businessName: string;
}

export function extractContextFromMessage(
  rawQuery: string,
  chatId: string,
  businessName: string = 'WiFi Solution Pro',
): ExtractedQueryContext {
  const text = rawQuery || '';
  const cleanChat = chatId ? chatId.replace(/@c\.us|@s\.whatsapp\.net|@g\.us/gi, '') : '';
  const cleanPhone = cleanChat.replace(/^[0-9]{2}(412|414|424|416|426)/, '0$1');

  // Extract Cédula / DNI patterns e.g. "V-12345678", "V12345678", "cedula 18452910", "ci 12345678", or 6-9 consecutive digits
  let cedula = '';
  const cedulaRegex = /(?:v|e|j|ci|cédula|cedula|dni|rif)?[\s.:-]*([0-9]{6,9})\b/i;
  const cedMatch = text.match(cedulaRegex);
  if (cedMatch && cedMatch[1]) {
    cedula = `V-${cedMatch[1]}`;
  }

  // Extract reference number (last 4 to 8 digits)
  let referencia = '';
  const refMatch = text.match(/(?:ref|referencia|ref\.|pago|transferencia|comprobante)[\s.:#-]*([0-9]{4,12})/i);
  if (refMatch && refMatch[1]) {
    referencia = refMatch[1];
  }

  // Extract money / amount
  let monto = '';
  const amountMatch = text.match(/(?:[$|bs|bs\.]\s*([0-9]+(?:[.,][0-9]{2})?))|(([0-9]+(?:[.,][0-9]{2})?)\s*(?:\$|usd|dolares|bolivares|bs))/i);
  if (amountMatch) {
    monto = amountMatch[1] || amountMatch[2] || '';
  }

  // Extract bank
  let banco = '';
  const bankMatch = text.match(/\b(banesco|mercantil|provincial|venezuela|bancaribe|bnc|pago movil|zelle)\b/i);
  if (bankMatch) {
    banco = bankMatch[1].toUpperCase();
  }

  return {
    phone: cleanChat || '584121234567',
    cleanPhone: cleanPhone || cleanChat || '04121234567',
    chatId: chatId || '584121234567@c.us',
    query: text,
    cedula: cedula || 'V-18452910',
    referencia: referencia || '74829104',
    monto: monto ? `$${monto}` : '$35.00',
    banco: banco || 'BANESCO',
    businessName,
  };
}

/** Flatten a nested JSON object to dot notation e.g. { data: { saldo: 20 } } -> { "data.saldo": 20, "saldo": 20 } */
export function flattenJsonObject(obj: any, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {};
  if (!obj || typeof obj !== 'object') return result;

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenJsonObject(value, fullKey));
      // Also expose direct top-level key alias for convenience
      if (prefix === 'data' || prefix === 'response' || prefix === 'result') {
        result[key] = value;
      }
    } else {
      result[fullKey] = value;
      // Expose basename if under 'data' or 'result'
      if (prefix === 'data' || prefix === 'result' || prefix === 'response' || prefix === 'client' || prefix === 'cliente') {
        result[key] = value;
      }
    }
  }
  return result;
}

/** Replace placeholders `{var}` in a template string with actual values */
export function interpolateVariables(template: string, vars: Record<string, any>): string {
  if (!template) return '';
  return template.replace(/\{([^{}]+)\}/g, (match, key) => {
    const trimmedKey = key.trim();
    if (vars[trimmedKey] !== undefined && vars[trimmedKey] !== null) {
      return String(vars[trimmedKey]);
    }
    // Try lower case
    const lowerKey = trimmedKey.toLowerCase();
    for (const [k, v] of Object.entries(vars)) {
      if (k.toLowerCase() === lowerKey && v !== undefined && v !== null) {
        return String(v);
      }
    }
    return match;
  });
}

export interface EndpointExecutionResult {
  success: boolean;
  statusCode?: number;
  data?: any;
  rawResponse?: string;
  formattedMessage: string;
  isMock: boolean;
  endpointName: string;
  durationMs: number;
  poll?: {
    name: string;
    options: string[];
  };
  error?: string;
}

/** Execute an API Endpoint (with real fetch or mock fallback) */
export async function executeApiEndpoint(
  endpoint: ApiEndpointConfig,
  context: ExtractedQueryContext,
): Promise<EndpointExecutionResult> {
  const startTime = Date.now();
  const contextVars: Record<string, any> = {
    phone: context.phone,
    cleanPhone: context.cleanPhone,
    chatId: context.chatId,
    query: context.query,
    cedula: context.cedula,
    referencia: context.referencia,
    monto: context.monto,
    banco: context.banco,
    empresa: context.businessName,
  };

  // Interpolate URL
  const targetUrl = interpolateVariables(endpoint.url, contextVars);

  // Prepare Headers
  const headersRecord: Record<string, string> = {};
  if (endpoint.headers && endpoint.headers.length > 0) {
    endpoint.headers.forEach(h => {
      if (h.key && h.value) {
        headersRecord[h.key] = interpolateVariables(h.value, contextVars);
      }
    });
  }

  // Prepare Body
  let bodyPayload: string | undefined = undefined;
  if ((endpoint.method === 'POST' || endpoint.method === 'PUT') && endpoint.bodyContent) {
    bodyPayload = interpolateVariables(endpoint.bodyContent, contextVars);
  }

  let fetchSuccess = false;
  let responseData: any = null;
  let rawResponse = '';
  let statusCode = 200;
  let isMock = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), endpoint.timeoutMs || 8000);

    const res = await fetch(targetUrl, {
      method: endpoint.method,
      headers: headersRecord,
      body: bodyPayload,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    statusCode = res.status;
    rawResponse = await res.text();

    try {
      responseData = JSON.parse(rawResponse);
    } catch {
      responseData = { text: rawResponse };
    }

    if (res.ok) {
      fetchSuccess = true;
    }
  } catch (err: any) {
    // If real request fails (e.g. CORS, offline or endpoint is a demo URL), use mock if enabled
    if (endpoint.enableMockFallback && endpoint.mockResponseJson) {
      try {
        responseData = JSON.parse(endpoint.mockResponseJson);
        rawResponse = endpoint.mockResponseJson;
        fetchSuccess = true;
        isMock = true;
        statusCode = 200;
      } catch {
        fetchSuccess = false;
      }
    } else {
      fetchSuccess = false;
    }
  }

  const durationMs = Date.now() - startTime;

  // Format response message
  let formattedMessage = '';
  if (fetchSuccess && responseData) {
    const flatData = flattenJsonObject(responseData);
    const combinedVars = { ...contextVars, ...flatData };
    formattedMessage = interpolateVariables(endpoint.responseTemplate, combinedVars);
  } else {
    formattedMessage = interpolateVariables(endpoint.fallbackMessage || 'Lo sentimos, el servicio no está disponible en este momento.', contextVars);
  }

  // Prepare interactive WhatsApp poll buttons if configured
  let poll: { name: string; options: string[] } | undefined = undefined;
  if (endpoint.buttons && endpoint.buttons.length >= 2) {
    poll = {
      name: `🔘 Opciones disponibles (${context.businessName}):`,
      options: endpoint.buttons.map(b => b.text),
    };
  }

  // Update total executions counter
  try {
    const all = getCustomApiEndpoints();
    const ep = all.find(e => e.id === endpoint.id);
    if (ep) {
      ep.totalExecutions = (ep.totalExecutions || 0) + 1;
      ep.lastExecutedAt = new Date().toISOString();
      saveCustomApiEndpoints(all);
    }
  } catch {}

  return {
    success: fetchSuccess,
    statusCode,
    data: responseData,
    rawResponse,
    formattedMessage,
    isMock,
    endpointName: endpoint.name,
    durationMs,
    poll,
  };
}

/** Check if incoming message matches any enabled custom API endpoint */
export function findMatchingApiEndpoint(
  query: string,
  role?: string,
): ApiEndpointConfig | null {
  if (!query || !query.trim()) return null;
  const q = query.toLowerCase().trim();
  const endpoints = getCustomApiEndpoints().filter(e => e.enabled);

  for (const ep of endpoints) {
    // Check role affiliation if specified
    if (role && ep.roleAffiliation && ep.roleAffiliation !== 'all' && ep.roleAffiliation !== role) {
      continue;
    }

    // Match keywords
    const matchesKeyword = ep.keywords.some(kw => {
      const k = kw.toLowerCase().trim();
      if (!k) return false;
      const regex = new RegExp(`\\b${k.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      return regex.test(q) || q === k || (k.length > 3 && q.includes(k));
    });

    if (matchesKeyword) {
      return ep;
    }
  }

  return null;
}
