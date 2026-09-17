import { useState } from 'react';
import { Bot, Check, X, Loader2, Play, Wrench, ShoppingBag, Users, CreditCard, Edit3, Maximize2, Minimize2 } from 'lucide-react';
import {
  AI_ROLES,
  type AiRoleType,
  type ChatAiConfig,
  type KnowledgeDocument,
  type KnowledgeUrl,
  type LlmConfig,
  type TemplateTriggerMapping,
  DEFAULT_SCHEDULE,
  getGlobalLlmConfig,
  getDefaultTemplateTriggers,
  saveSessionAiConfig,
  generateAiChatResponse,
  findMatchingTemplateTrigger,
} from '../../services/aiAssistant';
import { KnowledgeManager } from './KnowledgeManager';
import { LlmSettingsManager } from './LlmSettingsManager';
import { WorkflowCanvas } from './WorkflowCanvas';
import { TemplateAffiliationManager } from './TemplateAffiliationManager';
import { sessionNameIssues, canCreateSession } from '../../utils/sessionForm';
import './CreateSessionModal.css';

export interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingSessionNames: string[];
  onSessionCreated: (sessionName: string) => Promise<void>;
  isCreating: boolean;
}

const DAYS_OF_WEEK = [
  { id: 1, label: 'Lun' },
  { id: 2, label: 'Mar' },
  { id: 3, label: 'Mié' },
  { id: 4, label: 'Jue' },
  { id: 5, label: 'Vie' },
  { id: 6, label: 'Sáb' },
  { id: 0, label: 'Dom' },
];

const TEMPLATES = [
  {
    label: '⚡ Proveedor Internet / Fibra',
    businessName: 'WiFi Solution Pro',
    context:
      'Proveedor de internet por fibra óptica simétrica. Planes: 50Mbps ($25/mes), 100Mbps ($35/mes), 200Mbps ($50/mes). Incluye router WiFi doble banda e instalación en 24h. Métodos de pago: Pago Móvil, Transferencias y Zelle. Soporte 24/7.',
  },
  {
    label: '🛒 Tienda / Comercio',
    businessName: 'Tienda Online Solution',
    context:
      'Venta de equipos tecnológicos, routers, switches y accesorios. Envíos nacionales gratis en compras mayores a $50. Horario de despacho: 9am a 5pm. Aceptamos efectivo, tarjetas y transferencias.',
  },
  {
    label: '🏢 Servicios / Asesoría',
    businessName: 'Soluciones Tecnológicas & Redes',
    context:
      'Empresa de telecomunicaciones, soporte de servidores y cableado estructurado para empresas y hogares. Consultoría y presupuestos sin costo.',
  },
];

const SAMPLE_PROMPTS_BY_ROLE: Record<AiRoleType, string[]> = {
  sales: [
    'Hola, ¿qué planes de internet tienen y cuánto cuestan?',
    '¿Tienen cobertura en mi zona y cuánto tarda la instalación?',
    'Quiero contratar el plan de 100 megas hoy mismo.',
  ],
  support: [
    'Hola, no tengo señal de internet y la luz PON está parpadeando.',
    'El wifi está muy lento desde ayer, ¿qué puedo hacer?',
    'Se fue la luz y ahora el router no conecta a internet.',
  ],
  customer_care: [
    'Hola, ¿dónde queda su oficina y qué horarios tienen?',
    'Buenas tardes, ¿cómo puedo comunicarme con un asesor?',
  ],
  billing: [
    'Hola, ¿a qué número o cuenta puedo hacer el pago móvil?',
    'Ya realicé la transferencia, ¿cómo les envío el comprobante para reactivar?',
  ],
  custom: [
    'Hola, necesito información y asesoría especializada.',
    '¿Cómo funciona este servicio?',
  ],
};

function getDefaultSessionName(existing: string[]): string {
  let base = 'bot-wifi';
  if (!existing.includes(base)) return base;
  let counter = 2;
  while (existing.includes(`${base}-${counter}`)) {
    counter++;
  }
  return `${base}-${counter}`;
}

