import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Copy,
  Loader2,
  Plus,
  Search,
  Trash2,
  Terminal,
  Check,
  Send,
  Sparkles,
  PenTool,
  Smartphone,
  X,
  Link,
  Phone,
  MessageSquare,
  Edit,
  Play,
  Volume2,
  Bookmark,
  Zap,
  ClipboardPaste,
  Upload,
  FileText,
  Smile,
  ChevronDown,
  Info,
  Globe,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  GitFork,
} from 'lucide-react';
import { RoleFlowBuilder } from '../components/flows/RoleFlowBuilder';
import { type MessageTemplate, type TemplatePayload, messageApi } from '../services/api';
import {
  getSessionAiConfig,
  saveSessionAiConfig,
  getDefaultTemplateTriggers,
  parseMetaTemplateInput,
  type TemplateTriggerMapping,
  type TriggerIntentType,
} from '../services/aiAssistant';
import {
  getMetaCloudConfig,
  saveMetaCloudConfig,
  testMetaCloudConnection,
  fetchMetaCloudTemplates,
  sendMetaCloudTemplate,
  buildMetaComponentsFromVars,
  type MetaCloudCredentials,
} from '../services/metaCloudService';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import {
  useCreateTemplateMutation,
  useDeleteTemplateMutation,
  useSessionsQuery,
  useTemplatesQuery,
  useUpdateTemplateMutation,
} from '../hooks/queries';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { copyToClipboard } from '../utils/clipboard';
import './Templates.css';

export type HeaderType = 'none' | 'text' | 'image' | 'video' | 'audio' | 'document';
export type MetaCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

export interface TemplateButton {
  id: string;
  type: 'URL' | 'PHONE_NUMBER' | 'QUICK_REPLY' | 'COPY_CODE';
  text: string;
  value: string;
}

export interface CustomTemplate {
  id: string;
  templateNumber?: number;
  name: string;
  category: MetaCategory;
  headerType: HeaderType;
  headerText: string;
  mediaUrl: string;
  body: string;
  footer: string;
  buttons: TemplateButton[];
  defaultVars: Record<string, string>;
  isLocalOnly?: boolean;
  source?: 'meta' | 'local';
  metaStatus?: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED';
  language?: string;
  intentType?: TriggerIntentType;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateForm {
  templateNumber?: number;
  name: string;
  category: MetaCategory;
  headerType: HeaderType;
  headerText: string;
  mediaUrl: string;
  body: string;
  footer: string;
  buttons: TemplateButton[];
  source?: 'meta' | 'local';
  intentType?: TriggerIntentType;
}

const emptyForm: TemplateForm = {
  templateNumber: 101,
  name: '',
  category: 'UTILITY',
  headerType: 'none',
  headerText: '',
  mediaUrl: '',
  body: '',
  footer: '',
  buttons: [],
  source: 'local',
  intentType: 'greeting',
};

export interface InspirationTemplate {
  id: string;
  name: string;
  category: 'soporte' | 'ventas' | 'facturacion' | 'cumpleanos' | 'vip' | 'general';
  categoryLabel: string;
  categoryIcon: string;
  metaCategory: MetaCategory;
  headerType: HeaderType;
  headerText?: string;
  mediaUrl?: string;
  body: string;
  footer: string;
  buttons?: TemplateButton[];
  defaultVars: Record<string, string>;
}

export const INSPIRATION_TEMPLATES: InspirationTemplate[] = [
  {
    id: 'insp_1',
    name: 'Credenciales de Acceso WiFi',
    category: 'soporte',
    categoryLabel: 'Soporte Técnico',
    categoryIcon: '🛠️',
    metaCategory: 'UTILITY',
    headerType: 'none',
    headerText: '🛠️ COMUNICADO DE SOPORTE TÉCNICO',
    body: 'Hola {{4}}, Administración WIFI SOLUTION\n\nLe informa sus datos de acceso al portal de clientes son los siguientes:\n\nUsuario ID: {{1}}\nClave del Portal: {{2}}\nFecha de pago: {{3}} de cada mes\n\nPara comunicarse con alguno de nuestros departamentos con solo enviar un mensaje de vuelta y seleccionar la opción que necesite.',
    footer: 'WiFi Solution Pro • Soporte Técnico',
    buttons: [
      { id: 'btn_p1', type: 'URL', text: 'Portal de Clientes', value: 'https://clientes.wifisolution.com' },
      { id: 'btn_p2', type: 'PHONE_NUMBER', text: 'Llamar a Soporte', value: '+584121234567' },
    ],
    defaultVars: { '1': '000001', '2': 'sdjfhgbsl', '3': '1', '4': 'Pedro Pérez' },
  },
  {
    id: 'insp_2',
    category: 'ventas',
    categoryLabel: 'Ventas & Promociones',
    categoryIcon: '🔥',
    metaCategory: 'MARKETING',
    name: 'Duplica tus Megas de Fibra',
    headerType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80',
    body: '¡Hola {{nombre}}! En {{empresa}} queremos premiar tu fidelidad: Duplica la velocidad de tu plan a {{plan_nuevo}} manteniendo tu tarifa actual durante los próximos {{meses}} meses.\n\n👉 Responde con la palabra MEGAS o pulsa el botón para activarlo hoy mismo.',
    footer: 'Promoción válida por tiempo limitado',
    buttons: [
      { id: 'b3', type: 'QUICK_REPLY', text: '🚀 Activar Promoción', value: 'ACTIVAR_MEGAS' },
      { id: 'b4', type: 'URL', text: 'Ver Planes Disponibles', value: 'https://wifisolution.com/planes' },
      { id: 'b4_c', type: 'COPY_CODE', text: 'Copiar Cupón Promo', value: 'MEGAS2026' },
    ],
    defaultVars: {
      nombre: 'María Paredes',
      empresa: 'WiFi Solution Pro',
      plan_nuevo: '200 Mbps Simétricos',
      meses: '3',
    },
  },
  {
    id: 'insp_3',
    category: 'facturacion',
    categoryLabel: 'Cobranzas & Facturación',
    categoryIcon: '💳',
    metaCategory: 'UTILITY',
    name: 'Aviso de Pago y Corte Próximo',
    headerType: 'text',
    headerText: '💳 ESTADO DE CUENTA Y CORTE',
    body: 'Estimado(a) {{nombre}}, le recordamos que su factura de internet vence el {{fecha_corte}} por un monto de {{monto}}.\n\nPara evitar la suspensión automática del servicio, por favor reporte su comprobante de pago por este medio.',
    footer: 'WiFi Solution Pro • Dpto. de Cobranzas',
    buttons: [
      { id: 'b5', type: 'URL', text: 'Pagar en Línea', value: 'https://wifisolution.com/pagos' },
      { id: 'b6', type: 'QUICK_REPLY', text: 'Enviar Comprobante', value: 'COMPROBANTE' },
    ],
    defaultVars: {
      nombre: 'Jesús Silva',
      fecha_corte: '15 del presente mes',
      monto: '$25.00 USD',
    },
  },
  {
    id: 'insp_4',
    category: 'cumpleanos',
    categoryLabel: 'Cumpleaños & Fidelización',
    categoryIcon: '🎂',
    metaCategory: 'MARKETING',
    name: 'Felicitación de Cumpleaños VIP',
    headerType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&q=80',
    body: 'Todo el equipo de {{empresa}} te desea un día extraordinario lleno de éxitos y bendiciones.\n\nComo regalo exclusivo por tu cumpleaños, hemos activado en tu enlace navegación ilimitada a máxima velocidad durante toda esta semana.',
    footer: 'De parte de tu familia WiFi Solution',
    buttons: [
      { id: 'b7', type: 'QUICK_REPLY', text: '🎉 ¡Muchas Gracias!', value: 'GRACIAS' },
      { id: 'b7_c', type: 'COPY_CODE', text: 'Código Regalo VIP', value: 'CUMPLE_VIP' },
    ],
    defaultVars: {
      nombre: 'Sofía Valero',
      empresa: 'WiFi Solution Pro',
    },
  },
  {
    id: 'insp_5',
    category: 'vip',
    categoryLabel: 'Video Tutorial de Configuración',
    categoryIcon: '🎥',
    metaCategory: 'UTILITY',
    name: 'Guía de Configuración Router',
    headerType: 'video',
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    body: 'Estimado(a) {{nombre}}, le compartimos el video explicativo paso a paso para cambiar el nombre y la clave de su red WiFi en el modelo {{modelo_router}}.',
    footer: 'Dpto. Técnico • WiFi Solution Pro',
    buttons: [
      { id: 'b8', type: 'URL', text: 'Manual en PDF', value: 'https://wifisolution.com/manual.pdf' },
    ],
    defaultVars: {
      nombre: 'Ing. Alejandro Ruiz',
      modelo_router: 'Huawei HG8145V5',
    },
  },
  {
    id: 'insp_6',
    category: 'general',
    categoryLabel: 'Audio Mensaje de Bienvenida',
    categoryIcon: '🎵',
    metaCategory: 'MARKETING',
    name: 'Audio de Bienvenida y Activación',
    headerType: 'audio',
    mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    body: '¡Bienvenido a la familia {{empresa}}, {{nombre}}! Escucha las recomendaciones de tu asesor para disfrutar al máximo tu conexión de {{plan}}.',
    footer: 'Atención al Cliente • WiFi Solution',
    buttons: [
      { id: 'b9', type: 'PHONE_NUMBER', text: 'Atención Telefónica', value: '+584121234567' },
    ],
    defaultVars: {
      nombre: 'Daniela Castro',
      empresa: 'WiFi Solution Pro',
      plan: 'Fibra Óptica 100M',
    },
  },
];

const LOCAL_TEMPLATES_KEY = 'openwa_local_custom_templates_v2';
const RICH_STORAGE_KEY = 'openwa_rich_templates_metadata';

function getLocalCustomTemplates(): CustomTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_TEMPLATES_KEY);
    if (!raw) {
      const seeded: CustomTemplate[] = INSPIRATION_TEMPLATES.map(t => ({
        id: `tpl_${t.id}`,
        name: t.name,
        category: t.metaCategory,
        headerType: t.headerType,
        headerText: t.headerText || '',
        mediaUrl: t.mediaUrl || '',
        body: t.body,
        footer: t.footer || '',
        buttons: t.buttons || [],
        defaultVars: t.defaultVars,
        isLocalOnly: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      localStorage.setItem(LOCAL_TEMPLATES_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalCustomTemplates(templates: CustomTemplate[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_TEMPLATES_KEY, JSON.stringify(templates));
  } catch (err) {
    console.error('Error saving local templates:', err);
  }
}

function getRichMetadata(sessionId: string, templateName: string): Partial<TemplateForm> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(RICH_STORAGE_KEY);
    if (!raw) return null;
    const store = JSON.parse(raw);
    const key = `${sessionId}:${templateName.trim()}`;
    return store[key] || null;
  } catch {
    return null;
  }
}

function saveRichMetadata(sessionId: string, form: TemplateForm) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(RICH_STORAGE_KEY);
    const store = raw ? JSON.parse(raw) : {};
    const key = `${sessionId}:${form.name.trim()}`;
    store[key] = {
      headerType: form.headerType,
      headerText: form.headerText,
      mediaUrl: form.mediaUrl,
      category: form.category,
      buttons: form.buttons,
    };
    localStorage.setItem(RICH_STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn('Failed to save rich template metadata:', err);
  }
}

function extractPlaceholders(template: { headerText?: string; header?: string | null; body: string; footer?: string | null }): string[] {
  const source = [template.headerText || template.header || '', template.body, template.footer || ''].filter(Boolean).join('\n');
  const matches = Array.from(source.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g), match => match[1]);
  const unique = Array.from(new Set(matches));
  return unique.sort((a, b) => {
    const numA = Number(a);
    const numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    if (!isNaN(numA)) return -1;
    if (!isNaN(numB)) return 1;
    return a.localeCompare(b);
  });
}

export function renderPreview(template: { headerText?: string; header?: string | null; body: string; footer?: string | null }, values: Record<string, string>): string {
  const rawHeader = template.headerText || template.header || '';
  return [rawHeader, template.body, template.footer]
    .filter(Boolean)
    .join('\n\n')
    .replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => values[key] || `{{${key}}}`);
}

export function getDefaultSampleValue(varKey: string): string {
  const k = (varKey || '').trim().toLowerCase();
  if (k === '1') return '000001';
  if (k === '2') return 'sdjfhgbsl';
  if (k === '3') return '1';
  if (k === '4') return 'Pedro Pérez';
  if (k === '5') return 'WiFi Solution Pro';
  if (k === 'nombre' || k === 'name' || k === 'cliente') return 'Pedro Pérez';
  if (k === 'usuario' || k === 'user' || k === 'id') return '000001';
  if (k === 'clave' || k === 'password' || k === 'pass') return 'sdjfhgbsl';
  if (k === 'fecha' || k === 'date') return '1 de cada mes';
  if (k === 'monto' || k === 'precio' || k === 'saldo') return '$25.00';
  if (k === 'empresa' || k === 'compania') return 'WIFI SOLUTION';
  if (k === 'ticket') return '#TK-1082';
  if (k === 'plan') return 'Fibra 200M';
  if (k === 'zona') return 'Sector Central';
  if (k === 'telefono' || k === 'phone') return '+584121234567';
  return '';
}

export function substituteVariables(text: string, values: Record<string, string>): string {
  if (!text) return '';
  return text.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => {
    if (values[key] !== undefined && values[key].trim() !== '') {
      return values[key];
    }
    const fallback = getDefaultSampleValue(key);
    return fallback || `{{${key}}}`;
  });
}

export function parseWhatsAppFormatting(text: string): React.ReactNode {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    const tokens: React.ReactNode[] = [];
    const pattern = /(```[\s\S]*?```|`[^`\n]+`|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let k = 0;

    while ((match = pattern.exec(line)) !== null) {
      if (match.index > lastIndex) {
        tokens.push(<React.Fragment key={`t-${k++}`}>{line.substring(lastIndex, match.index)}</React.Fragment>);
      }
      const raw = match[0];
      if (raw.startsWith('```') && raw.endsWith('```')) {
        tokens.push(<code key={`c-${k++}`} className="wa-code-block">{raw.slice(3, -3)}</code>);
      } else if (raw.startsWith('`') && raw.endsWith('`')) {
        tokens.push(<code key={`c-${k++}`} className="wa-inline-code">{raw.slice(1, -1)}</code>);
      } else if (raw.startsWith('*') && raw.endsWith('*')) {
        tokens.push(<strong key={`b-${k++}`}>{raw.slice(1, -1)}</strong>);
      } else if (raw.startsWith('_') && raw.endsWith('_')) {
        tokens.push(<em key={`i-${k++}`}>{raw.slice(1, -1)}</em>);
      } else if (raw.startsWith('~') && raw.endsWith('~')) {
        tokens.push(<s key={`s-${k++}`}>{raw.slice(1, -1)}</s>);
      }
      lastIndex = pattern.lastIndex;
    }

    if (lastIndex < line.length) {
      tokens.push(<React.Fragment key={`t-${k++}`}>{line.substring(lastIndex)}</React.Fragment>);
    }

    return (
      <React.Fragment key={`line-${lineIdx}`}>
        {tokens}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

export function formatCurrentTime(): string {
  try {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  } catch {
    return '8:47 pm';
  }
}

/** Converts lengthy URLs (especially YouTube) into clean, elegant short URLs */
export function formatCleanUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return `https://youtu.be/${v}`;
      if (parsed.pathname.startsWith('/shorts/')) {
        const id = parsed.pathname.split('/shorts/')[1]?.split('/')[0];
        if (id) return `https://youtu.be/${id}`;
      }
    }
  } catch {
    // Keep original URL on error
  }
  return url;
}

/** Extracts high-definition YouTube thumbnail image URL if a YouTube link is found */
export function extractYouTubeThumbnail(url: string): string | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }
  return null;
}

