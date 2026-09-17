import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import {
  Megaphone,
  Plus,
  Send,
  Users,
  Copy,
  Check,
  Trash2,
  Upload,
  Download,
  Terminal,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  Radio,
  UserCheck,
  Building2,
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
import { parseContactsFile, generateCsvTemplate } from '../services/scheduledMessagesService';
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
};

const ICON_OPTIONS = ['👥', '🛠️', '🔥', '💳', '⭐', '🌐', '📢', '💼', '🚀'];

export function GroupBroadcasts() {
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('grp_support');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('WiFi Solution Pro');
  const [intervalSeconds, setIntervalSeconds] = useState<number>(4);
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);

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
        setSessions(list || []);
        if (list && list.length > 0) {
          setSelectedSessionId(list[0].name);
        }
      })
      .catch(() => {});
  }, []);

  const selectedGroup = groups.find(g => g.id === selectedGroupId) || groups[0];

  const totalContacts = groups.reduce((sum, g) => sum + g.contacts.length, 0);
  const totalSent = history.reduce((sum, h) => sum + h.sentCount, 0);
  const totalFailed = history.reduce((sum, h) => sum + h.failedCount, 0);

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    if (QUICK_GROUP_TEMPLATES[groupId]) {
      setMessage(QUICK_GROUP_TEMPLATES[groupId]);
    }
  };

  const handleCopyCurl = () => {
    const sampleContact = selectedGroup?.contacts?.[0];
    const curl = buildBroadcastCurl(
      selectedSessionId,
      sampleContact?.phone || '584121234567',
      message || 'Hola {nombre}',
    );
    navigator.clipboard.writeText(curl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleDownloadTemplate = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(generateCsvTemplate());
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', csvContent);
    downloadAnchor.setAttribute('download', 'plantilla_contactos_grupo.csv');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportCsvToGroup = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGroup) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const text = (ev.target?.result as string) || '';
      const parsed = parseContactsFile(text);
      if (parsed.length > 0) {
        const newContacts: GroupContact[] = parsed.map(p => ({
          id: p.id,
          name: p.name,
          phone: p.phone,
          note: p.date || '',
        }));

        const updatedGroup = {
          ...selectedGroup,
          contacts: [...selectedGroup.contacts, ...newContacts],
        };

        saveGroup(updatedGroup);
        setGroups(getContactGroups());
      }
    };
    reader.readAsText(file);
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

  const handleSendBroadcast = async () => {
    if (!selectedSessionId || !selectedGroup || selectedGroup.contacts.length === 0 || !message.trim()) {
      return;
    }

    const confirmSend = window.confirm(
      `¿Deseas enviar la difusión a ${selectedGroup.contacts.length} contactos del grupo "${selectedGroup.name}" usando la sesión "${selectedSessionId}"?`,
    );
    if (!confirmSend) return;

    setIsBroadcasting(true);
    setBroadcastProgress({ current: 0, total: selectedGroup.contacts.length });
    setLiveLogs([]);

    const currentLogs: BroadcastLogItem[] = [];
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < selectedGroup.contacts.length; i++) {
      const contact = selectedGroup.contacts[i];
      let personalizedText = message;
      personalizedText = personalizedText.replace(/\{nombre\}/gi, contact.name);
      personalizedText = personalizedText.replace(/\{empresa\}/gi, businessName);
      personalizedText = personalizedText.replace(/\{grupo\}/gi, selectedGroup.name);
      personalizedText = personalizedText.replace(/\{telefono\}/gi, contact.phone);

      const res = await sendGroupMessage(selectedSessionId, contact.phone, personalizedText);
      const timeStr = new Date().toLocaleTimeString();

      if (res.success) {
        sentCount++;
        currentLogs.unshift({
          phone: contact.phone,
          name: contact.name,
          status: 'success',
          time: timeStr,
        });
      } else {
        failedCount++;
        currentLogs.unshift({
          phone: contact.phone,
          name: contact.name,
          status: 'failed',
          error: res.error,
          time: timeStr,
        });
      }

      setLiveLogs([...currentLogs]);
      setBroadcastProgress({ current: i + 1, total: selectedGroup.contacts.length });

      // Anti-ban delay
      if (i < selectedGroup.contacts.length - 1) {
        await new Promise(r => setTimeout(r, intervalSeconds * 1000));
      }
    }

    // Record in history
    const record: BroadcastRecord = {
      id: 'bcast_' + Date.now(),
      groupId: selectedGroup.id,
      groupName: selectedGroup.name,
      sessionId: selectedSessionId,
      message,
      totalContacts: selectedGroup.contacts.length,
      sentCount,
      failedCount,
      createdAt: new Date().toISOString(),
      logs: currentLogs,
    };

    recordBroadcast(record);
    setHistory(getBroadcastHistory());
    setIsBroadcasting(false);
  };

  const sampleContact = selectedGroup?.contacts?.[0] || {
    id: 'sample',
    name: 'Carlos Mendoza',
    phone: '584121112233',
    note: 'Ticket #ST-4821',
  };

  const sampleRenderedMsg = message
    .replace(/\{nombre\}/gi, sampleContact.name)
    .replace(/\{empresa\}/gi, businessName)
    .replace(/\{grupo\}/gi, selectedGroup?.name || 'Grupo')
    .replace(/\{telefono\}/gi, sampleContact.phone);

  const liveCurlCommand = buildBroadcastCurl(
    selectedSessionId,
    sampleContact.phone,
    message || 'Hola {nombre}',
  );

  return (
    <div className="group-broadcasts-page">
      {/* Header */}
      <div className="page-header-unified">
        <div>
          <h1>Difusión de Mensajes por Grupos & Chatbots</h1>
          <p className="page-subtitle">
            Envía mensajes masivos segmentados por grupos de clientes (Soporte, Ventas, Cobranzas o VIP) y visualiza el comando cURL en tiempo real.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn-secondary" onClick={handleDownloadTemplate}>
            <Download size={16} /> Plantilla CSV
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setIsCreateGroupModalOpen(true)}
          >
            <Plus size={16} /> Crear Nuevo Grupo
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid-unified">
        <div className="stat-card">
          <div className="stat-icon-wrapper blue">
            <Users size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{groups.length}</span>
            <span className="stat-label">Grupos Segmentados</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper green">
            <UserCheck size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{totalContacts}</span>
            <span className="stat-label">Contactos en Total</span>
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
            Enviando {broadcastProgress.current} de {broadcastProgress.total} contactos • Intervalo anti-ban: {intervalSeconds}s
          </p>
        </div>
      )}

      {/* Main Grid: Left Groups / Right Composer & cURL */}
      <div className="broadcast-main-grid">
        {/* Left Column: Groups List */}
        <div className="groups-sidebar-panel">
          <div className="groups-sidebar-header">
            <h3>
              <Users size={18} /> Grupos de Chatbots
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
        </div>

        {/* Center / Right Column: Broadcast Composer & Live cURL */}
        <div className="composer-and-curl-panel">
          {/* Active Group Header & Contacts Bar */}
          <div className="active-group-header-card">
            <div className="active-group-info">
              <div className="active-group-icon">
                <Megaphone size={22} />
              </div>
              <div>
                <h2>{selectedGroup?.name || 'Selecciona un Grupo'}</h2>
                <span className="active-group-sub">
                  {selectedGroup?.contacts.length || 0} destinatarios en este grupo • {selectedGroup?.description}
                </span>
              </div>
            </div>

            <div className="active-group-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.json"
                style={{ display: 'none' }}
                onChange={handleImportCsvToGroup}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                title="Importar contactos por CSV a este grupo"
              >
                <Upload size={15} /> Importar CSV
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
          </div>

          {/* Composer Card */}
          <div className="composer-card">
            <div className="composer-controls-row">
              <div className="form-group-unified">
                <label htmlFor="bcast-session">Chatbot / Sesión WhatsApp Remitente:</label>
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
                        {s.name} ({s.status})
                      </option>
                    ))
                  )}
                </select>
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
              <span className="quick-templates-title">Plantillas rápidas para este grupo:</span>
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
              </div>
            </div>

            {/* Message Textarea with Variables */}
            <div className="form-group-unified">
              <div className="variables-helper-bar">
                <span className="variables-label">Variables:</span>
                <button
                  type="button"
                  className="var-pill"
                  onClick={() => setMessage(m => m + ' {nombre}')}
                >
                  + {'{nombre}'}
                </button>
                <button
                  type="button"
                  className="var-pill"
                  onClick={() => setMessage(m => m + ' {grupo}')}
                >
                  + {'{grupo}'}
                </button>
                <button
                  type="button"
                  className="var-pill"
                  onClick={() => setMessage(m => m + ' {empresa}')}
                >
                  + {'{empresa}'}
                </button>
                <button
                  type="button"
                  className="var-pill"
                  onClick={() => setMessage(m => m + ' {telefono}')}
                >
                  + {'{telefono}'}
                </button>
              </div>

              <textarea
                rows={6}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Escribe el mensaje de difusión..."
              />
            </div>

            {/* Live Message Preview & Send Action */}
            <div className="composer-footer-row">
              <div className="template-simulation-card">
                <span className="simulation-badge">
                  📱 Vista previa en WhatsApp ({sampleContact.name}):
                </span>
                <p className="simulation-text">{sampleRenderedMsg}</p>
              </div>

              <button
                type="button"
                className="btn-primary btn-send-broadcast"
                onClick={handleSendBroadcast}
                disabled={
                  isBroadcasting ||
                  !selectedSessionId ||
                  !selectedGroup ||
                  selectedGroup.contacts.length === 0 ||
                  !message.trim()
                }
              >
                {isBroadcasting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Enviando Difusión ({broadcastProgress?.current}/{broadcastProgress?.total})...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Enviar a {selectedGroup?.contacts.length || 0} Contactos
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Selected Group Contacts List */}
          {selectedGroup && selectedGroup.contacts.length > 0 && (
            <div className="live-logs-card">
              <h4 className="logs-title">
                <Users size={16} /> Contactos en {selectedGroup.name} ({selectedGroup.contacts.length})
              </h4>
              <div className="logs-stream-container">
                {selectedGroup.contacts.map(c => (
                  <div key={c.id} className="log-line">
                    <span className="log-contact">{c.name}</span>
                    <span className="log-time">{c.phone} {c.note ? `• ${c.note}` : ''}</span>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => handleRemoveContact(c.id)}
                      title="Quitar contacto de este grupo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Real-time cURL Visualizer */}
          <div className="curl-visualizer-card">
            <div className="curl-header">
              <div className="curl-title">
                <Terminal size={18} />
                <span>Comando cURL en Tiempo Real (API Endpoint)</span>
              </div>
              <button
                type="button"
                className="btn-copy-curl"
                onClick={handleCopyCurl}
              >
                {copiedCurl ? (
                  <>
                    <Check size={14} /> ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Copiar cURL
                  </>
                )}
              </button>
            </div>
            <pre className="curl-code-block">
              <code>{liveCurlCommand}</code>
            </pre>
          </div>

          {/* Real-time Execution Logs */}
          {liveLogs.length > 0 && (
            <div className="live-logs-card">
              <h4 className="logs-title">
                <Radio size={16} /> Registro de Envíos en Tiempo Real
              </h4>
              <div className="logs-stream-container">
                {liveLogs.map((log, idx) => (
                  <div key={idx} className={`log-line ${log.status}`}>
                    <span className="log-time"><Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />[{log.time}]</span>
                    <span className="log-contact">{log.name} ({log.phone})</span>
                    <span className="log-status-badge">
                      {log.status === 'success' ? '200 OK ✅ Enviado' : `ERROR ❌ ${log.error || 'Falló'}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE NEW GROUP MODAL */}
      {isCreateGroupModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateGroupModalOpen(false)}>
          <div className="modal create-group-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-with-badge">
                <div className="modal-header-icon-box">
                  <Users size={22} />
                </div>
                <div>
                  <h2>Crear Nuevo Grupo de Difusión</h2>
                  <span className="modal-subtitle">
                    Segmenta a tus clientes por rol, sector, plan o tipo de servicio
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setIsCreateGroupModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-section-stack">
                <div className="form-group-unified">
                  <label>Ícono del Grupo:</label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {ICON_OPTIONS.map(ic => (
                      <button
                        key={ic}
                        type="button"
                        className={`btn-template-pill ${newGroupIcon === ic ? 'active' : ''}`}
                        onClick={() => setNewGroupIcon(ic)}
                        style={{
                          fontSize: '1.25rem',
                          padding: '0.35rem 0.65rem',
                          background: newGroupIcon === ic ? 'rgba(37, 211, 102, 0.2)' : undefined,
                          borderColor: newGroupIcon === ic ? 'var(--primary, #25d366)' : undefined,
                        }}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group-unified">
                  <label htmlFor="new-group-name">Nombre del Grupo:</label>
                  <input
                    id="new-group-name"
                    type="text"
                    placeholder="ej. Clientes Sector Norte, Leads WhatsApp, Morosos 30 días"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="form-group-unified">
                  <label htmlFor="new-group-desc">Descripción / Objetivo:</label>
                  <textarea
                    id="new-group-desc"
                    rows={3}
                    placeholder="Describe qué clientes o prospectos conforman este grupo..."
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
                <Check size={16} /> Crear Grupo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD SINGLE CONTACT MODAL */}
      {isAddContactsModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddContactsModalOpen(false)}>
          <div className="modal add-contact-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-with-badge">
                <div className="modal-header-icon-box">
                  <Plus size={22} />
                </div>
                <div>
                  <h2>Añadir Contacto a "{selectedGroup?.name}"</h2>
                  <span className="modal-subtitle">Ingresa los datos del cliente</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setIsAddContactsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-section-stack">
                <div className="form-group-unified">
                  <label htmlFor="c-name">Nombre Completo:</label>
                  <input
                    id="c-name"
                    type="text"
                    placeholder="ej. Carlos Perez"
                    value={contactNameInput}
                    onChange={e => setContactNameInput(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="form-group-unified">
                  <label htmlFor="c-phone">Número de WhatsApp (con código de país):</label>
                  <input
                    id="c-phone"
                    type="text"
                    placeholder="ej. 584121234567"
                    value={contactPhoneInput}
                    onChange={e => setContactPhoneInput(e.target.value)}
                  />
                </div>

                <div className="form-group-unified">
                  <label htmlFor="c-note">Nota / Plan / Ticket (Opcional):</label>
                  <input
                    id="c-note"
                    type="text"
                    placeholder="ej. Ticket #ST-4821 o Plan 100M"
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
                <Check size={16} /> Guardar Contacto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupBroadcasts;
