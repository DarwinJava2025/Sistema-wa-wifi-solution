import { useState, useEffect } from 'react';
import { Bot, Check, X, Loader2, Play, Wrench, ShoppingBag, Users, CreditCard, Edit3, Maximize2, Minimize2 } from 'lucide-react';
import {
  AI_ROLES,
  type AiRoleType,
  type ChatAiConfig,
  type LlmConfig,
  DEFAULT_LLM_CONFIG,
  getSessionAiConfig,
  saveSessionAiConfig,
  generateAiChatResponse,
  findMatchingTemplateTrigger,
  getDefaultTemplateTriggers,
} from '../../services/aiAssistant';
import { KnowledgeManager } from './KnowledgeManager';
import { LlmSettingsManager } from './LlmSettingsManager';
import { WorkflowCanvas } from './WorkflowCanvas';
import { TemplateAffiliationManager } from './TemplateAffiliationManager';
import './SessionAiModal.css';

export interface SessionAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  sessionName: string;
  onSaved?: (config: ChatAiConfig) => void;
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

export function SessionAiModal({
  isOpen,
  onClose,
  sessionId,
  sessionName,
  onSaved,
}: SessionAiModalProps) {
  const [config, setConfig] = useState<ChatAiConfig>(() => getSessionAiConfig(sessionId));
  const [activeTab, setActiveTab] = useState<'flow' | 'triggers' | 'role' | 'business' | 'knowledge' | 'llm' | 'schedule' | 'test'>('flow');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [testQuery, setTestQuery] = useState('Hola, ¿qué planes tienen disponibles y cuánto cuestan?');
  const [testResponse, setTestResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(getSessionAiConfig(sessionId));
      setTestResponse('');
    }
  }, [isOpen, sessionId]);

  if (!isOpen) return null;

  const handleToggleDay = (dayId: number) => {
    setConfig(prev => {
      const currentDays = prev.schedule.days;
      const nextDays = currentDays.includes(dayId)
        ? currentDays.filter(d => d !== dayId)
        : [...currentDays, dayId].sort();
      return {
        ...prev,
        schedule: { ...prev.schedule, days: nextDays },
      };
    });
  };

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setConfig(prev => ({
      ...prev,
      businessName: tpl.businessName,
      businessContext: tpl.context,
    }));
  };

  const handleRunTest = async (overridePrompt?: string) => {
    const query = overridePrompt || testQuery;
    if (!query.trim()) return;
    setIsTesting(true);
    try {
      const res = await generateAiChatResponse([{ body: query, fromMe: false }], config);
      setTestResponse(res);
    } catch {
      setTestResponse('Error al generar respuesta simulada.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    saveSessionAiConfig(config);
    if (onSaved) onSaved(config);
    onClose();
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
      <div className={`modal session-ai-modal-unified ${isFullscreen ? 'is-fullscreen' : ''}`} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-with-badge">
            <div className="modal-header-icon-box">
              <Bot size={22} />
            </div>
            <div>
              <h2>Configurar Bot IA — {sessionName || sessionId}</h2>
              <span className="modal-subtitle">
                Ajusta el flujo visual, rol inteligente, archivos de precios, motor LLM y horarios
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

        {/* Global Switches */}
        <div className="config-card-box modal-switches-bar">
          <label className="toggle-switch-row">
            <div className="toggle-switch-info">
              <span className="toggle-title">🤖 Asistente Inteligente IA para esta sesión</span>
              <span className="toggle-description">
                Habilita el procesamiento de respuestas inteligentes por rol en esta sesión.
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={e => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
            />
          </label>

          {config.enabled && (
            <div className="toggle-divider">
              <label className="toggle-switch-row">
                <div className="toggle-switch-info">
                  <span className="toggle-title">⚡ Piloto Automático (Auto-Responder)</span>
                  <span className="toggle-description">
                    Responde automáticamente a todos los mensajes entrantes de clientes.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.autoPilot}
                  onChange={e => setConfig(prev => ({ ...prev, autoPilot: e.target.checked }))}
                />
              </label>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="modal-nav-tabs">
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
            📋 Afiliar Plantillas ({config.templateTriggers?.filter(t => t.enabled).length || 0})
          </button>
          <button
            type="button"
            className={`nav-tab-item ${activeTab === 'role' ? 'active' : ''}`}
            onClick={() => setActiveTab('role')}
          >
            1. Rol ({config.role === 'custom' && config.customRoleName ? config.customRoleName : AI_ROLES[config.role].name})
          </button>
          <button
            type="button"
            className={`nav-tab-item ${activeTab === 'business' ? 'active' : ''}`}
            onClick={() => setActiveTab('business')}
          >
            2. Info General
          </button>
          <button
            type="button"
            className={`nav-tab-item ${activeTab === 'knowledge' ? 'active' : ''}`}
            onClick={() => setActiveTab('knowledge')}
          >
            3. Archivos & Precios {(config.documents?.length || 0) > 0 && `(${config.documents?.length})`}
          </button>
          <button
            type="button"
            className={`nav-tab-item ${activeTab === 'llm' ? 'active' : ''}`}
            onClick={() => setActiveTab('llm')}
          >
            4. Motor LLM & Memoria
          </button>
          <button
            type="button"
            className={`nav-tab-item ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            5. Horarios
          </button>
          <button
            type="button"
            className={`nav-tab-item ${activeTab === 'test' ? 'active' : ''}`}
            onClick={() => setActiveTab('test')}
          >
            6. Probar
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body session-ai-modal-body">
          {/* TAB 0: VISUAL N8N WORKFLOW */}
          {activeTab === 'flow' && (
            <WorkflowCanvas
              config={config}
              onChange={setConfig}
              sessionId={sessionId}
            />
          )}

          {/* TAB: TEMPLATE AFFILIATION & TRIGGERS */}
          {activeTab === 'triggers' && (
            <div className="form-section-stack">
              <TemplateAffiliationManager
                triggers={config.templateTriggers || []}
                onChange={newTriggers => setConfig(prev => ({ ...prev, templateTriggers: newTriggers }))}
                currentRole={config.role}
                businessName={config.businessName}
                sessionId={sessionId}
              />
            </div>
          )}

          {/* TAB 1: ROLES */}
          {activeTab === 'role' && (
            <div className="form-section-stack">
              <div>
                <h3 className="section-heading">Selecciona el Rol del Asistente</h3>
                <p className="section-subheading">
                  Elige cómo debe interactuar el bot. Cada rol tiene un comportamiento y objetivo específico:
                </p>
              </div>

              <div className="roles-grid-unified">
                {(Object.keys(AI_ROLES) as AiRoleType[]).map(roleKey => {
                  const r = AI_ROLES[roleKey];
                  const isSelected = config.role === roleKey;
                  return (
                    <div
                      key={roleKey}
                      className={`role-select-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setConfig(prev => ({ ...prev, role: roleKey }))}
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

              {/* Custom Role Name & Instructions if 'Otro' */}
              {config.role === 'custom' && (
                <div className="custom-role-panel">
                  <h4 className="custom-role-heading">
                    <Edit3 size={16} /> Configuración de Rol Personalizado
                  </h4>
                  <div className="form-group-unified">
                    <label htmlFor="custom-role-name-edit">Nombre del Rol que adoptará la IA:</label>
                    <input
                      id="custom-role-name-edit"
                      type="text"
                      value={config.customRoleName || ''}
                      onChange={e => setConfig(prev => ({ ...prev, customRoleName: e.target.value }))}
                      placeholder="Ej: Asesor de Renovaciones, Promotor VIP, Agente de Campo"
                    />
                  </div>
                  <div className="form-group-unified">
                    <label htmlFor="custom-role-prompt-edit">Instrucciones de comportamiento / Prompt:</label>
                    <textarea
                      id="custom-role-prompt-edit"
                      rows={4}
                      value={config.customRolePrompt || ''}
                      onChange={e => setConfig(prev => ({ ...prev, customRolePrompt: e.target.value }))}
                      placeholder="Escribe aquí las directivas que debe seguir la IA..."
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BUSINESS CONTEXT */}
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
                <label htmlFor="business-name-edit">Nombre de la Empresa o Servicio:</label>
                <input
                  id="business-name-edit"
                  type="text"
                  value={config.businessName || ''}
                  onChange={e => setConfig(prev => ({ ...prev, businessName: e.target.value }))}
                  placeholder="ej. WiFi Solution Pro"
                />
              </div>

              <div className="form-group-unified">
                <label htmlFor="business-context-edit">
                  Base de conocimiento, Planes, Tarifas y Preguntas Frecuentes:
                </label>
                <textarea
                  id="business-context-edit"
                  rows={6}
                  value={config.businessContext || ''}
                  onChange={e => setConfig(prev => ({ ...prev, businessContext: e.target.value }))}
                  placeholder="Escribe los planes de internet, precios, métodos de pago, horarios, promociones y políticas del servicio..."
                />
              </div>
            </div>
          )}

          {/* TAB 3: KNOWLEDGE DOCUMENTS, PRICE LISTS & URLS */}
          {activeTab === 'knowledge' && (
            <KnowledgeManager
              documents={config.documents || []}
              urls={config.urls || []}
              onDocumentsChange={docs => setConfig(prev => ({ ...prev, documents: docs }))}
              onUrlsChange={urlsList => setConfig(prev => ({ ...prev, urls: urlsList }))}
            />
          )}

          {/* TAB 4: LLM ENGINE & CONVERSATION MEMORY */}
          {activeTab === 'llm' && (
            <LlmSettingsManager
              config={config.llmConfig || DEFAULT_LLM_CONFIG}
              onChange={(newLlm: LlmConfig) => setConfig(prev => ({ ...prev, llmConfig: newLlm }))}
            />
          )}

          {/* TAB 5: SCHEDULE */}
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
                    const isDayActive = config.schedule.days.includes(d.id);
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
                  <label htmlFor="schedule-start-edit">Hora de inicio:</label>
                  <input
                    id="schedule-start-edit"
                    type="time"
                    value={config.schedule.startHour}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule, startHour: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="form-group-unified">
                  <label htmlFor="schedule-end-edit">Hora de fin:</label>
                  <input
                    id="schedule-end-edit"
                    type="time"
                    value={config.schedule.endHour}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule, endHour: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="form-group-unified">
                <label htmlFor="away-msg-edit">Mensaje automático fuera de horario:</label>
                <textarea
                  id="away-msg-edit"
                  rows={3}
                  value={config.schedule.outOfHoursMessage}
                  onChange={e =>
                    setConfig(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule, outOfHoursMessage: e.target.value },
                    }))
                  }
                  placeholder="Mensaje que se enviará automáticamente si un cliente escribe fuera de los días u horas de atención..."
                />
              </div>
            </div>
          )}

          {/* TAB 6: TEST */}
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
                  {SAMPLE_PROMPTS_BY_ROLE[config.role]?.map((prompt, idx) => (
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
                const triggers = config.templateTriggers && config.templateTriggers.length > 0
                  ? config.templateTriggers
                  : getDefaultTemplateTriggers(config.role);
                const matched = findMatchingTemplateTrigger(testQuery, triggers, undefined, config);
                return (
                  <div className="test-output-card">
                    <div className="test-output-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {matched ? (
                        <span className="test-output-badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                          🎯 Plantilla Disparada: {matched.trigger.name} ({matched.trigger.templateName})
                        </span>
                      ) : (
                        <span className="test-output-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                          🧠 Motor IA LLM ({config.role === 'custom' && config.customRoleName ? config.customRoleName : AI_ROLES[config.role].name})
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
          <button type="button" className="btn-primary" onClick={handleSave}>
            <Check size={16} />
            Guardar Configuración IA
          </button>
        </div>
      </div>
    </div>
  );
}

export default SessionAiModal;
