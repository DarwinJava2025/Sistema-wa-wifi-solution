import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import {
  Megaphone,
  Plus,
  Send,
  Users,
  Copy,
  Check,
  Trash2,
  Download,
  Terminal,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  UserCheck,
  Building2,
  Bot,
  Search,
  CheckSquare,
  Square,
  CheckCheck,
  Zap,
  FileSpreadsheet,
} from 'lucide-react';
import { sessionApi, type Session } from '../services/api';
import {
  type ContactGroup,
  type GroupContact,
  type BroadcastRecord,
  type BroadcastLogItem,
  getContactGroups,
  saveGroup,
  deleteGroup,
  getBroadcastHistory,
  recordBroadcast,
  buildBroadcastCurl,
  sendGroupMessage,
} from '../services/groupBroadcastService';
import { generateCsvTemplate } from '../services/scheduledMessagesService';
import {
  downloadGroupBroadcastsExcelTemplate,
  parseContactsFileUnified,
} from '../utils/excelService';
import { getEffectiveAiConfig, AI_ROLES } from '../services/aiAssistant';
import './GroupBroadcasts.css';

const QUICK_GROUP_TEMPLATES: Record<string, string> = {
  grp_support:
    '🛠️ **Comunicado de Soporte Técnico - {empresa}:**\n\nEstimado(a) {nombre}, le informamos que las labores de mantenimiento en la zona han concluido exitosamente y el servicio se encuentra 100% operativo.\n\nSi experimenta lentitud, por favor reinicie su módem por 30 segundos. Para reportes adicionales responda a este chat.',
  grp_sales:
    '🔥 **¡Promoción Exclusiva para ti, {nombre}!** 🚀\n\nEn {empresa} queremos premiarte: **Duplica tu velocidad de fibra óptica a 100 Mbps o 200 Mbps** manteniendo tu tarifa actual durante los próximos 3 meses.\n\n👉 Responde con la palabra **MEGAS** para activarlo de inmediato.',
  grp_billing:
    '💳 **Aviso de Facturación - {empresa}:**\n\nEstimado(a) {nombre}, le recordamos que su fecha de corte se aproxima. Para evitar suspensión del servicio de internet, por favor reporte su comprobante de pago por este medio.',
  grp_vip:
    '⭐ **Notificación para Clientes Corporativos - {empresa}:**\n\nEstimado(a) {nombre}, su enlace dedicado cuenta con monitoreo activo 24/7. Le informamos sobre mejoras de ancho de banda aplicadas a su troncal de red.',
  bot_announcement:
    '🤖 **Notificación de Sistema para Bots / Líneas WhatsApp - {empresa}:**\n\nEstimado operador del bot {nombre}, se ha actualizado la directiva de atención y la base de conocimiento del sistema. Verifique su estado de conexión.',
};

const ICON_OPTIONS = ['👥', '🛠️', '🔥', '💳', '⭐', '🌐', '📢', '💼', '🚀'];

