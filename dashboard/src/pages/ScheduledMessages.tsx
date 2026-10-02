import { useState, useEffect, useRef, useMemo, type ChangeEvent } from 'react';
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
  Filter,
  Image as ImageIcon,
  Video as VideoIcon,
  Music as AudioIcon,
  FileText as DocumentIcon,
  Sparkles,
  ChevronDown,
  Search,
  Check,
  Smartphone,
  Info,
  FileSpreadsheet,
} from 'lucide-react';
import { sessionApi, type Session } from '../services/api';
import {
  type ScheduledCampaign,
  type ScheduledCampaignType,
  type ScheduledRepeatFrequency,
  type CampaignMediaType,
  type CampaignContact,
  getScheduledCampaigns,
  saveCampaign,
  deleteCampaign,
  generateCsvTemplate,
  renderMessageTemplate,
  sendWhatsAppMessage,
} from '../services/scheduledMessagesService';
import {
  downloadScheduledMessagesExcelTemplate,
  parseContactsFileUnified,
} from '../utils/excelService';
import { getSessionAiConfig, AI_ROLES } from '../services/aiAssistant';
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
  const [selectedBotFilter, setSelectedBotFilter] = useState<string>('all');
  const [isBotDropdownOpen, setIsBotDropdownOpen] = useState(false);
  const [botSearchQuery, setBotSearchQuery] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingContactsCampaign, setViewingContactsCampaign] = useState<ScheduledCampaign | null>(null);
  const [runningCampaignId, setRunningCampaignId] = useState<string | null>(null);
  const [executionProgress, setExecutionProgress] = useState<{ current: number; total: number } | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [campaignType, setCampaignType] = useState<ScheduledCampaignType>('birthday');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [mediaType, setMediaType] = useState<CampaignMediaType>('text');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaBase64, setMediaBase64] = useState('');
  const [mediaFilename, setMediaFilename] = useState('');
  const [mediaMimetype, setMediaMimetype] = useState('');
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState('');
  const [messageTemplate, setMessageTemplate] = useState(TEMPLATES_BY_TYPE.birthday.template);
  const [scheduledDate, setScheduledDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [repeat, setRepeat] = useState<ScheduledRepeatFrequency>('yearly');
  const [intervalSeconds, setIntervalSeconds] = useState(5);
  const [contacts, setContacts] = useState<CampaignContact[]>([]);
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);
  const [businessName] = useState('WiFi Solution Pro');
  const [manualText, setManualText] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const botDropdownRef = useRef<HTMLDivElement>(null);

  // Close bot filter dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (botDropdownRef.current && !botDropdownRef.current.contains(e.target as Node)) {
        setIsBotDropdownOpen(false);
      }
    };
    if (isBotDropdownOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isBotDropdownOpen]);

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

  // Enriched bot list for session filtering
  const enrichedBots = useMemo(() => {
    return sessions.map(session => {
      const aiConf = getSessionAiConfig(session.id || session.name);
      const isConnected = session.status === 'ready';
      const roleDef = aiConf ? AI_ROLES[aiConf.role] : null;
      const botCampaignsCount = campaigns.filter(c => c.sessionId === session.name || c.sessionId === session.id).length;

      return {
        session,
        id: session.name || session.id,
        name: session.name,
        isConnected,
        roleName: aiConf?.role === 'custom' && aiConf.customRoleName ? aiConf.customRoleName : roleDef?.name || 'Bot Asistente',
        phone: session.phone,
        campaignsCount: botCampaignsCount,
      };
    });
  }, [sessions, campaigns]);

  const filteredDropdownBots = useMemo(() => {
    if (!botSearchQuery.trim()) return enrichedBots;
    const q = botSearchQuery.toLowerCase();
    return enrichedBots.filter(
      b =>
        b.name.toLowerCase().includes(q) ||
        b.roleName.toLowerCase().includes(q) ||
        (b.phone && b.phone.toLowerCase().includes(q)),
    );
  }, [enrichedBots, botSearchQuery]);

  const selectedBotFilterData = useMemo(() => {
    if (selectedBotFilter === 'all') return null;
    return enrichedBots.find(b => b.id === selectedBotFilter || b.name === selectedBotFilter) || null;
  }, [selectedBotFilter, enrichedBots]);

  // Filtered campaigns by selected bot
  const filteredCampaigns = useMemo(() => {
    if (selectedBotFilter === 'all') return campaigns;
    return campaigns.filter(c => c.sessionId === selectedBotFilter || c.sessionId === selectedBotFilterData?.name);
  }, [campaigns, selectedBotFilter, selectedBotFilterData]);

  // Media file selection & conversion to Base64/DataURL
  const handleMediaFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaFilename(file.name);
    setMediaMimetype(file.type || 'application/octet-stream');

    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setMediaPreviewUrl(dataUrl);
      setMediaBase64(dataUrl);
      setMediaUrl('');
    };
    reader.readAsDataURL(file);
  };

  const handleClearMedia = () => {
    setMediaPreviewUrl('');
    setMediaBase64('');
    setMediaUrl('');
    setMediaFilename('');
    setMediaMimetype('');
    if (mediaInputRef.current) mediaInputRef.current.value = '';
  };

  const handleDownloadExcelTemplate = () => {
    downloadScheduledMessagesExcelTemplate(campaignType);
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

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const res = await parseContactsFileUnified(file);
      setContacts(res.contacts);

      // Extract custom column variables from headers
      const dynVars = res.headers
        .filter(h => {
          const l = h.toLowerCase().trim();
          return !l.includes('nombre') && !l.includes('name') && !l.includes('telefono') && !l.includes('phone') && !l.includes('numero') && !l.includes('fecha') && !l.includes('date');
        })
        .map(h => `{${h.toLowerCase().trim().replace(/\s+/g, '_')}}`);

      setDetectedVariables(dynVars);
    } catch (err) {
      console.error('Error importing contacts file:', err);
    } finally {
      setIsImporting(false);
    }
  };

  const handleApplyManualContacts = async () => {
    if (!manualText.trim()) return;
    const res = await parseContactsFileUnified(manualText);
    setContacts(res.contacts);
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
      mediaType,
      mediaUrl: mediaUrl.trim() || undefined,
      mediaBase64: mediaBase64 || undefined,
      mediaFilename: mediaFilename || undefined,
      mediaMimetype: mediaMimetype || undefined,
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
    setMediaType('text');
    handleClearMedia();
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

    const mediaLabel = campaign.mediaType && campaign.mediaType !== 'text' ? ` con archivo (${campaign.mediaType.toUpperCase()})` : '';
    const confirmRun = window.confirm(
      `¿Deseas iniciar el envío masivo para ${campaign.contacts.length} contactos${mediaLabel} usando el Bot/Sesión "${campaign.sessionId}"?`,
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
      const mediaPayload =
        campaign.mediaType && campaign.mediaType !== 'text'
          ? {
              type: campaign.mediaType,
              url: campaign.mediaUrl,
              base64: campaign.mediaBase64,
              filename: campaign.mediaFilename,
              mimetype: campaign.mediaMimetype,
            }
          : undefined;

      const res = await sendWhatsAppMessage(campaign.sessionId, contact.phone, body, mediaPayload);

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

      // Anti-ban delay between dispatches
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

  const getMediaBadge = (type?: CampaignMediaType) => {
    switch (type) {
      case 'image':
        return <span className="media-type-badge image"><ImageIcon size={12} /> Imagen</span>;
      case 'video':
        return <span className="media-type-badge video"><VideoIcon size={12} /> Video</span>;
      case 'audio':
        return <span className="media-type-badge audio"><AudioIcon size={12} /> Audio</span>;
      case 'document':
        return <span className="media-type-badge document"><DocumentIcon size={12} /> Archivo</span>;
      default:
        return <span className="media-type-badge text"><MessageSquare size={12} /> Texto</span>;
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
            Programa envíos masivos automatizados de felicitaciones de cumpleaños, ofertas, avisos y multimedia personalizada por bot.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn-secondary" onClick={handleDownloadExcelTemplate} title="Descargar plantilla formateada en Excel (.xlsx) para rellenar datos">
            <FileSpreadsheet size={16} /> Descargar Plantilla Excel (.xlsx)
          </button>
          <button type="button" className="btn-secondary" onClick={handleDownloadCsvTemplate} title="Descargar plantilla en formato CSV">
            <Download size={16} /> Plantilla CSV
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

      {/* FILTER BY BOT / SESSION BAR */}
      <div className="scheduled-bot-filter-bar">
        <div className="filter-bar-left">
          <div className="filter-label">
            <Filter size={15} />
            <span>Filtrar por Bot / Sesión:</span>
          </div>

          <div className="bot-select-dropdown-container" ref={botDropdownRef}>
            <button
              type="button"
              className="bot-select-trigger-btn"
              onClick={() => setIsBotDropdownOpen(!isBotDropdownOpen)}
              aria-expanded={isBotDropdownOpen}
            >
              <div className="trigger-content">
                {selectedBotFilterData ? (
                  <>
                    <span className={`status-dot-mini ${selectedBotFilterData.isConnected ? 'online' : 'offline'}`} />
                    <span className="trigger-icon">🤖</span>
                    <span className="trigger-bot-name">{selectedBotFilterData.name}</span>
                    <span className="trigger-role-badge">{selectedBotFilterData.roleName}</span>
                    {selectedBotFilterData.phone && (
                      <span className="trigger-phone">({selectedBotFilterData.phone})</span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="trigger-icon">🌐</span>
                    <span className="trigger-bot-name">Todos los Bots (Resumen Global)</span>
                    <span className="trigger-count-badge">{campaigns.length} campañas</span>
                  </>
                )}
              </div>
              <ChevronDown size={16} className={`trigger-chevron ${isBotDropdownOpen ? 'open' : ''}`} />
            </button>

            {isBotDropdownOpen && (
              <div className="bot-select-menu-popover animate-fade-in">
                {enrichedBots.length > 3 && (
                  <div className="bot-search-box">
                    <Search size={14} />
                    <input
                      type="text"
                      placeholder="Buscar bot por nombre o rol..."
                      value={botSearchQuery}
                      onChange={e => setBotSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </div>
                )}

                <div className="bot-options-list">
                  {/* All bots option */}
                  <div
                    className={`bot-option-item ${selectedBotFilter === 'all' ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedBotFilter('all');
                      setIsBotDropdownOpen(false);
                    }}
                  >
                    <div className="bot-option-left">
                      <span className="option-icon">🌐</span>
                      <div className="option-texts">
                        <span className="option-title">Todos los Bots (Resumen Global)</span>
                        <span className="option-sub">Ver todas las difusiones programadas en el sistema</span>
                      </div>
                    </div>
                    <div className="option-right">
                      <span className="option-count">{campaigns.length}</span>
                      {selectedBotFilter === 'all' && <Check size={16} className="option-check" />}
                    </div>
                  </div>

                  <div className="bot-options-divider" />

                  {/* Individual bots */}
                  {filteredDropdownBots.length === 0 ? (
                    <div className="bot-options-empty">No se encontraron bots coincidentes.</div>
                  ) : (
                    filteredDropdownBots.map(b => {
                      const isSelected = selectedBotFilter === b.id || selectedBotFilter === b.name;
                      return (
                        <div
                          key={b.id}
                          className={`bot-option-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedBotFilter(b.id);
                            setIsBotDropdownOpen(false);
                          }}
                        >
                          <div className="bot-option-left">
                            <span className={`status-dot-mini ${b.isConnected ? 'online' : 'offline'}`} />
                            <span className="option-icon">🤖</span>
                            <div className="option-texts">
                              <div className="option-name-row">
                                <span className="option-title">{b.name}</span>
                                <span className="option-role-tag">{b.roleName}</span>
                              </div>
                              <span className="option-sub">
                                {b.phone ? `📱 ${b.phone}` : '⚠️ Sin teléfono'} · {b.isConnected ? '🟢 Conectado' : '⚪ Desconectado'}
                              </span>
                            </div>
                          </div>

                          <div className="option-right">
                            <span className="option-count">{b.campaignsCount} camp.</span>
                            {isSelected && <Check size={16} className="option-check" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedBotFilter !== 'all' && (
          <button
            type="button"
            className="btn-reset-filter"
            onClick={() => setSelectedBotFilter('all')}
            title="Volver a la vista global de todos los bots"
          >
            Ver Todos 🌐
          </button>
        )}
      </div>

      {/* Overview Stats */}
      <div className="stats-grid-unified">
        <div className="stat-card">
          <div className="stat-icon-wrapper blue">
            <CalendarClock size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{filteredCampaigns.length}</span>
            <span className="stat-label">
              {selectedBotFilterData ? `Campañas en ${selectedBotFilterData.name}` : 'Total Campañas'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper green">
            <Clock size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">
              {filteredCampaigns.filter(c => c.status === 'scheduled' || c.status === 'running').length}
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
              {filteredCampaigns.reduce((acc, c) => acc + (c.contacts?.length || 0), 0)}
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
              {filteredCampaigns.reduce((acc, c) => acc + (c.totalSent || 0), 0)}
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
      {filteredCampaigns.length === 0 ? (
        <div className="empty-state-unified">
          <CalendarClock size={48} className="empty-icon" />
          <h3>No hay difusiones programadas {selectedBotFilterData ? `para ${selectedBotFilterData.name}` : ''}</h3>
          <p>
            Crea tu primera campaña para enviar mensajes con texto, imágenes, videos o audios automatizados.
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
          {filteredCampaigns.map(camp => {
            const total = camp.contacts?.length || 0;
            const sent = camp.totalSent || 0;
            const failed = camp.totalFailed || 0;
            const progressPercent = total > 0 ? Math.round((sent / total) * 100) : 0;
            const isRunning = runningCampaignId === camp.id;

            return (
              <div key={camp.id} className="campaign-card">
                <div className="campaign-card-header">
                  <div className="campaign-title-group">
                    <div className="campaign-type-icon">{getCampaignIcon(camp.type)}</div>
                    <div>
                      <h3 className="campaign-title">{camp.title}</h3>
                      <div className="campaign-meta-badges">
                        <span className="campaign-session-badge">🤖 {camp.sessionId}</span>
                        {getMediaBadge(camp.mediaType)}
                      </div>
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
                  {/* Schedule Details */}
                  <div className="campaign-schedule-info">
                    <div className="schedule-item">
                      <Clock size={14} />
                      <span className="schedule-datetime">
                        <strong>Día:</strong> {camp.scheduledDate} · <strong>Hora:</strong> {camp.scheduledTime}
                      </span>
                    </div>
                    <div className="schedule-item">
                      <Sparkles size={14} />
                      <span>Frecuencia: <strong>{getRepeatLabel(camp.repeat)}</strong></span>
                    </div>
                    <div className="schedule-item">
                      <Users size={14} />
                      <span>{total} destinatarios cargados</span>
                    </div>
                  </div>

                  {/* Media Thumbnail or Audio preview if present */}
                  {camp.mediaType && camp.mediaType !== 'text' && (
                    <div className="card-media-attachment-preview">
                      {camp.mediaType === 'image' && (
                        <div className="card-media-thumb image">
                          <img src={camp.mediaBase64 || camp.mediaUrl} alt="Adjunto" />
                          <span className="thumb-tag">🖼️ Imagen</span>
                        </div>
                      )}
                      {camp.mediaType === 'video' && (
                        <div className="card-media-thumb video">
                          <video src={camp.mediaBase64 || camp.mediaUrl} preload="metadata" />
                          <span className="thumb-tag">🎥 Video</span>
                        </div>
                      )}
                      {camp.mediaType === 'audio' && (
                        <div className="card-media-thumb audio">
                          <audio controls src={camp.mediaBase64 || camp.mediaUrl} />
                        </div>
                      )}
                      {camp.mediaType === 'document' && (
                        <div className="card-media-thumb doc">
                          <DocumentIcon size={20} />
                          <span>{camp.mediaFilename || 'Documento adjunto'}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Progress Box */}
                  <div className="campaign-progress-box">
                    <div className="progress-labels">
                      <span>Progreso de envío</span>
                      <span>
                        {sent} de {total} ({progressPercent}%) {failed > 0 && <span className="failed-text">· ⚠️ {failed} fallidos</span>}
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
            className="modal create-campaign-modal modal-studio-wide"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-with-badge">
                <div className="modal-header-icon-box">
                  <CalendarClock size={22} />
                </div>
                <div>
                  <h2>Configuración de Difusión & Envíos Masivos</h2>
                  <span className="modal-subtitle">
                    Programa envíos con texto, imágenes, videos, audios y previsualización en tiempo real
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

            <div className="modal-body modal-studio-grid">
              {/* LEFT COLUMN: FORM CONTROLS */}
              <div className="form-section-stack">
                {/* 1. Basic details & Type */}
                <div className="form-group-unified">
                  <label htmlFor="camp-title">
                    Nombre de la Difusión / Campaña <span className="required-star">*</span>
                  </label>
                  <input
                    id="camp-title"
                    type="text"
                    required
                    className="is-required"
                    placeholder="ej. Promo Fin de Mes Fibra, Felicitaciones Cumpleaños, Comunicado Red"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* WhatsApp Remitente Session */}
                <div className="form-group-unified">
                  <label htmlFor="session-select">
                    🤖 Bot / Sesión Remitente de WhatsApp <span className="required-star">*</span>
                  </label>
                  <select
                    id="session-select"
                    required
                    className="is-required"
                    value={selectedSessionId}
                    onChange={e => setSelectedSessionId(e.target.value)}
                  >
                    {sessions.length === 0 ? (
                      <option value="">No hay sesiones disponibles (conecta una en Sesiones)</option>
                    ) : (
                      sessions.map(s => (
                        <option key={s.name} value={s.name}>
                          {s.name} ({s.status === 'ready' ? '🟢 Conectado' : '⚪ Desconectado'}) {s.phone ? `· ${s.phone}` : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Campaign Types Selector */}
                <div className="form-group-unified">
                  <label>Tipo de Mensaje / Plantilla Base:</label>
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
                        <span>Cortes y avisos de red</span>
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

                {/* 2. MULTIMEDIA SELECTION TABS */}
                <div className="form-group-unified">
                  <label>Tipo de Contenido Multimedia Adjunto:</label>
                  <div className="media-type-selector-tabs">
                    <button
                      type="button"
                      className={`media-tab-btn ${mediaType === 'text' ? 'active' : ''}`}
                      onClick={() => setMediaType('text')}
                    >
                      <MessageSquare size={16} /> Sólo Texto
                    </button>
                    <button
                      type="button"
                      className={`media-tab-btn ${mediaType === 'image' ? 'active' : ''}`}
                      onClick={() => setMediaType('image')}
                    >
                      <ImageIcon size={16} /> Imagen
                    </button>
                    <button
                      type="button"
                      className={`media-tab-btn ${mediaType === 'video' ? 'active' : ''}`}
                      onClick={() => setMediaType('video')}
                    >
                      <VideoIcon size={16} /> Video
                    </button>
                    <button
                      type="button"
                      className={`media-tab-btn ${mediaType === 'audio' ? 'active' : ''}`}
                      onClick={() => setMediaType('audio')}
                    >
                      <AudioIcon size={16} /> Audio / Voz
                    </button>
                    <button
                      type="button"
                      className={`media-tab-btn ${mediaType === 'document' ? 'active' : ''}`}
                      onClick={() => setMediaType('document')}
                    >
                      <DocumentIcon size={16} /> Documento
                    </button>
                  </div>

                  {/* File Upload / URL when media is active */}
                  {mediaType !== 'text' && (
                    <div className="media-uploader-box">
                      <div
                        className="file-dropzone compact media-drop"
                        onClick={() => mediaInputRef.current?.click()}
                      >
                        <input
                          ref={mediaInputRef}
                          type="file"
                          accept={
                            mediaType === 'image'
                              ? 'image/*'
                              : mediaType === 'video'
                              ? 'video/*'
                              : mediaType === 'audio'
                              ? 'audio/*'
                              : '*/*'
                          }
                          style={{ display: 'none' }}
                          onChange={handleMediaFileUpload}
                        />
                        <Upload size={20} />
                        <span>
                          {mediaFilename
                            ? `✅ Archivo: ${mediaFilename} (Haz clic para cambiar)`
                            : `Cargar ${mediaType === 'image' ? 'Imagen (JPG, PNG)' : mediaType === 'video' ? 'Video (MP4)' : mediaType === 'audio' ? 'Audio / Nota de voz (MP3, OGG, WAV)' : 'Documento (PDF, DOC)'}`}
                        </span>
                      </div>

                      <div className="media-url-input-row">
                        <span className="or-text">o ingresar URL pública:</span>
                        <input
                          type="url"
                          placeholder="https://ejemplo.com/archivo.jpg"
                          value={mediaUrl}
                          onChange={e => {
                            setMediaUrl(e.target.value);
                            setMediaPreviewUrl(e.target.value);
                            setMediaBase64('');
                          }}
                        />
                        {mediaPreviewUrl && (
                          <button type="button" className="btn-clear-media" onClick={handleClearMedia}>
                            Quitar ✕
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Message Template & Variables */}
                <div className="form-group-unified">
                  <div className="label-with-action">
                    <label htmlFor="msg-template">
                      {mediaType !== 'text' ? 'Texto / Pie de foto (Caption)' : 'Plantilla de Mensaje'} <span className="required-star">*</span>
                    </label>
                  </div>
                  <div className="variables-helper-bar">
                    <span className="variables-label">Variables:</span>
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
                    {/* Render dynamically detected Excel variables */}
                    {detectedVariables.map(v => (
                      <button
                        key={v}
                        type="button"
                        className="var-pill custom-var"
                        style={{ borderColor: '#3b82f6', color: '#60a5fa' }}
                        onClick={() => handleInsertVariable(v)}
                        title={`Variable detectada de columna Excel: ${v}`}
                      >
                        + {v}
                      </button>
                    ))}
                  </div>
                  <textarea
                    id="msg-template"
                    rows={4}
                    required
                    className="is-required"
                    value={messageTemplate}
                    onChange={e => setMessageTemplate(e.target.value)}
                    placeholder="Escribe el mensaje con variables..."
                  />
                </div>

                {/* 4. Scheduling & Date/Time Settings */}
                <div className="scheduling-row-unified">
                  <div className="form-group-unified">
                    <label htmlFor="sched-date">📅 Día de Envío:</label>
                    <input
                      id="sched-date"
                      type="date"
                      value={scheduledDate}
                      onChange={e => setScheduledDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group-unified">
                    <label htmlFor="sched-time">⏰ Hora de Envío:</label>
                    <input
                      id="sched-time"
                      type="time"
                      value={scheduledTime}
                      onChange={e => setScheduledTime(e.target.value)}
                    />
                  </div>

                  <div className="form-group-unified">
                    <label htmlFor="sched-repeat">🔁 Frecuencia:</label>
                    <select
                      id="sched-repeat"
                      value={repeat}
                      onChange={e => setRepeat(e.target.value as ScheduledRepeatFrequency)}
                    >
                      <option value="none">Una sola vez</option>
                      <option value="daily">Diario</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensual</option>
                      <option value="yearly">Anual (Cumpleaños)</option>
                    </select>
                  </div>

                  <div className="form-group-unified">
                    <label htmlFor="sched-interval">⚡ Anti-Ban (seg):</label>
                    <input
                      id="sched-interval"
                      type="number"
                      min={2}
                      max={60}
                      value={intervalSeconds}
                      onChange={e => setIntervalSeconds(Number(e.target.value) || 5)}
                    />
                  </div>
                </div>

                {/* 5. File Upload for Contacts */}
                <div className="form-group-unified">
                  <div className="label-with-action">
                    <label>👥 Destinatarios ({contacts.length} listos):</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="text-link-btn"
                        style={{ color: '#10b981', fontWeight: 600 }}
                        onClick={handleDownloadExcelTemplate}
                        title="Descargar plantilla formateada en Excel (.xlsx)"
                      >
                        <FileSpreadsheet size={13} /> Plantilla Excel (.xlsx)
                      </button>
                      <button
                        type="button"
                        className="text-link-btn"
                        onClick={handleDownloadCsvTemplate}
                        title="Descargar plantilla CSV simple"
                      >
                        <Download size={13} /> Plantilla CSV
                      </button>
                    </div>
                  </div>

                  <div
                    className="file-dropzone compact"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv,.txt,.json"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                    {isImporting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Leyendo y procesando archivo Excel/CSV...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet size={18} color="#10b981" />
                        <span>
                          {contacts.length > 0
                            ? `✅ ${contacts.length} contactos cargados (clic para cambiar archivo Excel/CSV)`
                            : 'Subir archivo de contactos (.XLSX, .XLS, .CSV, .TXT, .JSON)'}
                        </span>
                      </>
                    )}
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
                        placeholder="Nombre, Teléfono, Fecha&#10;Ej: Carlos Perez, 584121234567, 1990-09-15"
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
                </div>
              </div>

              {/* RIGHT COLUMN: LIVE WHATSAPP PREVIEW */}
              <div className="whatsapp-preview-column">
                <div className="preview-header-tag">
                  <Smartphone size={16} />
                  <span>📱 Vista Previa en Vivo de WhatsApp</span>
                </div>

                <div className="whatsapp-phone-mockup">
                  <div className="mockup-chat-header">
                    <div className="chat-avatar-circle">
                      {selectedBotFilterData?.name?.[0]?.toUpperCase() || 'B'}
                    </div>
                    <div className="chat-header-info">
                      <span className="chat-header-name">
                        {selectedSessionId || 'Bot WhatsApp'}
                      </span>
                      <span className="chat-header-status">
                        Destinatario: {contacts[0]?.name || 'Carlos Perez'} (+{contacts[0]?.phone || '584121234567'})
                      </span>
                    </div>
                  </div>

                  <div className="mockup-chat-body">
                    <div className="chat-date-chip">
                      {scheduledDate} · {scheduledTime}
                    </div>

                    {/* WhatsApp Bubble */}
                    <div className="whatsapp-msg-bubble">
                      {/* Render Media Preview */}
                      {mediaType !== 'text' && (
                        <div className="bubble-media-container">
                          {mediaType === 'image' && (
                            <div className="bubble-image-wrap">
                              {mediaPreviewUrl ? (
                                <img src={mediaPreviewUrl} alt="Vista previa" className="bubble-img" />
                              ) : (
                                <div className="bubble-placeholder">
                                  <ImageIcon size={36} />
                                  <span>Imagen adjunta</span>
                                </div>
                              )}
                            </div>
                          )}

                          {mediaType === 'video' && (
                            <div className="bubble-video-wrap">
                              {mediaPreviewUrl ? (
                                <video src={mediaPreviewUrl} controls className="bubble-video" />
                              ) : (
                                <div className="bubble-placeholder">
                                  <VideoIcon size={36} />
                                  <span>Video adjunto</span>
                                </div>
                              )}
                            </div>
                          )}

                          {mediaType === 'audio' && (
                            <div className="bubble-audio-wrap">
                              <div className="audio-voice-player">
                                <div className="audio-play-circle">
                                  <Play size={16} />
                                </div>
                                <div className="audio-wave-bar">
                                  <span className="wave-bar active" />
                                  <span className="wave-bar active" />
                                  <span className="wave-bar active" />
                                  <span className="wave-bar" />
                                  <span className="wave-bar" />
                                  <span className="wave-bar" />
                                </div>
                                <span className="audio-duration">0:24</span>
                              </div>
                              {mediaPreviewUrl && <audio controls src={mediaPreviewUrl} className="real-audio-player" />}
                            </div>
                          )}

                          {mediaType === 'document' && (
                            <div className="bubble-doc-wrap">
                              <DocumentIcon size={24} className="doc-icon" />
                              <div className="doc-info">
                                <span className="doc-name">{mediaFilename || 'Documento.pdf'}</span>
                                <span className="doc-sub">PDF · Archivo descargable</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Render Formatted Text with Variables Replaced */}
                      {messageTemplate && (
                        <div className="bubble-text-content">
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
                        </div>
                      )}

                      {/* Bubble Time & Blue Checks */}
                      <div className="bubble-meta-row">
                        <span className="bubble-time">{scheduledTime}</span>
                        <span className="bubble-checks">✓✓</span>
                      </div>
                    </div>
                  </div>

                  <div className="mockup-footer-note">
                    <Info size={13} />
                    <span>Se enviará mediante el Bot {selectedSessionId} con intervalo anti-bloqueo de {intervalSeconds}s.</span>
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
                <Plus size={16} /> Guardar & Programar Difusión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW CONTACTS MODAL */}
      {viewingContactsCampaign && (
        <div className="modal-overlay" onClick={() => setViewingContactsCampaign(null)}>
          <div className="modal contacts-view-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Destinatarios: {viewingContactsCampaign.title}</h2>
                <span className="modal-subtitle">
                  {viewingContactsCampaign.contacts.length} contactos en lista · Bot: {viewingContactsCampaign.sessionId}
                </span>
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
              <div className="contacts-table-wrapper">
                <table className="contacts-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nombre</th>
                      <th>Teléfono</th>
                      <th>Fecha Asignada</th>
                      <th>Estado</th>
                      <th>Mensaje Personalizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingContactsCampaign.contacts.map((c, i) => (
                      <tr key={c.id}>
                        <td>{i + 1}</td>
                        <td className="font-semibold">{c.name}</td>
                        <td>{c.phone}</td>
                        <td>{c.date || '—'}</td>
                        <td>
                          <span className={`status-tag ${c.status}`}>
                            {c.status === 'sent' && '✅ Enviado'}
                            {c.status === 'pending' && '⏳ Pendiente'}
                            {c.status === 'failed' && '❌ Falló'}
                          </span>
                        </td>
                        <td className="contact-msg-cell">
                          {renderMessageTemplate(
                            viewingContactsCampaign.messageTemplate,
                            c,
                            businessName,
                          ).slice(0, 90)}...
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
