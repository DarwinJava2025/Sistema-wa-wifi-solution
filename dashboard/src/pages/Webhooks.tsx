import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Edit,
  Trash2,
  Play,
  ExternalLink,
  Loader2,
  Webhook as WebhookIcon,
  Check,
  AlertCircle,
  Filter,
  HelpCircle,
  Zap,
  Bot,
  BarChart3,
  Users,
  Globe,
  Search,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { webhookApi, type Webhook, type WebhookFilters, type WebhookFilterCondition } from '../services/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useRole } from '../hooks/useRole';
import { useToast } from '../hooks/useToast';
import {
  useWebhooksQuery,
  useSessionsQuery,
  useSessionChatsQuery,
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  useDeleteWebhookMutation,
} from '../hooks/queries';
import { PageHeader } from '../components/PageHeader';
import { FilterBuilder } from '../components/FilterBuilder';
import { Modal } from '../components/Modal';
import './Webhooks.css';

// Filters only apply to message.* events (the wildcard subscribes to them too).
const supportsFilters = (events: string[]) => events.some(e => e === '*' || e.startsWith('message.'));

type TFn = ReturnType<typeof useTranslation>['t'];

function conditionSummary(c: WebhookFilterCondition, t: TFn): string {
  const field = t(`webhooks.filters.fields.${c.field}`, { defaultValue: c.field });
  const operator = t(`webhooks.filters.operators.${c.operator}`, { defaultValue: c.operator });
  let value: string;
  if (typeof c.value === 'boolean') {
    value = c.value ? t('webhooks.filters.yes') : t('webhooks.filters.no');
  } else if (Array.isArray(c.value)) {
    value = c.value.join(', ');
  } else {
    value = `"${c.value}"`;
  }
  const caseNote = c.caseSensitive ? ` · ${t('webhooks.filters.caseSensitive')}` : '';
  return `${field} ${operator} ${value}${caseNote}`;
}

function FilterBadge({ filters }: { filters: WebhookFilters }) {
  const { t } = useTranslation();
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const openAt = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setCoords({ top: r.bottom + 6, left: r.left });
  };
  const close = () => setCoords(null);

  return (
    <span
      className="filter-badge filter-badge-interactive"
      tabIndex={0}
      onMouseEnter={e => openAt(e.currentTarget)}
      onMouseLeave={close}
      onFocus={e => openAt(e.currentTarget)}
      onBlur={close}
    >
      <Filter size={12} />
      {t('webhooks.filters.badge', { count: filters.conditions.length })}
      {coords && (
        <div className="filter-popover" style={{ top: coords.top, left: coords.left }} role="tooltip">
          <div className="filter-popover-title">{t('webhooks.filters.title')}</div>
          {filters.conditions.map((condition, i) => (
            <div key={i} className="filter-popover-row">
              {conditionSummary(condition, t)}
            </div>
          ))}
        </div>
      )}
    </span>
  );
}

// Help tooltip component with interactive popup
function HelpTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="help-tooltip-container"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(!show)}
      title="Haz clic para ver explicación"
    >
      <HelpCircle size={15} className="help-tooltip-icon" />
      {show && (
        <div className="help-tooltip-popover">
          <p>{text}</p>
        </div>
      )}
    </span>
  );
}

// Categorized events definition
interface EventCategory {
  id: string;
  label: string;
  icon: string;
  events: Array<{
    name: string;
    title: string;
    description: string;
    badge: string;
  }>;
}

