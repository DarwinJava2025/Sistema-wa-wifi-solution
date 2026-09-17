import { useEffect, useMemo, useState } from 'react';
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
  LayoutGrid,
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
} from 'lucide-react';
import { type MessageTemplate, type TemplatePayload, messageApi } from '../services/api';
import {
  getSessionAiConfig,
  saveSessionAiConfig,
  getDefaultTemplateTriggers,
  type TemplateTriggerMapping,
  type TriggerIntentType,
} from '../services/aiAssistant';
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
  type: 'URL' | 'PHONE_NUMBER' | 'QUICK_REPLY';
  text: string;
  value: string;
}

export interface CustomTemplate {
  id: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface TemplateForm {
  name: string;
  category: MetaCategory;
  headerType: HeaderType;
  headerText: string;
  mediaUrl: string;
  body: string;
  footer: string;
  buttons: TemplateButton[];
}

const emptyForm: TemplateForm = {
  name: '',
  category: 'UTILITY',
  headerType: 'none',
  headerText: '',
  mediaUrl: '',
  body: '',
  footer: '',
  buttons: [],
};

interface InspirationTemplate {
  id: string;
  category: 'soporte' | 'ventas' | 'facturacion' | 'cumpleanos' | 'vip' | 'general';
  categoryLabel: string;
  categoryIcon: string;
  metaCategory: MetaCategory;
  name: string;
  headerType: HeaderType;
  headerText?: string;
  mediaUrl?: string;
  body: string;
  footer: string;
  buttons?: TemplateButton[];
  defaultVars: Record<string, string>;
}

const INSPIRATION_TEMPLATES: InspirationTemplate[] = [
  {
    id: 'insp_1',
    category: 'soporte',
    categoryLabel: 'Soporte Técnico',
    categoryIcon: '🛠️',
    metaCategory: 'UTILITY',
    name: 'Aviso de Mantenimiento & Solución',
    headerType: 'text',
    headerText: '🛠️ COMUNICADO DE SOPORTE TÉCNICO',
    body: 'Estimado(a) {{nombre}}, le informamos que las labores de mantenimiento en la zona {{zona}} han finalizado exitosamente. Su enlace de fibra óptica se encuentra 100% operativo.\n\nSi presenta lentitud, por favor reinicie su módem por 30 segundos. Ticket asociado: #{{ticket}}.',
    footer: 'WiFi Solution Pro • Soporte 24/7',
    buttons: [
      { id: 'b1', type: 'PHONE_NUMBER', text: 'Llamar a Soporte', value: '+584121234567' },
      { id: 'b2', type: 'QUICK_REPLY', text: 'Servicio Operativo', value: 'OPERATIVO' },
    ],
    defaultVars: {
      nombre: 'Carlos Mendoza',
      zona: 'Sector Norte',
      ticket: 'ST-4821',
    },
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
      // Seed default inspiration as initial custom templates
      const seeded: CustomTemplate[] = INSPIRATION_TEMPLATES.map(t => ({
        id: `tpl_${t.id}`,
        name: t.name,
        category: t.metaCategory,
        headerType: t.headerType,
        headerText: t.headerText || '',
        mediaUrl: t.mediaUrl || '',
        body: t.body,
        footer: t.footer,
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
  return Array.from(new Set(Array.from(source.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g), match => match[1]))).sort();
}

function renderPreview(template: { headerText?: string; header?: string | null; body: string; footer?: string | null }, values: Record<string, string>): string {
  const rawHeader = template.headerText || template.header || '';
  return [rawHeader, template.body, template.footer]
    .filter(Boolean)
    .join('\n\n')
    .replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => values[key] || `{{${key}}}`);
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
      url: form.mediaUrl || 'https://via.placeholder.com/600x400.png',
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
      parameters: [{ type: 'image', image: { link: form.mediaUrl || 'https://example.com/image.jpg' } }],
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
  useDocumentTitle('Plantillas de Mensajes | Meta & Local');
  const { data: sessions = [] } = useSessionsQuery();
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'my-templates' | 'gallery'>('editor');
  const [curlFlavor, setCurlFlavor] = useState<'openwa' | 'meta'>('openwa');
  const [galleryCategory, setGalleryCategory] = useState<string>('todos');

  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomTemplate | MessageTemplate | null>(null);
  const toast = useToast();
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Local Custom Templates state
  const [localTemplates, setLocalTemplates] = useState<CustomTemplate[]>(getLocalCustomTemplates);

  // Quick Send Test state
  const [testPhone, setTestPhone] = useState('584121234567');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Live Test Modal state
  const [testModalTemplate, setTestModalTemplate] = useState<CustomTemplate | MessageTemplate | InspirationTemplate | null>(null);
  const [testModalVars, setTestModalVars] = useState<Record<string, string>>({});
  const [testModalPhone, setTestModalPhone] = useState('584121234567');
  const [testModalCopiedCurl, setTestModalCopiedCurl] = useState(false);
  const [isModalSending, setIsModalSending] = useState(false);

  // Affiliate to Bot Modal state
  const [affiliateTarget, setAffiliateTarget] = useState<CustomTemplate | MessageTemplate | InspirationTemplate | null>(null);
  const [affiliateIntent, setAffiliateIntent] = useState<TriggerIntentType>('greeting');
  const [affiliateSessionId, setAffiliateSessionId] = useState<string>('*');
  const [affiliateAction, setAffiliateAction] = useState<'send_template' | 'ai_hybrid'>('send_template');

  const { data: serverTemplates = [] } = useTemplatesQuery(
    selectedSessionId,
    !!selectedSessionId,
  );
  const createMutation = useCreateTemplateMutation();
  const updateMutation = useUpdateTemplateMutation();
  const deleteMutation = useDeleteTemplateMutation();

  const selectedSession = sessions.find(session => session.id === selectedSessionId);
  const placeholders = useMemo(() => extractPlaceholders(form), [form]);
  const preview = useMemo(() => renderPreview(form, previewValues), [form, previewValues]);

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
    return buildOpenWaCurlSnippet(sessionName, testPhone, form, preview, previewValues);
  }, [selectedSession, selectedSessionId, testPhone, form, preview, previewValues, curlFlavor]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingTemplateId(null);
    setPreviewValues({});
  };

  const openEdit = (template: CustomTemplate | MessageTemplate) => {
    setEditingTemplateId(template.id);
    
    if ('headerType' in template) {
      // It's a CustomTemplate
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
      // Server MessageTemplate
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
    // Guess default intent from template name or category
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
    if (!form.name.trim()) {
      toast.error('Por favor escribe un nombre para la plantilla');
      return;
    }
    if (!form.body.trim()) {
      toast.error('El cuerpo del mensaje no puede estar vacío');
      return;
    }

    // 1. Guardar en almacenamiento local persistente
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

    // 2. Si hay sesión activa en el servidor, sincronizar con OpenWA API
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

    toast.success(`¡Plantilla "${form.name}" guardada y disponible en el sistema!`);
    resetForm();
    setActiveTab('my-templates');
  };

  const handleDelete = async (template: CustomTemplate | MessageTemplate) => {
    // 1. Eliminar de plantillas locales
    const updatedLocal = localTemplates.filter(t => t.id !== template.id && t.name !== template.name);
    setLocalTemplates(updatedLocal);
    saveLocalCustomTemplates(updatedLocal);

    // 2. Si existe en el servidor, eliminar de la sesión
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

      if (form.headerType === 'image' && form.mediaUrl) {
        await messageApi.sendMedia(targetSession, chatId, 'image', {
          url: form.mediaUrl,
          caption: preview,
        });
      } else if (form.headerType === 'video' && form.mediaUrl) {
        await messageApi.sendMedia(targetSession, chatId, 'video', {
          url: form.mediaUrl,
          caption: preview,
        });
      } else if (form.headerType === 'audio' && form.mediaUrl) {
        await messageApi.sendMedia(targetSession, chatId, 'audio', {
          url: form.mediaUrl,
        });
      } else {
        await messageApi.sendText(targetSession, chatId, preview);
      }
      toast.success(`Mensaje de plantilla enviado con éxito a +${cleanPhone}`);
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
    const targetSession = selectedSession?.id || (sessions.length > 0 ? sessions[0].id : null);
    if (!targetSession) {
      toast.error('Por favor selecciona o conecta una sesión de WhatsApp');
      return;
    }

    setIsModalSending(true);
    try {
      const cleanPhone = testModalPhone.replace(/[^0-9]/g, '');
      const chatId = `${cleanPhone}@c.us`;
      const renderedMsg = renderPreview(testModalTemplate as any, testModalVars);
      const headerType = ('headerType' in testModalTemplate! ? testModalTemplate.headerType : 'none') as HeaderType;
      const mediaUrl = ('mediaUrl' in testModalTemplate! ? testModalTemplate.mediaUrl : '') || '';

      if (headerType === 'image' && mediaUrl) {
        await messageApi.sendMedia(targetSession, chatId, 'image', { url: mediaUrl, caption: renderedMsg });
      } else if (headerType === 'video' && mediaUrl) {
        await messageApi.sendMedia(targetSession, chatId, 'video', { url: mediaUrl, caption: renderedMsg });
      } else if (headerType === 'audio' && mediaUrl) {
        await messageApi.sendMedia(targetSession, chatId, 'audio', { url: mediaUrl });
      } else {
        await messageApi.sendText(targetSession, chatId, renderedMsg);
      }

      toast.success(`¡Plantilla enviada exitosamente a +${cleanPhone}!`);
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
      type: 'QUICK_REPLY',
      text: 'Opción Rápida',
      value: 'OPCION_1',
    };
    setForm(f => ({ ...f, buttons: [...f.buttons, newBtn] }));
  };

  const handleRemoveButton = (id: string) => {
    setForm(f => ({ ...f, buttons: f.buttons.filter(b => b.id !== id) }));
  };

  const handleButtonChange = (id: string, field: keyof TemplateButton, value: string) => {
    setForm(f => ({
      ...f,
      buttons: f.buttons.map(b => (b.id === id ? { ...b, [field]: value } : b)),
    }));
  };

  const handleInsertVariable = (varName: string) => {
    setForm(f => ({
      ...f,
      body: f.body + (f.body.length > 0 && !f.body.endsWith(' ') ? ' ' : '') + `{{${varName}}}`,
    }));
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
        subtitle="Crea, guarda y envía plantillas enriquecidas con soporte Meta Cloud API y OpenWA"
        actions={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className={`btn-secondary ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTab('editor')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <PenTool size={16} />
              <span>Crear Plantilla</span>
            </button>
            <button
              className={`btn-secondary ${activeTab === 'my-templates' ? 'active' : ''}`}
              onClick={() => setActiveTab('my-templates')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Bookmark size={16} />
              <span>Mis Plantillas ({localTemplates.length})</span>
            </button>
            <button
              className={`btn-secondary ${activeTab === 'gallery' ? 'active' : ''}`}
              onClick={() => setActiveTab('gallery')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <LayoutGrid size={16} />
              <span>Galería de Ejemplos ({INSPIRATION_TEMPLATES.length})</span>
            </button>
          </div>
        }
      />

      {/* Main Tab Navigation Header */}
      <div className="templates-tab-bar">
        <button
          className={`tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveTab('editor')}
        >
          <PenTool size={18} />
          <span>Editor de Plantilla</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'my-templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-templates')}
        >
          <Bookmark size={18} />
          <span>Mis Plantillas Guardadas ({localTemplates.length})</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'gallery' ? 'active' : ''}`}
          onClick={() => setActiveTab('gallery')}
        >
          <Sparkles size={18} />
          <span>Galería de Ejemplos / Meta</span>
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
              <label htmlFor="template-name">Nombre de la Plantilla *</label>
              <input
                id="template-name"
                type="text"
                placeholder="ej: aviso_mantenimiento_fibra"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="custom-input"
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
                <label>Texto del Encabezado</label>
                <input
                  type="text"
                  placeholder="ej: 🛠️ COMUNICADO OFICIAL DE SOPORTE"
                  value={form.headerText}
                  onChange={e => setForm({ ...form, headerText: e.target.value })}
                  className="custom-input"
                />
              </div>
            )}

            {(form.headerType === 'image' || form.headerType === 'video' || form.headerType === 'audio' || form.headerType === 'document') && (
              <div className="form-group-field">
                <label>URL del Archivo Multimedia ({form.headerType.toUpperCase()})</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="url"
                    placeholder={`https://ejemplo.com/archivo.${form.headerType === 'image' ? 'png' : form.headerType === 'video' ? 'mp4' : form.headerType === 'audio' ? 'mp3' : 'pdf'}`}
                    value={form.mediaUrl}
                    onChange={e => setForm({ ...form, mediaUrl: e.target.value })}
                    className="custom-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      if (form.headerType === 'image') setForm(f => ({ ...f, mediaUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80' }));
                      if (form.headerType === 'video') setForm(f => ({ ...f, mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' }));
                      if (form.headerType === 'audio') setForm(f => ({ ...f, mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }));
                    }}
                    title="Cargar demo"
                  >
                    Demo URL
                  </button>
                </div>
              </div>
            )}

