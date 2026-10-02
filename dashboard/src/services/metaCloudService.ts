/**
 * Meta WhatsApp Cloud API Service
 * Handles integration with Meta Graph API, Webhook verification,
 * fetching official templates from WhatsApp Business Account,
 * and dispatching template messages via the Meta-affiliated number.
 */

export interface MetaGraphTemplate {
  id?: string;
  name: string;
  status?: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED';
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language?: string;
  components?: Array<{
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    text?: string;
    example?: any;
    buttons?: Array<{
      type: string;
      text: string;
      url?: string;
      phone_number?: string;
    }>;
  }>;
}

export interface MetaCloudCredentials {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  verifyToken: string;
  webhookUrl?: string;
  apiVersion?: string;
  verified?: boolean;
  lastSync?: string;
  phoneNumberDisplay?: string;
  businessName?: string;
}

const STORAGE_KEY = 'openwa_meta_cloud_api_credentials_v1';

export const DEFAULT_META_CONFIG: MetaCloudCredentials = {
  phoneNumberId: '',
  wabaId: '',
  accessToken: '',
  verifyToken: 'openwa_meta_webhook_token_' + Math.random().toString(36).substring(2, 8),
  webhookUrl: `${window.location.origin}/api/ingress/whatsapp-cloud/default/events`,
  apiVersion: 'v20.0',
  verified: false,
};

/**
 * Get stored Meta Cloud API configuration
 */
export function getMetaCloudConfig(): MetaCloudCredentials {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_META_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_META_CONFIG,
      ...parsed,
      webhookUrl: parsed.webhookUrl || `${window.location.origin}/api/ingress/whatsapp-cloud/default/events`,
    };
  } catch {
    return DEFAULT_META_CONFIG;
  }
}

/**
 * Save Meta Cloud API configuration
 */
export function saveMetaCloudConfig(config: MetaCloudCredentials): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Error saving Meta Cloud credentials:', err);
  }
}

/**
 * Validate and test connection with Meta Graph API
 * Checks Phone Number ID and retrieves verification status and display name
 */
export async function testMetaCloudConnection(
  customConfig?: MetaCloudCredentials,
): Promise<{ success: boolean; data?: any; error?: string }> {
  const cfg = customConfig || getMetaCloudConfig();
  if (!cfg.phoneNumberId || !cfg.accessToken) {
    return {
      success: false,
      error: 'Se requiere Phone Number ID y Access Token de Meta Graph API.',
    };
  }

  const version = cfg.apiVersion || 'v20.0';
  const url = `https://graph.facebook.com/${version}/${encodeURIComponent(cfg.phoneNumberId)}?fields=id,verified_name,display_phone_number,quality_rating,code_verification_status`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cfg.accessToken.trim()}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message || `Error ${res.status}: Fallo de autenticación en Meta.`,
        data,
      };
    }

    // Update verified state in stored config
    const updated = {
      ...cfg,
      verified: true,
      phoneNumberDisplay: data.display_phone_number || cfg.phoneNumberDisplay,
      businessName: data.verified_name || cfg.businessName,
      lastSync: new Date().toISOString(),
    };
    saveMetaCloudConfig(updated);

    return { success: true, data };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error de red al conectar con Meta Graph API.',
    };
  }
}

/**
 * Fetch official message templates approved in WhatsApp Business Account (WABA)
 */
export async function fetchMetaCloudTemplates(
  customConfig?: MetaCloudCredentials,
): Promise<{ success: boolean; templates?: any[]; error?: string }> {
  const cfg = customConfig || getMetaCloudConfig();
  if (!cfg.wabaId || !cfg.accessToken) {
    return {
      success: false,
      error: 'Se requiere el WhatsApp Business Account ID (WABA ID) y Access Token.',
    };
  }

  const version = cfg.apiVersion || 'v20.0';
  const url = `https://graph.facebook.com/${version}/${encodeURIComponent(cfg.wabaId)}/message_templates?limit=100`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cfg.accessToken.trim()}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message || `Error ${res.status} al consultar plantillas en Meta.`,
      };
    }

    return {
      success: true,
      templates: data.data || [],
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'No se pudieron consultar las plantillas de Meta.',
    };
  }
}

/**
 * Send an official Meta Cloud API template message to a recipient phone number
 */
export async function sendMetaCloudTemplate(
  toPhone: string,
  templateName: string,
  languageCode: string = 'es',
  components: any[] = [],
  customConfig?: MetaCloudCredentials,
): Promise<{ success: boolean; messageId?: string; error?: string; rawResponse?: any }> {
  const cfg = customConfig || getMetaCloudConfig();
  if (!cfg.phoneNumberId || !cfg.accessToken) {
    return {
      success: false,
      error: 'Credenciales de Meta incompletas. Configura Phone Number ID y Access Token.',
    };
  }

  const version = cfg.apiVersion || 'v20.0';
  const url = `https://graph.facebook.com/${version}/${encodeURIComponent(cfg.phoneNumberId)}/messages`;

  // Clean phone number (digits only)
  const cleanPhone = toPhone.replace(/\D/g, '');
  if (!cleanPhone) {
    return { success: false, error: 'El número de teléfono receptor es inválido.' };
  }

  const payload: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode || 'es',
      },
    },
  };

  if (components && components.length > 0) {
    payload.template.components = components;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.accessToken.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message || `Error ${res.status} al enviar plantilla por Meta Cloud API.`,
        rawResponse: data,
      };
    }

    const messageId = data.messages?.[0]?.id;
    return {
      success: true,
      messageId,
      rawResponse: data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error de conexión enviando plantilla a Meta.',
    };
  }
}

/**
 * Transforms template parameters to Meta Graph API components format
 */
export function buildMetaComponentsFromVars(
  headerType: string,
  mediaUrl: string,
  headerText: string,
  bodyVars: Record<string, string>,
): any[] {
  const components: any[] = [];

  // Header Component
  if (headerType === 'image' && mediaUrl) {
    components.push({
      type: 'header',
      parameters: [{ type: 'image', image: { link: mediaUrl } }],
    });
  } else if (headerType === 'video' && mediaUrl) {
    components.push({
      type: 'header',
      parameters: [{ type: 'video', video: { link: mediaUrl } }],
    });
  } else if (headerType === 'document' && mediaUrl) {
    components.push({
      type: 'header',
      parameters: [{ type: 'document', document: { link: mediaUrl } }],
    });
  } else if (headerType === 'text' && headerText) {
    components.push({
      type: 'header',
      parameters: [{ type: 'text', text: headerText }],
    });
  }

  // Body Component parameters
  const varKeys = Object.keys(bodyVars || {});
  if (varKeys.length > 0) {
    // Sort keys if they are numeric like 1, 2, 3...
    const sorted = [...varKeys].sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });

    const bodyParams = sorted.map(k => ({
      type: 'text',
      text: String(bodyVars[k] ?? ''),
    }));

    components.push({
      type: 'body',
      parameters: bodyParams,
    });
  }

  return components;
}

/**
 * Validate Meta Webhook Challenge
 */
export function verifyMetaWebhookChallenge(
  mode: string,
  token: string,
  challenge: string,
  expectedToken?: string,
): { valid: boolean; challenge?: string } {
  const expected = expectedToken || getMetaCloudConfig().verifyToken;
  if (mode === 'subscribe' && token === expected) {
    return { valid: true, challenge };
  }
  return { valid: false };
}