const EVENT_CATEGORIES: EventCategory[] = [
  {
    id: 'messages',
    label: 'Mensajes',
    icon: '💬',
    events: [
      {
        name: 'message.received',
        title: '📩 Mensaje Recibido',
        description: 'Notifica cada vez que un contacto o grupo envía un mensaje (texto, audio, imagen, documentos).',
        badge: 'Más Usado',
      },
      {
        name: 'message.sent',
        title: '📤 Mensaje Enviado',
        description: 'Notifica cuando tú o tu bot envían un mensaje saliente con éxito.',
        badge: 'Saliente',
      },
      {
        name: 'message.ack',
        title: '✓✓ Estado de Entrega (ACK)',
        description: 'Informa cuando un mensaje fue enviado (1 check), entregado (2 checks grises) o leído (2 checks azules).',
        badge: 'Lecturas',
      },
      {
        name: 'message.failed',
        title: '❌ Mensaje Fallido',
        description: 'Notifica si un mensaje no pudo ser entregado por error de red o número inválido.',
        badge: 'Errores',
      },
      {
        name: 'message.revoked',
        title: '🗑️ Mensaje Eliminado',
        description: 'Notifica cuando alguien borra un mensaje ("eliminar para todos").',
        badge: 'Eliminados',
      },
      {
        name: 'message.reaction',
        title: '❤️ Reacciones Emoji',
        description: 'Notifica cuando un usuario reacciona a un mensaje con un emoji.',
        badge: 'Interacciones',
      },
      {
        name: 'message.edited',
        title: '✏️ Mensaje Editado',
        description: 'Notifica cuando un usuario modifica el contenido de un mensaje enviado previamente.',
        badge: 'Ediciones',
      },
    ],
  },
  {
    id: 'sessions',
    label: 'Sesión & Estado',
    icon: '📱',
    events: [
      {
        name: 'session.status',
        title: '🔄 Estado de Sesión',
        description: 'Notifica transiciones de estado del bot (iniciando, esperando QR, conectado, desconectado).',
        badge: 'Esencial',
      },
      {
        name: 'session.qr',
        title: '🏁 Código QR Generado',
        description: 'Envía el nuevo código QR en base64 para vincular la sesión con WhatsApp.',
        badge: 'Vinculación',
      },
      {
        name: 'session.authenticated',
        title: '🔑 Autenticación Exitosa',
        description: 'Notifica cuando el teléfono escaneó el código QR y la sesión se autenticó.',
        badge: 'Conectado',
      },
      {
        name: 'session.disconnected',
        title: '⚠️ Sesión Desconectada',
        description: 'Notifica cuando el teléfono pierde conexión a internet o se cierra sesión.',
        badge: 'Alertas',
      },
      {
        name: 'session.restriction',
        title: '🛡️ Restricción Temporal',
        description: 'Alerta si WhatsApp impone un límite temporal de mensajería o verificación.',
        badge: 'Seguridad',
      },
      {
        name: 'session.reconnect_loop',
        title: '🔁 Bucle de Reconexión',
        description: 'Alerta cuando hay intentos repetidos de reconexión sin éxito.',
        badge: 'Diagnóstico',
      },
    ],
  },
  {
    id: 'groups',
    label: 'Grupos',
    icon: '👥',
    events: [
      {
        name: 'group.join',
        title: '👋 Miembro Entra al Grupo',
        description: 'Notifica cuando un usuario se une o es añadido a un grupo de WhatsApp.',
        badge: 'Entradas',
      },
      {
        name: 'group.leave',
        title: '🚪 Miembro Sale del Grupo',
        description: 'Notifica cuando un usuario abandona o es expulsado de un grupo.',
        badge: 'Salidas',
      },
      {
        name: 'group.update',
        title: '⚙️ Actualización de Grupo',
        description: 'Notifica cambios en el título, foto, descripción o permisos de un grupo.',
        badge: 'Ajustes',
      },
      {
        name: 'group.join_request',
        title: '📋 Solicitud de Entrada',
        description: 'Notifica solicitudes de usuarios para ingresar a grupos privados con aprobación.',
        badge: 'Solicitudes',
      },
    ],
  },
  {
    id: 'calls',
    label: 'Llamadas',
    icon: '📞',
    events: [
      {
        name: 'call.received',
        title: '📞 Llamada Entrante',
        description: 'Notifica cuando entra una llamada de voz o videollamada a la línea.',
        badge: 'Entrante',
      },
      {
        name: 'call.accepted',
        title: '🟢 Llamada Aceptada',
        description: 'Notifica cuando se atiende una llamada en el teléfono.',
        badge: 'Atendida',
      },
      {
        name: 'call.rejected',
        title: '🔴 Llamada Rechazada',
        description: 'Notifica cuando se rechaza una llamada entrante.',
        badge: 'Rechazada',
      },
      {
        name: 'call.missed',
        title: '📵 Llamada Perdida',
        description: 'Notifica cuando una llamada entrante no fue atendida a tiempo.',
        badge: 'Perdida',
      },
    ],
  },
  {
    id: 'others',
    label: 'Otros Eventos',
    icon: '🔔',
    events: [
      {
        name: 'status.received',
        title: '📱 Estado / Story Publicado',
        description: 'Notifica cuando un contacto publica una historia o estado temporal en WhatsApp.',
        badge: 'Stories',
      },
      {
        name: 'presence.update',
        title: '✍️ Presencia del Contacto',
        description: 'Notifica cuando un contacto está escribiendo, grabando audio o disponible.',
        badge: 'Tiempo Real',
      },
      {
        name: '*',
        title: '🌐 Todos los Eventos (*)',
        description: 'Dispara el webhook ante cualquier notificación o suceso en el sistema.',
        badge: 'Comodín',
      },
    ],
  },
];

