import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import {
  CalendarClock,
  Plus,
  Play,
  Pause,
  Trash2,
  Download,
  Upload,
  Users,
  CheckCircle2,
  Clock,
  Cake,
  Flame,
  Bell,
  MessageSquare,
  X,
  Eye,
  Loader2,
  Send,
} from 'lucide-react';
import { sessionApi, type Session } from '../services/api';
import {
  type ScheduledCampaign,
  type ScheduledCampaignType,
  type ScheduledRepeatFrequency,
  type CampaignContact,
  getScheduledCampaigns,
  saveCampaign,
  deleteCampaign,
  parseContactsFile,
  generateCsvTemplate,
  renderMessageTemplate,
  sendWhatsAppMessage,
} from '../services/scheduledMessagesService';
import './ScheduledMessages.css';

const TEMPLATES_BY_TYPE: Record<ScheduledCampaignType, { title: string; template: string }> = {
  birthday: {
    title: '🎂 Felicitaciones de Cumpleaños',
    template:
      '🎉 ¡Feliz Cumpleaños {nombre}! 🎂✨\n\nDe parte de todo el equipo de {empresa}, hoy celebramos contigo este día especial.\n\n🎁 Para celebrarlo, te regalamos un **20% de descuento en tu próxima mensualidad** o un upgrade de velocidad durante este mes.\n\n¡Que pases un excelente día lleno de éxitos y bendiciones! 🥳🚀',
  },
  offer: {
    title: '🔥 Oferta Especial / Promoción',
    template:
      '🔥 ¡Hola {nombre}! En {empresa} tenemos una super promoción exclusiva para ti 🚀:\n\n✨ **Aumenta a 100 Mbps o 200 Mbps** con precio congelado por 6 meses y router Gigabit incluido.\n\n👉 Responde a este mensaje con la palabra **PROMO** para activarla hoy mismo.',
  },
  notice: {
    title: '📢 Aviso y Notificación de Servicio',
    template:
      '📢 **Aviso Importante - {empresa}:**\n\nEstimado(a) {nombre}, le informamos que el día {fecha} realizaremos labores de mantenimiento preventivo y optimización en nuestra red de fibra óptica.\n\n⏰ Horario: 01:00 AM a 05:00 AM.\n\nAgradecemos su comprensión mientras seguimos mejorando su experiencia de navegación.',
  },
  custom: {
    title: '✉️ Mensaje Personalizado',
    template: 'Hola {nombre}, te contactamos desde {empresa} para brindarte información sobre tu servicio.',
  },
};