            <div className="form-group-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="template-body">Cuerpo del Mensaje *</label>
                <div className="var-pills-bar">
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Insertar variable:</span>
                  <button type="button" onClick={() => handleInsertVariable('nombre')} className="var-chip">+ {"{{nombre}}"}</button>
                  <button type="button" onClick={() => handleInsertVariable('empresa')} className="var-chip">+ {"{{empresa}}"}</button>
                  <button type="button" onClick={() => handleInsertVariable('monto')} className="var-chip">+ {"{{monto}}"}</button>
                  <button type="button" onClick={() => handleInsertVariable('fecha')} className="var-chip">+ {"{{fecha}}"}</button>
                </div>
              </div>
              <textarea
                id="template-body"
                rows={5}
                placeholder="Hola {{nombre}}, le informamos que su servicio de internet en {{empresa}} tiene un saldo pendiente de {{monto}}..."
                value={form.body}
                onChange={e => setForm({ ...form, body: e.target.value })}
                className="custom-textarea"
              />
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

            {/* Interactive Buttons Section */}
            <div className="buttons-editor-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={16} />
                  Botones Interactivos ({form.buttons.length}/3)
                </label>
                {form.buttons.length < 3 && (
                  <button type="button" onClick={handleAddButton} className="btn-sm btn-secondary">
                    <Plus size={14} />
                    <span>Agregar Botón</span>
                  </button>
                )}
              </div>