// Flat event map for quick lookup
const ALL_EVENTS = EVENT_CATEGORIES.flatMap(c => c.events);

export function Webhooks() {
  const { t } = useTranslation();
  useDocumentTitle(t('webhooks.title'));
  const { canWrite } = useRole();
  const { data: webhooks = [], isLoading: loadingWebhooks, isError: webhooksError } = useWebhooksQuery();
  const { data: sessions = [] } = useSessionsQuery();
  const loading = loadingWebhooks;
  const createMutation = useCreateWebhookMutation();
  const updateMutation = useUpdateWebhookMutation();
  const deleteMutation = useDeleteWebhookMutation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ sessionId: string; id: string; url: string } | null>(null);
  const [editWebhook, setEditWebhook] = useState<Webhook | null>(null);
  const [newWebhook, setNewWebhook] = useState<{
    url: string;
    events: string[];
    sessionId: string;
    filters: WebhookFilters | null;
  }>({ url: '', events: ['message.received', 'session.status'], sessionId: '', filters: null });
  const [testingId, setTestingId] = useState<string | null>(null);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('messages');
  const [searchEventQuery, setSearchEventQuery] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const toast = useToast();

  const activeSessionId = showEditModal ? (editWebhook?.sessionId ?? '') : newWebhook.sessionId;
  const { data: chats = [] } = useSessionChatsQuery(activeSessionId, showCreateModal || showEditModal);

  // Quick preset handlers
  const applyPreset = (presetEvents: string[]) => {
    setNewWebhook(prev => ({ ...prev, events: presetEvents }));
  };

  const applyEditPreset = (presetEvents: string[]) => {
    if (!editWebhook) return;
    setEditWebhook(prev => (prev ? { ...prev, events: presetEvents } : null));
  };

  const handleCreate = async () => {
    if (!newWebhook.url.trim() || !newWebhook.sessionId) {
      toast.error('Campos requeridos', 'Por favor selecciona la sesión e ingresa la URL del webhook.');
      return;
    }
    try {
      await createMutation.mutateAsync({
        sessionId: newWebhook.sessionId,
        url: newWebhook.url.trim(),
        events: newWebhook.events.length > 0 ? newWebhook.events : ['message.received'],
        filters: supportsFilters(newWebhook.events) ? newWebhook.filters : null,
      });
      setShowCreateModal(false);
      setNewWebhook({ url: '', events: ['message.received', 'session.status'], sessionId: '', filters: null });
      toast.success(t('webhooks.toasts.created'));
    } catch (err) {
      toast.error(
        t('webhooks.toasts.createFailed', {
          message: err instanceof Error ? err.message : t('common.unknownError'),
        }),
      );
    }
  };

  const confirmDelete = (sessionId: string, id: string, url: string) => {
    setDeleteTarget({ sessionId, id, url });
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({ sessionId: deleteTarget.sessionId, id: deleteTarget.id });
      setShowDeleteModal(false);
      setDeleteTarget(null);
      toast.success(t('webhooks.toasts.deleted'));
    } catch (err) {
      toast.error(
        t('webhooks.toasts.deleteFailed', {
          message: err instanceof Error ? err.message : t('common.unknownError'),
        }),
      );
    }
  };

  const handleTest = async (sessionId: string, id: string) => {
    setTestingId(id);
    try {
      const result = await webhookApi.test(sessionId, id);
      if (result.success) {
        toast.success(t('webhooks.toasts.testOk', { status: result.statusCode }));
      } else {
        toast.error(t('webhooks.toasts.testFailed', { message: result.error || `Status ${result.statusCode}` }));
      }
    } catch (err) {
      toast.error(
        t('webhooks.toasts.testError', {
          message: err instanceof Error ? err.message : t('common.unknownError'),
        }),
      );
    } finally {
      setTestingId(null);
    }
  };

  const openEdit = (webhook: Webhook) => {
    setEditWebhook({ ...webhook });
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    if (!editWebhook) return;
    try {
      await updateMutation.mutateAsync({
        sessionId: editWebhook.sessionId,
        id: editWebhook.id,
        data: {
          url: editWebhook.url.trim(),
          events: editWebhook.events,
          active: editWebhook.active,
          filters: supportsFilters(editWebhook.events) ? (editWebhook.filters ?? null) : null,
        },
      });
      setShowEditModal(false);
      setEditWebhook(null);
      toast.success(t('webhooks.toasts.updated'));
    } catch (err) {
      toast.error(
        t('webhooks.toasts.updateFailed', {
          message: err instanceof Error ? err.message : t('common.unknownError'),
        }),
      );
    }
  };

  const toggleEditEvent = (event: string) => {
    if (!editWebhook) return;
    setEditWebhook({
      ...editWebhook,
      events: editWebhook.events.includes(event)
        ? editWebhook.events.filter(e => e !== event)
        : [...editWebhook.events, event],
    });
  };

  const toggleNewEvent = (event: string) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(event) ? prev.events.filter(e => e !== event) : [...prev.events, event],
    }));
  };

  // Filtered reference events for sidebar
  const filteredEventsForSidebar = ALL_EVENTS.filter(
    e =>
      e.name.toLowerCase().includes(searchEventQuery.toLowerCase()) ||
      e.title.toLowerCase().includes(searchEventQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchEventQuery.toLowerCase()),
  );

  if (loading) {
    return (
      <div
        className="webhooks-page"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}
      >
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="webhooks-page">
      <PageHeader
        title={t('webhooks.title')}
        subtitle="Configura callbacks HTTP para recibir notificaciones automáticas en tiempo real en n8n, Make, Zapier o tu propio servidor"
        actions={
          canWrite && (
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={18} />
              {t('webhooks.addWebhook')}
            </button>
          )
        }
      />

      {/* Quick Interactive Guide Banner */}
      <div className="webhook-guide-card">
        <div className="webhook-guide-header" onClick={() => setShowGuide(!showGuide)}>
          <div className="webhook-guide-title">
            <BookOpen size={18} className="guide-icon" />
            <span>¿Cómo funcionan los Webhooks? (Guía rápida de integración)</span>
          </div>
          <button type="button" className="btn-guide-toggle">
            {showGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {showGuide && (
          <div className="webhook-guide-content">
            <div className="guide-steps-grid">
              <div className="guide-step-card">
                <div className="step-number">1</div>
                <h4>1. Crea tu URL de Destino</h4>
                <p>
                  Obtén tu URL de Webhook en <strong>n8n, Make, Zapier</strong> o crea una ruta en tu servidor (ej.{' '}
                  <code>https://mi-servidor.com/webhook</code>).
                </p>
              </div>
              <div className="guide-step-card">
                <div className="step-number">2</div>
                <h4>2. Selecciona la Sesión y Eventos</h4>
                <p>
                  Elige qué bot de WhatsApp enviará los datos y marca eventos como{' '}
                  <code>message.received</code> (para mensajes entrantes) o <code>session.status</code>.
                </p>
              </div>
              <div className="guide-step-card">
                <div className="step-number">3</div>
                <h4>3. Prueba y Automatiza</h4>
                <p>
                  Usa el botón <strong>"Probar" (▶)</strong> para enviar una carga JSON de prueba y verificar que tu
                  servidor responda con código HTTP 200 OK.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {webhooksError && (
        <div className="error-banner" role="alert">
          <AlertCircle size={20} />
          <span className="error-banner-text">{t('dashboard.loadError')}</span>
        </div>
      )}

      {/* CREATE WEBHOOK MODAL */}
      {showCreateModal && (
        <Modal
          open
          onClose={() => setShowCreateModal(false)}
          title="Configurar Nuevo Webhook"
          closeLabel={t('common.close')}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                {t('common.cancel')}
              </button>
              <button className="btn-primary" onClick={handleCreate} disabled={!newWebhook.url.trim() || !newWebhook.sessionId}>
                <Check size={16} />
                Guardar Webhook
              </button>
            </>
          }
        >
          {/* Quick Presets Bar */}
          <div className="webhook-presets-container">
            <span className="presets-label">
              ⚡ Preajustes rápidos con 1 clic:
              <HelpTooltip text="Selecciona una plantilla predefinida para configurar automáticamente los eventos más recomendados según tu caso de uso." />
            </span>
            <div className="presets-buttons-row">
              <button
                type="button"
                className="btn-preset-pill"
                onClick={() => applyPreset(['message.received', 'session.status'])}
              >
                <Zap size={14} /> n8n / Make / Zapier
              </button>
              <button
                type="button"
                className="btn-preset-pill"
                onClick={() => applyPreset(['message.received'])}
              >
                <Bot size={14} /> Chatbot (Solo Entrantes)
              </button>
              <button
                type="button"
                className="btn-preset-pill"
                onClick={() => applyPreset(['message.received', 'message.sent', 'message.ack', 'message.failed'])}
              >
                <BarChart3 size={14} /> CRM & Lecturas
              </button>
              <button
                type="button"
                className="btn-preset-pill"
                onClick={() => applyPreset(['group.join', 'group.leave', 'group.update'])}
              >
                <Users size={14} /> Grupos
              </button>
              <button
                type="button"
                className="btn-preset-pill"
                onClick={() => applyPreset(['*'])}
              >
                <Globe size={14} /> Todos (*)
              </button>
            </div>
          </div>

          {/* Session Selection */}
          <div className="webhook-form-field">
            <div className="field-label-with-help">
              <label htmlFor="wh-create-session">1. Sesión de WhatsApp:</label>
              <HelpTooltip text="Selecciona la cuenta de WhatsApp o bot que emitirá las notificaciones y eventos hacia este webhook." />
            </div>
            <select
              id="wh-create-session"
              value={newWebhook.sessionId}
              onChange={e => setNewWebhook({ ...newWebhook, sessionId: e.target.value })}
              className="webhook-select-input"
            >
              <option value="">-- Elige la sesión que enviará los datos --</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.phone || 'Sin teléfono asignado'})
                </option>
              ))}
            </select>
          </div>

          {/* Webhook URL Input */}
          <div className="webhook-form-field">
            <div className="field-label-with-help">
              <label htmlFor="wh-create-url">2. URL del Callback (Endpoint HTTP POST):</label>
              <HelpTooltip text="La dirección URL pública donde OpenWA enviará una solicitud HTTP POST en formato JSON cada vez que ocurra un evento seleccionado." />
            </div>
            <input
              id="wh-create-url"
              type="url"
              placeholder="https://tu-dominio.com/webhook o https://webhook.site/..."
              value={newWebhook.url}
              onChange={e => setNewWebhook({ ...newWebhook, url: e.target.value })}
              className="webhook-url-input"
            />
            <span className="field-subtext">
              💡 Ejemplo: URL de Webhook Trigger en n8n, Make.com, Zapier o una API REST propia.
            </span>
          </div>

          {/* Events Selector with Categories */}
          <div className="webhook-form-field">
            <div className="field-label-with-help">
              <label>3. Eventos a Escuchar ({newWebhook.events.length} seleccionados):</label>
              <HelpTooltip text="Marca qué sucesos enviarán datos a tu servidor. Cada evento incluye información detallada como número del remitente, texto, archivos adjuntos o estado de la conexión." />
            </div>

            {/* Category Tabs */}
            <div className="event-category-tabs">
              {EVENT_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className={`cat-tab-btn ${selectedCategoryTab === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategoryTab(cat.id)}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Events List for Current Tab */}
            <div className="categorized-events-grid">
              {EVENT_CATEGORIES.find(c => c.id === selectedCategoryTab)?.events.map(ev => {
                const isSelected = newWebhook.events.includes(ev.name);
                return (
                  <div
                    key={ev.name}
                    className={`event-card-selectable ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleNewEvent(ev.name)}
                  >
                    <div className="event-card-top">
                      <div className="event-card-name-group">
                        <span className="event-card-title">{ev.title}</span>
                        <code className="event-code-tag">{ev.name}</code>
                      </div>
                      <div className={`event-checkbox ${isSelected ? 'checked' : ''}`}>
                        {isSelected && <Check size={12} />}
                      </div>
                    </div>
                    <p className="event-card-desc">{ev.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filter Builder */}
          {supportsFilters(newWebhook.events) && (
            <div className="webhook-form-field">
              <div className="field-label-with-help">
                <label>4. Filtros de Mensajes (Opcional):</label>
                <HelpTooltip text="Permite que el webhook solo se dispare si el mensaje cumple reglas específicas (ej. no es de grupo, contiene ciertas palabras clave o proviene de un número específico)." />
              </div>
              <FilterBuilder
                filters={newWebhook.filters}
                onChange={filters => setNewWebhook(prev => ({ ...prev, filters }))}
                chats={chats}
              />
            </div>
          )}
        </Modal>
      )}

      {/* EDIT WEBHOOK MODAL */}
      {showEditModal && editWebhook && (
        <Modal
          open
          onClose={() => setShowEditModal(false)}
          title="Editar Webhook"
          closeLabel={t('common.close')}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setShowEditModal(false)}>
                {t('common.cancel')}
              </button>
              <button className="btn-primary" onClick={handleEdit}>
                <Check size={16} />
                Guardar Cambios
              </button>
            </>
          }
        >
          {/* Presets Bar */}
          <div className="webhook-presets-container">
            <span className="presets-label">⚡ Preajustes rápidos:</span>
            <div className="presets-buttons-row">
              <button
                type="button"
                className="btn-preset-pill"
                onClick={() => applyEditPreset(['message.received', 'session.status'])}
              >
                <Zap size={14} /> n8n / Make / Zapier
              </button>
              <button
                type="button"
                className="btn-preset-pill"
                onClick={() => applyEditPreset(['message.received'])}
              >
                <Bot size={14} /> Chatbot
              </button>
              <button
                type="button"
                className="btn-preset-pill"
                onClick={() => applyEditPreset(['message.received', 'message.sent', 'message.ack', 'message.failed'])}
              >
                <BarChart3 size={14} /> CRM & Lecturas
              </button>
              <button
                type="button"
                className="btn-preset-pill"
                onClick={() => applyEditPreset(['*'])}
              >
                <Globe size={14} /> Todos (*)
              </button>
            </div>
          </div>

          <div className="webhook-form-field">
            <div className="field-label-with-help">
              <label htmlFor="wh-edit-url">URL del Callback:</label>
              <HelpTooltip text="Dirección URL de tu webhook a donde se enviarán las notificaciones." />
            </div>
            <input
              id="wh-edit-url"
              type="url"
              value={editWebhook.url}
              onChange={e => setEditWebhook({ ...editWebhook, url: e.target.value })}
              className="webhook-url-input"
            />
          </div>

          <div className="webhook-form-field">
            <div className="field-label-with-help">
              <label>Eventos a Escuchar ({editWebhook.events.length} seleccionados):</label>
              <HelpTooltip text="Marca los eventos que deseas recibir en esta URL." />
            </div>

            <div className="event-category-tabs">
              {EVENT_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className={`cat-tab-btn ${selectedCategoryTab === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategoryTab(cat.id)}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            <div className="categorized-events-grid">
              {EVENT_CATEGORIES.find(c => c.id === selectedCategoryTab)?.events.map(ev => {
                const isSelected = editWebhook.events.includes(ev.name);
                return (
                  <div
                    key={ev.name}
                    className={`event-card-selectable ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleEditEvent(ev.name)}
                  >
                    <div className="event-card-top">
                      <div className="event-card-name-group">
                        <span className="event-card-title">{ev.title}</span>
                        <code className="event-code-tag">{ev.name}</code>
                      </div>
                      <div className={`event-checkbox ${isSelected ? 'checked' : ''}`}>
                        {isSelected && <Check size={12} />}
                      </div>
                    </div>
                    <p className="event-card-desc">{ev.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {supportsFilters(editWebhook.events) && (
            <div className="webhook-form-field">
              <div className="field-label-with-help">
                <label>Filtros de Mensajes (Opcional):</label>
                <HelpTooltip text="Aplica condiciones personalizadas sobre los mensajes recibidos." />
              </div>
              <FilterBuilder
                filters={editWebhook.filters}
                onChange={filters => setEditWebhook(prev => (prev ? { ...prev, filters } : prev))}
                chats={chats}
              />
            </div>
          )}

          <div className="toggle-group">
            <span className="toggle-label" id="webhook-active-label">
              Estado del Webhook:
            </span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                aria-labelledby="webhook-active-label"
                checked={editWebhook.active}
                onChange={e => setEditWebhook({ ...editWebhook, active: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
            <span className={`toggle-status ${editWebhook.active ? 'active' : 'inactive'}`}>
              {editWebhook.active ? 'Activo (Enviando notificaciones)' : 'Pausado'}
            </span>
          </div>
        </Modal>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && deleteTarget && (
        <Modal
          open
          onClose={() => setShowDeleteModal(false)}
          title={t('webhooks.deleteTitle')}
          className="modal-sm"
          closeLabel={t('common.close')}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>
                {t('common.cancel')}
              </button>
              <button className="btn-danger" onClick={handleDelete}>
                {t('common.delete')}
              </button>
            </>
          }
        >
          <p>{t('webhooks.deleteConfirm')}</p>
          <code
            style={{
              display: 'block',
              marginTop: '0.5rem',
              padding: '0.5rem',
              background: 'var(--color-bg-secondary)',
              borderRadius: '4px',
              fontSize: '0.85rem',
              wordBreak: 'break-all',
            }}
          >
            {deleteTarget.url}
          </code>
        </Modal>
      )}

      {/* MAIN CONTENT: WEBHOOKS LIST + SIDEBAR REFERENCE */}
      <div className="webhooks-content">
        <div className="webhooks-list-container">
          {webhooks.length === 0 ? (
            <div className="empty-table-state">
              <WebhookIcon size={48} strokeWidth={1} />
              <h3>No hay webhooks configurados todavía</h3>
              <p>
                Haz clic en el botón <strong>"+ Añadir webhook"</strong> para conectar tu bot de WhatsApp con n8n, Make,
                Zapier o tu backend en tiempo real.
              </p>
              {canWrite && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setShowCreateModal(true)}
                  style={{ marginTop: '1.25rem' }}
                >
                  <Plus size={16} /> Configurar mi primer webhook
                </button>
              )}
            </div>
          ) : (
            <div className="webhooks-card-list">
              {webhooks.map(webhook => {
                const sessionName =
                  sessions.find(s => s.id === webhook.sessionId)?.name || webhook.sessionId.substring(0, 12);
                return (
                  <div key={webhook.id} className="webhook-card">
                    <div className="webhook-card-header">
                      <div className="webhook-url-row">
                        <ExternalLink size={16} className="webhook-url-icon" />
                        <code className="webhook-url">{webhook.url}</code>
                      </div>
                      <div className="webhook-card-actions">
                        <button
                          className="icon-btn"
                          title="Enviar payload de prueba a esta URL"
                          onClick={() => handleTest(webhook.sessionId, webhook.id)}
                          disabled={testingId === webhook.id}
                        >
                          {testingId === webhook.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Play size={16} />
                          )}
                        </button>
                        {canWrite && (
                          <>
                            <button
                              className="icon-btn"
                              title={t('webhooks.actions.edit')}
                              onClick={() => openEdit(webhook)}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className="icon-btn danger"
                              title={t('webhooks.actions.delete')}
                              onClick={() => confirmDelete(webhook.sessionId, webhook.id, webhook.url)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="webhook-card-body">
                      <div className="webhook-meta">
                        <div className="webhook-meta-item">
                          <span className="webhook-meta-label">{t('webhooks.columns.session')}</span>
                          <span className="webhook-meta-value">🤖 {sessionName}</span>
                        </div>
                        <div className="webhook-meta-item">
                          <span className="webhook-meta-label">{t('webhooks.columns.status')}</span>
                          <span className={`status-badge ${webhook.active ? 'active' : 'inactive'}`}>
                            {webhook.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </div>
                      <div className="webhook-events">
                        <span className="webhook-meta-label">{t('webhooks.columns.events')}</span>
                        <div className="events-cell">
                          {webhook.events.map((event: string) => {
                            const found = ALL_EVENTS.find(e => e.name === event);
                            return (
                              <span key={event} className="event-tag" title={found?.description || event}>
                                {found ? found.title : event}
                              </span>
                            );
                          })}
                          {webhook.filters?.conditions?.length ? <FilterBadge filters={webhook.filters} /> : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SIDEBAR: EVENT REFERENCE WITH SEARCH & TOOLTIPS */}
        <div className="events-reference">
          <div className="events-reference-header">
            <h3>Eventos Disponibles</h3>
            <HelpTooltip text="Catálogo completo de todos los eventos que WhatsApp y OpenWA pueden notificar a tus endpoints en tiempo real." />
          </div>

          <div className="events-search-bar">
            <Search size={14} />
            <input
              type="text"
              placeholder="Buscar evento (ej. received, qr)..."
              value={searchEventQuery}
              onChange={e => setSearchEventQuery(e.target.value)}
            />
          </div>

          <div className="events-list">
            {filteredEventsForSidebar.length === 0 ? (
              <p className="no-events-found">No se encontraron eventos coincidentes.</p>
            ) : (
              filteredEventsForSidebar.map(item => (
                <div key={item.name} className="event-item">
                  <div className="event-item-top">
                    <code>{item.name}</code>
                    <span className="event-item-badge">{item.badge}</span>
                  </div>
                  <span className="event-item-title">{item.title}</span>
                  <span className="event-item-desc">{item.description}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Webhooks;