export function GroupBroadcasts() {
  // Target Mode: 'contacts' = Groups of Clients, 'bots' = Created Bots/Sessions
  const [targetMode, setTargetMode] = useState<'contacts' | 'bots'>('contacts');

  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('grp_support');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('WiFi Solution Pro');
  const [intervalSeconds, setIntervalSeconds] = useState<number>(4);
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);

  // Bot Filtering State
  const [botSearchTerm, setBotSearchTerm] = useState<string>('');
  const [botStatusFilter, setBotStatusFilter] = useState<'all' | 'connected' | 'disconnected'>('all');
  const [selectedTargetBotNames, setSelectedTargetBotNames] = useState<string[]>([]);
  const [multiSenderEnabled, setMultiSenderEnabled] = useState<boolean>(false);
  const [selectedSenderBotNames, setSelectedSenderBotNames] = useState<string[]>([]);

  // Execution & Progress State
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [broadcastProgress, setBroadcastProgress] = useState<{ current: number; total: number } | null>(null);
  const [liveLogs, setLiveLogs] = useState<BroadcastLogItem[]>([]);
  const [history, setHistory] = useState<BroadcastRecord[]>([]);

  // Modals
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupIcon, setNewGroupIcon] = useState('👥');
  const [isAddContactsModalOpen, setIsAddContactsModalOpen] = useState(false);
  const [contactNameInput, setContactNameInput] = useState('');
  const [contactPhoneInput, setContactPhoneInput] = useState('');
  const [contactNoteInput, setContactNoteInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load groups, history, and sessions on mount
  useEffect(() => {
    const loadedGroups = getContactGroups();
    setGroups(loadedGroups);
    setHistory(getBroadcastHistory());

    if (loadedGroups.length > 0) {
      setSelectedGroupId(loadedGroups[0].id);
      setMessage(QUICK_GROUP_TEMPLATES[loadedGroups[0].id] || QUICK_GROUP_TEMPLATES.grp_support);
    }

    sessionApi
      .list()
      .then(list => {
        const sessList = list || [];
        setSessions(sessList);
        if (sessList.length > 0) {
          const firstConnected = sessList.find(s => s.status === 'ready') || sessList[0];
          setSelectedSessionId(firstConnected.name);
          setSelectedSenderBotNames([firstConnected.name]);
          setSelectedTargetBotNames(sessList.map(s => s.name));
        }
      })
      .catch(() => {});
  }, []);

  const selectedGroup = groups.find(g => g.id === selectedGroupId) || groups[0];

  const totalContacts = groups.reduce((sum, g) => sum + g.contacts.length, 0);
  const totalSent = history.reduce((sum, h) => sum + h.sentCount, 0);
  const totalFailed = history.reduce((sum, h) => sum + h.failedCount, 0);

  // Filter bots list according to search term and status
  const filteredSessions = sessions.filter(s => {
    const isConn = s.status === 'ready';
    if (botStatusFilter === 'connected' && !isConn) return false;
    if (botStatusFilter === 'disconnected' && isConn) return false;

    if (botSearchTerm.trim()) {
      const term = botSearchTerm.toLowerCase().trim();
      const matchName = s.name.toLowerCase().includes(term);
      const matchPhone = s.phone ? s.phone.includes(term) : false;
      return matchName || matchPhone;
    }
    return true;
  });

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    if (QUICK_GROUP_TEMPLATES[groupId]) {
      setMessage(QUICK_GROUP_TEMPLATES[groupId]);
    }
  };

  const handleToggleTargetBot = (botName: string) => {
    setSelectedTargetBotNames(prev =>
      prev.includes(botName) ? prev.filter(n => n !== botName) : [...prev, botName],
    );
  };

  const handleSelectAllTargetBots = () => {
    if (selectedTargetBotNames.length === filteredSessions.length) {
      setSelectedTargetBotNames([]);
    } else {
      setSelectedTargetBotNames(filteredSessions.map(s => s.name));
    }
  };

  const handleToggleSenderBot = (botName: string) => {
    setSelectedSenderBotNames(prev =>
      prev.includes(botName) ? (prev.length > 1 ? prev.filter(n => n !== botName) : prev) : [...prev, botName],
    );
  };

  const handleCopyCurl = () => {
    let targetPhone = '584121234567';
    if (targetMode === 'contacts') {
      const sampleContact = selectedGroup?.contacts?.[0];
      targetPhone = sampleContact?.phone || '584121234567';
    } else {
      const sampleBot = sessions.find(s => selectedTargetBotNames.includes(s.name)) || sessions[0];
      targetPhone = sampleBot?.phone ? sampleBot.phone.replace(/[^0-9]/g, '') : '584129998877';
    }

    const curl = buildBroadcastCurl(
      selectedSessionId,
      targetPhone,
      message || 'Hola {nombre}',
    );
    navigator.clipboard.writeText(curl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleDownloadExcelTemplate = () => {
    downloadGroupBroadcastsExcelTemplate();
  };

  const handleDownloadCsvTemplate = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(generateCsvTemplate());
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', csvContent);
    downloadAnchor.setAttribute('download', 'plantilla_contactos_grupo.csv');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportFileToGroup = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGroup) return;

    try {
      const res = await parseContactsFileUnified(file);
      if (res.contacts.length > 0) {
        const newContacts: GroupContact[] = res.contacts.map(p => ({
          id: p.id,
          name: p.name,
          phone: p.phone,
          note: p.date || (p.customData ? Object.values(p.customData).join(' | ') : ''),
        }));

        const updatedGroup = {
          ...selectedGroup,
          contacts: [...selectedGroup.contacts, ...newContacts],
        };

        saveGroup(updatedGroup);
        setGroups(getContactGroups());
      }
    } catch (err) {
      console.error('Error importing contacts to group:', err);
    }
  };

  const handleAddSingleContact = () => {
    if (!contactPhoneInput.trim() || !selectedGroup) return;

    const cleanPhone = contactPhoneInput.replace(/[^0-9]/g, '');
    const newC: GroupContact = {
      id: 'c_' + Date.now(),
      name: contactNameInput.trim() || `Contacto ${cleanPhone}`,
      phone: cleanPhone,
      note: contactNoteInput.trim(),
    };

    const updatedGroup = {
      ...selectedGroup,
      contacts: [...selectedGroup.contacts, newC],
    };

    saveGroup(updatedGroup);
    setGroups(getContactGroups());
    setContactNameInput('');
    setContactPhoneInput('');
    setContactNoteInput('');
    setIsAddContactsModalOpen(false);
  };

  const handleRemoveContact = (contactId: string) => {
    if (!selectedGroup) return;
    const updated = {
      ...selectedGroup,
      contacts: selectedGroup.contacts.filter(c => c.id !== contactId),
    };
    saveGroup(updated);
    setGroups(getContactGroups());
  };

  const handleCreateNewGroup = () => {
    if (!newGroupName.trim()) return;

    const newG: ContactGroup = {
      id: 'grp_' + Date.now(),
      name: `${newGroupIcon} ${newGroupName.trim()}`,
      description: newGroupDesc.trim() || 'Grupo personalizado de clientes',
      icon: newGroupIcon,
      contacts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveGroup(newG);
    const updated = getContactGroups();
    setGroups(updated);
    setSelectedGroupId(newG.id);
    setIsCreateGroupModalOpen(false);
    setNewGroupName('');
    setNewGroupDesc('');
    setNewGroupIcon('👥');
  };

  const handleDeleteGroup = (groupId: string) => {
    if (window.confirm('¿Seguro que deseas eliminar este grupo de difusión?')) {
      deleteGroup(groupId);
      const remaining = getContactGroups();
      setGroups(remaining);
      if (remaining.length > 0) setSelectedGroupId(remaining[0].id);
    }
  };

  // Build target recipients list according to active mode
  const getRecipients = (): Array<{ id: string; name: string; phone: string; note?: string }> => {
    if (targetMode === 'contacts') {
      return (selectedGroup?.contacts || []).map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        note: c.note,
      }));
    } else {
      const targetBots = sessions.filter(s => selectedTargetBotNames.includes(s.name));
      return targetBots.map(b => ({
        id: b.name,
        name: b.name,
        phone: b.phone ? b.phone.replace(/[^0-9]/g, '') : b.name,
        note: `Bot: ${b.status}`,
      }));
    }
  };

  const recipients = getRecipients();

  const handleSendBroadcast = async () => {
    if (!selectedSessionId || recipients.length === 0 || !message.trim()) {
      return;
    }

    const senders = multiSenderEnabled && selectedSenderBotNames.length > 0
      ? selectedSenderBotNames
      : [selectedSessionId];

    const targetDesc = targetMode === 'contacts'
      ? `al grupo "${selectedGroup?.name}" (${recipients.length} clientes)`
      : `a ${recipients.length} Bots / Sesiones seleccionados`;

    const sendersDesc = senders.length > 1
      ? `distribuido entre ${senders.length} bots emisores (Round-Robin)`
      : `usando la sesión "${selectedSessionId}"`;

    const confirmSend = window.confirm(
      `¿Deseas iniciar el envío de difusión ${targetDesc} ${sendersDesc}?`,
    );
    if (!confirmSend) return;

    setIsBroadcasting(true);
    setBroadcastProgress({ current: 0, total: recipients.length });
    setLiveLogs([]);

    const currentLogs: BroadcastLogItem[] = [];
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      // Resolve sender in round-robin if multi-sender active
      const currentSender = senders[i % senders.length];

      let personalizedText = message;
      personalizedText = personalizedText.replace(/\{nombre\}/gi, recipient.name);
      personalizedText = personalizedText.replace(/\{empresa\}/gi, businessName);
      personalizedText = personalizedText.replace(/\{grupo\}/gi, targetMode === 'contacts' ? (selectedGroup?.name || 'Grupo') : 'Bots');
      personalizedText = personalizedText.replace(/\{telefono\}/gi, recipient.phone);

      const res = await sendGroupMessage(currentSender, recipient.phone, personalizedText);
      const timeStr = new Date().toLocaleTimeString();

      if (res.success) {
        sentCount++;
        currentLogs.unshift({
          phone: recipient.phone,
          name: `${recipient.name} [via ${currentSender}]`,
          status: 'success',
          time: timeStr,
        });
      } else {
        failedCount++;
        currentLogs.unshift({
          phone: recipient.phone,
          name: `${recipient.name} [via ${currentSender}]`,
          status: 'failed',
          error: res.error,
          time: timeStr,
        });
      }

      setLiveLogs([...currentLogs]);
      setBroadcastProgress({ current: i + 1, total: recipients.length });

      // Anti-ban delay
      if (i < recipients.length - 1) {
        await new Promise(r => setTimeout(r, intervalSeconds * 1000));
      }
    }

    // Record in history
    const record: BroadcastRecord = {
      id: 'bcast_' + Date.now(),
      groupId: targetMode === 'contacts' ? (selectedGroup?.id || 'grp_custom') : 'grp_bots',
      groupName: targetMode === 'contacts' ? (selectedGroup?.name || 'Grupo') : '🤖 Difusión a Bots Creados',
      sessionId: senders.join(', '),
      message,
      totalContacts: recipients.length,
      sentCount,
      failedCount,
      createdAt: new Date().toISOString(),
      logs: currentLogs,
    };

    recordBroadcast(record);
    setHistory(getBroadcastHistory());
    setIsBroadcasting(false);
  };

  const sampleRecipient = recipients[0] || {
    id: 'sample',
    name: targetMode === 'contacts' ? 'Carlos Mendoza' : 'bot-soporte-01',
    phone: '584121112233',
    note: 'Destinatario Demo',
  };

  const sampleRenderedMsg = message
    .replace(/\{nombre\}/gi, sampleRecipient.name)
    .replace(/\{empresa\}/gi, businessName)
    .replace(/\{grupo\}/gi, targetMode === 'contacts' ? (selectedGroup?.name || 'Grupo') : 'Bots')
    .replace(/\{telefono\}/gi, sampleRecipient.phone);

  const liveCurlCommand = buildBroadcastCurl(
    selectedSessionId,
    sampleRecipient.phone,
    message || 'Hola {nombre}',
  );

  return (
    <div className="group-broadcasts-page">
      {/* Header */}
      <div className="page-header-unified">
        <div>
          <h1>Difusión de Mensajes por Grupos & Chatbots</h1>
          <p className="page-subtitle">
            Envía mensajes masivos segmentados a grupos de clientes o directamente a los Bots y Sesiones creados con filtros avanzados y soporte multi-emisor.
          </p>
        </div>
        <div className="header-actions">
          {targetMode === 'contacts' && (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleDownloadExcelTemplate}
                title="Descargar plantilla formateada en Excel (.xlsx) con columnas contextuales"
              >
                <FileSpreadsheet size={16} /> Descargar Plantilla Excel (.xlsx)
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleDownloadCsvTemplate}
                title="Descargar plantilla en formato CSV"
              >
                <Download size={16} /> Plantilla CSV
              </button>
            </>
          )}
          {targetMode === 'contacts' && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setIsCreateGroupModalOpen(true)}
            >
              <Plus size={16} /> Crear Nuevo Grupo
            </button>
          )}
        </div>
      </div>

      {/* Target Destination Switch */}
      <div className="target-mode-bar">
        <button
          className={`target-mode-tab ${targetMode === 'contacts' ? 'active' : ''}`}
          onClick={() => {
            setTargetMode('contacts');
            if (selectedGroup && QUICK_GROUP_TEMPLATES[selectedGroup.id]) {
              setMessage(QUICK_GROUP_TEMPLATES[selectedGroup.id]);
            }
          }}
        >
          <Users size={18} /> Difusión a Grupos de Contactos / Clientes
        </button>
        <button
          className={`target-mode-tab ${targetMode === 'bots' ? 'active' : ''}`}
          onClick={() => {
            setTargetMode('bots');
            setMessage(QUICK_GROUP_TEMPLATES.bot_announcement);
          }}
        >
          <Bot size={18} /> Difusión a Bots / Sesiones Creadas ({sessions.length})
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid-unified">
        <div className="stat-card">
          <div className="stat-icon-wrapper blue">
            {targetMode === 'contacts' ? <Users size={22} /> : <Bot size={22} />}
          </div>
          <div className="stat-content">
            <span className="stat-value">
              {targetMode === 'contacts' ? groups.length : sessions.length}
            </span>
            <span className="stat-label">
              {targetMode === 'contacts' ? 'Grupos Segmentados' : 'Bots Registrados'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper green">
            <UserCheck size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">
              {targetMode === 'contacts' ? totalContacts : selectedTargetBotNames.length}
            </span>
            <span className="stat-label">
              {targetMode === 'contacts' ? 'Contactos en Total' : 'Bots Destinatarios'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper purple">
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{totalSent}</span>
            <span className="stat-label">Mensajes Enviados</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper amber">
            <XCircle size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{totalFailed}</span>
            <span className="stat-label">Fallidos / Errores</span>
          </div>
        </div>
      </div>

      {/* Running Execution Banner */}
      {isBroadcasting && broadcastProgress && (
        <div className="execution-banner">
          <div className="execution-banner-header">
            <span>
              <Loader2 size={18} className="animate-spin" /> Enviando Difusión Masiva en tiempo real...
            </span>
            <span>
              {Math.round((broadcastProgress.current / broadcastProgress.total) * 100)}%
            </span>
          </div>
          <div className="progress-bar-unified">
            <div
              className="progress-fill"
              style={{
                width: `${(broadcastProgress.current / broadcastProgress.total) * 100}%`,
              }}
            />
          </div>
          <p className="execution-counter">
            Enviando {broadcastProgress.current} de {broadcastProgress.total} destinatarios • Intervalo anti-ban: {intervalSeconds}s
          </p>
        </div>
      )}

      {/* Main Grid */}
      <div className="broadcast-main-grid">
        {/* Left Column: Groups or Bots List */}
        <div className="groups-sidebar-panel">
          {targetMode === 'contacts' ? (
            <>
              <div className="groups-sidebar-header">
                <h3>
                  <Users size={18} /> Grupos de Clientes
                </h3>
                <span className="groups-count-badge">{groups.length} grupos</span>
              </div>

              <div className="groups-list">
                {groups.map(g => {
                  const isSelected = g.id === selectedGroupId;
                  return (
                    <div
                      key={g.id}
                      className={`group-item-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectGroup(g.id)}
                    >
                      <div className="group-item-header">
                        <span className="group-item-name">{g.name}</span>
                        <span className="group-members-badge">
                          <Users size={12} /> {g.contacts.length}
                        </span>
                      </div>
                      <p className="group-item-desc">{g.description}</p>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                className="btn-secondary btn-full-width"
                onClick={() => setIsCreateGroupModalOpen(true)}
              >
                <Plus size={16} /> Crear Grupo Adicional
              </button>
            </>
          ) : (
            <>
              <div className="groups-sidebar-header">
                <h3>
                  <Bot size={18} /> Bots / Sesiones Destinatarias
                </h3>
                <span className="groups-count-badge">
                  {selectedTargetBotNames.length} / {filteredSessions.length} sel.
                </span>
              </div>

              {/* Bot Filters in Sidebar */}
              <div className="bot-filter-controls">
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="text"
                    className="bot-search-input"
                    placeholder="Filtrar bots por nombre..."
                    value={botSearchTerm}
                    onChange={e => setBotSearchTerm(e.target.value)}
                  />
                </div>

                <div className="bot-filter-pills">
                  <button
                    className={`bot-filter-pill ${botStatusFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setBotStatusFilter('all')}
                  >
                    Todos ({sessions.length})
                  </button>
                  <button
                    className={`bot-filter-pill ${botStatusFilter === 'connected' ? 'active' : ''}`}
                    onClick={() => setBotStatusFilter('connected')}
                  >
                    🟢 Conectados
                  </button>
                  <button
                    className={`bot-filter-pill ${botStatusFilter === 'disconnected' ? 'active' : ''}`}
                    onClick={() => setBotStatusFilter('disconnected')}
                  >
                    ⚪ Offline
                  </button>
                </div>

                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '5px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={handleSelectAllTargetBots}
                >
                  {selectedTargetBotNames.length === filteredSessions.length ? (
                    <>
                      <Square size={14} /> Deseleccionar Todos
                    </>
                  ) : (
                    <>
                      <CheckSquare size={14} /> Seleccionar Todos
                    </>
                  )}
                </button>
              </div>

              <div className="groups-list">
                {filteredSessions.map(bot => {
                  const isSelected = selectedTargetBotNames.includes(bot.name);
                  const isOnline = bot.status === 'ready';
                  const botAi = getEffectiveAiConfig(bot.name);
                  const roleName = botAi?.role ? (AI_ROLES[botAi.role]?.name || botAi.role) : 'General';

                  return (
                    <div
                      key={bot.name}
                      className={`group-item-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleToggleTargetBot(bot.name)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="group-item-header">
                        <span className="group-item-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isSelected ? <CheckSquare size={15} color="#10b981" /> : <Square size={15} color="#64748b" />}
                          {bot.name}
                        </span>
                        <span className={`bot-status-indicator ${isOnline ? 'connected' : 'disconnected'}`}>
                          {isOnline ? '🟢 Online' : '⚪ Offline'}
                        </span>
                      </div>
                      <p className="group-item-desc" style={{ margin: '4px 0 0 0' }}>
                        {bot.phone ? `📱 ${bot.phone}` : 'Sin número vinculado'} • Rol: <strong>{roleName}</strong>
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Center / Right Column: Composer & Live Preview */}
        <div className="composer-and-curl-panel">
          {/* Active Target Header */}
          <div className="active-group-header-card">
            <div className="active-group-info">
              <div className="active-group-icon">
                {targetMode === 'contacts' ? <Megaphone size={22} /> : <Bot size={22} />}
              </div>
              <div>
                <h2>
                  {targetMode === 'contacts'
                    ? (selectedGroup?.name || 'Selecciona un Grupo')
                    : `🤖 Difusión Masiva a Bots Creados (${selectedTargetBotNames.length} seleccionados)`}
                </h2>
                <span className="active-group-sub">
                  {targetMode === 'contacts'
                    ? `${selectedGroup?.contacts.length || 0} destinatarios en este grupo • ${selectedGroup?.description}`
                    : `Se enviará la notificación directa a ${selectedTargetBotNames.length} bots/sesiones de WhatsApp registradas`}
                </span>
              </div>
            </div>

            {targetMode === 'contacts' && (
              <div className="active-group-actions">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.txt,.json"
                  style={{ display: 'none' }}
                  onChange={handleImportFileToGroup}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  title="Importar contactos por Excel (.xlsx) o CSV a este grupo"
                >
                  <FileSpreadsheet size={15} color="#10b981" /> Importar Excel / CSV
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsAddContactsModalOpen(true)}
                >
                  <Plus size={15} /> Añadir Contacto
                </button>
                {selectedGroup && !['grp_support', 'grp_sales', 'grp_billing'].includes(selectedGroup.id) && (
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => handleDeleteGroup(selectedGroup.id)}
                    title="Eliminar grupo"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Contact List in Group (when in contacts mode) */}
          {targetMode === 'contacts' && selectedGroup && selectedGroup.contacts.length > 0 && (
            <div style={{ background: 'var(--bg-card, #1e293b)', borderRadius: 10, padding: '10px 14px', border: '1px solid var(--border, #334155)', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>Contactos en este Grupo ({selectedGroup.contacts.length}):</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxHeight: 80, overflowY: 'auto' }}>
                {selectedGroup.contacts.map(c => (
                  <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '2px 8px', fontSize: '0.78rem', color: '#cbd5e1' }}>
                    {c.name} ({c.phone})
                    <button
                      type="button"
                      onClick={() => handleRemoveContact(c.id)}
                      style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}
                      title="Eliminar contacto"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Composer Card */}
          <div className="composer-card">
            {/* Sender Bot Selection & Multi-Bot Dispatch */}
            <div className="composer-controls-row">
              <div className="form-group-unified">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label htmlFor="bcast-session">Chatbot Remitente (Emisor):</label>
                  <label style={{ fontSize: '0.8rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={multiSenderEnabled}
                      onChange={e => setMultiSenderEnabled(e.target.checked)}
                    />
                    <Zap size={13} /> Multi-Bot (Round-Robin)
                  </label>
                </div>

                {!multiSenderEnabled ? (
                  <select
                    id="bcast-session"
                    value={selectedSessionId}
                    onChange={e => setSelectedSessionId(e.target.value)}
                  >
                    {sessions.length === 0 ? (
                      <option value="">No hay sesiones disponibles (conecta una en Sesiones)</option>
                    ) : (
                      sessions.map(s => (
                        <option key={s.name} value={s.name}>
                          {s.name} ({s.status === 'ready' ? '🟢 Online' : '⚪ ' + s.status})
                        </option>
                      ))
                    )}
                  </select>
                ) : (
                  <div className="multi-bot-select-grid">
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      Distribuye los mensajes entre los bots seleccionados:
                    </span>
                    {sessions.map(bot => {
                      const isSel = selectedSenderBotNames.includes(bot.name);
                      return (
                        <div
                          key={bot.name}
                          className={`bot-select-item ${isSel ? 'selected' : ''}`}
                          onClick={() => handleToggleSenderBot(bot.name)}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                            {isSel ? <CheckSquare size={14} color="#10b981" /> : <Square size={14} color="#64748b" />}
                            {bot.name}
                          </span>
                          <span className={`bot-status-indicator ${bot.status === 'ready' ? 'connected' : 'disconnected'}`}>
                            {bot.status === 'ready' ? '🟢 Online' : '⚪ ' + bot.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="form-group-unified">
                <label htmlFor="bcast-interval">Intervalo Antiban entre envíos:</label>
                <select
                  id="bcast-interval"
                  value={intervalSeconds}
                  onChange={e => setIntervalSeconds(Number(e.target.value))}
                >
                  <option value={3}>3 segundos</option>
                  <option value={4}>4 segundos (Recomendado)</option>
                  <option value={8}>8 segundos</option>
                  <option value={12}>12 segundos (Máxima seguridad)</option>
                </select>
              </div>
            </div>

            <div className="form-group-unified">
              <label htmlFor="bcast-empresa">
                <Building2 size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Nombre de la Empresa (Variable {'{empresa}'}):
              </label>
              <input
                id="bcast-empresa"
                type="text"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="ej. WiFi Solution Pro"
              />
            </div>

            {/* Quick Template pills */}
            <div className="quick-templates-box">
              <span className="quick-templates-title">Plantillas rápidas:</span>
              <div className="quick-templates-row">
                <button
                  type="button"
                  className="btn-template-pill"
                  onClick={() => setMessage(QUICK_GROUP_TEMPLATES.grp_support)}
                >
                  🛠️ Aviso Soporte
                </button>
                <button
                  type="button"
                  className="btn-template-pill"
                  onClick={() => setMessage(QUICK_GROUP_TEMPLATES.grp_sales)}
                >
                  🔥 Promo Ventas
                </button>
                <button
                  type="button"
                  className="btn-template-pill"
                  onClick={() => setMessage(QUICK_GROUP_TEMPLATES.grp_billing)}
                >
                  💳 Aviso Cobranzas
                </button>
                <button
                  type="button"
                  className="btn-template-pill"
                  onClick={() => setMessage(QUICK_GROUP_TEMPLATES.grp_vip)}
                >
                  ⭐ Comunicado VIP
                </button>
                <button
                  type="button"
                  className="btn-template-pill"
                  onClick={() => setMessage(QUICK_GROUP_TEMPLATES.bot_announcement)}
                >
                  🤖 Aviso a Bots
                </button>
              </div>
            </div>

            {/* Message Textarea with Variables */}
            <div className="form-group-unified">
              <div className="variables-helper-bar">
                <span className="variables-label">Variables:</span>
                <button
                  type="button"
                  className="btn-var-pill"
                  onClick={() => setMessage(prev => prev + ' {nombre}')}
                >
                  +{'{nombre}'}
                </button>
                <button
                  type="button"
                  className="btn-var-pill"
                  onClick={() => setMessage(prev => prev + ' {empresa}')}
                >
                  +{'{empresa}'}
                </button>
                <button
                  type="button"
                  className="btn-var-pill"
                  onClick={() => setMessage(prev => prev + ' {telefono}')}
                >
                  +{'{telefono}'}
                </button>
                <button
                  type="button"
                  className="btn-var-pill"
                  onClick={() => setMessage(prev => prev + ' {grupo}')}
                >
                  +{'{grupo}'}
                </button>
              </div>

              <textarea
                rows={7}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Escribe el mensaje de difusión..."
                className="bcast-textarea"
              />
            </div>

            {/* Action Buttons */}
            <div className="composer-footer-row">
              <div className="recipients-summary">
                <span>
                  Destinatarios listos para envío: <strong>{recipients.length}</strong>
                </span>
                {multiSenderEnabled && (
                  <span style={{ marginLeft: 12, color: '#34d399', fontSize: '0.8rem' }}>
                    ⚡ {selectedSenderBotNames.length} bots repartirán la carga
                  </span>
                )}
              </div>

              <div className="composer-action-buttons">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCopyCurl}
                  title="Copiar comando cURL para terminal"
                >
                  {copiedCurl ? <Check size={16} /> : <Copy size={16} />}
                  {copiedCurl ? '¡cURL Copiado!' : 'Copiar cURL'}
                </button>

                <button
                  type="button"
                  className="btn-send-broadcast"
                  onClick={handleSendBroadcast}
                  disabled={isBroadcasting || recipients.length === 0 || !message.trim()}
                >
                  {isBroadcasting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Enviando...
                    </>
                  ) : (
                    <>
                      <Send size={18} /> Enviar Difusión Masiva
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Live Preview and cURL Panel */}
          <div className="preview-and-terminal-grid">
            {/* WhatsApp Bubble Preview */}
            <div className="preview-card">
              <div className="preview-card-header">
                <span>📱 Vista Previa en WhatsApp:</span>
                <span className="sample-badge">Para: {sampleRecipient.name}</span>
              </div>
              <div className="wa-bubble-preview">
                <div className="wa-bubble-text">{sampleRenderedMsg}</div>
                <span className="wa-bubble-time">
                  10:45 AM <CheckCheck size={14} className="wa-check-icon" />
                </span>
              </div>
            </div>

            {/* Live Terminal cURL */}
            <div className="terminal-card">
              <div className="terminal-header">
                <div className="terminal-title">
                  <Terminal size={14} /> cURL API Request
                </div>
                <button
                  type="button"
                  className="btn-copy-terminal"
                  onClick={handleCopyCurl}
                  title="Copiar comando"
                >
                  {copiedCurl ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <div className="terminal-body">
                <pre>{liveCurlCommand}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History and Live Execution Logs */}
      {(liveLogs.length > 0 || history.length > 0) && (
        <div className="history-section">
          <div className="history-section-header">
            <h3>
              <Clock size={18} /> Registro de Envíos en Tiempo Real
            </h3>
          </div>

          {liveLogs.length > 0 && (
            <div className="live-logs-table-wrapper">
              <table className="broadcast-table">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Destinatario</th>
                    <th>Teléfono</th>
                    <th>Estado</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {liveLogs.map((log, idx) => (
                    <tr key={idx}>
                      <td>{log.time}</td>
                      <td>{log.name}</td>
                      <td>{log.phone}</td>
                      <td>
                        <span className={`status-pill ${log.status}`}>
                          {log.status === 'success' ? 'Enviado' : 'Error'}
                        </span>
                      </td>
                      <td>{log.error || 'Mensaje entregado correctamente a la API'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Group */}
      {isCreateGroupModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsCreateGroupModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon-box">
                <Plus size={22} />
              </div>
              <div>
                <h2>Crear Nuevo Grupo de Clientes</h2>
                <span className="modal-subtitle">Segmenta tus contactos para difusiones específicas</span>
              </div>
              <button
                type="button"
                className="btn-icon modal-close-btn"
                onClick={() => setIsCreateGroupModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-section-stack">
                <div className="form-group-unified">
                  <label>Icono del Grupo:</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {ICON_OPTIONS.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        className={`btn-template-pill ${newGroupIcon === icon ? 'active' : ''}`}
                        onClick={() => setNewGroupIcon(icon)}
                        style={{ fontSize: '1.2rem', padding: '6px 10px' }}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group-unified">
                  <label>
                    Nombre del Grupo <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="is-required"
                    placeholder="Ej. Clientes Fibra Residencial Sector Norte"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                  />
                </div>

                <div className="form-group-unified">
                  <label>Descripción del Segmento</label>
                  <textarea
                    rows={3}
                    placeholder="Describe el perfil de los clientes de este grupo..."
                    value={newGroupDesc}
                    onChange={e => setNewGroupDesc(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsCreateGroupModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleCreateNewGroup}
                disabled={!newGroupName.trim()}
              >
                Crear Grupo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Single Contact */}
      {isAddContactsModalOpen && selectedGroup && (
        <div className="modal-backdrop" onClick={() => setIsAddContactsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon-box">
                <Plus size={22} />
              </div>
              <div>
                <h2>Añadir Contacto a {selectedGroup.name}</h2>
                <span className="modal-subtitle">Ingresa los datos del destinatario</span>
              </div>
              <button
                type="button"
                className="btn-icon modal-close-btn"
                onClick={() => setIsAddContactsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-section-stack">
                <div className="form-group-unified">
                  <label>
                    Nombre del Contacto <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="is-required"
                    placeholder="Ej. Juan Pérez"
                    value={contactNameInput}
                    onChange={e => setContactNameInput(e.target.value)}
                  />
                </div>

                <div className="form-group-unified">
                  <label>
                    Teléfono con Código de País <span className="required-star">*</span> (ej. 584121234567)
                  </label>
                  <input
                    type="text"
                    required
                    className="is-required"
                    placeholder="584121234567"
                    value={contactPhoneInput}
                    onChange={e => setContactPhoneInput(e.target.value)}
                  />
                </div>

                <div className="form-group-unified">
                  <label>Nota o Detalle (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Plan 100M - Sector Oeste"
                    value={contactNoteInput}
                    onChange={e => setContactNoteInput(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsAddContactsModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleAddSingleContact}
                disabled={!contactPhoneInput.trim()}
              >
                Añadir Contacto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