              {form.buttons.length === 0 ? (
                <p className="empty-buttons-hint">Sin botones interactivos configurados.</p>
              ) : (
                <div className="buttons-list">
                  {form.buttons.map(btn => (
                    <div key={btn.id} className="button-item-row">
                      <select
                        value={btn.type}
                        onChange={e => handleButtonChange(btn.id, 'type', e.target.value)}
                        className="custom-input-sm"
                        style={{ width: '130px' }}
                      >
                        <option value="QUICK_REPLY">Respuesta Rápida</option>
                        <option value="URL">Enlace Web (URL)</option>
                        <option value="PHONE_NUMBER">Llamada Teléfono</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Texto del botón"
                        value={btn.text}
                        onChange={e => handleButtonChange(btn.id, 'text', e.target.value)}
                        className="custom-input-sm"
                        style={{ flex: 1 }}
                      />

                      <input
                        type="text"
                        placeholder={btn.type === 'URL' ? 'https://...' : btn.type === 'PHONE_NUMBER' ? '+58412...' : 'PAYLOAD_KEY'}
                        value={btn.value}
                        onChange={e => handleButtonChange(btn.id, 'value', e.target.value)}
                        className="custom-input-sm"
                        style={{ flex: 1 }}
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveButton(btn.id)}
                        className="btn-icon-danger"
                        title="Eliminar botón"
                      >
                        <Trash2 size={15} />
                      </button>
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
                <span>Previsualización WhatsApp en Tiempo Real</span>
              </div>

              {/* Dynamic Variables Inputs */}
              {placeholders.length > 0 && (
                <div className="vars-fill-box">
                  <span className="vars-title">Probar con Variables:</span>
                  <div className="vars-grid">
                    {placeholders.map(key => (
                      <div key={key} className="var-input-item">
                        <label>&#123;&#123;{key}&#125;&#125;:</label>
                        <input
                          type="text"
                          value={previewValues[key] || ''}
                          placeholder={`Ej: ${key}`}
                          onChange={e => setPreviewValues({ ...previewValues, [key]: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* WhatsApp Phone Mockup */}
              <div className="whatsapp-phone-frame">
                <div className="whatsapp-chat-bubble">
                  {/* Media Header Preview */}
                  {form.headerType === 'text' && form.headerText && (
                    <div className="bubble-header-text">{form.headerText}</div>
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

                  {/* Body Content */}
                  <div className="bubble-body-text">
                    {preview || <span className="placeholder-text">Escribe el cuerpo del mensaje en el editor para previsualizarlo...</span>}
                  </div>

                  {/* Footer */}
                  {form.footer && (
                    <div className="bubble-footer-text">{form.footer}</div>
                  )}

                  {/* Timestamp & Status */}
                  <div className="bubble-time">
                    <span>12:00</span>
                    <span className="check-marks">✓✓</span>
                  </div>
                </div>

                {/* Buttons Preview */}
                {form.buttons.length > 0 && (
                  <div className="bubble-buttons-stack">
                    {form.buttons.map(b => (
                      <button key={b.id} className="bubble-action-btn" type="button">
                        {b.type === 'PHONE_NUMBER' && <Phone size={14} />}
                        {b.type === 'URL' && <Link size={14} />}
                        {b.type === 'QUICK_REPLY' && <MessageSquare size={14} />}
                        <span>{b.text || 'Botón'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Send Bar */}
              <div className="quick-send-box">
                <label>Enviar prueba a número de WhatsApp:</label>
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
                placeholder="Buscar en mis plantillas..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
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

          {localTemplates.length === 0 ? (
            <div className="empty-templates-state">
              <Bookmark size={48} />
              <h3>No tienes plantillas guardadas</h3>
              <p>Crea tu primera plantilla o carga una desde la galería de ejemplos.</p>
              <button className="btn-primary" onClick={() => setActiveTab('gallery')}>
                Ver Galería de Ejemplos
              </button>
            </div>
          ) : (
            <div className="templates-cards-grid">
              {localTemplates
                .filter(t => !searchTerm || t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.body.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(tpl => (
                  <div key={tpl.id} className="template-card">
                    <div className="card-top-header">
                      <div className="badge-group">
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

                    <h4 className="template-title">{tpl.name}</h4>

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

                    <div className="card-footer-buttons">
                      <button
                        className="btn-send-tpl"
                        onClick={() => handleOpenTestModal(tpl)}
                        style={{ flex: 1 }}
                      >
                        <Send size={15} />
                        <span>Enviar</span>
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
                          const curl = buildOpenWaCurlSnippet(
                            selectedSession?.name || 'sesion-demostracion',
                            '584121234567',
                            tpl as any,
                            tpl.body,
                            tpl.defaultVars || {},
                          );
                          copyToClipboard(curl);
                          toast.success('cURL de la plantilla copiado');
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
                      onClick={() => handleOpenTestModal(insp)}
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
              <label style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                Sesión / Número WhatsApp de Destino:
              </label>
              <select
                value={affiliateSessionId}
                onChange={e => setAffiliateSessionId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff' }}
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
              <label style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                Intención o Evento Disparador (Trigger):
              </label>
              <select
                value={affiliateIntent}
                onChange={e => setAffiliateIntent(e.target.value as TriggerIntentType)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff' }}
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
              <label style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                Acción del Chatbot al Detectar la Intención:
              </label>
              <select
                value={affiliateAction}
                onChange={e => setAffiliateAction(e.target.value as any)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff' }}
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
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isModalSending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                <span>Enviar Ahora por WhatsApp</span>
              </button>
            </div>
          }
        >
          <div className="test-modal-content">
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
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Mensaje que se enviará:</span>
              <div className="preview-bubble">
                {renderPreview(testModalTemplate as any, testModalVars)}
              </div>
            </div>

            <div className="modal-curl-snippet">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>cURL para automatización:</span>
                <button
                  type="button"
                  onClick={async () => {
                    const snippet = buildOpenWaCurlSnippet(
                      selectedSession?.name || 'sesion-demostracion',
                      testModalPhone,
                      testModalTemplate as any,
                      renderPreview(testModalTemplate as any, testModalVars),
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
                  {buildOpenWaCurlSnippet(
                    selectedSession?.name || 'sesion-demostracion',
                    testModalPhone,
                    testModalTemplate as any,
                    renderPreview(testModalTemplate as any, testModalVars),
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
    </div>
  );
}

export default Templates;