/** Formats the complete message payload for WhatsApp transmission matching the live preview */
export function buildFullWhatsAppFormattedText(
  template: {
    name?: string;
    headerType?: HeaderType;
    headerText?: string;
    header?: string | null;
    body: string;
    footer?: string | null;
    buttons?: TemplateButton[];
  },
  values: Record<string, string>,
  includeActionLinks = true,
): string {
  const parts: string[] = [];

  // 1. Text header (bold, prominent title)
  let header = (template.headerText || template.header || '').trim();
  if (!header && template.headerType === 'text' && template.name) {
    header = template.name.replace(/\[#\d+\]/g, '').trim();
  }
  if (header) {
    parts.push(`*${header}*`);
  }

  // 2. Body with variables substituted
  let body = template.body || '';
  body = body.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => values[key] || `{{${key}}}`);
  if (body.trim()) {
    parts.push(body.trim());
  }

  // 3. Footer (formatted in italic)
  if (template.footer?.trim()) {
    parts.push(`_${template.footer.trim()}_`);
  }

  // 4. Clickable Action Buttons styled as elegant WhatsApp Card Blocks
  if (includeActionLinks && template.buttons && template.buttons.length > 0) {
    const buttonBlocks: string[] = [];
    template.buttons.forEach((b) => {
      if (b.type === 'URL' && b.value) {
        const text = b.text.trim() || 'Ver Enlace Web';
        const cleanUrl = formatCleanUrl(b.value.trim());
        buttonBlocks.push(`> 🌐 *${text}*\n> ${cleanUrl}`);
      } else if (b.type === 'PHONE_NUMBER' && b.value) {
        const text = b.text.trim() || 'Llamar';
        const cleanNum = b.value.replace(/[^0-9+]/g, '');
        buttonBlocks.push(`> 📞 *${text}*\n> https://wa.me/${cleanNum.replace('+', '')}`);
      } else if (b.type === 'COPY_CODE' && b.value) {
        const text = b.text.trim() || 'Copiar Código';
        buttonBlocks.push(`> 📋 *${text}*\n> \`${b.value.trim()}\``);
      } else if (b.type === 'QUICK_REPLY' && b.text) {
        buttonBlocks.push(`> 💬 *${b.text.trim()}*`);
      }
    });
    if (buttonBlocks.length > 0) {
      parts.push(buttonBlocks.join('\n\n'));
    }
  }

  return parts.join('\n\n');
}

function buildOpenWaCurlSnippet(
  sessionId: string,
  chatId: string,
  form: TemplateForm,
  renderedText: string,
  vars: Record<string, string>,
): string {
  const apiKey = sessionStorage.getItem('openwa_api_key') || 'owa_k1_c781d47782561dbaf74bb17918e42fe39ff0f57264cab2afe3e3a43ff751da04';
  const targetPhone = chatId.replace(/[^0-9]/g, '') || '584121234567';
  const targetJid = `${targetPhone}@c.us`;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:2785';

  if (form.headerType === 'image' || form.headerType === 'video' || form.headerType === 'audio' || form.headerType === 'document') {
    const mediaPayload = {
      chatId: targetJid,
      url: form.mediaUrl.startsWith('data:') ? '[BASE64_IMAGE_DATA]' : (form.mediaUrl || 'https://via.placeholder.com/600x400.png'),
      caption: renderedText || form.body,
    };
    return `curl -X POST "${origin}/api/sessions/${sessionId || 'sesion-demostracion'}/messages/send-${form.headerType}" \\
  -H "accept: application/json" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey}" \\
  -d '${JSON.stringify(mediaPayload, null, 2).replace(/'/g, "'\\''")}'`;
  }

  const payload = {
    chatId: targetJid,
    templateName: form.name || 'plantilla-demo',
    vars: Object.keys(vars).length > 0 ? vars : { nombre: 'Carlos Mendoza', empresa: 'WiFi Solution Pro' },
  };

  return `curl -X POST "${origin}/api/sessions/${sessionId || 'sesion-demostracion'}/messages/send-template" \\
  -H "accept: application/json" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey}" \\
  -d '${JSON.stringify(payload, null, 2).replace(/'/g, "'\\''")}'`;
}

function buildMetaCloudCurlSnippet(
  form: TemplateForm,
  vars: Record<string, string>,
  targetPhone: string,
): string {
  const phone = targetPhone.replace(/[^0-9]/g, '') || '584121234567';
  const cleanName = (form.name || 'plantilla_meta').toLowerCase().replace(/[^a-z0-9_]/g, '_');

  const components: any[] = [];

  if (form.headerType === 'text' && form.headerText) {
    components.push({
      type: 'header',
      parameters: [{ type: 'text', text: form.headerText }],
    });
  } else if (form.headerType === 'image') {
    components.push({
      type: 'header',
      parameters: [{ type: 'image', image: { link: form.mediaUrl.startsWith('data:') ? 'https://example.com/image.jpg' : (form.mediaUrl || 'https://example.com/image.jpg') } }],
    });
  } else if (form.headerType === 'video') {
    components.push({
      type: 'header',
      parameters: [{ type: 'video', video: { link: form.mediaUrl || 'https://example.com/video.mp4' } }],
    });
  } else if (form.headerType === 'audio') {
    components.push({
      type: 'header',
      parameters: [{ type: 'audio', audio: { link: form.mediaUrl || 'https://example.com/audio.mp3' } }],
    });
  }

  const bodyParams = Object.keys(vars).map(k => ({
    type: 'text',
    text: vars[k] || `{{${k}}}`,
  }));

  if (bodyParams.length > 0) {
    components.push({
      type: 'body',
      parameters: bodyParams,
    });
  }

  if (form.buttons && form.buttons.length > 0) {
    form.buttons.forEach((b, idx) => {
      if (b.type === 'QUICK_REPLY') {
        components.push({
          type: 'button',
          sub_type: 'quick_reply',
          index: String(idx),
          parameters: [{ type: 'payload', payload: b.value || b.text }],
        });
      } else if (b.type === 'URL') {
        components.push({
          type: 'button',
          sub_type: 'url',
          index: String(idx),
          parameters: [{ type: 'text', text: b.value }],
        });
      } else if (b.type === 'PHONE_NUMBER') {
        components.push({
          type: 'button',
          sub_type: 'voice_call',
          index: String(idx),
          parameters: [{ type: 'text', text: b.value }],
        });
      } else if (b.type === 'COPY_CODE') {
        components.push({
          type: 'button',
          sub_type: 'copy_code',
          index: String(idx),
          parameters: [{ type: 'coupon_code', coupon_code: b.value || 'PROMO' }],
        });
      }
    });
  }

  const metaPayload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'template',
    template: {
      name: cleanName,
      language: { code: 'es' },
      components: components.length > 0 ? components : undefined,
    },
  };

  return `curl -X POST "https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages" \\
  -H "Authorization: Bearer EAAG..." \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(metaPayload, null, 2).replace(/'/g, "'\\''")}'`;
}