export function CreateSessionModal({
  isOpen,
  onClose,
  existingSessionNames,
  onSessionCreated,
  isCreating,
}: CreateSessionModalProps) {
  const [sessionName, setSessionName] = useState(() => getDefaultSessionName(existingSessionNames));
  const [activeTab, setActiveTab] = useState<'general' | 'flow' | 'triggers' | 'role' | 'business' | 'knowledge' | 'llm' | 'schedule' | 'test'>('flow');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // AI Configuration state
  const [enableAi, setEnableAi] = useState(true);
  const [autoPilot, setAutoPilot] = useState(true);
  const [selectedRole, setSelectedRole] = useState<AiRoleType>('support');
  const [customRoleName, setCustomRoleName] = useState('');
  const [customRolePrompt, setCustomRolePrompt] = useState('');
  const [businessName, setBusinessName] = useState('WiFi Solution Pro');
  const [businessContext, setBusinessContext] = useState(
    'Proveedor de internet por fibra óptica simétrica. Planes de 50Mbps ($25), 100Mbps ($35) y 200Mbps ($50). Métodos de pago: Pago Móvil, Transferencias y Efectivo. Instalación rápida y soporte prioritario.',
  );
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [urls, setUrls] = useState<KnowledgeUrl[]>([]);
  const [templateTriggers, setTemplateTriggers] = useState<TemplateTriggerMapping[]>(() => getDefaultTemplateTriggers('support'));
  const [llmConfig, setLlmConfig] = useState<LlmConfig>(getGlobalLlmConfig);
  const [schedule, setSchedule] = useState({ ...DEFAULT_SCHEDULE });

  // Test prompt state
  const [testQuery, setTestQuery] = useState('Hola, ¿qué planes tienen disponibles y cuánto cuestan?');
  const [testResponse, setTestResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const currentEffectiveName = sessionName.trim().toLowerCase() || getDefaultSessionName(existingSessionNames);
  const nameIssues = sessionName ? sessionNameIssues(sessionName, existingSessionNames) : [];
  const isValidName = canCreateSession(currentEffectiveName, existingSessionNames);

  const handleToggleDay = (dayId: number) => {
    setSchedule(prev => {
      const nextDays = prev.days.includes(dayId)
        ? prev.days.filter(d => d !== dayId)
        : [...prev.days, dayId].sort();
      return { ...prev, days: nextDays };
    });
  };

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setBusinessName(tpl.businessName);
    setBusinessContext(tpl.context);
  };

  const handleRunTest = async (overridePrompt?: string) => {
    const query = overridePrompt || testQuery;
    if (!query.trim()) return;
    setIsTesting(true);
    try {
      const mockConfig: ChatAiConfig = {
        chatId: '*',
        sessionId: currentEffectiveName,
        enabled: enableAi,
        autoPilot,
        role: selectedRole,
        customRoleName,
        customRolePrompt,
        businessName,
        businessContext,
        documents,
        urls,
        templateTriggers,
        llmConfig,
        schedule,
        updatedAt: new Date().toISOString(),
      };
      const resp = await generateAiChatResponse([{ body: query, fromMe: false }], mockConfig);
      setTestResponse(resp);
    } catch (err: any) {
      setTestResponse(`Error al procesar: ${err.message || err}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async () => {
    let targetName = sessionName.trim().toLowerCase();
    if (!targetName) {
      targetName = getDefaultSessionName(existingSessionNames);
      setSessionName(targetName);
    }

    if (!canCreateSession(targetName, existingSessionNames)) {
      setActiveTab('general');
      return;
    }

    if (isCreating) return;

    // Save session AI configuration
    const aiConfig: ChatAiConfig = {
      chatId: '*',
      sessionId: targetName,
      enabled: enableAi,
      autoPilot,
      role: selectedRole,
      customRoleName: selectedRole === 'custom' ? customRoleName.trim() : '',
      customRolePrompt: customRolePrompt.trim(),
      businessName: businessName.trim() || 'Mi Empresa',
      businessContext: businessContext.trim(),
      documents,
      urls,
      templateTriggers,
      llmConfig,
      schedule,
      updatedAt: new Date().toISOString(),
    };
    saveSessionAiConfig(aiConfig);

    await onSessionCreated(targetName);
  };

  const getRoleIcon = (roleKey: AiRoleType) => {
    switch (roleKey) {
      case 'support':
        return <Wrench size={20} />;
      case 'sales':
        return <ShoppingBag size={20} />;
      case 'customer_care':
        return <Users size={20} />;
      case 'billing':
        return <CreditCard size={20} />;
      case 'custom':
        return <Edit3 size={20} />;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal create-session-modal-unified ${isFullscreen ? 'is-fullscreen' : ''}`} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-with-badge">
            <div className="modal-header-icon-box">
              <Bot size={22} />
            </div>
            <div>
              <h2>Crear Sesión con Bot IA</h2>
              <span className="modal-subtitle">
                Configura el nombre, rol inteligente, archivos de precios, motor LLM y horarios
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn-icon"
              onClick={() => setIsFullscreen(prev => !prev)}
              title={isFullscreen ? 'Restaurar ventana' : 'Pantalla Completa (Modo Estudio)'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Persistent Quick Session Name Bar */}
        <div className="session-name-top-bar">
          <div className="session-name-top-label">
            <span className="name-bar-icon">🏷️</span>
            <span>Nombre de la Sesión:</span>
          </div>
          <div className="session-name-top-input-wrap">
            <input
              type="text"
              placeholder="ej. bot-ventas, soporte-principal"
              value={sessionName}
              onChange={e => {
                const clean = e.target.value.toLowerCase().replace(/\s+/g, '-');
                setSessionName(clean);
              }}
              className={nameIssues.length > 0 ? 'has-error' : ''}
            />
            {nameIssues.length > 0 && (
              <span className="name-bar-error-text">
                {nameIssues.includes('duplicate')
                  ? '⚠️ Ya existe una sesión con este nombre'
                  : nameIssues.includes('format')
                  ? '⚠️ Solo minúsculas, números y guiones'
                  : '⚠️ Revisa el nombre'}
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="modal-nav-tabs">
          <button
            type="button"
            className={`nav-tab-item ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            1. Sesión
          </button>
          <button
            type="button"
            className={`nav-tab-item ${activeTab === 'flow' ? 'active' : ''}`}
            onClick={() => setActiveTab('flow')}
          >
            ⚡ Flujo Visual n8n
          </button>
          <button
            type="button"
            className={`nav-tab-item ${activeTab === 'triggers' ? 'active' : ''}`}
            onClick={() => setActiveTab('triggers')}
          >
            📋 Afiliar Plantillas ({templateTriggers.filter(t => t.enabled).length})
          </button>
          <button
            type="button"
            className={`nav-tab-item ${activeTab === 'role' ? 'active' : ''}`}
            onClick={() => setActiveTab('role')}
          >
            2. Rol ({selectedRole === 'custom' && customRoleName ? customRoleName : AI_ROLES[selectedRole].name})
          </button>
          <button
            type="button"
            className={`nav-tab-item ${activeTab === 'business' ? 'active' : ''}`}
            onClick={() => setActiveTab('business')}
          >
            3. Info General
          </button>
          <button
            type="button"
            className={`nav-tab-item ${activeTab === 'knowledge' ? 'active' : ''}`}
            onClick={() => setActiveTab('knowledge')}
          >
            4. Archivos & Precios {documents.length > 0 && `(${documents.length})`}
          </button>
          <button
            type="button"
            className={`nav-tab-item ${activeTab === 'llm' ? 'active' : ''}`}
            onClick={() => setActiveTab('llm')}
          >
            5. Motor LLM & Memoria
          </button>
          <button
            type="button"
            className={`nav-tab-item ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            6. Horarios
          </button>
          <button
            type="button"
            className={`nav-tab-item ${activeTab === 'test' ? 'active' : ''}`}
            onClick={() => setActiveTab('test')}
          >
            7. Probar
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body create-session-modal-body">
          {/* TAB 0: FLOW CANVAS */}
          {activeTab === 'flow' && (
            <WorkflowCanvas
              config={{
                chatId: '*',
                sessionId: sessionName || 'nueva_sesion',
                enabled: enableAi,
                autoPilot,
                role: selectedRole,
                customRoleName,
                customRolePrompt,
                businessName,
                businessContext,
                documents,
                urls,
                templateTriggers,
                llmConfig,
                schedule,
                updatedAt: new Date().toISOString(),
              }}
              onChange={newConf => {
                setSelectedRole(newConf.role);
                setCustomRoleName(newConf.customRoleName || '');
                setCustomRolePrompt(newConf.customRolePrompt || '');
                setBusinessName(newConf.businessName);
                setBusinessContext(newConf.businessContext);
                setDocuments(newConf.documents || []);
                setUrls(newConf.urls || []);
                if (newConf.templateTriggers) setTemplateTriggers(newConf.templateTriggers);
                if (newConf.llmConfig) setLlmConfig(newConf.llmConfig);
                setSchedule(newConf.schedule);
              }}
              sessionId={sessionName || 'nueva_sesion'}
            />
          )}

          {/* TAB: TEMPLATE AFFILIATION & TRIGGERS */}
          {activeTab === 'triggers' && (
            <div className="form-section-stack">
              <TemplateAffiliationManager
                triggers={templateTriggers}
                onChange={setTemplateTriggers}
                currentRole={selectedRole}
                businessName={businessName}
                sessionId={sessionName || 'nueva_sesion'}
              />
            </div>
          )}

          {/* TAB 1: GENERAL (Session Name & Switches) */}
          {activeTab === 'general' && (
            <div className="form-section-stack">
              <div className="form-group-unified">
                <label htmlFor="create-session-name-input">Nombre de la sesión WhatsApp:</label>
                <input
                  id="create-session-name-input"
                  type="text"
                  placeholder="ej. ventas-principal, soporte-tecnico, bot-1"
                  value={sessionName}
                  onChange={e => {
                    const clean = e.target.value.toLowerCase().replace(/\s+/g, '-');
                    setSessionName(clean);
                  }}
                  autoFocus
                />
                <p className="input-hint">
                  Usa letras minúsculas, números y guiones. Ejemplo: <code>soporte-cliente</code> o <code>bot-ventas</code>.
                </p>
                {nameIssues.includes('format') && <p className="input-error">Solo se permiten letras minúsculas, números y guiones.</p>}
                {nameIssues.includes('too-long') && <p className="input-error">El nombre es demasiado largo.</p>}
                {nameIssues.includes('duplicate') && <p className="input-error">Ya existe una sesión con este nombre.</p>}
              </div>

              <div className="config-card-box">
                <label className="toggle-switch-row">
                  <div className="toggle-switch-info">
                    <span className="toggle-title">🤖 Asistente Inteligente IA para esta sesión</span>
                    <span className="toggle-description">
                      Habilita las respuestas inteligentes con rol especializado y contexto del negocio.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableAi}
                    onChange={e => setEnableAi(e.target.checked)}
                  />
                </label>

                {enableAi && (
                  <div className="toggle-divider">
                    <label className="toggle-switch-row">
                      <div className="toggle-switch-info">
                        <span className="toggle-title">⚡ Piloto Automático (Auto-Responder)</span>
                        <span className="toggle-description">
                          Responde automáticamente a los mensajes entrantes de los clientes en tiempo real.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoPilot}
                        onChange={e => setAutoPilot(e.target.checked)}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ROLE SELECTION */}
          {activeTab === 'role' && (
            <div className="form-section-stack">
              <div>
                <h3 className="section-heading">Selecciona el Rol del Asistente</h3>
                <p className="section-subheading">
                  Elige cómo debe interactuar el bot. Cada rol tiene un comportamiento y objetivo específico:
                </p>
              </div>

              {/* Roles Grid */}
              <div className="roles-grid-unified">
                {(Object.keys(AI_ROLES) as AiRoleType[]).map(roleKey => {
                  const r = AI_ROLES[roleKey];
                  const isSelected = selectedRole === roleKey;
                  return (
                    <div
                      key={roleKey}
                      className={`role-select-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedRole(roleKey)}
                    >
                      <div className="role-card-header">
                        <div className="role-card-icon-container">
                          {getRoleIcon(roleKey)}
                        </div>
                        <div className="role-card-title-group">
                          <span className="role-card-name">{r.name}</span>
                        </div>
                        <div className={`role-card-radio ${isSelected ? 'checked' : ''}`}>
                          {isSelected && <Check size={14} />}
                        </div>
                      </div>
                      <p className="role-card-description">{r.description}</p>
                      <div className="role-card-behavior-badge">
                        {roleKey === 'sales' && '🎯 Objetivo: Cotizar planes y cerrar venta'}
                        {roleKey === 'support' && '🛠️ Objetivo: Diagnóstico, luces ONT y Ticket'}
                        {roleKey === 'billing' && '💳 Objetivo: Métodos de pago y reactivación'}
                        {roleKey === 'customer_care' && '🤝 Objetivo: Información, horarios y cordialidad'}
                        {roleKey === 'custom' && '✏️ Rol e instrucciones 100% personalizadas'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom Role Fields (When 'custom' is selected) */}
              {selectedRole === 'custom' && (
                <div className="custom-role-panel">
                  <h4 className="custom-role-heading">
                    <Edit3 size={16} /> Configuración de Rol Personalizado
                  </h4>
                  <div className="form-group-unified">
                    <label htmlFor="custom-role-name">Nombre del Rol que adoptará la IA:</label>
                    <input
                      id="custom-role-name"
                      type="text"
                      placeholder="ej. Asesor de Renovaciones, Promotor VIP, Agente de Campo"
                      value={customRoleName}
                      onChange={e => setCustomRoleName(e.target.value)}
                    />
                  </div>
                  <div className="form-group-unified">
                    <label htmlFor="custom-role-prompt">Instrucciones de comportamiento / Prompt:</label>
                    <textarea
                      id="custom-role-prompt"
                      rows={4}
                      placeholder="Escribe aquí las directivas que debe seguir la IA (ej. Sé breve, solicita el número de cédula del cliente, enfócate en retenerlo ofreciendo un 10% de descuento y habla de manera formal)..."
                      value={customRolePrompt}
                      onChange={e => setCustomRolePrompt(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BUSINESS INFO & CONTEXT */}
          {activeTab === 'business' && (
            <div className="form-section-stack">
              <div>
                <h3 className="section-heading">Información del Negocio y Respuestas</h3>
                <p className="section-subheading">
                  La IA utilizará esta información para responder fielmente sobre tus planes, precios y servicios.
                </p>
              </div>

              {/* Quick 1-Click Templates */}
              <div className="quick-templates-box">
                <span className="quick-templates-title">Plantillas rápidas con 1 clic:</span>
                <div className="quick-templates-row">
                  {TEMPLATES.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      className="btn-template-pill"
                      onClick={() => applyTemplate(tpl)}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group-unified">
                <label htmlFor="business-name-input">Nombre de la Empresa o Servicio:</label>
                <input
                  id="business-name-input"
                  type="text"
                  placeholder="ej. WiFi Solution Pro"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                />
              </div>

              <div className="form-group-unified">
                <label htmlFor="business-context-input">
                  Base de conocimiento, Resumen de Planes y Preguntas Frecuentes:
                </label>
                <textarea
                  id="business-context-input"
                  rows={6}
                  placeholder="Escribe los planes de internet, precios, métodos de pago, horarios, promociones y políticas del servicio..."
                  value={businessContext}
                  onChange={e => setBusinessContext(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* TAB 4: KNOWLEDGE DOCUMENTS, PRICE LISTS & URLS */}
          {activeTab === 'knowledge' && (
            <KnowledgeManager
              documents={documents}
              urls={urls}
              onDocumentsChange={setDocuments}
              onUrlsChange={setUrls}
            />
          )}

          {/* TAB 5: LLM ENGINE & CONVERSATION MEMORY */}
          {activeTab === 'llm' && (
            <LlmSettingsManager
              config={llmConfig}
              onChange={setLlmConfig}
            />
          )}

          {/* TAB 6: SCHEDULE & HOURS */}
          {activeTab === 'schedule' && (
            <div className="form-section-stack">
              <div>
                <h3 className="section-heading">Horarios de Atención del Bot</h3>
                <p className="section-subheading">
                  Define los días y horas en que el bot atenderá activamente o enviará el mensaje de fuera de horario.
                </p>
              </div>

              <div className="form-group-unified">
                <label>Días laborables activos:</label>
                <div className="days-pill-row">
                  {DAYS_OF_WEEK.map(d => {
                    const isDayActive = schedule.days.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        className={`day-pill-btn ${isDayActive ? 'active' : ''}`}
                        onClick={() => handleToggleDay(d.id)}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="time-grid-row">
                <div className="form-group-unified">
                  <label htmlFor="schedule-start-time">Hora de inicio:</label>
                  <input
                    id="schedule-start-time"
                    type="time"
                    value={schedule.startHour}
                    onChange={e => setSchedule(s => ({ ...s, startHour: e.target.value }))}
                  />
                </div>
                <div className="form-group-unified">
                  <label htmlFor="schedule-end-time">Hora de fin:</label>
                  <input
                    id="schedule-end-time"
                    type="time"
                    value={schedule.endHour}
                    onChange={e => setSchedule(s => ({ ...s, endHour: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group-unified">
                <label htmlFor="away-msg-input">Mensaje automático fuera de horario:</label>
                <textarea
                  id="away-msg-input"
                  rows={3}
                  value={schedule.outOfHoursMessage}
                  onChange={e => setSchedule(s => ({ ...s, outOfHoursMessage: e.target.value }))}
                  placeholder="Mensaje que se enviará automáticamente si un cliente escribe fuera de los días u horas de atención..."
                />
              </div>
            </div>
          )}

          {/* TAB 7: SIMULATOR / TEST */}
          {activeTab === 'test' && (
            <div className="form-section-stack">
              <div>
                <h3 className="section-heading">Simulador de Respuestas en Tiempo Real</h3>
                <p className="section-subheading">
                  Prueba preguntas frecuentes de clientes para ver exactamente cómo responderá la IA con el modelo LLM, archivos de precios y memoria conversacional.
                </p>
              </div>

              {/* Quick sample queries for current role */}
              <div className="sample-prompts-container">
                <span className="sample-prompts-label">Preguntas de prueba sugeridas para este rol:</span>
                <div className="sample-prompts-pills">
                  {SAMPLE_PROMPTS_BY_ROLE[selectedRole]?.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="sample-prompt-pill"
                      onClick={() => {
                        setTestQuery(prompt);
                        handleRunTest(prompt);
                      }}
                    >
                      "{prompt}"
                    </button>
                  ))}
                </div>
              </div>

              <div className="test-input-row">
                <input
                  type="text"
                  placeholder="Escribe una pregunta para probar el bot..."
                  value={testQuery}
                  onChange={e => setTestQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleRunTest();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleRunTest()}
                  disabled={isTesting || !testQuery.trim()}
                >
                  {isTesting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  Probar
                </button>
              </div>

              {testResponse && (() => {
                const matched = findMatchingTemplateTrigger(testQuery, templateTriggers);
                return (
                  <div className="test-output-card">
                    <div className="test-output-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {matched ? (
                        <span className="test-output-badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                          🎯 Plantilla Disparada: {matched.trigger.name} ({matched.trigger.templateName})
                        </span>
                      ) : (
                        <span className="test-output-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                          🧠 Motor IA LLM ({selectedRole === 'custom' && customRoleName ? customRoleName : AI_ROLES[selectedRole].name})
                        </span>
                      )}
                    </div>
                    <p className="test-output-text">{testResponse}</p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!isValidName || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creando Sesión...
              </>
            ) : (
              <>
                <Check size={16} />
                Crear Sesión & Bot
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateSessionModal;