export function ScheduledMessages() {
  const [campaigns, setCampaigns] = useState<ScheduledCampaign[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingContactsCampaign, setViewingContactsCampaign] = useState<ScheduledCampaign | null>(null);
  const [runningCampaignId, setRunningCampaignId] = useState<string | null>(null);
  const [executionProgress, setExecutionProgress] = useState<{ current: number; total: number } | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [campaignType, setCampaignType] = useState<ScheduledCampaignType>('birthday');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [messageTemplate, setMessageTemplate] = useState(TEMPLATES_BY_TYPE.birthday.template);
  const [scheduledDate, setScheduledDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [repeat, setRepeat] = useState<ScheduledRepeatFrequency>('yearly');
  const [intervalSeconds, setIntervalSeconds] = useState(5);
  const [contacts, setContacts] = useState<CampaignContact[]>([]);
  const [businessName] = useState('WiFi Solution Pro');
  const [manualText, setManualText] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load campaigns and active sessions on mount
  useEffect(() => {
    setCampaigns(getScheduledCampaigns());
    sessionApi
      .list()
      .then((list: Session[]) => {
        setSessions(list || []);
        if (list && list.length > 0) {
          setSelectedSessionId(list[0].name);
        }
      })
      .catch(() => {});
  }, []);

  const refreshCampaigns = () => {
    setCampaigns(getScheduledCampaigns());
  };

  const handleDownloadCsvTemplate = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(generateCsvTemplate());
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', csvContent);
    downloadAnchor.setAttribute('download', 'plantilla_contactos_programados.csv');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const text = (ev.target?.result as string) || '';
      const parsed = parseContactsFile(text);
      setContacts(parsed);
    };
    reader.readAsText(file);
  };

  const handleApplyManualContacts = () => {
    if (!manualText.trim()) return;
    const parsed = parseContactsFile(manualText);
    setContacts(parsed);
    setShowManualInput(false);
  };

  const handleSelectType = (type: ScheduledCampaignType) => {
    setCampaignType(type);
    setMessageTemplate(TEMPLATES_BY_TYPE[type].template);
    if (type === 'birthday') {
      setRepeat('yearly');
    } else if (type === 'offer') {
      setRepeat('none');
    } else if (type === 'notice') {
      setRepeat('none');
    }
  };

  const handleInsertVariable = (variable: string) => {
    setMessageTemplate(prev => prev + ' ' + variable);
  };

  const handleCreateCampaign = () => {
    if (!title.trim() || !selectedSessionId || contacts.length === 0) return;

    const newCampaign: ScheduledCampaign = {
      id: 'camp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: title.trim(),
      type: campaignType,
      sessionId: selectedSessionId,
      messageTemplate,
      scheduledDate,
      scheduledTime,
      repeat,
      intervalSeconds,
      contacts,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalSent: 0,
      totalFailed: 0,
    };

    saveCampaign(newCampaign);
    refreshCampaigns();
    setIsCreateModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setCampaignType('birthday');
    setMessageTemplate(TEMPLATES_BY_TYPE.birthday.template);
    setContacts([]);
    setManualText('');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Seguro que deseas eliminar esta campaña programada?')) {
      deleteCampaign(id);
      refreshCampaigns();
    }
  };

  const handleTogglePause = (campaign: ScheduledCampaign) => {
    const updatedStatus = campaign.status === 'paused' ? 'scheduled' : 'paused';
    saveCampaign({ ...campaign, status: updatedStatus });
    refreshCampaigns();
  };

  // Run campaign manually / start execution now
  const handleExecuteNow = async (campaign: ScheduledCampaign) => {
    if (runningCampaignId) return;

    const confirmRun = window.confirm(
      `¿Deseas iniciar el envío masivo para ${campaign.contacts.length} contactos usando la sesión "${campaign.sessionId}"?`,
    );
    if (!confirmRun) return;

    setRunningCampaignId(campaign.id);
    setExecutionProgress({ current: 0, total: campaign.contacts.length });

    const updatedContacts = [...campaign.contacts];
    let sentCount = campaign.totalSent || 0;
    let failedCount = campaign.totalFailed || 0;

    for (let i = 0; i < updatedContacts.length; i++) {
      const contact = updatedContacts[i];
      if (contact.status === 'sent') {
        setExecutionProgress({ current: i + 1, total: updatedContacts.length });
        continue;
      }

      const body = renderMessageTemplate(campaign.messageTemplate, contact, businessName);
      const res = await sendWhatsAppMessage(campaign.sessionId, contact.phone, body);

      if (res.success) {
        contact.status = 'sent';
        contact.sentAt = new Date().toISOString();
        sentCount++;
      } else {
        contact.status = 'failed';
        contact.error = res.error;
        failedCount++;
      }

      setExecutionProgress({ current: i + 1, total: updatedContacts.length });

      // Save progressive updates
      saveCampaign({
        ...campaign,
        status: i === updatedContacts.length - 1 ? 'completed' : 'running',
        contacts: updatedContacts,
        totalSent: sentCount,
        totalFailed: failedCount,
        lastRunAt: new Date().toISOString(),
      });
      refreshCampaigns();

      // Anti-ban delay between dispatches (in seconds)
      if (i < updatedContacts.length - 1) {
        await new Promise(r => setTimeout(r, (campaign.intervalSeconds || 5) * 1000));
      }
    }

    setRunningCampaignId(null);
    setExecutionProgress(null);
    refreshCampaigns();
  };

  const getCampaignIcon = (type: ScheduledCampaignType) => {
    switch (type) {
      case 'birthday':
        return <Cake size={18} className="type-icon-birthday" />;
      case 'offer':
        return <Flame size={18} className="type-icon-offer" />;
      case 'notice':
        return <Bell size={18} className="type-icon-notice" />;
      case 'custom':
      default:
        return <MessageSquare size={18} className="type-icon-custom" />;
    }
  };

  const getRepeatLabel = (rep: ScheduledRepeatFrequency) => {
    switch (rep) {
      case 'none':
        return 'Una sola vez';
      case 'daily':
        return 'Diario';
      case 'weekly':
        return 'Semanal';
      case 'monthly':
        return 'Mensual';
      case 'yearly':
        return 'Anual (Cumpleaños)';
    }
  };

  return (
    <div className="scheduled-messages-page">
      {/* Header */}
      <div className="page-header-unified">
        <div>
          <h1>Mensajes Programados & Envíos Masivos</h1>
          <p className="page-subtitle">
            Programa envíos masivos automatizados de felicitaciones de cumpleaños, ofertas y avisos con plantillas personalizadas.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn-secondary" onClick={handleDownloadCsvTemplate}>
            <Download size={16} /> Descargar Plantilla CSV
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={16} /> Nueva Campaña Programada
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="stats-grid-unified">
        <div className="stat-card">
          <div className="stat-icon-wrapper blue">
            <CalendarClock size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{campaigns.length}</span>
            <span className="stat-label">Total Campañas</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper green">
            <Clock size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">
              {campaigns.filter(c => c.status === 'scheduled' || c.status === 'running').length}
            </span>
            <span className="stat-label">Activas / Programadas</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper purple">
            <Users size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">
              {campaigns.reduce((acc, c) => acc + (c.contacts?.length || 0), 0)}
            </span>
            <span className="stat-label">Total Destinatarios</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper amber">
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">
              {campaigns.reduce((acc, c) => acc + (c.totalSent || 0), 0)}
            </span>
            <span className="stat-label">Mensajes Enviados</span>
          </div>
        </div>
      </div>

      {/* Running Execution Banner */}
      {runningCampaignId && executionProgress && (
        <div className="execution-banner">
          <Loader2 size={20} className="animate-spin" />
          <div className="execution-info">
            <span className="execution-title">Ejecutando envío masivo en segundo plano...</span>
            <span className="execution-sub">
              Progreso: {executionProgress.current} de {executionProgress.total} contactos procesados
            </span>
          </div>
          <div className="execution-progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${(executionProgress.current / (executionProgress.total || 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Campaigns Grid / List */}
      {campaigns.length === 0 ? (
        <div className="empty-state-unified">
          <CalendarClock size={48} className="empty-icon" />
          <h3>No tienes mensajes ni campañas programadas</h3>
          <p>
            Crea tu primera campaña para enviar felicitaciones automáticas de cumpleaños, promociones con listas de precios o comunicados de servicio.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={16} /> Crear Campaña Programada
          </button>
        </div>
      ) : (
        <div className="campaigns-grid">
          {campaigns.map(camp => {
            const total = camp.contacts?.length || 0;
            const sent = camp.totalSent || 0;
            const progressPercent = total > 0 ? Math.round((sent / total) * 100) : 0;
            const isRunning = runningCampaignId === camp.id;

            return (
              <div key={camp.id} className="campaign-card">
                <div className="campaign-card-header">
                  <div className="campaign-title-group">
                    <div className="campaign-type-icon">{getCampaignIcon(camp.type)}</div>
                    <div>
                      <h3 className="campaign-title">{camp.title}</h3>
                      <span className="campaign-session-badge">Remitente: {camp.sessionId}</span>
                    </div>
                  </div>
                  <span className={`status-pill ${camp.status}`}>
                    {camp.status === 'scheduled' && '📅 Programado'}
                    {camp.status === 'running' && '⚡ En Ejecución'}
                    {camp.status === 'paused' && '⏸️ Pausado'}
                    {camp.status === 'completed' && '✅ Completado'}
                    {camp.status === 'cancelled' && '✕ Cancelado'}
                  </span>
                </div>

                <div className="campaign-card-body">
                  <div className="campaign-schedule-info">
                    <div className="schedule-item">
                      <Clock size={14} />
                      <span>
                        {camp.scheduledDate} a las {camp.scheduledTime} ({getRepeatLabel(camp.repeat)})
                      </span>
                    </div>
                    <div className="schedule-item">
                      <Users size={14} />
                      <span>{total} destinatarios cargados</span>
                    </div>
                  </div>

                  <div className="campaign-progress-box">
                    <div className="progress-labels">
                      <span>Progreso de envío</span>
                      <span>
                        {sent} / {total} ({progressPercent}%)
                      </span>
                    </div>
                    <div className="progress-bar-track">
                      <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>

                  <div className="campaign-msg-preview">
                    <strong>Mensaje:</strong> "{camp.messageTemplate.slice(0, 110)}..."
                  </div>
                </div>

                <div className="campaign-card-footer">
                  <button
                    type="button"
                    className="btn-action"
                    onClick={() => setViewingContactsCampaign(camp)}
                    title="Ver Destinatarios"
                  >
                    <Eye size={14} /> Destinatarios ({total})
                  </button>

                  <button
                    type="button"
                    className="btn-action"
                    onClick={() => handleTogglePause(camp)}
                    title={camp.status === 'paused' ? 'Reanudar' : 'Pausar'}
                  >
                    {camp.status === 'paused' ? <Play size={14} /> : <Pause size={14} />}
                  </button>

                  <button
                    type="button"
                    className="btn-action btn-execute"
                    onClick={() => handleExecuteNow(camp)}
                    disabled={isRunning || runningCampaignId !== null}
                    title="Ejecutar envío ahora"
                  >
                    {isRunning ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        <Send size={14} /> Enviar Ahora
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="btn-action danger"
                    onClick={() => handleDelete(camp.id)}
                    title="Eliminar campaña"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE CAMPAIGN MODAL */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div
            className="modal create-campaign-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-with-badge">
                <div className="modal-header-icon-box">
                  <CalendarClock size={22} />
                </div>
                <div>
                  <h2>Nueva Campaña de Mensajes Programados</h2>
                  <span className="modal-subtitle">
                    Programa envíos masivos automáticos para cumpleaños, promociones y avisos
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setIsCreateModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-section-stack">
                {/* 1. Basic details & Type */}
                <div className="form-group-unified">
                  <label htmlFor="camp-title">Nombre de la Campaña:</label>
                  <input
                    id="camp-title"
                    type="text"
                    placeholder="ej. Cumpleañeros de Septiembre, Oferta Fibra 100M, Aviso Mantenimiento"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* Campaign Types Selector */}
                <div className="form-group-unified">
                  <label>Tipo de Mensaje / Objetivo:</label>
                  <div className="campaign-types-selector">
                    <button
                      type="button"
                      className={`type-btn ${campaignType === 'birthday' ? 'active' : ''}`}
                      onClick={() => handleSelectType('birthday')}
                    >
                      <Cake size={18} />
                      <div className="type-btn-info">
                        <strong>🎂 Cumpleaños</strong>
                        <span>Felicitaciones + Regalo</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`type-btn ${campaignType === 'offer' ? 'active' : ''}`}
                      onClick={() => handleSelectType('offer')}
                    >
                      <Flame size={18} />
                      <div className="type-btn-info">
                        <strong>🔥 Oferta / Promo</strong>
                        <span>Planes, precios y descuentos</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`type-btn ${campaignType === 'notice' ? 'active' : ''}`}
                      onClick={() => handleSelectType('notice')}
                    >
                      <Bell size={18} />
                      <div className="type-btn-info">
                        <strong>📢 Aviso / Noticia</strong>
                        <span>Cortes, mantenimiento y avisos</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`type-btn ${campaignType === 'custom' ? 'active' : ''}`}
                      onClick={() => handleSelectType('custom')}
                    >
                      <MessageSquare size={18} />
                      <div className="type-btn-info">
                        <strong>✉️ Personalizado</strong>
                        <span>Mensaje libre a medida</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* WhatsApp Remitente Session */}
                <div className="form-group-unified">
                  <label htmlFor="session-select">Sesión Remitente de WhatsApp:</label>
                  <select
                    id="session-select"
                    value={selectedSessionId}
                    onChange={e => setSelectedSessionId(e.target.value)}
                  >
                    {sessions.length === 0 ? (
                      <option value="">No hay sesiones disponibles (conecta una en Sesiones)</option>
                    ) : (
                      sessions.map(s => (
                        <option key={s.name} value={s.name}>
                          {s.name} ({s.status})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* 2. File Upload for Contacts */}
                <div className="form-group-unified">
                  <div className="label-with-action">
                    <label>Archivo de Destinatarios (Nombres, Números y Fechas):</label>
                    <button
                      type="button"
                      className="text-link-btn"
                      onClick={handleDownloadCsvTemplate}
                    >
                      <Download size={13} /> Descargar plantilla CSV
                    </button>
                  </div>

                  <div
                    className="file-dropzone compact"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt,.json,.xls,.xlsx"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                    <Upload size={20} />
                    <span>
                      {contacts.length > 0
                        ? `✅ ${contacts.length} contactos cargados exitosamente (Haz clic para cambiar archivo)`
                        : 'Haz clic aquí para subir tu archivo de contactos (.CSV, .TXT, .JSON)'}
                    </span>
                  </div>

                  <div className="manual-toggle-row">
                    <button
                      type="button"
                      className="text-link-btn"
                      onClick={() => setShowManualInput(!showManualInput)}
                    >
                      {showManualInput ? 'Ocultar entrada manual' : 'O pegar números/nombres manualmente'}
                    </button>
                  </div>

                  {showManualInput && (
                    <div className="manual-input-box">
                      <textarea
                        rows={3}
                        placeholder="Pega contactos en formato: Nombre, Teléfono, Fecha&#10;Ej: Carlos Perez, 584121234567, 1990-09-15"
                        value={manualText}
                        onChange={e => setManualText(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn-template-pill highlight"
                        onClick={handleApplyManualContacts}
                      >
                        Aplicar Contactos Pegados
                      </button>
                    </div>
                  )}

                  {contacts.length > 0 && (
                    <div className="contacts-preview-badge">
                      <Users size={14} />
                      <span>{contacts.length} destinatarios listos para programar</span>
                    </div>
                  )}
                </div>

                {/* 3. Message Template & Variables */}
                <div className="form-group-unified">
                  <label htmlFor="msg-template">Plantilla de Mensaje:</label>
                  <div className="variables-helper-bar">
                    <span className="variables-label">Insertar variable:</span>
                    <button
                      type="button"
                      className="var-pill"
                      onClick={() => handleInsertVariable('{nombre}')}
                    >
                      + {'{nombre}'}
                    </button>
                    <button
                      type="button"
                      className="var-pill"
                      onClick={() => handleInsertVariable('{numero}')}
                    >
                      + {'{numero}'}
                    </button>
                    <button
                      type="button"
                      className="var-pill"
                      onClick={() => handleInsertVariable('{fecha}')}
                    >
                      + {'{fecha}'}
                    </button>
                    <button
                      type="button"
                      className="var-pill"
                      onClick={() => handleInsertVariable('{empresa}')}
                    >
                      + {'{empresa}'}
                    </button>
                  </div>
                  <textarea
                    id="msg-template"
                    rows={6}
                    value={messageTemplate}
                    onChange={e => setMessageTemplate(e.target.value)}
                    placeholder="Escribe el mensaje con variables..."
                  />

                  {/* Realtime Message Simulation */}
                  <div className="template-simulation-card">
                    <span className="simulation-badge">
                      📱 Vista Previa del Mensaje ({contacts[0]?.name || 'Cliente Ejemplo'}):
                    </span>
                    <p className="simulation-text">
                      {renderMessageTemplate(
                        messageTemplate,
                        contacts[0] || {
                          id: '1',
                          name: 'Carlos Perez',
                          phone: '584121234567',
                          date: '15 de Septiembre',
                          status: 'pending',
                        },
                        businessName,
                      )}
                    </p>
                  </div>
                </div>

                {/* 4. Date, Time & Frequency */}
                <div className="time-grid-row">
                  <div className="form-group-unified">
                    <label htmlFor="camp-date">Fecha de Envío:</label>
                    <input
                      id="camp-date"
                      type="date"
                      value={scheduledDate}
                      onChange={e => setScheduledDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group-unified">
                    <label htmlFor="camp-time">Hora de Envío:</label>
                    <input
                      id="camp-time"
                      type="time"
                      value={scheduledTime}
                      onChange={e => setScheduledTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="time-grid-row">
                  <div className="form-group-unified">
                    <label htmlFor="camp-repeat">Frecuencia / Repetición:</label>
                    <select
                      id="camp-repeat"
                      value={repeat}
                      onChange={e => setRepeat(e.target.value as ScheduledRepeatFrequency)}
                    >
                      <option value="none">Una sola vez (Sin repetición)</option>
                      <option value="daily">Diario (Todos los días a esta hora)</option>
                      <option value="weekly">Semanal (Una vez por semana)</option>
                      <option value="monthly">Mensual (Cada mes en esta fecha)</option>
                      <option value="yearly">Anual (Ideal para Cumpleaños)</option>
                    </select>
                  </div>

                  <div className="form-group-unified">
                    <label htmlFor="camp-interval">Intervalo Antiban entre mensajes:</label>
                    <select
                      id="camp-interval"
                      value={intervalSeconds}
                      onChange={e => setIntervalSeconds(Number(e.target.value))}
                    >
                      <option value="3">3 segundos</option>
                      <option value="5">5 segundos (Recomendado)</option>
                      <option value="10">10 segundos (Máxima seguridad)</option>
                      <option value="15">15 segundos</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleCreateCampaign}
                disabled={!title.trim() || !selectedSessionId || contacts.length === 0}
              >
                <CheckCircle2 size={16} /> Guardar y Programar Campaña
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW CONTACTS LIST MODAL */}
      {viewingContactsCampaign && (
        <div className="modal-overlay" onClick={() => setViewingContactsCampaign(null)}>
          <div
            className="modal contacts-modal-wide"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-with-badge">
                <div className="modal-header-icon-box">
                  <Users size={22} />
                </div>
                <div>
                  <h2>Destinatarios — {viewingContactsCampaign.title}</h2>
                  <span className="modal-subtitle">
                    {viewingContactsCampaign.contacts?.length || 0} contactos asignados a esta campaña
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setViewingContactsCampaign(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="contacts-table-container">
                <table className="contacts-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nombre</th>
                      <th>Teléfono / WhatsApp</th>
                      <th>Fecha Asignada</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingContactsCampaign.contacts?.map((c, idx) => (
                      <tr key={c.id}>
                        <td>{idx + 1}</td>
                        <td><strong>{c.name}</strong></td>
                        <td><code>{c.phone}</code></td>
                        <td>{c.date || '—'}</td>
                        <td>
                          <span className={`contact-status-badge ${c.status}`}>
                            {c.status === 'sent' && '✅ Enviado'}
                            {c.status === 'failed' && '❌ Fallido'}
                            {c.status === 'pending' && '⏳ Pendiente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setViewingContactsCampaign(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScheduledMessages;
