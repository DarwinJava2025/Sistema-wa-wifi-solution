import { useState, useEffect } from 'react';
import {
  Bot,
  Check,
  X,
  Loader2,
  Play,
  Building2,
  Users,
  FileText,
  Database,
  Cpu,
  Share2,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  type ChatAiConfig,
  type LlmConfig,
  DEFAULT_LLM_CONFIG,
  getSessionAiConfig,
  saveSessionAiConfig,
  generateAiChatResponse,
  findMatchingTemplateTrigger,
  getDefaultTemplateTriggers,
  getDefaultMultiRoleConfig,
  AI_ROLES,
} from '../../services/aiAssistant';
import { KnowledgeManager } from './KnowledgeManager';
import { LlmSettingsManager } from './LlmSettingsManager';
import { WorkflowCanvas } from './WorkflowCanvas';
import { TemplateAffiliationManager } from './TemplateAffiliationManager';
import { MultiRoleManager } from './MultiRoleManager';
import './SessionAiModal.css';

export interface SessionAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  sessionName: string;
  onSaved?: (config: ChatAiConfig) => void;
}

const WIZARD_STEPS = [
  { id: 'business', stepNum: 1, label: 'Empresa & Tono', icon: Building2, desc: 'Nombre, contexto base y tarifas' },
  { id: 'multirole', stepNum: 2, label: 'Roles & Menú', icon: Users, desc: 'Departamentos y saludo interactivo' },
  { id: 'triggers', stepNum: 3, label: 'Plantillas & Meta', icon: FileText, desc: 'Respuestas numeradas #101-#105' },
  { id: 'knowledge', stepNum: 4, label: 'Base de Precios (RAG)', icon: Database, desc: 'Archivos y URLs web indexadas' },
  { id: 'llm_schedule', stepNum: 5, label: 'Motor IA & Horarios', icon: Cpu, desc: 'ChatGPT/Gemini y horario comercial' },
  { id: 'flow_test', stepNum: 6, label: 'Flujo n8n & Probar', icon: Share2, desc: 'Pipeline visual y simulador en vivo' },
] as const;

type StepId = (typeof WIZARD_STEPS)[number]['id'];

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
    label: '🛒 Tienda / Comercio Online',
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