export function Templates() {
  useDocumentTitle('Plantillas de Mensajes | Meta WhatsApp Cloud API & Local');
  const { data: sessions = [] } = useSessionsQuery();
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [activeTab, setActiveTab] = useState<'meta-webhook' | 'editor' | 'my-templates' | 'gallery' | 'flow-builder'>('meta-webhook');
  const [curlFlavor, setCurlFlavor] = useState<'openwa' | 'meta'>('meta');
  const [galleryCategory, setGalleryCategory] = useState<string>('todos');

  // Meta Cloud API and Webhook configuration state
  const [metaConfig, setMetaConfig] = useState<MetaCloudCredentials>(getMetaCloudConfig);
  const [isTestingMeta, setIsTestingMeta] = useState(false);
  const [isSyncingMeta, setIsSyncingMeta] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'meta' | 'local'>('all');
  
  // Meta Studio Step-by-Step State
  const [metaCategoryFilter, setMetaCategoryFilter] = useState<'all' | 'UTILITY' | 'MARKETING' | 'AUTHENTICATION'>('all');
  const [metaStatusFilter, setMetaStatusFilter] = useState<'all' | 'APPROVED' | 'PENDING' | 'REJECTED'>('all');
  const [selectedMetaTplForTest, setSelectedMetaTplForTest] = useState<CustomTemplate | null>(null);
  const [metaDirectTestPhone, setMetaDirectTestPhone] = useState('584121234567');
  const [metaDirectTestVars, setMetaDirectTestVars] = useState<Record<string, string>>({});
  const [isSendingMetaDirect, setIsSendingMetaDirect] = useState(false);
  const [metaDirectResult, setMetaDirectResult] = useState<{ success: boolean; messageId?: string; error?: string; raw?: any } | null>(null);

  const [isMetaPasteModalOpen, setIsMetaPasteModalOpen] = useState(false);
  const [metaRawInput, setMetaRawInput] = useState('');

  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomTemplate | MessageTemplate | null>(null);
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
  const toast = useToast();
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Body editor ref and toolbar states
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isVarMenuOpen, setIsVarMenuOpen] = useState(false);
  const [showVarInfoTooltip, setShowVarInfoTooltip] = useState(false);

  // File upload ref for direct image attachment
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local Custom Templates state
  const [localTemplates, setLocalTemplates] = useState<CustomTemplate[]>(getLocalCustomTemplates);

  // Quick Send Test state
  const [testPhone, setTestPhone] = useState('584121234567');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Live Test Modal state
  const [testModalTemplate, setTestModalTemplate] = useState<CustomTemplate | MessageTemplate | InspirationTemplate | null>(null);
  const [testModalVars, setTestModalVars] = useState<Record<string, string>>({});
  const [testModalPhone, setTestModalPhone] = useState('584121234567');
  const [testModalChannel, setTestModalChannel] = useState<'local' | 'meta'>('meta');
  const [testModalCopiedCurl, setTestModalCopiedCurl] = useState(false);
  const [isModalSending, setIsModalSending] = useState(false);

  // Affiliate to Bot Modal state
  const [affiliateTarget, setAffiliateTarget] = useState<CustomTemplate | MessageTemplate | InspirationTemplate | null>(null);
  const [affiliateIntent, setAffiliateIntent] = useState<TriggerIntentType>('greeting');
  const [affiliateSessionId, setAffiliateSessionId] = useState<string>('*');
  const [affiliateAction, setAffiliateAction] = useState<'send_template' | 'ai_hybrid'>('send_template');

  // Bot Intent Flow Rules State
  const [flowTriggers, setFlowTriggers] = useState<TemplateTriggerMapping[]>(() => {
    const existing = getSessionAiConfig('default_session');
    return existing.templateTriggers && existing.templateTriggers.length > 0
      ? existing.templateTriggers
      : getDefaultTemplateTriggers('support');
  });

  const handleSaveMetaConfig = (newCfg: MetaCloudCredentials) => {
    setMetaConfig(newCfg);
    saveMetaCloudConfig(newCfg);
    toast.success('Configuración de Meta Cloud API guardada');
  };

  const handleTestMetaConnection = async () => {
    setIsTestingMeta(true);
    try {
      const res = await testMetaCloudConnection(metaConfig);
      if (res.success) {
        toast.success(`¡Conexión verificada con Meta! Número: ${res.data?.display_phone_number || res.data?.id || 'Activo'}`);
        setMetaConfig(getMetaCloudConfig());
      } else {
        toast.error(res.error || 'Error al conectar con Meta Graph API');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error conectando con Meta');
    } finally {
      setIsTestingMeta(false);
    }
  };

  const handleSyncMetaTemplates = async () => {
    if (!metaConfig.wabaId || !metaConfig.accessToken) {
      toast.error('Configura primero tu WABA ID y Access Token en el Paso 1 para conectarte a Meta');
      setActiveTab('meta-webhook');
      return;
    }

    setIsSyncingMeta(true);
    try {
      const res = await fetchMetaCloudTemplates(metaConfig);
      if (!res.success || !res.templates) {
        toast.error(res.error || 'No se pudieron descargar las plantillas de Meta.');
        return;
      }

      let nextNum = localTemplates.length > 0 ? Math.max(...localTemplates.map(t => t.templateNumber || 100)) + 1 : 101;
      const imported: CustomTemplate[] = [];

      for (const mt of res.templates) {
        const existingIdx = localTemplates.findIndex(t => t.name.toLowerCase() === (mt.name || '').toLowerCase());
        
        const components = Array.isArray(mt.components) ? mt.components : [];
        let hType: HeaderType = 'none';
        let hText = '';
        let mUrl = '';
        let bText = '';
        let fText = '';
        const btns: TemplateButton[] = [];

        for (const c of components) {
          const type = (c.type || '').toUpperCase();
          if (type === 'HEADER') {
            const fmt = (c.format || 'TEXT').toUpperCase();
            if (fmt === 'TEXT') { hType = 'text'; hText = c.text || ''; }
            else if (fmt === 'IMAGE') { hType = 'image'; mUrl = c.example?.header_handle?.[0] || ''; }
            else if (fmt === 'VIDEO') { hType = 'video'; mUrl = c.example?.header_handle?.[0] || ''; }
            else if (fmt === 'DOCUMENT') { hType = 'document'; mUrl = ''; }
          } else if (type === 'BODY') {
            bText = c.text || '';
          } else if (type === 'FOOTER') {
            fText = c.text || '';
          } else if (type === 'BUTTONS') {
            (c.buttons || []).forEach((b: any, i: number) => {
              const bType = (b.type || 'QUICK_REPLY').toUpperCase();
              btns.push({
                id: `btn_meta_${Date.now()}_${i}`,
                type: bType === 'URL' ? 'URL' : bType === 'PHONE_NUMBER' ? 'PHONE_NUMBER' : bType === 'COPY_CODE' ? 'COPY_CODE' : 'QUICK_REPLY',
                text: b.text || `Botón ${i + 1}`,
                value: b.url || b.phone_number || b.code || b.text || `BTN_${i + 1}`,
              });
            });
          }
        }

        const vars: Record<string, string> = {};
        const matches = bText.match(/\{\{([^}]+)\}\}/g);
        if (matches) {
          matches.forEach(m => {
            const clean = m.replace(/[{}]/g, '').trim();
            vars[clean] = getDefaultSampleValue(clean) || `[${clean}]`;
          });
        }

        const templateObj: CustomTemplate = {
          id: existingIdx >= 0 ? localTemplates[existingIdx].id : `tpl_meta_${mt.id || Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          templateNumber: existingIdx >= 0 ? localTemplates[existingIdx].templateNumber : nextNum++,
          name: mt.name,
          category: (mt.category as MetaCategory) || 'UTILITY',
          headerType: hType,
          headerText: hText,
          mediaUrl: mUrl,
          body: bText || mt.name,
          footer: fText,
          buttons: btns,
          defaultVars: vars,
          source: 'meta',
          metaStatus: mt.status || 'APPROVED',
          language: mt.language || 'es',
          isLocalOnly: false,
          createdAt: existingIdx >= 0 ? localTemplates[existingIdx].createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        imported.push(templateObj);
      }

      // Merge imported Meta templates with non-meta local templates
      const nonMeta = localTemplates.filter(t => t.source !== 'meta' && !imported.some(im => im.name.toLowerCase() === t.name.toLowerCase()));
      const combined = [...imported, ...nonMeta];
      
      setLocalTemplates(combined);
      saveLocalCustomTemplates(combined);

      // Select first template for test tester if not selected
      if (imported.length > 0 && !selectedMetaTplForTest) {
        setSelectedMetaTplForTest(imported[0]);
        setMetaDirectTestVars(imported[0].defaultVars || {});
      }

      toast.success(`¡${imported.length} plantillas consumidas directamente de Meta WhatsApp Cloud API!`);
    } catch (err: any) {
      toast.error(err.message || 'Error sincronizando plantillas de Meta');
    } finally {
      setIsSyncingMeta(false);
    }
  };

  const handleSendMetaDirect = async () => {
    if (!selectedMetaTplForTest) {
      toast.error('Selecciona una plantilla de Meta para enviar la prueba');
      return;
    }
    if (!metaDirectTestPhone.trim()) {
      toast.error('Ingresa un número de teléfono destino para la prueba');
      return;
    }

    setIsSendingMetaDirect(true);
    setMetaDirectResult(null);

    try {
      const components = buildMetaComponentsFromVars(
        selectedMetaTplForTest.headerType,
        selectedMetaTplForTest.mediaUrl,
        selectedMetaTplForTest.headerText,
        metaDirectTestVars,
      );

      const res = await sendMetaCloudTemplate(
        metaDirectTestPhone,
        selectedMetaTplForTest.name,
        selectedMetaTplForTest.language || 'es',
        components,
        metaConfig,
      );

      if (res.success) {
        setMetaDirectResult({ success: true, messageId: res.messageId, raw: res.rawResponse });
        toast.success(`¡Plantilla Meta "${selectedMetaTplForTest.name}" despachada exitosamente a +${metaDirectTestPhone}! ID: ${res.messageId || 'OK'}`);
      } else {
        setMetaDirectResult({ success: false, error: res.error, raw: res.rawResponse });
        toast.error(res.error || 'Error al despachar plantilla por Meta Graph API');
      }
    } catch (err: any) {
      setMetaDirectResult({ success: false, error: err.message });
      toast.error(err.message || 'Error enviando plantilla');
    } finally {
      setIsSendingMetaDirect(false);
    }
  };

  const handleImportFromMeta = () => {
    if (!metaRawInput.trim()) return;
    const parsed = parseMetaTemplateInput(metaRawInput);
    if (!parsed) {
      toast.error('No se pudo interpretar el formato de la plantilla Meta');
      return;
    }
    const nextNum = localTemplates.length > 0 ? Math.max(...localTemplates.map(t => t.templateNumber || 100)) + 1 : 101;
    const newTpl: CustomTemplate = {
      id: `tpl_meta_${Date.now()}`,
      templateNumber: nextNum,
      name: `${parsed.name} [#${nextNum}]`,
      category: parsed.category,
      headerType: parsed.headerType,
      headerText: parsed.headerText || '',
      mediaUrl: parsed.mediaUrl || '',
      body: parsed.body,
      footer: parsed.footer || '',
      buttons: parsed.buttons.map(b => ({
        id: `btn_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type: (b.type as any) || 'QUICK_REPLY',
        text: b.text,
        value: b.value,
      })),
      defaultVars: parsed.variables.reduce((acc, v) => ({ ...acc, [v]: `[${v}]` }), {}),
      source: 'meta',
      isLocalOnly: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newTpl, ...localTemplates];
    setLocalTemplates(updated);
    saveLocalCustomTemplates(updated);
    setIsMetaPasteModalOpen(false);
    setMetaRawInput('');
    toast.success(`Plantilla Meta "${parsed.name}" importada exitosamente como #${nextNum} (Meta Cloud API)`);
    setActiveTab('my-templates');
  };

  const { data: serverTemplates = [] } = useTemplatesQuery(
    selectedSessionId,
    !!selectedSessionId,
  );
  const createMutation = useCreateTemplateMutation();
  const updateMutation = useUpdateTemplateMutation();
  const deleteMutation = useDeleteTemplateMutation();

  const selectedSession = sessions.find(session => session.id === selectedSessionId);
  const placeholders = useMemo(() => extractPlaceholders(form), [form]);

  useEffect(() => {
    if (!selectedSessionId && sessions.length > 0) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [selectedSessionId, sessions]);

  useEffect(() => {
    setPreviewValues(current => {
      const next: Record<string, string> = {};
      for (const key of placeholders) {
        next[key] = current[key] || '';
      }
      return next;
    });
  }, [placeholders]);

  const liveCurlSnippet = useMemo(() => {
    const sessionName = selectedSession?.name || selectedSessionId || 'sesion-demostracion';
    if (curlFlavor === 'meta') {
      return buildMetaCloudCurlSnippet(form, previewValues, testPhone);
    }
    const fullText = buildFullWhatsAppFormattedText(form, previewValues, true);
    return buildOpenWaCurlSnippet(sessionName, testPhone, form, fullText, previewValues);
  }, [selectedSession, selectedSessionId, testPhone, form, previewValues, curlFlavor]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingTemplateId(null);
    setPreviewValues({});
    setHasAttemptedSave(false);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 8 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm(f => ({ ...f, headerType: 'image', mediaUrl: reader.result as string }));
        toast.success(`Imagen "${file.name}" cargada correctamente`);
      }
    };
    reader.readAsDataURL(file);
  };

  const openEdit = (template: CustomTemplate | MessageTemplate) => {
    setEditingTemplateId(template.id);
    
    if ('headerType' in template) {
      setForm({
        name: template.name,
        category: template.category || 'UTILITY',
        headerType: template.headerType || 'none',
        headerText: template.headerText || '',
        mediaUrl: template.mediaUrl || '',
        body: template.body,
        footer: template.footer || '',
        buttons: template.buttons || [],
      });
      if (template.defaultVars) {
        setPreviewValues(template.defaultVars);
      }
    } else {
      const richMeta = getRichMetadata(selectedSessionId, template.name);
      let headerType: HeaderType = 'none';
      let headerText = template.header || '';
      let mediaUrl = '';

      if (richMeta) {
        headerType = richMeta.headerType || (template.header ? 'text' : 'none');
        headerText = richMeta.headerText || template.header || '';
        mediaUrl = richMeta.mediaUrl || '';
      } else if (template.header) {
        if (/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)/i.test(template.header)) {
          headerType = 'image';
          mediaUrl = template.header;
        } else if (/^https?:\/\/.*\.(mp4|mov|avi)/i.test(template.header)) {
          headerType = 'video';
          mediaUrl = template.header;
        } else if (/^https?:\/\/.*\.(mp3|ogg|wav)/i.test(template.header)) {
          headerType = 'audio';
          mediaUrl = template.header;
        } else {
          headerType = 'text';
        }
      }

      setForm({
        name: template.name,
        category: richMeta?.category || 'UTILITY',
        headerType,
        headerText,
        mediaUrl,
        body: template.body,
        footer: template.footer || '',
        buttons: richMeta?.buttons || [],
      });
    }

    setActiveTab('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUseInspiration = (insp: InspirationTemplate) => {
    setEditingTemplateId(null);
    setForm({
      name: insp.name,
      category: insp.metaCategory || 'UTILITY',
      headerType: insp.headerType || 'none',
      headerText: insp.headerText || '',
      mediaUrl: insp.mediaUrl || '',
      body: insp.body,
      footer: insp.footer || '',
      buttons: insp.buttons || [],
    });
    setPreviewValues(insp.defaultVars);
    setActiveTab('editor');
    toast.success(`Plantilla "${insp.name}" cargada en el editor.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenTestModal = (template: CustomTemplate | MessageTemplate | InspirationTemplate) => {
    setTestModalTemplate(template);
    const pKeys = extractPlaceholders(template as any);
    const defaultV: Record<string, string> = 'defaultVars' in template ? { ...template.defaultVars } : {};
    for (const k of pKeys) {
      if (!defaultV[k]) defaultV[k] = '';
    }
    setTestModalVars(defaultV);
    setTestModalPhone('584121234567');
  };

  const handleOpenAffiliateModal = (template: CustomTemplate | MessageTemplate | InspirationTemplate) => {
    setAffiliateTarget(template);
    const tName = template.name.toLowerCase();
    if (tName.includes('saldo') || tName.includes('pago') || tName.includes('factura') || tName.includes('cobro')) {
      setAffiliateIntent('balance');
    } else if (tName.includes('plan') || tName.includes('precio') || tName.includes('fibra') || tName.includes('promo')) {
      setAffiliateIntent('plans');
    } else if (tName.includes('soporte') || tName.includes('falla') || tName.includes('mantenimiento') || tName.includes('ticket')) {
      setAffiliateIntent('support');
    } else if (tName.includes('bienvenida') || tName.includes('saludo') || tName.includes('hola')) {
      setAffiliateIntent('greeting');
    } else {
      setAffiliateIntent('custom');
    }
    setAffiliateSessionId(selectedSessionId || (sessions[0]?.id || '*'));
    setAffiliateAction('send_template');
  };

  const handleSaveAffiliation = () => {
    if (!affiliateTarget) return;
    const targetSessionId = affiliateSessionId || (sessions[0]?.id || '*');
    const existingConf = getSessionAiConfig(targetSessionId);
    const existingTriggers = existingConf.templateTriggers && existingConf.templateTriggers.length > 0
      ? existingConf.templateTriggers
      : getDefaultTemplateTriggers(existingConf.role);

    const defaultKeywords: Record<TriggerIntentType, string[]> = {
      greeting: ['hola', 'buenos dias', 'buenas tardes', 'saludos', 'inicio', 'menu'],
      balance: ['saldo', 'deuda', 'factura', 'pagar', 'recibo', 'cuenta', 'cuanto debo', 'corte', 'pago'],
      plans: ['planes', 'precios', 'costo', 'fibra', 'megas', 'promocion', 'contratar', 'velocidad', 'tarifas'],
      support: ['soporte', 'falla', 'sin internet', 'lento', 'averia', 'luz roja', 'router', 'problema', 'los', 'pon'],
      agent: ['asesor', 'humano', 'operador', 'agente', 'persona', 'atencion humana'],
      custom: ['informacion', 'consulta', affiliateTarget.name.toLowerCase()],
    };

    const newTrigger: TemplateTriggerMapping = {
      id: `trig_aff_${Date.now()}`,
      enabled: true,
      name: `Afiliación: ${affiliateTarget.name}`,
      intentType: affiliateIntent,
      keywords: defaultKeywords[affiliateIntent] || ['consulta'],
      roleAffiliation: 'all',
      templateId: affiliateTarget.id,
      templateName: affiliateTarget.name,
      headerType: 'headerType' in affiliateTarget ? affiliateTarget.headerType : 'none',
      headerText: ('headerText' in affiliateTarget ? (affiliateTarget.headerText || '') : ('header' in affiliateTarget ? (affiliateTarget.header || '') : '')) || undefined,
      mediaUrl: ('mediaUrl' in affiliateTarget ? (affiliateTarget.mediaUrl || '') : '') || undefined,
      body: affiliateTarget.body,
      footer: affiliateTarget.footer || undefined,
      buttons: 'buttons' in affiliateTarget ? affiliateTarget.buttons : undefined,
      action: affiliateAction,
      dynamicAiMatch: true,
    };

    const updatedTriggers = [...existingTriggers, newTrigger];
    saveSessionAiConfig({
      ...existingConf,
      sessionId: targetSessionId,
      templateTriggers: updatedTriggers,
    });

    toast.success(`¡Plantilla "${affiliateTarget.name}" afiliada exitosamente al Bot para la intención "${affiliateIntent}"!`);
    setAffiliateTarget(null);
  };

  const handleSave = async () => {
    setHasAttemptedSave(true);

    if (!form.name.trim()) {
      toast.error('Por favor escribe un nombre para la plantilla');
      return;
    }
    if (!form.body.trim()) {
      toast.error('El cuerpo del mensaje no puede estar vacío');
      return;
    }

    const invalidBtn = form.buttons.find(b => !b.text.trim() || !b.value.trim());
    if (invalidBtn) {
      toast.error('Por favor completa el texto y destino de los botones interactivos');
      return;
    }

    const updatedLocal = [...localTemplates];
    const existingIdx = updatedLocal.findIndex(t => t.id === editingTemplateId || t.name.toLowerCase() === form.name.trim().toLowerCase());

    const templateData: CustomTemplate = {
      id: editingTemplateId || `tpl_${Date.now()}`,
      name: form.name.trim(),
      category: form.category,
      headerType: form.headerType,
      headerText: form.headerText.trim(),
      mediaUrl: form.mediaUrl.trim(),
      body: form.body.trim(),
      footer: form.footer.trim(),
      buttons: form.buttons,
      defaultVars: previewValues,
      isLocalOnly: !selectedSessionId,
      createdAt: existingIdx >= 0 ? updatedLocal[existingIdx].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      updatedLocal[existingIdx] = templateData;
    } else {
      updatedLocal.unshift(templateData);
    }

    setLocalTemplates(updatedLocal);
    saveLocalCustomTemplates(updatedLocal);

    if (selectedSessionId) {
      let headerPayload: string | null = null;
      if (form.headerType === 'text') {
        headerPayload = form.headerText.trim() || null;
      } else if (form.headerType !== 'none') {
        headerPayload = form.mediaUrl.trim() || `[${form.headerType.toUpperCase()}]`;
      }

      const payload: TemplatePayload = {
        name: form.name.trim(),
        header: headerPayload,
        body: form.body.trim(),
        footer: form.footer.trim() || null,
      };

      try {
        const serverExists = serverTemplates.find(t => t.id === editingTemplateId || t.name === form.name.trim());
        if (serverExists) {
          await updateMutation.mutateAsync({
            sessionId: selectedSessionId,
            id: serverExists.id,
            data: payload,
          });
        } else {
          await createMutation.mutateAsync({
            sessionId: selectedSessionId,
            data: payload,
          });
        }
        saveRichMetadata(selectedSessionId, form);
      } catch (err: any) {
        console.warn('Backend sync warning (stored locally):', err);
      }
    }

    setHasAttemptedSave(false);
    toast.success(`¡Plantilla "${form.name}" guardada y disponible en el sistema!`);
    resetForm();
    setActiveTab('my-templates');
  };

  const handleDelete = async (template: CustomTemplate | MessageTemplate) => {
    const updatedLocal = localTemplates.filter(t => t.id !== template.id && t.name !== template.name);
    setLocalTemplates(updatedLocal);
    saveLocalCustomTemplates(updatedLocal);

    if (selectedSessionId && 'header' in template) {
      try {
        await deleteMutation.mutateAsync({
          sessionId: selectedSessionId,
          id: template.id,
        });
      } catch (err: any) {
        console.warn('Server delete error:', err);
      }
    }

    toast.success(`Plantilla "${template.name}" eliminada.`);
    setDeleteTarget(null);
  };

  const handleQuickSend = async () => {
    if (!testPhone.trim()) {
      toast.error('Por favor ingresa un número de teléfono destino');
      return;
    }
    const targetSession = selectedSession?.id || (sessions.length > 0 ? sessions[0].id : null);
    if (!targetSession) {
      toast.error('No hay ninguna sesión activa de WhatsApp para enviar el mensaje.');
      return;
    }

    setIsSendingTest(true);
    try {
      const cleanPhone = testPhone.replace(/[^0-9]/g, '');
      const chatId = `${cleanPhone}@c.us`;
      const fullText = buildFullWhatsAppFormattedText(form, previewValues, true);

      if (form.headerType === 'image' && form.mediaUrl) {
        const isBase64 = form.mediaUrl.startsWith('data:');
        try {
          if (isBase64) {
            const match = form.mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
            const mimetype = match ? match[1] : 'image/jpeg';
            const base64Data = match ? match[2] : form.mediaUrl;
            await messageApi.sendMedia(targetSession, chatId, 'image', {
              base64: base64Data,
              mimetype,
              caption: fullText,
            });
          } else {
            await messageApi.sendMedia(targetSession, chatId, 'image', {
              url: form.mediaUrl,
              caption: fullText,
            });
          }
        } catch (mediaErr: any) {
          console.warn('Media send failed, falling back to text message:', mediaErr);
          await messageApi.sendText(targetSession, chatId, fullText + (!isBase64 && form.mediaUrl ? `\n\n🖼️ *Imagen:* ${form.mediaUrl}` : ''));
        }
      } else if (form.headerType === 'video' && form.mediaUrl) {
        try {
          await messageApi.sendMedia(targetSession, chatId, 'video', {
            url: form.mediaUrl,
            caption: fullText,
          });
        } catch (mediaErr) {
          await messageApi.sendText(targetSession, chatId, fullText + `\n\n🎥 *Video:* ${form.mediaUrl}`);
        }
      } else if (form.headerType === 'audio' && form.mediaUrl) {
        try {
          await messageApi.sendMedia(targetSession, chatId, 'audio', {
            url: form.mediaUrl,
          });
          await messageApi.sendText(targetSession, chatId, fullText);
        } catch (mediaErr) {
          await messageApi.sendText(targetSession, chatId, fullText + `\n\n🎵 *Audio:* ${form.mediaUrl}`);
        }
      } else if (form.headerType === 'document' && form.mediaUrl) {
        try {
          await messageApi.sendMedia(targetSession, chatId, 'document', {
            url: form.mediaUrl,
            caption: fullText,
          });
        } catch (mediaErr) {
          await messageApi.sendText(targetSession, chatId, fullText + `\n\n📄 *Documento:* ${form.mediaUrl}`);
        }
      } else {
        await messageApi.sendText(targetSession, chatId, fullText);
      }

      // Only send interactive poll if there are genuine QUICK_REPLY buttons (e.g. surveys / multiple choice)
      // Do NOT send poll for URL or PHONE buttons because poll voting widgets cannot redirect to external web URLs
      const quickReplyButtons = (form.buttons || []).filter(b => b.type === 'QUICK_REPLY');
      if (quickReplyButtons.length > 0) {
        try {
          await messageApi.sendPoll(targetSession, {
            chatId,
            name: '🔘 Elige una opción:',
            options: quickReplyButtons.map(b => b.text || 'Opción'),
            allowMultipleAnswers: false,
          });
        } catch (pollErr) {
          console.warn('Poll buttons fallback handled:', pollErr);
        }
      }

      toast.success(`¡Plantilla enviada exitosamente a +${cleanPhone}!`);
    } catch (err: any) {
      console.error('Error sending test:', err);
      toast.error('Error al enviar mensaje', err.message || 'Verifica que la sesión de WhatsApp esté conectada');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleModalSend = async () => {
    if (!testModalPhone.trim()) {
      toast.error('Ingresa un número de teléfono destino');
      return;
    }

    const cleanPhone = testModalPhone.replace(/[^0-9]/g, '');
    const headerType = ('headerType' in testModalTemplate! ? testModalTemplate.headerType : 'none') as HeaderType;
    const mediaUrl = ('mediaUrl' in testModalTemplate! ? testModalTemplate.mediaUrl : '') || '';
    const headerText = ('headerText' in testModalTemplate! ? (testModalTemplate as any).headerText : '') || '';

    setIsModalSending(true);

    // 1. Send via Meta WhatsApp Cloud API
    if (testModalChannel === 'meta') {
      try {
        if (!metaConfig.phoneNumberId || !metaConfig.accessToken) {
          toast.error('Credenciales de Meta incompletas. Configura Phone Number ID y Access Token en la pestaña Meta Cloud API.');
          setIsModalSending(false);
          return;
        }

        const components = buildMetaComponentsFromVars(headerType, mediaUrl, headerText, testModalVars);
        const cleanName = (testModalTemplate!.name || 'plantilla_meta').toLowerCase().replace(/[^a-z0-9_]/g, '_');

        const res = await sendMetaCloudTemplate(cleanPhone, cleanName, 'es', components, metaConfig);
        if (res.success) {
          toast.success(`¡Plantilla despachada por Meta Cloud API! Message ID: ${res.messageId || 'wamid.ok'}`);
          setTestModalTemplate(null);
        } else {
          toast.error(res.error || 'Error al enviar plantilla por Meta Cloud API');
        }
      } catch (err: any) {
        console.error('Error sending via Meta Cloud API:', err);
        toast.error(err.message || 'Fallo de conexión con Meta Graph API');
      } finally {
        setIsModalSending(false);
      }
      return;
    }

    // 2. Send via Local WhatsApp Session
    const targetSession = selectedSession?.id || (sessions.length > 0 ? sessions[0].id : null);
    if (!targetSession) {
      toast.error('Por favor selecciona o conecta una sesión de WhatsApp');
      setIsModalSending(false);
      return;
    }

    try {
      const chatId = `${cleanPhone}@c.us`;
      const fullText = buildFullWhatsAppFormattedText(testModalTemplate as any, testModalVars, true);
      const isBase64 = mediaUrl.startsWith('data:');

      if (headerType === 'image' && mediaUrl) {
        try {
          if (isBase64) {
            const match = mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
            const mimetype = match ? match[1] : 'image/jpeg';
            const base64Data = match ? match[2] : mediaUrl;
            await messageApi.sendMedia(targetSession, chatId, 'image', { base64: base64Data, mimetype, caption: fullText });
          } else {
            await messageApi.sendMedia(targetSession, chatId, 'image', { url: mediaUrl, caption: fullText });
          }
        } catch (mediaErr) {
          await messageApi.sendText(targetSession, chatId, fullText + (!isBase64 && mediaUrl ? `\n\n🖼️ *Imagen:* ${mediaUrl}` : ''));
        }
      } else if (headerType === 'video' && mediaUrl) {
        try {
          await messageApi.sendMedia(targetSession, chatId, 'video', { url: mediaUrl, caption: fullText });
        } catch (mediaErr) {
          await messageApi.sendText(targetSession, chatId, fullText + `\n\n🎥 *Video:* ${mediaUrl}`);
        }
      } else if (headerType === 'audio' && mediaUrl) {
        try {
          await messageApi.sendMedia(targetSession, chatId, 'audio', { url: mediaUrl });
          await messageApi.sendText(targetSession, chatId, fullText);
        } catch (mediaErr) {
          await messageApi.sendText(targetSession, chatId, fullText + `\n\n🎵 *Audio:* ${mediaUrl}`);
        }
      } else if (headerType === 'document' && mediaUrl) {
        try {
          await messageApi.sendMedia(targetSession, chatId, 'document', { url: mediaUrl, caption: fullText });
        } catch (mediaErr) {
          await messageApi.sendText(targetSession, chatId, fullText + `\n\n📄 *Documento:* ${mediaUrl}`);
        }
      } else {
        await messageApi.sendText(targetSession, chatId, fullText);
      }

      const tButtons = ('buttons' in testModalTemplate! ? testModalTemplate.buttons : []) || [];
      const quickReplyButtons = tButtons.filter((b: any) => b.type === 'QUICK_REPLY');
      if (quickReplyButtons.length > 0) {
        try {
          await messageApi.sendPoll(targetSession, {
            chatId,
            name: '🔘 Elige una opción:',
            options: quickReplyButtons.map((b: any) => b.text || 'Opción'),
            allowMultipleAnswers: false,
          });
        } catch (pollErr) {
          console.warn('Poll buttons modal fallback handled:', pollErr);
        }
      }

      toast.success(`¡Plantilla enviada exitosamente a +${cleanPhone} (Sesión Local)!`);
      setTestModalTemplate(null);
    } catch (err: any) {
      console.error('Error sending modal template:', err);
      toast.error('Error al enviar plantilla', err.message || 'Verifica la conexión');
    } finally {
      setIsModalSending(false);
    }
  };

  const handleAddButton = () => {
    if (form.buttons.length >= 3) {
      toast.warning('Meta permite un máximo de 3 botones interactivos por plantilla');
      return;
    }
    const newBtn: TemplateButton = {
      id: `btn_${Date.now()}`,
      type: 'URL',
      text: 'Ver Página Web',
      value: 'https://',
    };
    setForm(f => ({ ...f, buttons: [...f.buttons, newBtn] }));
  };

  const handleRemoveButton = (id: string) => {
    setForm(f => ({ ...f, buttons: f.buttons.filter(b => b.id !== id) }));
  };

  const handleButtonChange = (id: string, field: keyof TemplateButton, value: string) => {
    setForm(f => ({
      ...f,
      buttons: f.buttons.map(b => {
        if (b.id !== id) return b;
        if (field === 'type') {
          const newType = value as TemplateButton['type'];
          let newText = b.text;
          let newValue = b.value;

          // Intelligently adapt text and target value when type changes
          if (newType === 'URL') {
            if (!b.text || b.text.toLowerCase().includes('opción') || b.text.toLowerCase().includes('opcion') || b.text.startsWith('Llamar') || b.text.startsWith('Copiar')) {
              newText = 'Ver Página Web';
            }
            if (!b.value || !b.value.startsWith('http')) {
              newValue = 'https://';
            }
          } else if (newType === 'PHONE_NUMBER') {
            if (!b.text || b.text.toLowerCase().includes('opción') || b.text.toLowerCase().includes('opcion') || b.text.startsWith('Ver') || b.text.startsWith('Copiar')) {
              newText = 'Llamar a Soporte';
            }
            if (!b.value || !b.value.startsWith('+')) {
              newValue = '+584121234567';
            }
          } else if (newType === 'COPY_CODE') {
            if (!b.text || b.text.toLowerCase().includes('opción') || b.text.toLowerCase().includes('opcion') || b.text.startsWith('Ver') || b.text.startsWith('Llamar')) {
              newText = 'Copiar Cupón Promo';
            }
            if (!b.value || b.value.startsWith('http') || b.value.startsWith('+') || b.value.startsWith('OPCION_')) {
              newValue = 'PROMO2026';
            }
          } else {
            // QUICK_REPLY
            if (!b.text || b.text.startsWith('Ver') || b.text.startsWith('Llamar') || b.text.startsWith('Copiar')) {
              newText = `Opción ${f.buttons.indexOf(b) + 1}`;
            }
            if (!b.value || b.value.startsWith('http') || b.value.startsWith('+') || b.value.startsWith('PROMO')) {
              newValue = `OPCION_${f.buttons.indexOf(b) + 1}`;
            }
          }

          return { ...b, type: newType, text: newText, value: newValue };
        }
        return { ...b, [field]: value };
      }),
    }));
  };

  const POPULAR_EMOJIS = [
    '👋', '😊', '👍', '🚀', '✨', '🔥', '💡', '📌', '✅', '❌',
    '⚠️', '🔔', '📞', '📱', '💬', '🌐', '🔒', '🔑', '👤', '🏢',
    '📡', '📶', '🛠️', '💳', '💰', '💵', '🧾', '📅', '⏰', '🎉',
    '🎁', '⭐', '👉', '👇', '📍', '❤️', '💯', '🎯', '🛒', '📦',
  ];

  const insertAtCursor = (textToInsert: string) => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) {
      setForm(f => ({ ...f, body: f.body + (f.body.length > 0 && !f.body.endsWith(' ') ? ' ' : '') + textToInsert }));
      return;
    }
    const start = textarea.selectionStart ?? form.body.length;
    const end = textarea.selectionEnd ?? form.body.length;
    const currentVal = form.body;
    const newVal = currentVal.substring(0, start) + textToInsert + currentVal.substring(end);
    setForm(f => ({ ...f, body: newVal }));

    setTimeout(() => {
      textarea.focus();
      const nextCursor = start + textToInsert.length;
      textarea.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  const applyFormatWrapper = (prefix: string, suffix = prefix) => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const currentVal = form.body;
    const selectedText = currentVal.substring(start, end);

    if (selectedText.length > 0) {
      const newVal = currentVal.substring(0, start) + prefix + selectedText + suffix + currentVal.substring(end);
      setForm(f => ({ ...f, body: newVal }));
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
      }, 0);
    } else {
      const placeholder = prefix === '*' ? 'negrita' : prefix === '_' ? 'cursiva' : prefix === '~' ? 'tachado' : 'código';
      const insertStr = `${prefix}${placeholder}${suffix}`;
      insertAtCursor(insertStr);
    }
  };

  const handleInsertNextNumericVar = () => {
    const matches = Array.from(form.body.matchAll(/\{\{\s*(\d+)\s*\}\}/g), m => parseInt(m[1], 10));
    const maxNum = matches.length > 0 ? Math.max(...matches) : 0;
    const nextNum = maxNum + 1;
    insertAtCursor(`{{${nextNum}}}`);
    setIsVarMenuOpen(false);
  };

  const handleInsertNamedVar = (varName: string) => {
    insertAtCursor(`{{${varName}}}`);
    setIsVarMenuOpen(false);
  };

  const handleInsertEmoji = (emoji: string) => {
    insertAtCursor(emoji);
    setIsEmojiPickerOpen(false);
  };

  const handleCopyCurl = async () => {
    const ok = await copyToClipboard(liveCurlSnippet);
    if (ok) {
      setCopiedCurl(true);
      toast.success('Comando cURL copiado al portapapeles');
      setTimeout(() => setCopiedCurl(false), 2500);
    }
  };

  return (
    <div className="templates-page">
      <PageHeader
        title="Plantillas de Mensajes"
        subtitle="Consumo oficial Meta WhatsApp Cloud API (Graph API) y plantillas locales enriquecidas"
        actions={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              onClick={handleSyncMetaTemplates}
              disabled={isSyncingMeta}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                border: 'none',
                color: '#fff',
                fontWeight: 600,
              }}
              title="Consumir y sincronizar plantillas oficiales aprobadas en Meta Graph API"
            >
              {isSyncingMeta ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              <span>Sincronizar con Meta</span>
            </button>
            <button
              className="btn-primary"
              onClick={() => setIsMetaPasteModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                border: 'none',
                color: '#fff',
                fontWeight: 600,
              }}
              title="Pegar formato copiado desde Meta Business Manager"
            >
              <ClipboardPaste size={16} />
              <span>Pegar Plantilla Meta</span>
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                resetForm();
                setActiveTab('editor');
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <PenTool size={16} />
              <span>+ Nueva Plantilla</span>
            </button>
          </div>
        }
      />

      {/* Main Tab Navigation Header */}
      <div className="templates-tab-bar">
        <button
          className={`tab-btn ${activeTab === 'meta-webhook' ? 'active' : ''}`}
          onClick={() => setActiveTab('meta-webhook')}
          style={activeTab === 'meta-webhook' ? { background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', borderColor: '#2563eb' } : {}}
        >
          <Globe size={18} />
          <span>🌐 Meta Cloud API (Paso a Paso)</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveTab('editor')}
        >
          <PenTool size={18} />
          <span>📝 Editor de Plantilla</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'my-templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-templates')}
        >
          <Bookmark size={18} />
          <span>📁 Mis Plantillas Guardadas ({localTemplates.length})</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'gallery' ? 'active' : ''}`}
          onClick={() => setActiveTab('gallery')}
        >
          <Sparkles size={18} />
          <span>✨ Galería de Ejemplos Meta</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'flow-builder' ? 'active' : ''}`}
          onClick={() => setActiveTab('flow-builder')}
        >
          <GitFork size={18} />
          <span>🌿 Flujos de Roles & API (n8n)</span>
        </button>
      </div>

      {/* TAB 1: EDITOR DE PLANTILLAS */}
      {activeTab === 'editor' && (
        <div className="templates-editor-layout">
          {/* Left Column: Form Settings */}
          <div className="editor-form-card">
            <div className="card-header-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="step-badge">1</span>
                <h3>Configuración de la Plantilla</h3>
              </div>
              {editingTemplateId && (
                <span className="editing-tag">
                  Editando: {form.name}
                  <button onClick={resetForm} className="btn-icon-sm" title="Cancelar edición">
                    <X size={14} />
                  </button>
                </span>
              )}
            </div>

            <div className="form-group-field">
              <label htmlFor="template-name">
                Nombre de la Plantilla <span className="required-star">*</span>
              </label>
              <input
                id="template-name"
                type="text"
                required
                placeholder="ej: aviso_mantenimiento_fibra"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className={`custom-input ${form.name.trim() ? 'is-valid' : hasAttemptedSave ? 'is-invalid' : ''}`}
              />
              <span className="field-hint">Usa minúsculas y guiones bajos para compatibilidad con Meta Cloud API.</span>
            </div>

            <div className="form-grid-2">
              <div className="form-group-field">
                <label>Categoría Meta</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value as MetaCategory })}
                  className="custom-input"
                >
                  <option value="UTILITY">UTILIDAD (Transaccional, Avisos)</option>
                  <option value="MARKETING">MARKETING (Promociones, Ventas)</option>
                  <option value="AUTHENTICATION">AUTENTICACIÓN (Códigos OTP)</option>
                </select>
              </div>

              <div className="form-group-field">
                <label>Encabezado Multimedia</label>
                <select
                  value={form.headerType}
                  onChange={e => setForm({ ...form, headerType: e.target.value as HeaderType })}
                  className="custom-input"
                >
                  <option value="none">Sin Encabezado</option>
                  <option value="text">📝 Texto Destacado</option>
                  <option value="image">🖼️ Imagen (JPG, PNG, WebP)</option>
                  <option value="video">🎥 Video (MP4)</option>
                  <option value="audio">🎵 Audio (MP3, OGG)</option>
                  <option value="document">📄 Documento (PDF)</option>
                </select>
              </div>
            </div>

            {form.headerType === 'text' && (
              <div className="form-group-field">
                <label>Texto del Encabezado Destacado</label>
                <input
                  type="text"
                  placeholder="ej: 🛠️ COMUNICADO OFICIAL DE SOPORTE"
                  value={form.headerText}
                  onChange={e => setForm({ ...form, headerText: e.target.value })}
                  className="custom-input"
                />
              </div>
            )}

            {form.headerType === 'image' && (
              <div className="form-group-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Imagen del Encabezado (JPG, PNG, WebP)</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageFileUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  >
                    <Upload size={13} />
                    <span>📁 Subir desde mi PC</span>
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <input
                    type="text"
                    placeholder="https://ejemplo.com/banner.png o pega base64"
                    value={form.mediaUrl.startsWith('data:') ? '✅ [Imagen cargada localmente en base64]' : form.mediaUrl}
                    onChange={e => setForm({ ...form, mediaUrl: e.target.value })}
                    className="custom-input"
                    style={{ flex: 1 }}
                  />
                  {form.mediaUrl && (
                    <button
                      type="button"
                      className="btn-icon-danger"
                      onClick={() => setForm({ ...form, mediaUrl: '' })}
                      title="Eliminar imagen"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                {/* Quick Image Presets */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ejemplos rápidos:</span>
                  <button
                    type="button"
                    className="var-chip"
                    onClick={() => setForm(f => ({ ...f, mediaUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80' }))}
                  >
                    📡 Fibra Óptica
                  </button>
                  <button
                    type="button"
                    className="var-chip"
                    onClick={() => setForm(f => ({ ...f, mediaUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80' }))}
                  >
                    🚀 Router WiFi
                  </button>
                  <button
                    type="button"
                    className="var-chip"
                    onClick={() => setForm(f => ({ ...f, mediaUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&q=80' }))}
                  >
                    🎉 Promoción / Regalo
                  </button>
                </div>
              </div>
            )}

            {(form.headerType === 'video' || form.headerType === 'audio' || form.headerType === 'document') && (
              <div className="form-group-field">
                <label>URL del Archivo Multimedia ({form.headerType.toUpperCase()})</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="url"
                    placeholder={`https://ejemplo.com/archivo.${form.headerType === 'video' ? 'mp4' : form.headerType === 'audio' ? 'mp3' : 'pdf'}`}
                    value={form.mediaUrl}
                    onChange={e => setForm({ ...form, mediaUrl: e.target.value })}
                    className="custom-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      if (form.headerType === 'video') setForm(f => ({ ...f, mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' }));
                      if (form.headerType === 'audio') setForm(f => ({ ...f, mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }));
                      if (form.headerType === 'document') setForm(f => ({ ...f, mediaUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }));
                    }}
                    title="Cargar demo"
                  >
                    Demo URL
                  </button>
                </div>
              </div>
            )}

            {/* Meta WhatsApp Standard: Cuerpo (Body Editor) */}
            <div className="meta-cuerpo-section">
              <div className="meta-cuerpo-header">
                <label htmlFor="template-body" className="meta-section-label">
                  Cuerpo <span className="required-star">*</span>
                </label>

                <div className="meta-cuerpo-header-actions">
                  <div className="meta-var-btn-container" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      className="meta-add-var-btn"
                      onClick={handleInsertNextNumericVar}
                      title="Insertar siguiente variable numérica (ej. {{1}}, {{2}}...)"
                    >
                      <Plus size={14} />
                      <span>Agregar variable</span>
                    </button>

                    <button
                      type="button"
                      className="meta-var-toggle-arrow-btn"
                      onClick={() => setIsVarMenuOpen(!isVarMenuOpen)}
                      title="Opciones avanzadas de variables"
                    >
                      <ChevronDown size={13} />
                    </button>

                    {isVarMenuOpen && (
                      <div className="meta-var-dropdown-menu">
                        <div className="var-menu-header">
                          <span>Variables Dinámicas</span>
                          <button type="button" onClick={() => setIsVarMenuOpen(false)}><X size={13} /></button>
                        </div>
                        <button
                          type="button"
                          className="var-menu-item highlight"
                          onClick={handleInsertNextNumericVar}
                        >
                          <span className="var-badge-icon">#</span>
                          <span>Variable numérica siguiente <strong>{`{{${(Array.from(form.body.matchAll(/\{\{\s*(\d+)\s*\}\}/g), m => parseInt(m[1], 10)).length > 0 ? Math.max(...Array.from(form.body.matchAll(/\{\{\s*(\d+)\s*\}\}/g), m => parseInt(m[1], 10))) + 1 : 1)}}`}</strong></span>
                        </button>
                        <div className="var-menu-divider" />
                        <span className="var-menu-group-title">Variables personalizadas:</span>
                        <div className="var-menu-chips-grid">
                          {['nombre', 'usuario', 'clave', 'fecha', 'monto', 'empresa', 'ticket', 'plan', 'zona', 'telefono'].map(v => (
                            <button
                              key={v}
                              type="button"
                              className="var-menu-chip"
                              onClick={() => handleInsertNamedVar(v)}
                            >
                              {`{{${v}}}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="meta-info-circle-btn"
                    onClick={() => setShowVarInfoTooltip(!showVarInfoTooltip)}
                    title="Información sobre variables"
                  >
                    <Info size={15} />
                  </button>
                </div>
              </div>

              {showVarInfoTooltip && (
                <div className="meta-info-tooltip-banner">
                  <Info size={16} />
                  <span>Usa <code>{'{{1}}'}</code>, <code>{'{{2}}'}</code> o nombres como <code>{'{{nombre}}'}</code> para insertar campos dinámicos que se reemplazarán automáticamente con los datos de cada cliente al enviar el mensaje.</span>
                </div>
              )}

              {/* Textarea Container with Top Character Count and Bottom Formatting Toolbar */}
              <div className="meta-editor-box">
                <div className="meta-editor-top-counter">
                  <span>{form.body.length}/1040</span>
                </div>

                <textarea
                  id="template-body"
                  ref={bodyTextareaRef}
                  rows={6}
                  required
                  placeholder={`Hola {{4}}, Administración WIFI SOLUTION\n\nLe informa sus datos de acceso al portal de clientes son los siguientes:\n\nUsuario ID: {{1}}\nClave del Portal: {{2}}\nFecha de pago: {{3}} de cada mes\n\nPara comunicarse con alguno de nuestros departamentos con solo enviar un mensaje de vuelta y seleccionar la opción que necesite.`}
                  value={form.body}
                  onChange={e => setForm({ ...form, body: e.target.value })}
                  className={`meta-textarea ${form.body.trim() ? 'is-valid' : hasAttemptedSave ? 'is-invalid' : ''}`}
                />

                {/* Bottom Meta Toolbar */}
                <div className="meta-editor-bottom-toolbar">
                  {/* Left: Formatting & Emoji */}
                  <div className="meta-toolbar-left">
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        className={`meta-tool-btn ${isEmojiPickerOpen ? 'active' : ''}`}
                        onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                        title="Insertar emoji"
                      >
                        <Smile size={17} />
                      </button>

                      {isEmojiPickerOpen && (
                        <div className="meta-emoji-popover">
                          <div className="emoji-popover-header">
                            <span>Emojis populares</span>
                            <button type="button" onClick={() => setIsEmojiPickerOpen(false)}><X size={13} /></button>
                          </div>
                          <div className="emoji-grid">
                            {POPULAR_EMOJIS.map(em => (
                              <button
                                key={em}
                                type="button"
                                className="emoji-btn"
                                onClick={() => handleInsertEmoji(em)}
                              >
                                {em}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="meta-toolbar-separator" />

                    <button
                      type="button"
                      className="meta-tool-btn font-bold"
                      onClick={() => applyFormatWrapper('*')}
                      title="Negrita (*texto*)"
                    >
                      <strong>B</strong>
                    </button>

                    <button
                      type="button"
                      className="meta-tool-btn font-italic"
                      onClick={() => applyFormatWrapper('_')}
                      title="Cursiva (_texto_)"
                    >
                      <em>I</em>
                    </button>

                    <button
                      type="button"
                      className="meta-tool-btn font-strikethrough"
                      onClick={() => applyFormatWrapper('~')}
                      title="Tachado (~texto~)"
                    >
                      <s>S</s>
                    </button>

                    <button
                      type="button"
                      className="meta-tool-btn font-code"
                      onClick={() => applyFormatWrapper('```')}
                      title="Monospace (```texto```)"
                    >
                      &lt;/&gt;
                    </button>

                    <div className="meta-toolbar-separator" />

                    <button
                      type="button"
                      className="meta-add-var-btn-toolbar"
                      onClick={handleInsertNextNumericVar}
                      title="Insertar siguiente variable numérica"
                    >
                      <Plus size={14} />
                      <span>Agregar variable</span>
                    </button>
                  </div>

                  {/* Right: Info Circle */}
                  <div className="meta-toolbar-right">
                    <button
                      type="button"
                      className="meta-info-circle-btn"
                      onClick={() => setShowVarInfoTooltip(!showVarInfoTooltip)}
                      title="Información sobre variables"
                    >
                      <Info size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* MUESTRAS DE VARIABLES (Meta Business WhatsApp Variable Samples Card) */}
            <div className="meta-samples-card">
              <div className="meta-samples-header">
                <h4>Muestras de variables</h4>
                <p>
                  Agrega una muestra de cada variable para que Meta pueda revisar la plantilla. Las muestras solo se usan con fines de revisión y no se envían a los clientes. Recuerda no incluir ningún dato del cliente para proteger su privacidad.
                </p>
              </div>

              <div className="meta-samples-section">
                <h5 className="meta-samples-section-title">Cuerpo</h5>

                {placeholders.length > 0 ? (
                  <div className="meta-samples-list">
                    {placeholders.map(key => (
                      <div key={key} className="meta-sample-row">
                        <div className="meta-sample-tag">
                          <span>{`{{${key}}}`}</span>
                        </div>
                        <div className="meta-sample-input-box">
                          <input
                            type="text"
                            placeholder={getDefaultSampleValue(key) || `Muestra para {{${key}}}`}
                            value={previewValues[key] ?? ''}
                            onChange={e => setPreviewValues({ ...previewValues, [key]: e.target.value })}
                            className="custom-input meta-sample-input"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="meta-samples-empty">
                    <span>💡 Agrega variables como <code>{'{{1}}'}</code>, <code>{'{{2}}'}</code> o <code>{'{{nombre}}'}</code> en el cuerpo para llenar muestras de prueba.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="form-group-field">
              <label htmlFor="template-footer">Pie de Página (Opcional)</label>
              <input
                id="template-footer"
                type="text"
                placeholder="WiFi Solution Pro • Atención al Cliente"
                value={form.footer}
                onChange={e => setForm({ ...form, footer: e.target.value })}
                className="custom-input"
              />
            </div>

            {/* Interactive Buttons Section (Meta WhatsApp Cloud API / Manager standard) */}
            <div className="buttons-editor-section" style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ fontWeight: 700, fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <MessageSquare size={17} color="#25d366" />
                  Botones Interactivos Meta ({form.buttons.length}/3)
                </label>
                {form.buttons.length < 3 && (
                  <button type="button" onClick={handleAddButton} className="btn-sm btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <Plus size={14} />
                    <span>+ Agregar Botón</span>
                  </button>
                )}
              </div>

              {form.buttons.length === 0 ? (
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed var(--border)', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                    Sin botones interactivos configurados. Haz clic en <strong>+ Agregar Botón</strong> para añadir botones de enlace web (URL), llamada telefónica, código promocional o respuesta rápida.
                  </p>
                </div>
              ) : (
                <div className="buttons-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {form.buttons.map((btn, idx) => (
                    <div
                      key={btn.id}
                      className="button-item-card"
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      {/* Button Card Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              background: 'rgba(37, 211, 102, 0.15)',
                              color: '#25d366',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            Botón #{idx + 1}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                            Tipo de Acción:
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <select
                            value={btn.type}
                            onChange={e => handleButtonChange(btn.id, 'type', e.target.value)}
                            className="custom-input-sm"
                            style={{ width: '190px', fontWeight: 600, padding: '4px 8px', borderRadius: '6px' }}
                          >
                            <option value="URL">🌐 Enlace Web (URL)</option>
                            <option value="PHONE_NUMBER">📞 Llamada Telefónica</option>
                            <option value="COPY_CODE">📋 Copiar Código</option>
                            <option value="QUICK_REPLY">💬 Respuesta Rápida</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleRemoveButton(btn.id)}
                            className="btn-icon-danger"
                            title="Eliminar botón"
                            style={{ padding: '5px', borderRadius: '6px' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Inputs Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '10px' }}>
                        {/* 1. Button Display Text */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            Texto del Botón (WhatsApp) <span className="required-star">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={
                              btn.type === 'URL'
                                ? 'Ej: Ver Planes / Pagar Web'
                                : btn.type === 'PHONE_NUMBER'
                                ? 'Ej: Llamar a Soporte'
                                : btn.type === 'COPY_CODE'
                                ? 'Ej: Copiar Cupón'
                                : 'Ej: Consultar Saldo'
                            }
                            value={btn.text}
                            onChange={e => handleButtonChange(btn.id, 'text', e.target.value)}
                            className={`custom-input-sm ${btn.text.trim() ? 'is-valid' : hasAttemptedSave ? 'is-invalid' : ''}`}
                            style={{ width: '100%', padding: '6px 10px' }}
                          />
                        </div>

                        {/* 2. Value / URL input with specific label and placeholder */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              color:
                                btn.type === 'URL'
                                  ? '#38bdf8'
                                  : btn.type === 'PHONE_NUMBER'
                                  ? '#34d399'
                                  : btn.type === 'COPY_CODE'
                                  ? '#fbbf24'
                                  : '#a78bfa',
                            }}
                          >
                            {btn.type === 'URL' && (
                              <>
                                <Link size={13} />
                                <span>URL de Destino (Enlace Web) <span className="required-star">*</span></span>
                              </>
                            )}
                            {btn.type === 'PHONE_NUMBER' && (
                              <>
                                <Phone size={13} />
                                <span>Número de Teléfono (+País) <span className="required-star">*</span></span>
                              </>
                            )}
                            {btn.type === 'COPY_CODE' && (
                              <>
                                <Copy size={13} />
                                <span>Código a Copiar (Cupón) <span className="required-star">*</span></span>
                              </>
                            )}
                            {btn.type === 'QUICK_REPLY' && (
                              <>
                                <MessageSquare size={13} />
                                <span>Payload / Clave de Respuesta <span className="required-star">*</span></span>
                              </>
                            )}
                          </label>

                          <input
                            type={btn.type === 'URL' ? 'url' : btn.type === 'PHONE_NUMBER' ? 'tel' : 'text'}
                            required
                            placeholder={
                              btn.type === 'URL'
                                ? 'https://tu-portal.com/pagos'
                                : btn.type === 'PHONE_NUMBER'
                                ? '+584121234567'
                                : btn.type === 'COPY_CODE'
                                ? 'PROMO2026'
                                : 'OPCION_1'
                            }
                            value={btn.value}
                            onChange={e => handleButtonChange(btn.id, 'value', e.target.value)}
                            className={`custom-input-sm ${btn.value.trim() ? 'is-valid' : hasAttemptedSave ? 'is-invalid' : ''}`}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                            }}
                          />
                        </div>
                      </div>

                      {/* Helper Note & Smart Actions for the selected button action */}
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {btn.type === 'URL' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span>🌐 <strong>Enlace Web:</strong> Al tocar este botón en WhatsApp, el usuario abrirá directamente la URL <code>{formatCleanUrl(btn.value) || 'https://...'}</code>.</span>
                            {extractYouTubeThumbnail(btn.value) && (
                              <button
                                type="button"
                                className="var-chip"
                                style={{ alignSelf: 'flex-start', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer', marginTop: '2px' }}
                                onClick={() => {
                                  const thumb = extractYouTubeThumbnail(btn.value);
                                  if (thumb) {
                                    setForm(f => ({ ...f, headerType: 'image', mediaUrl: thumb }));
                                    toast.success('¡Miniatura del video configurada como Imagen de Encabezado!');
                                  }
                                }}
                              >
                                🎬 📸 Usar portada de YouTube como Encabezado Imagen (Plan B)
                              </button>
                            )}
                          </div>
                        )}
                        {btn.type === 'PHONE_NUMBER' && (
                          <span>📞 <strong>Llamada:</strong> Al tocar este botón en WhatsApp, se marcará directamente el número <code>{btn.value || '+58...'}</code>.</span>
                        )}
                        {btn.type === 'COPY_CODE' && (
                          <span>📋 <strong>Copiar Código:</strong> Copia automáticamente <code>{btn.value || 'CODIGO'}</code> al portapapeles del dispositivo del cliente.</span>
                        )}
                        {btn.type === 'QUICK_REPLY' && (
                          <span>💬 <strong>Respuesta Rápida:</strong> Envía el payload <code>{btn.value || 'OPCION'}</code> de vuelta al bot o sistema cuando el cliente lo pulsa.</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="form-action-buttons">
              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <Bookmark size={18} />
                <span>{editingTemplateId ? 'Actualizar Plantilla' : '💾 Guardar Plantilla (Local & Sistema)'}</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={resetForm}
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* Right Column: Live WhatsApp Mobile Preview & cURL Viewer */}
          <div className="editor-preview-column">
            {/* Live WhatsApp Simulation Card */}
            <div className="preview-card">
              <div className="preview-card-header">
                <Smartphone size={18} />
                <span>Vista previa de la plantilla</span>
              </div>

              {/* WhatsApp Phone Mockup matching WhatsApp Web & Meta Portal */}
              <div className="whatsapp-phone-frame">
                <div className="whatsapp-chat-bubble">
                  {/* Media Header Preview */}
                  {form.headerType === 'text' && form.headerText && (
                    <div className="bubble-header-text">
                      {parseWhatsAppFormatting(substituteVariables(form.headerText, previewValues))}
                    </div>
                  )}

                  {form.headerType === 'image' && (
                    <div className="bubble-media-preview">
                      <img
                        src={form.mediaUrl || 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80'}
                        alt="Preview"
                        onError={e => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600x300.png?text=Imagen+Plantilla';
                        }}
                      />
                    </div>
                  )}

                  {form.headerType === 'video' && (
                    <div className="bubble-media-preview video-box">
                      <video src={form.mediaUrl} controls />
                    </div>
                  )}

                  {form.headerType === 'audio' && (
                    <div className="bubble-audio-preview">
                      <Volume2 size={24} className="audio-icon" />
                      <audio src={form.mediaUrl} controls className="audio-player-element" />
                    </div>
                  )}

                  {form.headerType === 'document' && (
                    <div className="bubble-audio-preview" style={{ background: 'rgba(2, 132, 199, 0.15)', color: '#0284c7' }}>
                      <FileText size={24} />
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>Documento Adjunto (PDF)</span>
                    </div>
                  )}

                  {/* Body Content */}
                  <div className="bubble-body-text">
                    {form.body.trim() ? (
                      parseWhatsAppFormatting(substituteVariables(form.body, previewValues))
                    ) : (
                      <span className="placeholder-text">Escribe el cuerpo del mensaje en el editor para previsualizarlo...</span>
                    )}
                  </div>

                  {/* Footer */}
                  {form.footer && (
                    <div className="bubble-footer-text">{form.footer}</div>
                  )}

                  {/* Timestamp & Status */}
                  <div className="bubble-time">
                    <span>{formatCurrentTime()}</span>
                    <span className="check-marks">✓✓</span>
                  </div>
                </div>

                {/* Meta Style Interactive Action Buttons */}
                {form.buttons.length > 0 && (
                  <div className="bubble-buttons-stack">
                    {form.buttons.map(b => (
                      <button key={b.id} className="bubble-action-btn" type="button">
                        {b.type === 'PHONE_NUMBER' && <Phone size={14} />}
                        {b.type === 'URL' && <Link size={14} />}
                        {b.type === 'COPY_CODE' && <Copy size={14} />}
                        {b.type === 'QUICK_REPLY' && <MessageSquare size={14} />}
                        <span>{b.text || (b.type === 'URL' ? 'Ver Enlace Web' : 'Opción')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Send Bar */}
              <div className="quick-send-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontWeight: 600, fontSize: '13px', margin: 0 }}>Enviar prueba por WhatsApp:</label>
                  {placeholders.length > 0 && (
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                      ✓ {placeholders.length} {placeholders.length === 1 ? 'variable resuelta' : 'variables resueltas'}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="tel"
                    placeholder="584121234567"
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    className="custom-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleQuickSend}
                    disabled={isSendingTest}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                  >
                    {isSendingTest ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                    <span>Enviar Prueba</span>
                  </button>
                </div>
                {placeholders.length > 0 && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Se enviará a WhatsApp reemplazando cada variable con los valores de la sección "Muestras de variables".
                  </span>
                )}
              </div>
            </div>

            {/* Real-time cURL Viewer */}
            <div className="curl-viewer-card">
              <div className="curl-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Terminal size={18} className="terminal-icon" />
                  <span style={{ fontWeight: 600 }}>Comando cURL en Tiempo Real</span>
                </div>

                <div className="curl-flavor-tabs">
                  <button
                    className={`flavor-btn ${curlFlavor === 'openwa' ? 'active' : ''}`}
                    onClick={() => setCurlFlavor('openwa')}
                  >
                    OpenWA REST API
                  </button>
                  <button
                    className={`flavor-btn ${curlFlavor === 'meta' ? 'active' : ''}`}
                    onClick={() => setCurlFlavor('meta')}
                  >
                    Meta Cloud API
                  </button>
                </div>
              </div>

              <div className="curl-code-container">
                <pre><code>{liveCurlSnippet}</code></pre>
                <button
                  type="button"
                  className="copy-curl-floating-btn"
                  onClick={handleCopyCurl}
                  title="Copiar cURL"
                >
                  {copiedCurl ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                  <span>{copiedCurl ? '¡Copiado!' : 'Copiar cURL'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MIS PLANTILLAS GUARDADAS */}
      {activeTab === 'my-templates' && (
        <div className="my-templates-view">
          <div className="templates-toolbar">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Buscar por nombre, #código o contenido..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Source Filter Tabs */}
            <div className="source-filter-group" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                type="button"
                className={`pill-filter-btn ${sourceFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSourceFilter('all')}
              >
                Todas ({localTemplates.length})
              </button>
              <button
                type="button"
                className={`pill-filter-btn ${sourceFilter === 'meta' ? 'active meta-pill' : ''}`}
                onClick={() => setSourceFilter('meta')}
              >
                📱 Meta Cloud API ({localTemplates.filter(t => t.source === 'meta').length})
              </button>
              <button
                type="button"
                className={`pill-filter-btn ${sourceFilter === 'local' ? 'active local-pill' : ''}`}
                onClick={() => setSourceFilter('local')}
              >
                🟢 Local ({localTemplates.filter(t => t.source !== 'meta').length})
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
              <button
                className="btn-secondary"
                onClick={handleSyncMetaTemplates}
                disabled={isSyncingMeta}
                title="Consultar y descargar plantillas aprobadas desde Meta Graph API"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isSyncingMeta ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />}
                <span>Sincronizar Meta</span>
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  resetForm();
                  setActiveTab('editor');
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} />
                <span>Nueva Plantilla</span>
              </button>
            </div>
          </div>

          {localTemplates.length === 0 ? (
            <div className="empty-templates-state">
              <Bookmark size={48} />
              <h3>No tienes plantillas guardadas</h3>
              <p>Crea tu primera plantilla, importa desde Meta o carga una desde la galería de ejemplos.</p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button className="btn-primary" onClick={() => setIsMetaPasteModalOpen(true)}>
                  <ClipboardPaste size={16} /> Pegar Plantilla Meta
                </button>
                <button className="btn-secondary" onClick={() => setActiveTab('gallery')}>
                  Ver Galería de Ejemplos
                </button>
              </div>
            </div>
          ) : (
            <div className="templates-cards-grid">
              {localTemplates
                .filter(t => {
                  if (sourceFilter === 'meta' && t.source !== 'meta') return false;
                  if (sourceFilter === 'local' && t.source === 'meta') return false;
                  if (!searchTerm) return true;
                  const term = searchTerm.toLowerCase();
                  return (
                    t.name.toLowerCase().includes(term) ||
                    t.body.toLowerCase().includes(term) ||
                    String(t.templateNumber || '').includes(term)
                  );
                })
                .map(tpl => (
                  <div key={tpl.id} className="template-card">
                    <div className="card-top-header">
                      <div className="badge-group" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="tpl-id-badge" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                          #{tpl.templateNumber || 100}
                        </span>

                        <span
                          className={`source-badge ${tpl.source === 'meta' ? 'source-meta' : 'source-local'}`}
                          style={{
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: tpl.source === 'meta' ? 'rgba(37, 99, 235, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                            color: tpl.source === 'meta' ? '#60a5fa' : '#34d399',
                            border: `1px solid ${tpl.source === 'meta' ? 'rgba(37, 99, 235, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                          }}
                          onClick={() => {
                            const newSource: 'local' | 'meta' = tpl.source === 'meta' ? 'local' : 'meta';
                            const updated: CustomTemplate[] = localTemplates.map(t => (t.id === tpl.id ? { ...t, source: newSource } : t));
                            setLocalTemplates(updated);
                            saveLocalCustomTemplates(updated);
                            toast.info(`Plantilla #${tpl.templateNumber || 100} configurada como: ${newSource === 'meta' ? '🔵 Meta Cloud API' : '🟢 Local'}`);
                          }}
                          title="Haz clic para alternar entre Meta Cloud API y Sesión Local"
                        >
                          {tpl.source === 'meta' ? '🔵 Meta Cloud API' : '🟢 Local'}
                        </span>

                        <span className={`category-tag ${tpl.category.toLowerCase()}`}>{tpl.category}</span>
                        <span className="media-type-tag">
                          {tpl.headerType === 'image' && '🖼️ Imagen'}
                          {tpl.headerType === 'video' && '🎥 Video'}
                          {tpl.headerType === 'audio' && '🎵 Audio'}
                          {tpl.headerType === 'text' && '📝 Texto'}
                          {tpl.headerType === 'none' && '💬 Texto Simple'}
                        </span>
                      </div>
                      <div className="card-top-actions">
                        <button
                          onClick={() => openEdit(tpl)}
                          className="btn-icon"
                          title="Editar plantilla"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(tpl)}
                          className="btn-icon-danger"
                          title="Eliminar plantilla"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <h4 className="template-title" style={{ marginTop: '8px' }}>{tpl.name}</h4>

                    {/* Media Thumbnail */}
                    {tpl.headerType === 'image' && tpl.mediaUrl && (
                      <div className="card-thumb">
                        <img src={tpl.mediaUrl} alt="Thumbnail" />
                      </div>
                    )}

                    {tpl.headerType === 'video' && tpl.mediaUrl && (
                      <div className="card-thumb video-thumb">
                        <Play size={28} />
                        <span>Video MP4</span>
                      </div>
                    )}

                    {tpl.headerType === 'audio' && tpl.mediaUrl && (
                      <div className="card-thumb audio-thumb">
                        <Volume2 size={24} />
                        <span>Audio Mensaje</span>
                      </div>
                    )}

                    <p className="template-body-snippet">{tpl.body}</p>

                    {tpl.footer && <span className="template-footer-snippet">{tpl.footer}</span>}

                    {/* Interactive Buttons Badges in Card */}
                    {tpl.buttons && tpl.buttons.length > 0 && (
                      <div className="card-buttons-preview">
                        {tpl.buttons.map((b, i) => (
                          <div
                            key={b.id || i}
                            className={`card-button-badge ${
                              b.type === 'URL'
                                ? 'badge-url'
                                : b.type === 'PHONE_NUMBER'
                                ? 'badge-phone'
                                : b.type === 'COPY_CODE'
                                ? 'badge-copy'
                                : 'badge-reply'
                            }`}
                          >
                            {b.type === 'URL' && <Link size={12} />}
                            {b.type === 'PHONE_NUMBER' && <Phone size={12} />}
                            {b.type === 'COPY_CODE' && <Copy size={12} />}
                            {b.type === 'QUICK_REPLY' && <MessageSquare size={12} />}
                            <span>{b.text || (b.type === 'URL' ? 'Enlace Web' : 'Opción')}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="card-footer-buttons">
                      <button
                        className="btn-send-tpl"
                        onClick={() => {
                          setTestModalChannel(tpl.source === 'meta' ? 'meta' : 'local');
                          handleOpenTestModal(tpl);
                        }}
                        style={{ flex: 1 }}
                      >
                        <Send size={15} />
                        <span>{tpl.source === 'meta' ? 'Enviar (Meta)' : 'Enviar'}</span>
                      </button>

                      <button
                        className="btn-affiliate-tpl"
                        onClick={() => handleOpenAffiliateModal(tpl)}
                        title="Afiliar al Bot para respuestas automáticas"
                      >
                        <Zap size={14} />
                        <span>Afiliar</span>
                      </button>

                      <button
                        className="btn-curl-tpl"
                        onClick={() => {
                          const curl = tpl.source === 'meta'
                            ? buildMetaCloudCurlSnippet(tpl as any, tpl.defaultVars || {}, '584121234567')
                            : buildOpenWaCurlSnippet(
                                selectedSession?.name || 'sesion-demostracion',
                                '584121234567',
                                tpl as any,
                                tpl.body,
                                tpl.defaultVars || {},
                              );
                          copyToClipboard(curl);
                          toast.success(`cURL (${tpl.source === 'meta' ? 'Meta Cloud API' : 'OpenWA'}) copiado`);
                        }}
                        title="Copiar cURL"
                      >
                        <Terminal size={15} />
                        <span>cURL</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GALERÍA DE EJEMPLOS / META */}
      {activeTab === 'gallery' && (
        <div className="templates-gallery-view">
          <div className="gallery-categories-bar">
            {[
              { id: 'todos', label: '🌟 Todos los Ejemplos' },
              { id: 'soporte', label: '🛠️ Soporte Técnico' },
              { id: 'ventas', label: '🔥 Ventas & Promos' },
              { id: 'facturacion', label: '💳 Cobranzas' },
              { id: 'cumpleanos', label: '🎂 Fidelización' },
              { id: 'vip', label: '🎥 Videos & Multimedia' },
              { id: 'general', label: '🎵 Audios' },
            ].map(cat => (
              <button
                key={cat.id}
                className={`category-pill-btn ${galleryCategory === cat.id ? 'active' : ''}`}
                onClick={() => setGalleryCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="templates-cards-grid">
            {INSPIRATION_TEMPLATES
              .filter(t => galleryCategory === 'todos' || t.category === galleryCategory)
              .map(insp => (
                <div key={insp.id} className="template-card inspiration-card">
                  <div className="card-top-header">
                    <div className="badge-group">
                      <span className="category-tag inspiration">{insp.categoryIcon} {insp.categoryLabel}</span>
                      <span className="media-type-tag">{insp.headerType.toUpperCase()}</span>
                    </div>
                  </div>

                  <h4 className="template-title">{insp.name}</h4>

                  {insp.headerType === 'image' && insp.mediaUrl && (
                    <div className="card-thumb">
                      <img src={insp.mediaUrl} alt="Thumbnail" />
                    </div>
                  )}

                  {insp.headerType === 'video' && insp.mediaUrl && (
                    <div className="card-thumb video-thumb">
                      <Play size={28} />
                      <span>Video Tutorial</span>
                    </div>
                  )}

                  {insp.headerType === 'audio' && insp.mediaUrl && (
                    <div className="card-thumb audio-thumb">
                      <Volume2 size={24} />
                      <span>Mensaje de Audio</span>
                    </div>
                  )}

                  <p className="template-body-snippet">{insp.body}</p>

                  {/* Interactive Buttons Badges in Gallery */}
                  {insp.buttons && insp.buttons.length > 0 && (
                    <div className="card-buttons-preview">
                      {insp.buttons.map((b, i) => (
                        <div
                          key={b.id || i}
                          className={`card-button-badge ${
                            b.type === 'URL'
                              ? 'badge-url'
                              : b.type === 'PHONE_NUMBER'
                              ? 'badge-phone'
                              : b.type === 'COPY_CODE'
                              ? 'badge-copy'
                              : 'badge-reply'
                          }`}
                        >
                          {b.type === 'URL' && <Link size={12} />}
                          {b.type === 'PHONE_NUMBER' && <Phone size={12} />}
                          {b.type === 'COPY_CODE' && <Copy size={12} />}
                          {b.type === 'QUICK_REPLY' && <MessageSquare size={12} />}
                          <span>{b.text || (b.type === 'URL' ? 'Enlace Web' : 'Opción')}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="card-footer-buttons">
                    <button
                      className="btn-load-editor"
                      onClick={() => handleUseInspiration(insp)}
                      style={{ flex: 1 }}
                    >
                      <PenTool size={15} />
                      <span>Cargar</span>
                    </button>

                    <button
                      className="btn-affiliate-tpl"
                      onClick={() => handleOpenAffiliateModal(insp)}
                      title="Afiliar esta plantilla al Bot para respuestas automáticas"
                    >
                      <Zap size={14} />
                      <span>Afiliar a Bot</span>
                    </button>

                    <button
                      className="btn-send-tpl"
                      onClick={() => {
                        setTestModalChannel('local');
                        handleOpenTestModal(insp);
                      }}
                    >
                      <Send size={15} />
                      <span>Probar</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB: META CLOUD API STEP-BY-STEP CONSUMPTION STUDIO */}
      {activeTab === 'meta-webhook' && (
        <div className="meta-webhook-studio" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Top Banner */}
          <div
            className="meta-studio-banner"
            style={{
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(30, 64, 175, 0.08))',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '16px',
              padding: '1.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                }}
              >
                <Globe size={28} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', fontWeight: 800 }}>
                    Centro de Consumo Oficial Meta WhatsApp Cloud API
                  </h3>
                  <span
                    style={{
                      background: 'rgba(37, 99, 235, 0.25)',
                      color: '#60a5fa',
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      border: '1px solid rgba(96, 165, 250, 0.3)',
                    }}
                  >
                    Graph API {metaConfig.apiVersion || 'v20.0'}
                  </span>
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.875rem', color: '#94a3b8', maxWidth: '750px', lineHeight: 1.4 }}>
                  Conecta directamente con Meta Graph API para consumir tus plantillas aprobadas en WhatsApp Business Account (WABA), probar envíos en tiempo real, configurar Webhooks y enrutar las intenciones de tus clientes.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleTestMetaConnection}
                disabled={isTestingMeta}
                style={{
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 600,
                }}
              >
                {isTestingMeta ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}
                <span>Validar Conexión</span>
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleSyncMetaTemplates}
                disabled={isSyncingMeta}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255,255,255,0.08)',
                  fontWeight: 600,
                }}
              >
                {isSyncingMeta ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                <span>Sincronizar Plantillas Meta</span>
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsMetaPasteModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255,255,255,0.08)',
                  fontWeight: 600,
                }}
              >
                <ClipboardPaste size={16} />
                <span>Pegar Formato Meta</span>
              </button>
            </div>
          </div>

          {/* Connection Status Badge Row if verified */}
          {metaConfig.verified && (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.06))',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle2 size={22} color="#10b981" />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.925rem', color: '#34d399' }}>
                      Línea Conectada y Verificada con Meta Graph API
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        color: '#10b981',
                        background: 'rgba(16, 185, 129, 0.25)',
                        padding: '2px 8px',
                        borderRadius: '20px',
                        fontWeight: 700,
                      }}
                    >
                      🟢 Activo Oficial
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: '#cbd5e1', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span>📱 Número Afiliado: <strong>{metaConfig.phoneNumberDisplay || metaConfig.phoneNumberId}</strong></span>
                    {metaConfig.businessName && <span>🏢 Nombre Comercial: <strong>{metaConfig.businessName}</strong></span>}
                    {metaConfig.wabaId && <span>🆔 WABA ID: <strong>{metaConfig.wabaId}</strong></span>}
                    <span>⚡ Versión API: <strong>{metaConfig.apiVersion || 'v20.0'}</strong></span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleSyncMetaTemplates}
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  <RefreshCw size={14} /> Refrescar Plantillas
                </button>
              </div>
            </div>
          )}

          {/* Step-by-Step Progress Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
            }}
          >
            {[
              { step: '1', title: 'Conexión Graph API', desc: 'Credenciales WABA y Token' },
              { step: '2', title: 'Consumo de Plantillas', desc: 'Sincronización 1-Click' },
              { step: '3', title: 'Probador en Vivo', desc: 'Envío real y cURL' },
              { step: '4', title: 'Webhook de Eventos', desc: 'Handshake y Callback' },
              { step: '5', title: 'Enrutador del Bot', desc: 'Matriz de Intenciones' },
            ].map(item => (
              <div
                key={item.step}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    flexShrink: 0,
                  }}
                >
                  {item.step}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.825rem', color: '#fff' }}>{item.title}</div>
                  <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* PASO 1: CREDENCIALES & CONEXION GRAPH API */}
          <div className="editor-form-card" style={{ gap: '1.25rem' }}>
            <div className="card-header-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="step-badge" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>1</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Paso 1: Configurar Credenciales de Meta Graph API</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                    Ingresa tus credenciales obtenidas de la consola de Meta for Developers para conectar tu WhatsApp Business Account oficial.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleSaveMetaConfig(metaConfig)}
                  style={{ padding: '0.4rem 0.9rem', fontSize: '0.825rem' }}
                >
                  💾 Guardar Credenciales
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleTestMetaConnection}
                  disabled={isTestingMeta}
                  style={{ padding: '0.4rem 0.9rem', fontSize: '0.825rem' }}
                >
                  {isTestingMeta ? <Loader2 size={14} className="spin" /> : <ShieldCheck size={14} />} Probar
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div className="form-group-field">
                <label>Phone Number ID (ID de Teléfono en Meta) <span className="required-star">*</span>:</label>
                <input
                  type="text"
                  placeholder="Ej: 109283746591028"
                  value={metaConfig.phoneNumberId}
                  onChange={e => setMetaConfig({ ...metaConfig, phoneNumberId: e.target.value.trim() })}
                  className="custom-input"
                />
                <span className="field-hint">En Meta for Developers &gt; WhatsApp &gt; Inicio rápido.</span>
              </div>

              <div className="form-group-field">
                <label>WhatsApp Business Account ID (WABA ID) <span className="required-star">*</span>:</label>
                <input
                  type="text"
                  placeholder="Ej: 102938475610293"
                  value={metaConfig.wabaId}
                  onChange={e => setMetaConfig({ ...metaConfig, wabaId: e.target.value.trim() })}
                  className="custom-input"
                />
                <span className="field-hint">ID de tu cuenta de WhatsApp Business para consultar plantillas.</span>
              </div>

              <div className="form-group-field" style={{ gridColumn: 'span 2' }}>
                <label>Token de Acceso Permanente / Temporal (Access Token) <span className="required-star">*</span>:</label>
                <input
                  type="password"
                  placeholder="EAAG..."
                  value={metaConfig.accessToken}
                  onChange={e => setMetaConfig({ ...metaConfig, accessToken: e.target.value.trim() })}
                  className="custom-input"
                />
                <span className="field-hint">
                  Token de Usuario del Sistema con permisos <code>whatsapp_business_messaging</code> y <code>whatsapp_business_management</code>.
                </span>
              </div>

              <div className="form-group-field">
                <label>Versión de Graph API:</label>
                <input
                  type="text"
                  placeholder="v20.0"
                  value={metaConfig.apiVersion || 'v20.0'}
                  onChange={e => setMetaConfig({ ...metaConfig, apiVersion: e.target.value.trim() })}
                  className="custom-input"
                />
              </div>
            </div>
          </div>

          {/* PASO 2: CONSUMO Y SINCRONIZACION AUTOMATICA DE PLANTILLAS */}
          <div className="editor-form-card" style={{ gap: '1.25rem' }}>
            <div className="card-header-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="step-badge" style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)' }}>2</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Paso 2: Consumir y Sincronizar Plantillas Oficiales de Meta (1-Click Sync)</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                    Consulta directamente el endpoint <code>/message_templates</code> de tu WABA ID para importar y sincronizar todas las plantillas aprobadas.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSyncMetaTemplates}
                  disabled={isSyncingMeta}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isSyncingMeta ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                  <span>Sincronizar Plantillas ({localTemplates.filter(t => t.source === 'meta').length})</span>
                </button>
              </div>
            </div>

            {/* Filter Bar for Meta Templates */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Categoría:</span>
                {(['all', 'UTILITY', 'MARKETING', 'AUTHENTICATION'] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`pill-filter-btn ${metaCategoryFilter === cat ? 'active meta-pill' : ''}`}
                    onClick={() => setMetaCategoryFilter(cat)}
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  >
                    {cat === 'all' ? 'Todas' : cat}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Estado en Meta:</span>
                {(['all', 'APPROVED', 'PENDING', 'REJECTED'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    className={`pill-filter-btn ${metaStatusFilter === st ? 'active' : ''}`}
                    onClick={() => setMetaStatusFilter(st)}
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  >
                    {st === 'all' ? 'Todos' : st === 'APPROVED' ? '🟢 Aprobadas' : st === 'PENDING' ? '🟡 En Revisión' : '🔴 Rechazadas'}
                  </button>
                ))}
              </div>
            </div>

            {/* Meta Synced Templates Grid */}
            {localTemplates.filter(t => t.source === 'meta').length === 0 ? (
              <div
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                  <RefreshCw size={24} />
                </div>
                <h4 style={{ margin: 0, color: '#fff', fontSize: '1.05rem' }}>No has sincronizado plantillas de Meta aún</h4>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem', maxWidth: '500px' }}>
                  Asegúrate de ingresar tu <strong>WABA ID</strong> y <strong>Access Token</strong> en el Paso 1 y haz clic en <em>"Sincronizar Plantillas Meta"</em> para traer todas tus plantillas aprobadas.
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSyncMetaTemplates}
                  disabled={isSyncingMeta}
                  style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', marginTop: '6px' }}
                >
                  {isSyncingMeta ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                  <span>Sincronizar Ahora</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {localTemplates
                  .filter(t => t.source === 'meta')
                  .filter(t => (metaCategoryFilter === 'all' ? true : t.category === metaCategoryFilter))
                  .filter(t => (metaStatusFilter === 'all' ? true : (t.metaStatus || 'APPROVED') === metaStatusFilter))
                  .map(tpl => {
                    const varsCount = Object.keys(tpl.defaultVars || {}).length;
                    return (
                      <div
                        key={tpl.id}
                        className="template-card"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          borderRadius: '12px',
                          padding: '1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#60a5fa', background: 'rgba(37, 99, 235, 0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                                #{tpl.templateNumber || 100}
                              </span>
                              <strong style={{ fontSize: '0.95rem', color: '#fff' }}>{tpl.name}</strong>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>{tpl.category}</span>
                              <span style={{ fontSize: '0.7rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '1px 6px', borderRadius: '10px' }}>
                                {tpl.metaStatus || 'APPROVED'}
                              </span>
                              {varsCount > 0 && (
                                <span style={{ fontSize: '0.7rem', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.15)', padding: '1px 6px', borderRadius: '10px' }}>
                                  {varsCount} {varsCount === 1 ? 'Variable' : 'Variables'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Snippet */}
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: '#e2e8f0',
                            background: 'rgba(0,0,0,0.25)',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            maxHeight: '90px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1.4,
                          }}
                        >
                          {tpl.body}
                        </div>

                        {/* Buttons badge */}
                        {tpl.buttons && tpl.buttons.length > 0 && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {tpl.buttons.map(b => (
                              <span
                                key={b.id}
                                style={{
                                  fontSize: '0.7rem',
                                  background: 'rgba(255,255,255,0.06)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  color: '#cbd5e1',
                                }}
                              >
                                {b.type === 'URL' ? '🌐' : b.type === 'PHONE_NUMBER' ? '📞' : b.type === 'COPY_CODE' ? '📋' : '💬'} {b.text}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <button
                            type="button"
                            className="btn-load-editor"
                            onClick={() => {
                              openEdit(tpl);
                              setActiveTab('editor');
                            }}
                            style={{ flex: 1, padding: '5px 8px', fontSize: '0.78rem' }}
                          >
                            <PenTool size={13} /> Cargar
                          </button>
                          <button
                            type="button"
                            className="btn-send-tpl"
                            onClick={() => {
                              setSelectedMetaTplForTest(tpl);
                              setMetaDirectTestVars(tpl.defaultVars || {});
                            }}
                            style={{ flex: 1, padding: '5px 8px', fontSize: '0.78rem', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff' }}
                          >
                            <Send size={13} /> Probar
                          </button>
                          <button
                            type="button"
                            className="btn-affiliate-tpl"
                            onClick={() => handleOpenAffiliateModal(tpl)}
                            style={{ padding: '5px 8px', fontSize: '0.78rem' }}
                            title="Afiliar al Bot"
                          >
                            <Zap size={13} /> Afiliar
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* PASO 3: PROBADOR DE ENVIO DIRECTO POR META GRAPH API */}
          <div className="editor-form-card" style={{ gap: '1.25rem' }}>
            <div className="card-header-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="step-badge" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>3</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Paso 3: Probador de Envío Directo por Meta Graph API</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                    Envía un mensaje de prueba oficial consumiendo el endpoint <code>/{metaConfig.phoneNumberId || '{PHONE_NUMBER_ID}'}/messages</code> con sustitución de variables en tiempo real.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem', alignItems: 'start' }}>
              {/* Left: Test Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group-field">
                  <label>Plantilla de Meta Seleccionada:</label>
                  <select
                    value={selectedMetaTplForTest?.id || ''}
                    onChange={e => {
                      const found = localTemplates.find(t => t.id === e.target.value);
                      if (found) {
                        setSelectedMetaTplForTest(found);
                        setMetaDirectTestVars(found.defaultVars || {});
                        setMetaDirectResult(null);
                      }
                    }}
                    className="custom-input"
                    style={{ fontWeight: 600 }}
                  >
                    <option value="">-- Selecciona una plantilla de Meta --</option>
                    {localTemplates
                      .filter(t => t.source === 'meta')
                      .map(t => (
                        <option key={t.id} value={t.id}>
                          #{t.templateNumber || 100} - {t.name} ({t.category})
                        </option>
                      ))}
                  </select>
                </div>

                {selectedMetaTplForTest && (
                  <>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#60a5fa', display: 'block', marginBottom: '6px' }}>
                        Cuerpo de la Plantilla ({selectedMetaTplForTest.name}):
                      </strong>
                      <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                        {selectedMetaTplForTest.body}
                      </div>
                    </div>

                    {/* Dynamic Variable Inputs */}
                    {Object.keys(selectedMetaTplForTest.defaultVars || {}).length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#fbbf24' }}>
                          Variables Dinámicas Requeridas:
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          {Object.keys(selectedMetaTplForTest.defaultVars || {}).map(varKey => (
                            <div key={varKey} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                                &#123;&#123;{varKey}&#125;&#125;:
                              </span>
                              <input
                                type="text"
                                value={metaDirectTestVars[varKey] ?? ''}
                                onChange={e => setMetaDirectTestVars({ ...metaDirectTestVars, [varKey]: e.target.value })}
                                placeholder={`Valor para {{${varKey}}}`}
                                className="custom-input-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="form-group-field">
                  <label>Número de Teléfono Receptor (+País):</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="tel"
                      value={metaDirectTestPhone}
                      onChange={e => setMetaDirectTestPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="584121234567"
                      className="custom-input"
                      style={{ flex: 1, fontFamily: 'monospace', fontWeight: 600 }}
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleSendMetaDirect}
                      disabled={isSendingMetaDirect || !selectedMetaTplForTest}
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isSendingMetaDirect ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                      <span>🚀 Disparar Envío Real Meta</span>
                    </button>
                  </div>
                </div>

                {/* Test Result Display */}
                {metaDirectResult && (
                  <div
                    style={{
                      background: metaDirectResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      border: `1px solid ${metaDirectResult.success ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                      borderRadius: '10px',
                      padding: '12px',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: metaDirectResult.success ? '#34d399' : '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {metaDirectResult.success ? <CheckCircle2 size={16} /> : <X size={16} />}
                      {metaDirectResult.success ? `¡Mensaje enviado exitosamente! WAMID: ${metaDirectResult.messageId || 'OK'}` : `Error de Meta Graph API: ${metaDirectResult.error}`}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: cURL Generator */}
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.825rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Terminal size={14} /> cURL Oficial de Meta Graph API
                  </span>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={async () => {
                      if (!selectedMetaTplForTest) return;
                      const curlStr = buildMetaCloudCurlSnippet(
                        {
                          name: selectedMetaTplForTest.name,
                          category: selectedMetaTplForTest.category,
                          headerType: selectedMetaTplForTest.headerType,
                          headerText: selectedMetaTplForTest.headerText,
                          mediaUrl: selectedMetaTplForTest.mediaUrl,
                          body: selectedMetaTplForTest.body,
                          footer: selectedMetaTplForTest.footer,
                          buttons: selectedMetaTplForTest.buttons,
                        },
                        metaDirectTestVars,
                        metaDirectTestPhone,
                      );
                      await copyToClipboard(curlStr);
                      toast.success('cURL de Meta copiado al portapapeles');
                    }}
                    style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                  >
                    <Copy size={13} /> Copiar
                  </button>
                </div>

                <pre
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    padding: '10px',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    color: '#e2e8f0',
                    overflowX: 'auto',
                    margin: 0,
                    fontFamily: 'monospace',
                    lineHeight: 1.4,
                  }}
                >
                  <code>
                    {selectedMetaTplForTest
                      ? buildMetaCloudCurlSnippet(
                          {
                            name: selectedMetaTplForTest.name,
                            category: selectedMetaTplForTest.category,
                            headerType: selectedMetaTplForTest.headerType,
                            headerText: selectedMetaTplForTest.headerText,
                            mediaUrl: selectedMetaTplForTest.mediaUrl,
                            body: selectedMetaTplForTest.body,
                            footer: selectedMetaTplForTest.footer,
                            buttons: selectedMetaTplForTest.buttons,
                          },
                          metaDirectTestVars,
                          metaDirectTestPhone,
                        )
                      : '# Selecciona una plantilla para ver el comando cURL'}
                  </code>
                </pre>
              </div>
            </div>
          </div>

          {/* PASO 4: CONFIGURACION DE WEBHOOK */}
          <div className="editor-form-card" style={{ gap: '1.25rem' }}>
            <div className="card-header-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="step-badge" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>4</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Paso 4: Configuración del Webhook de Meta (Handshake & Eventos)</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                    Recibe mensajes entrantes de clientes y cambios de estado de plantillas en tiempo real.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group-field">
                  <label>URL de Retorno del Webhook (Callback URL):</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      readOnly
                      value={metaConfig.webhookUrl || `${window.location.origin}/api/ingress/whatsapp-cloud/default/events`}
                      className="custom-input"
                      style={{ background: 'rgba(0,0,0,0.2)', fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={async () => {
                        const url = metaConfig.webhookUrl || `${window.location.origin}/api/ingress/whatsapp-cloud/default/events`;
                        await copyToClipboard(url);
                        toast.success('URL del Webhook copiada');
                      }}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <Copy size={14} /> Copiar
                    </button>
                  </div>
                  <span className="field-hint">Pega esta URL en Meta for Developers &gt; WhatsApp &gt; Configuración &gt; Webhook.</span>
                </div>

                <div className="form-group-field">
                  <label>Token de Verificación del Webhook (Verify Token):</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={metaConfig.verifyToken}
                      onChange={e => setMetaConfig({ ...metaConfig, verifyToken: e.target.value.trim() })}
                      className="custom-input"
                      style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={async () => {
                        await copyToClipboard(metaConfig.verifyToken);
                        toast.success('Token de verificación copiado');
                      }}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <Copy size={14} /> Copiar
                    </button>
                  </div>
                  <span className="field-hint">Token secreto que Meta valida en el handshake GET (<code>hub.verify_token</code>).</span>
                </div>
              </div>

              {/* Step by Step Guide Box */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', fontSize: '0.825rem', color: '#94a3b8', lineHeight: 1.5 }}>
                <strong style={{ color: '#fff', display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                  🚀 Guía Rápida para Meta Developers:
                </strong>
                <ol style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>Ingresa a <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>developers.facebook.com</a> y entra a tu App.</li>
                  <li>En el menú lateral ve a <strong>WhatsApp &gt; Configuración &gt; Webhook</strong>.</li>
                  <li>Haz clic en <strong>"Editar"</strong>, pega la <strong>URL de Retorno</strong> y el <strong>Token de Verificación</strong> y presiona <em>"Verificar y Guardar"</em>.</li>
                  <li>En <strong>Campos de suscripción de Webhook</strong>, activa <code>messages</code> y <code>message_template_status_update</code>.</li>
                </ol>
              </div>
            </div>
          </div>

          {/* PASO 5: ENRUTAMIENTO INTELIGENTE DEL BOT */}
          <div className="editor-form-card" style={{ gap: '1.25rem' }}>
            <div className="card-header-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="step-badge" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>5</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Paso 5: Enrutamiento Inteligente del Bot (Consumir Meta vs Local)</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                    Define qué plantilla de Meta o Local responde a cada intención detectada en las conversaciones de WhatsApp.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const currentConf = getSessionAiConfig('default_session');
                  saveSessionAiConfig({
                    ...currentConf,
                    templateTriggers: flowTriggers,
                  });
                  toast.success('¡Reglas de flujo y enrutamiento guardadas exitosamente!');
                }}
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
              >
                <Check size={16} /> Guardar Reglas de Flujo
              </button>
            </div>

            {/* Matrix Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', color: '#94a3b8' }}>Intención del Usuario</th>
                    <th style={{ padding: '10px 12px', color: '#94a3b8' }}>Plantilla Asignada (#ID y Título)</th>
                    <th style={{ padding: '10px 12px', color: '#94a3b8' }}>Canal de Despacho</th>
                    <th style={{ padding: '10px 12px', color: '#94a3b8' }}>Modo de Respuesta</th>
                    <th style={{ padding: '10px 12px', color: '#94a3b8' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { intent: 'greeting', label: '👋 Saludo & Bienvenida', defaultNum: 101, defaultName: 'Bienvenida Oficial' },
                    { intent: 'balance', label: '💳 Consulta de Saldo & Facturas', defaultNum: 102, defaultName: 'Estado de Cuenta' },
                    { intent: 'plans', label: '⚡ Planes & Tarifas de Internet', defaultNum: 103, defaultName: 'Catálogo de Planes' },
                    { intent: 'support', label: '🛠️ Soporte Técnico & Fallas', defaultNum: 104, defaultName: 'Diagnóstico y Ticket' },
                    { intent: 'agent', label: '👤 Asesor Humano', defaultNum: 105, defaultName: 'Transferencia Humana' },
                    { intent: 'custom', label: '🎯 Personalizado / Otras', defaultNum: 106, defaultName: 'Respuesta General' },
                  ].map(row => {
                    const trig = flowTriggers.find(t => t.intentType === row.intent) || {
                      id: `trig_${row.intent}`,
                      templateNumber: row.defaultNum,
                      enabled: true,
                      name: row.defaultName,
                      intentType: row.intent as TriggerIntentType,
                      keywords: [row.intent],
                      templateName: row.defaultName,
                      headerType: 'text',
                      body: 'Mensaje asignado',
                      action: 'send_template',
                      source: row.intent === 'greeting' || row.intent === 'support' ? 'meta' : 'local',
                    };

                    return (
                      <tr key={row.intent} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#fff' }}>
                          {row.label}
                        </td>

                        <td style={{ padding: '10px 12px' }}>
                          <select
                            value={trig.templateNumber || row.defaultNum}
                            onChange={e => {
                              const num = parseInt(e.target.value, 10);
                              const matched = localTemplates.find(t => t.templateNumber === num);
                              const updated = flowTriggers.map(t => {
                                if (t.intentType === row.intent) {
                                  return {
                                    ...t,
                                    templateNumber: num,
                                    templateName: matched ? matched.name : t.templateName,
                                    body: matched ? matched.body : t.body,
                                    headerType: matched ? matched.headerType : t.headerType,
                                    source: matched?.source || t.source || 'local',
                                  };
                                }
                                return t;
                              });
                              if (!flowTriggers.some(t => t.intentType === row.intent)) {
                                updated.push({
                                  ...trig,
                                  templateNumber: num,
                                  templateName: matched ? matched.name : trig.templateName,
                                  body: matched ? matched.body : trig.body,
                                  headerType: matched ? matched.headerType : trig.headerType,
                                  source: matched?.source || trig.source || 'local',
                                });
                              }
                              setFlowTriggers(updated);
                            }}
                            className="custom-input-sm"
                            style={{ width: '240px', fontWeight: 600 }}
                          >
                            <option value={row.defaultNum}>#{row.defaultNum} - {row.defaultName} (Predeterminada)</option>
                            {localTemplates.map(tpl => (
                              <option key={tpl.id} value={tpl.templateNumber || 100}>
                                #{tpl.templateNumber || 100} - {tpl.name} ({tpl.source === 'meta' ? '🔵 Meta' : '🟢 Local'})
                              </option>
                            ))}
                          </select>
                        </td>

                        <td style={{ padding: '10px 12px' }}>
                          <select
                            value={trig.source || 'local'}
                            onChange={e => {
                              const src = e.target.value as 'meta' | 'local';
                              const updated = flowTriggers.map(t => (t.intentType === row.intent ? { ...t, source: src } : t));
                              setFlowTriggers(updated);
                            }}
                            className="custom-input-sm"
                            style={{
                              width: '180px',
                              fontWeight: 700,
                              color: trig.source === 'meta' ? '#60a5fa' : '#34d399',
                              background: trig.source === 'meta' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            }}
                          >
                            <option value="meta">🔵 Meta WhatsApp Cloud API</option>
                            <option value="local">🟢 Local (Sesión WhatsApp Web)</option>
                          </select>
                        </td>

                        <td style={{ padding: '10px 12px' }}>
                          <select
                            value={trig.action || 'send_template'}
                            onChange={e => {
                              const act = e.target.value as any;
                              const updated = flowTriggers.map(t => (t.intentType === row.intent ? { ...t, action: act } : t));
                              setFlowTriggers(updated);
                            }}
                            className="custom-input-sm"
                            style={{ width: '150px' }}
                          >
                            <option value="send_template">⚡ Solo Plantilla</option>
                            <option value="ai_hybrid">✨ Híbrido IA</option>
                            <option value="pure_ai">🤖 Solo IA</option>
                          </select>
                        </td>

                        <td style={{ padding: '10px 12px' }}>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={trig.enabled !== false}
                              onChange={e => {
                                const updated = flowTriggers.map(t => (t.intentType === row.intent ? { ...t, enabled: e.target.checked } : t));
                                setFlowTriggers(updated);
                              }}
                            />
                            <span className="slider round"></span>
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: FLUJOS DE ROLES & API (n8n Style) */}
      {activeTab === 'flow-builder' && (
        <RoleFlowBuilder
          localTemplates={localTemplates}
          onSelectTemplateForEdit={(tplId) => {
            const found = localTemplates.find((t) => t.id === tplId);
            if (found) {
              openEdit(found);
              setActiveTab('editor');
            }
          }}
        />
      )}

      {/* AFFILIATE TO BOT MODAL */}
      {affiliateTarget && (
        <Modal
          open
          onClose={() => setAffiliateTarget(null)}
          title={`⚡ Afiliar Plantilla a Bot: ${affiliateTarget.name}`}
          className="affiliate-modal"
          closeLabel="Cerrar"
          footer={
            <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setAffiliateTarget(null)}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleSaveAffiliation}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Check size={16} />
                <span>Guardar y Afiliar al Bot</span>
              </button>
            </div>
          }
        >
          <div className="affiliate-modal-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.4 }}>
              Asocia esta plantilla para que el chatbot la use de forma dinámica cuando un cliente consulte sobre este tema.
            </p>

            <div className="form-group-field">
              <label style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px', display: 'block', color: 'var(--text-primary)' }}>
                Sesión / Número WhatsApp de Destino:
              </label>
              <select
                value={affiliateSessionId}
                onChange={e => setAffiliateSessionId(e.target.value)}
                className="custom-input"
              >
                <option value="*">🌟 Todas las Sesiones / Bots Globales</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    📱 {s.name} ({s.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group-field">
              <label style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px', display: 'block', color: 'var(--text-primary)' }}>
                Intención o Evento Disparador (Trigger):
              </label>
              <select
                value={affiliateIntent}
                onChange={e => setAffiliateIntent(e.target.value as TriggerIntentType)}
                className="custom-input"
              >
                <option value="greeting">👋 Saludo & Bienvenida Automática (hola, buenos días, inicio, menú)</option>
                <option value="balance">💳 Consulta de Saldo & Facturas (saldo, deuda, factura, pagar, corte)</option>
                <option value="plans">⚡ Planes & Tarifas de Internet (planes, precios, megas, fibra, contratar)</option>
                <option value="support">🛠️ Soporte Técnico & Fallas (soporte, falla, sin internet, lento, avería)</option>
                <option value="agent">👤 Transferencia a Asesor Humano (asesor, humano, operador, agente)</option>
                <option value="custom">🎯 Trigger Personalizado</option>
              </select>
            </div>

            <div className="form-group-field">
              <label style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px', display: 'block', color: 'var(--text-primary)' }}>
                Acción del Chatbot al Detectar la Intención:
              </label>
              <select
                value={affiliateAction}
                onChange={e => setAffiliateAction(e.target.value as any)}
                className="custom-input"
              >
                <option value="send_template">⚡ Envío Directo: Despachar la plantilla oficial con variables resueltas</option>
                <option value="ai_hybrid">✨ Híbrido IA: La IA redacta la respuesta usando los datos de esta plantilla</option>
              </select>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#34d399' }}>
              ✓ Al afiliarse, la IA reconocerá automáticamente las palabras clave y la intención semántica del cliente en WhatsApp para entregar esta respuesta enriquecida.
            </div>
          </div>
        </Modal>
      )}

      {/* LIVE SEND TEST MODAL */}
      {testModalTemplate && (
        <Modal
          open
          onClose={() => setTestModalTemplate(null)}
          title={`🚀 Enviar Plantilla: ${testModalTemplate.name}`}
          className="test-send-modal"
          closeLabel="Cerrar"
          footer={
            <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setTestModalTemplate(null)}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleModalSend}
                disabled={isModalSending}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: testModalChannel === 'meta' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'linear-gradient(135deg, #10b981, #059669)',
                }}
              >
                {isModalSending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                <span>{testModalChannel === 'meta' ? 'Enviar vía Meta Cloud API' : 'Enviar por WhatsApp Local'}</span>
              </button>
            </div>
          }
        >
          <div className="test-modal-content">
            {/* Channel Selection */}
            <div className="form-group-field" style={{ marginBottom: '12px' }}>
              <label style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe size={15} color="#2563eb" />
                <span>Canal de Envío / Proveedor:</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  className={`tab-btn ${testModalChannel === 'meta' ? 'active' : ''}`}
                  onClick={() => setTestModalChannel('meta')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: testModalChannel === 'meta' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    border: '1px solid ' + (testModalChannel === 'meta' ? '#3b82f6' : 'var(--border)'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <Globe size={14} />
                  <span>🔵 Meta WhatsApp Cloud API</span>
                </button>
                <button
                  type="button"
                  className={`tab-btn ${testModalChannel === 'local' ? 'active' : ''}`}
                  onClick={() => setTestModalChannel('local')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: testModalChannel === 'local' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    border: '1px solid ' + (testModalChannel === 'local' ? '#10b981' : 'var(--border)'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <Smartphone size={14} />
                  <span>🟢 Sesión Local WhatsApp</span>
                </button>
              </div>
              <div style={{ marginTop: '6px', fontSize: '11px', color: testModalChannel === 'meta' ? '#60a5fa' : '#34d399' }}>
                {testModalChannel === 'meta' ? (
                  <span>
                    ℹ️ Consumirá la plantilla oficial en Meta Graph API con el Phone Number ID (<code>{metaConfig.phoneNumberId || 'No configurado'}</code>).
                  </span>
                ) : (
                  <span>
                    ℹ️ Se enviará a través de la sesión de WhatsApp Web conectada ({selectedSession?.name || 'sesión activa'}).
                  </span>
                )}
              </div>
            </div>

            <div className="form-group-field">
              <label>Número de WhatsApp Destino (con código de país):</label>
              <input
                type="tel"
                placeholder="584121234567"
                value={testModalPhone}
                onChange={e => setTestModalPhone(e.target.value.replace(/[^0-9]/g, ''))}
                className="custom-input"
              />
            </div>

            {Object.keys(testModalVars).length > 0 && (
              <div className="modal-vars-box">
                <label style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', display: 'block' }}>
                  Valores de Variables:
                </label>
                <div className="modal-vars-grid">
                  {Object.keys(testModalVars).map(k => (
                    <div key={k} className="var-item">
                      <span className="var-label">&#123;&#123;{k}&#125;&#125;</span>
                      <input
                        type="text"
                        value={testModalVars[k]}
                        placeholder={`Valor para ${k}`}
                        onChange={e => setTestModalVars({ ...testModalVars, [k]: e.target.value })}
                        className="custom-input-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-rendered-preview">
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Mensaje que se enviará por WhatsApp (idéntico al previo):</span>
              <div className="preview-bubble" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
                {buildFullWhatsAppFormattedText(testModalTemplate as any, testModalVars, false)}
              </div>
              {Boolean(testModalTemplate && 'buttons' in testModalTemplate && testModalTemplate.buttons && testModalTemplate.buttons.length > 0) && (
                <div className="bubble-buttons-stack" style={{ marginTop: '8px' }}>
                  {((testModalTemplate as any).buttons || []).map((b: TemplateButton) => (
                    <button key={b.id} className="bubble-action-btn" type="button">
                      {b.type === 'PHONE_NUMBER' && <Phone size={14} />}
                      {b.type === 'URL' && <Link size={14} />}
                      {b.type === 'COPY_CODE' && <Copy size={14} />}
                      {b.type === 'QUICK_REPLY' && <MessageSquare size={14} />}
                      <span>{b.text || (b.type === 'URL' ? 'Ver Enlace Web' : 'Opción')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-curl-snippet">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  cURL {testModalChannel === 'meta' ? 'Meta Cloud API' : 'OpenWA REST API'}:
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const snippet = testModalChannel === 'meta'
                      ? buildMetaCloudCurlSnippet(testModalTemplate as any, testModalVars, testModalPhone)
                      : buildOpenWaCurlSnippet(
                          selectedSession?.name || 'sesion-demostracion',
                          testModalPhone,
                          testModalTemplate as any,
                          buildFullWhatsAppFormattedText(testModalTemplate as any, testModalVars, true),
                          testModalVars,
                        );
                    await copyToClipboard(snippet);
                    setTestModalCopiedCurl(true);
                    setTimeout(() => setTestModalCopiedCurl(false), 2000);
                  }}
                  className="btn-icon-copy"
                >
                  {testModalCopiedCurl ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  <span>{testModalCopiedCurl ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
              <pre>
                <code>
                  {testModalChannel === 'meta'
                    ? buildMetaCloudCurlSnippet(testModalTemplate as any, testModalVars, testModalPhone)
                    : buildOpenWaCurlSnippet(
                        selectedSession?.name || 'sesion-demostracion',
                        testModalPhone,
                        testModalTemplate as any,
                        buildFullWhatsAppFormattedText(testModalTemplate as any, testModalVars, true),
                        testModalVars,
                      )}
                </code>
              </pre>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteTarget && (
        <Modal
          open
          onClose={() => setDeleteTarget(null)}
          title="Eliminar Plantilla"
          className="confirm-modal"
          closeLabel="Cerrar"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </button>
              <button className="btn-danger" onClick={() => handleDelete(deleteTarget)}>
                Eliminar
              </button>
            </>
          }
        >
          <p>
            ¿Estás seguro de que deseas eliminar la plantilla <strong>"{deleteTarget.name}"</strong>?
          </p>
        </Modal>
      )}

      {/* META PASTE MODAL */}
      {isMetaPasteModalOpen && (
        <Modal
          open
          onClose={() => setIsMetaPasteModalOpen(false)}
          title="Importar Plantilla de Meta WhatsApp / Cloud API"
          className="meta-paste-modal"
          closeLabel="Cerrar"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setIsMetaPasteModalOpen(false)}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleImportFromMeta}
                disabled={!metaRawInput.trim()}
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', color: '#fff' }}
              >
                <Check size={16} />
                <span>Importar y Guardar Plantilla</span>
              </button>
            </>
          }
        >
          <div className="meta-paste-dialog-content">
            <p className="field-hint" style={{ marginBottom: '12px' }}>
              Pega el JSON oficial de Meta Graph API / WhatsApp Cloud API, o el texto de la plantilla creado en WhatsApp Business Manager con variables <code>{'{{1}}'}</code>, <code>{'{{2}}'}</code> o nombres directos.
            </p>
            <textarea
              rows={8}
              className="custom-textarea meta-paste-textarea"
              value={metaRawInput}
              onChange={e => setMetaRawInput(e.target.value)}
              placeholder={`Ejemplo de Payload JSON de Meta:\n{\n  "name": "aviso_pago_vencido",\n  "category": "UTILITY",\n  "components": [\n    { "type": "HEADER", "format": "TEXT", "text": "💳 ESTADO DE CUENTA" },\n    { "type": "BODY", "text": "Estimado(a) {{1}}, le recordamos que su saldo pendiente es de {{2}}." },\n    { "type": "FOOTER", "text": "WiFi Solution Pro" },\n    { "type": "BUTTONS", "buttons": [{ "type": "QUICK_REPLY", "text": "Reportar Pago" }] }\n  ]\n}`}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.82rem', padding: '10px' }}
            />

            {metaRawInput.trim() && parseMetaTemplateInput(metaRawInput) && (
              <div style={{ marginTop: '12px', padding: '10px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--info, #3b82f6)', fontWeight: 600, fontSize: '0.82rem', marginBottom: '6px' }}>
                  <Sparkles size={14} />
                  <span>Plantilla Detectada: {parseMetaTemplateInput(metaRawInput)?.name}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  <p style={{ margin: '2px 0' }}><strong>Tipo Encabezado:</strong> {parseMetaTemplateInput(metaRawInput)?.headerType.toUpperCase()}</p>
                  <p style={{ margin: '2px 0' }}><strong>Cuerpo:</strong> {parseMetaTemplateInput(metaRawInput)?.body}</p>
                  {parseMetaTemplateInput(metaRawInput)?.buttons && (parseMetaTemplateInput(metaRawInput)?.buttons.length || 0) > 0 && (
                    <p style={{ margin: '2px 0' }}><strong>Botones:</strong> {parseMetaTemplateInput(metaRawInput)?.buttons.map(b => b.text).join(' • ')}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Templates;