export function SessionAiModal({
  isOpen,
  onClose,
  sessionId,
  sessionName,
  onSaved,
}: SessionAiModalProps) {
  const [config, setConfig] = useState<ChatAiConfig>(() => getSessionAiConfig(sessionId, sessionName));
  const [activeStep, setActiveStep] = useState<StepId>('business');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [testQuery, setTestQuery] = useState('Hola, ¿qué planes tienen disponibles y cuánto cuestan?');
  const [testResponse, setTestResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(getSessionAiConfig(sessionId, sessionName));
      setTestResponse('');
    }
  }, [isOpen, sessionId, sessionName]);

  if (!isOpen) return null;

  const currentStepIndex = WIZARD_STEPS.findIndex(s => s.id === activeStep);

  const handleNextStep = () => {
    if (currentStepIndex < WIZARD_STEPS.length - 1) {
      setActiveStep(WIZARD_STEPS[currentStepIndex + 1].id);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setActiveStep(WIZARD_STEPS[currentStepIndex - 1].id);
    }
  };

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
    saveSessionAiConfig(config, sessionName);
    if (onSaved) onSaved(config);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal session-ai-modal-unified ${isFullscreen ? 'is-fullscreen' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="modal-header session-ai-header">
          <div className="modal-title-with-badge">
            <div className="modal-header-icon-box">
              <Bot size={22} />
            </div>
            <div>
              <div className="header-title-flex">
                <h2>Configuración del Bot IA — {sessionName || sessionId}</h2>
                <span className="bot-session-badge">📱 {sessionName}</span>
              </div>
              <p className="modal-subtitle">
                Asistente paso a paso para configurar respuestas, roles multi-LLM, plantillas oficiales de Meta y automatizaciones.
              </p>
            </div>
          </div>
          <div className="header-actions-right">
            <button
              type="button"
              className="btn-icon"
              onClick={() => setIsFullscreen(prev => !prev)}
              title={isFullscreen ? 'Restaurar ventana' : 'Pantalla Completa'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Global Operational Switches Banner */}
        <div className="wizard-global-toggles-bar">
          <div className="toggle-box-card">
            <label className="custom-switch-label">
              <input
                type="checkbox"
                className="custom-switch-input"
                checked={config.enabled}
                onChange={e => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              <span className="custom-switch-slider" />
            </label>
            <div className="toggle-card-texts">
              <span className="toggle-card-title">🤖 Asistente Inteligente IA</span>
              <span className="toggle-card-sub">
                {config.enabled ? 'Habilitado (procesa mensajes con IA y plantillas)' : 'Desactivado (sin respuestas automáticas)'}
              </span>
            </div>
          </div>

          <div className={`toggle-box-card ${!config.enabled ? 'disabled' : ''}`}>
            <label className="custom-switch-label">
              <input
                type="checkbox"
                className="custom-switch-input"
                disabled={!config.enabled}
                checked={config.autoPilot}
                onChange={e => setConfig(prev => ({ ...prev, autoPilot: e.target.checked }))}
              />
              <span className="custom-switch-slider" />
            </label>
            <div className="toggle-card-texts">
              <span className="toggle-card-title">⚡ Piloto Automático (Auto-Responder)</span>
              <span className="toggle-card-sub">
                {config.autoPilot ? 'Activo (responde al instante en WhatsApp)' : 'Manual (sugiere respuestas a los operadores)'}
              </span>
            </div>
          </div>
        </div>

        {/* Wizard Step Navigation Bar */}
        <div className="wizard-stepper-nav">
          {WIZARD_STEPS.map(step => {
            const Icon = step.icon;
            const isActive = activeStep === step.id;
            const isCompleted = step.stepNum < currentStepIndex + 1;

            return (
              <button
                key={step.id}
                type="button"
                className={`wizard-step-btn ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => setActiveStep(step.id)}
              >
                <div className="step-btn-number-badge">
                  {isCompleted ? <Check size={12} /> : step.stepNum}
                </div>
                <div className="step-btn-content">
                  <div className="step-btn-title-row">
                    <Icon size={14} className="step-btn-icon" />
                    <span className="step-btn-title">{step.label}</span>
                  </div>
                  <span className="step-btn-desc">{step.desc}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Modal Body Step Content */}
        <div className="modal-body session-ai-modal-body">
          {/* PASO 1: EMPRESA & TONO */}
          {activeStep === 'business' && (
            <div className="wizard-step-content-stack">
              <div className="wizard-step-explanation-banner">
                <div className="banner-icon-box">
                  <Building2 size={20} />
                </div>
                <div className="banner-texts">
                  <h4>Paso 1: Identidad y Contexto Base del Negocio</h4>
                  <p>
                    Define el nombre comercial de tu empresa y la información fundamental (planes, precios y políticas). Todos los departamentos y roles utilizarán este contexto como base de verdad para responder a los clientes.
                  </p>
                </div>
              </div>

              {/* 1-Click Fast Templates */}
              <div className="quick-templates-box">
                <span className="quick-templates-title">🚀 Cargar Plantilla Rápida de Ejemplo (1 Clic):</span>
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
                  value={config.businessName || ''}
                  onChange={e => setConfig(prev => ({ ...prev, businessName: e.target.value }))}
                  placeholder="ej. WiFi Solution Pro"
                />
              </div>

              <div className="form-group-unified">
                <label htmlFor="business-context-input">
                  Información Comercial, Precios Base y Políticas del Servicio:
                </label>
                <textarea
                  id="business-context-input"
                  rows={5}
                  value={config.businessContext || ''}
                  onChange={e => setConfig(prev => ({ ...prev, businessContext: e.target.value }))}
                  placeholder="Describe tus planes de internet, precios, métodos de pago (Pago Móvil, Zelle, Transferencias), horarios y especificaciones técnicas..."
                />
              </div>
            </div>
          )}

          {/* PASO 2: ROLES & MENÚ */}
          {activeStep === 'multirole' && (
            <div className="wizard-step-content-stack">
              <div className="wizard-step-explanation-banner">
                <div className="banner-icon-box purple">
                  <Users size={20} />
                </div>
                <div className="banner-texts">
                  <h4>Paso 2: Departamentos & Roles Especializados</h4>
                  <p>
                    Configura el menú de bienvenida y los roles del bot. Cada departamento (Soporte, Ventas, Cobranzas, Atención) cuenta con su propio prompt y motor LLM independiente para brindar una respuesta con personalidad y conocimientos especializados.
                  </p>
                </div>
              </div>

              <MultiRoleManager
                config={config.multiRole || getDefaultMultiRoleConfig(config.businessName)}
                onChange={newMulti => setConfig(prev => ({ ...prev, multiRole: newMulti }))}
                businessName={config.businessName}
              />
            </div>
          )}

          {/* PASO 3: PLANTILLAS & META */}
          {activeStep === 'triggers' && (
            <div className="wizard-step-content-stack">
              <div className="wizard-step-explanation-banner">
                <div className="banner-icon-box amber">
                  <FileText size={20} />
                </div>
                <div className="banner-texts">
                  <h4>Paso 3: Plantillas de Respuesta & Formatos Oficiales de Meta</h4>
                  <p>
                    Asocia plantillas numeradas (<strong>#101</strong>, <strong>#102</strong>, <strong>#103</strong>...) a cada departamento. Puedes importar directamente plantillas oficiales desde <strong>Meta WhatsApp Business Manager</strong> y elegir el modo de entrega (Solo Plantilla, Híbrido IA con datos de precios, o Solo IA).
                  </p>
                </div>
              </div>

              <TemplateAffiliationManager
                triggers={config.templateTriggers && config.templateTriggers.length > 0 ? config.templateTriggers : getDefaultTemplateTriggers(config.role)}
                onChange={newTriggers => setConfig(prev => ({ ...prev, templateTriggers: newTriggers }))}
                currentRole={config.role}
                businessName={config.businessName}
                sessionId={sessionId}
              />
            </div>
          )}

          {/* PASO 4: BASE DE CONOCIMIENTO (RAG) */}
          {activeStep === 'knowledge' && (
            <div className="wizard-step-content-stack">
              <div className="wizard-step-explanation-banner">
                <div className="banner-icon-box blue">
                  <Database size={20} />
                </div>
                <div className="banner-texts">
                  <h4>Paso 4: Base de Conocimiento (Precios, Tarifas & Enlaces Web)</h4>
                  <p>
                    Adjunta documentos de tarifas, especificaciones de routers o catálogos web. El motor de IA consultará estos documentos para dar precios exactos y datos actualizados a los clientes.
                  </p>
                </div>
              </div>

              <KnowledgeManager
                documents={config.documents || []}
                urls={config.urls || []}
                onDocumentsChange={docs => setConfig(prev => ({ ...prev, documents: docs }))}
                onUrlsChange={urlsList => setConfig(prev => ({ ...prev, urls: urlsList }))}
              />
            </div>
          )}

          {/* PASO 5: MOTOR IA & HORARIOS */}
          {activeStep === 'llm_schedule' && (
            <div className="wizard-step-content-stack">
              <div className="wizard-step-explanation-banner">
                <div className="banner-icon-box teal">
                  <Cpu size={20} />
                </div>
                <div className="banner-texts">
                  <h4>Paso 5: Motor LLM, Memoria Conversacional & Horarios de Atención</h4>
                  <p>
                    Ajusta el proveedor de IA (OpenAI ChatGPT, Gemini, Groq, Claude o modelos locales con Ollama) y define los horarios de atención comercial con respuesta automática fuera de horario.
                  </p>
                </div>
              </div>

              {/* LLM Engine Settings */}
              <LlmSettingsManager
                config={config.llmConfig || DEFAULT_LLM_CONFIG}
                onChange={(newLlm: LlmConfig) => setConfig(prev => ({ ...prev, llmConfig: newLlm }))}
              />

              {/* Schedule Block */}
              <div className="config-card-box" style={{ marginTop: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '1rem', fontWeight: 700 }}>
                  🕒 Horarios de Atención del Bot
                </h4>
                <p style={{ margin: '0 0 1rem 0', color: '#94a3b8', fontSize: '0.8125rem' }}>
                  Define en qué días y horas el bot responderá consultas o despachará el mensaje automático de fuera de horario.
                </p>

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
                    <label htmlFor="sched-start">Hora de inicio:</label>
                    <input
                      id="sched-start"
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
                    <label htmlFor="sched-end">Hora de fin:</label>
                    <input
                      id="sched-end"
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
                  <label htmlFor="sched-away-msg">Mensaje automático fuera de horario:</label>
                  <textarea
                    id="sched-away-msg"
                    rows={3}
                    value={config.schedule.outOfHoursMessage}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule, outOfHoursMessage: e.target.value },
                      }))
                    }
                    placeholder="Hola, nuestro horario de atención es de Lunes a Viernes de 8:00 AM a 6:00 PM. Dejanos tu mensaje y te atenderemos a primera hora..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* PASO 6: FLUJO N8N & SIMULADOR */}
          {activeStep === 'flow_test' && (
            <div className="wizard-step-content-stack">
              <div className="wizard-step-explanation-banner">
                <div className="banner-icon-box green">
                  <Share2 size={20} />
                </div>
                <div className="banner-texts">
                  <h4>Paso 6: Pipeline Visual n8n & Simulador de Flujo en Vivo</h4>
                  <p>
                    Visualiza cómo interactúan los nodos en el canvas estilo n8n y prueba preguntas de clientes para comprobar la respuesta en tiempo real.
                  </p>
                </div>
              </div>

              <WorkflowCanvas
                config={config}
                onChange={setConfig}
                sessionId={sessionId}
              />

              {/* Quick Interactive Testing */}
              <div className="config-card-box" style={{ marginTop: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '1rem', fontWeight: 700 }}>
                  🧪 Prueba Rápida de Conversación
                </h4>
                <div className="test-input-row">
                  <input
                    type="text"
                    placeholder="Escribe una pregunta para probar cómo responde el bot..."
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
                    <div className="test-output-card" style={{ marginTop: '1rem' }}>
                      <div className="test-output-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {matched ? (
                          <span className="test-output-badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                            🎯 Plantilla #{matched.trigger.templateNumber || '101'}: {matched.trigger.name} ({matched.trigger.templateName})
                          </span>
                        ) : (
                          <span className="test-output-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                            🧠 Motor IA ({AI_ROLES[config.role]?.name || 'Soporte'})
                          </span>
                        )}
                      </div>
                      <p className="test-output-text" style={{ whiteSpace: 'pre-wrap', margin: '0.5rem 0 0 0' }}>{testResponse}</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Modal Stepper Footer */}
        <div className="modal-footer session-ai-footer">
          <div className="footer-left-nav">
            <button
              type="button"
              className="btn-secondary"
              onClick={handlePrevStep}
              disabled={currentStepIndex === 0}
            >
              <ChevronLeft size={16} />
              Anterior Paso
            </button>
            <span className="footer-step-indicator">
              Paso {currentStepIndex + 1} de {WIZARD_STEPS.length}: <strong>{WIZARD_STEPS[currentStepIndex].label}</strong>
            </span>
          </div>

          <div className="footer-right-actions">
            {currentStepIndex < WIZARD_STEPS.length - 1 ? (
              <button type="button" className="btn-wizard-next" onClick={handleNextStep}>
                Siguiente Paso
                <ChevronRight size={16} />
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={handleSave}>
                <Check size={16} />
                Guardar Configuración IA
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionAiModal;
