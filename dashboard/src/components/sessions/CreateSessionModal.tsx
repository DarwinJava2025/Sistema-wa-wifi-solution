import { useState } from 'react';
import {
  Bot,
  Check,
  X,
  Loader2,
  Maximize2,
  Minimize2,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Layers,
  FileText,
  Clock,
  Cpu,
  Workflow,
  CheckCircle2,
  Info,
  Zap,
  Sliders,
} from 'lucide-react';
import {
  type AiRoleType,
  type ChatAiConfig,
  type KnowledgeDocument,
  type KnowledgeUrl,
  type LlmConfig,
  type MultiRoleConfig,
  type TemplateTriggerMapping,
  DEFAULT_SCHEDULE,
  getGlobalLlmConfig,
  getDefaultTemplateTriggers,
  getDefaultMultiRoleConfig,
  saveSessionAiConfig,
} from '../../services/aiAssistant';
import { KnowledgeManager } from './KnowledgeManager';
import { LlmSettingsManager } from './LlmSettingsManager';
import { WorkflowCanvas } from './WorkflowCanvas';
import { TemplateAffiliationManager } from './TemplateAffiliationManager';
import { MultiRoleManager } from './MultiRoleManager';
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
    label: '⚡ Proveedor Internet / Fibra (WISP)',
    businessName: 'WiFi Solution Pro',
    context:
      'Proveedor de internet por fibra óptica simétrica y radioenlace. Planes residenciales: 50Mbps ($25/mes), 100Mbps ($35/mes), 200Mbps ($50/mes). Planes corporativos con IP fija. Incluye router WiFi doble banda e instalación rápida en 24h. Métodos de pago: Pago Móvil, Transferencias Banesco/Mercantil, Zelle y Efectivo. Soporte técnico 24/7.',
  },
  {
    label: '🛒 Tienda de Tecnología & Routers',
    businessName: 'WiFi Store & Tech',
    context:
      'Venta de equipos de telecomunicaciones, routers WiFi 6, antenas, switches y accesorios. Envíos a todo el país. Métodos de pago en divisas y moneda local. Horario de atención y despacho: Lunes a Sábado de 8:30am a 6:00pm.',
  },
  {
    label: '🏢 Soporte & Asesoría de Redes',
    businessName: 'Soluciones Tecnológicas & Redes',
    context:
      'Empresa especializada en soporte de infraestructura de redes, cableado estructurado, configuración de servidores MikroTik y consultoría corporativa. Presupuestos y diagnósticos sin costo.',
  },
];

function getDefaultSessionName(existing: string[]): string {
  let base = 'bot-wifi';
  if (!existing.includes(base)) return base;
  let counter = 2;
  while (existing.includes(`${base}-${counter}`)) {
    counter++;
  }
  return `${base}-${counter}`;
}

// Help tooltip component
function HelpTip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="help-tip-badge"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(!show)}
      title="Haz clic para ver explicación"
    >
      <HelpCircle size={15} />
      {show && (
        <div className="help-tip-dropdown">
          <p>{text}</p>
        </div>
      )}
    </span>
  );
}

// Wizard steps definition (6 focused steps - no simulated testing during creation)
const WIZARD_STEPS = [
  { id: 1, key: 'general', title: 'Identidad', subtitle: 'Nombre & Permisos', icon: Bot },
  { id: 2, key: 'multirole', title: 'Roles del Bot', subtitle: 'Seleccionar Roles & Menú', icon: Layers },
  { id: 3, key: 'business', title: 'Empresa', subtitle: 'Planes & Respuestas', icon: FileText },
  { id: 4, key: 'knowledge', title: 'Archivos & URLs', subtitle: 'Precios y PDFs', icon: Layers },
  { id: 5, key: 'flow', title: 'Automatización', subtitle: 'Flujo & Plantillas', icon: Workflow },
  { id: 6, key: 'settings', title: 'Motor & Finalizar', subtitle: 'LLM, Horarios y Resumen', icon: Clock },
];

const WIZARD_STEPS_LEN = WIZARD_STEPS.length;

export function CreateSessionModal({
  isOpen,
  onClose,
  existingSessionNames,
  onSessionCreated,
  isCreating,
}: CreateSessionModalProps) {
  const [creationMode, setCreationMode] = useState<'quick' | 'advanced'>('quick');
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionName, setSessionName] = useState(() => getDefaultSessionName(existingSessionNames));
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sub-tab for Step 5 (Automation)
  const [automationSubTab, setAutomationSubTab] = useState<'triggers' | 'canvas'>('triggers');

  // AI Configuration state
  const [enableAi, setEnableAi] = useState(true);
  const [autoPilot, setAutoPilot] = useState(true);
  const [selectedRole] = useState<AiRoleType>('support');
  const [customRoleName] = useState('');
  const [customRolePrompt] = useState('');
  const [businessName, setBusinessName] = useState('WiFi Solution Pro');
  const [businessContext, setBusinessContext] = useState(
    'Proveedor de internet por fibra óptica simétrica. Planes de 50Mbps ($25), 100Mbps ($35) y 200Mbps ($50). Métodos de pago: Pago Móvil, Transferencias y Efectivo. Instalación rápida y soporte prioritario.',
  );
  const [multiRole, setMultiRole] = useState<MultiRoleConfig>(() => getDefaultMultiRoleConfig('WiFi Solution Pro'));
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [urls, setUrls] = useState<KnowledgeUrl[]>([]);
  const [templateTriggers, setTemplateTriggers] = useState<TemplateTriggerMapping[]>(() => getDefaultTemplateTriggers('support'));
  const [llmConfig, setLlmConfig] = useState<LlmConfig>(getGlobalLlmConfig);
  const [schedule, setSchedule] = useState({ ...DEFAULT_SCHEDULE });

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
    setMultiRole(getDefaultMultiRoleConfig(tpl.businessName));
  };

  const handleSubmit = async () => {
    let targetName = sessionName.trim().toLowerCase();
    if (!targetName) {
      targetName = getDefaultSessionName(existingSessionNames);
      setSessionName(targetName);
    }

    if (!canCreateSession(targetName, existingSessionNames)) {
      if (creationMode === 'advanced') {
        setCurrentStep(1);
      }
      return;
    }

    if (isCreating) return;

    // Save session AI configuration if AI is enabled or in advanced mode
    if (creationMode === 'advanced') {
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
        multiRole,
        documents,
        urls,
        templateTriggers,
        llmConfig,
        schedule,
        updatedAt: new Date().toISOString(),
      };
      saveSessionAiConfig(aiConfig);
    }

    await onSessionCreated(targetName);
  };

  const nextStep = () => {
    if (currentStep === 1 && !isValidName) return;
    if (currentStep < WIZARD_STEPS_LEN) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal create-session-modal-unified ${isFullscreen ? 'is-fullscreen' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header wizard-modal-header">
          <div className="modal-title-with-badge">
            <div className="modal-header-icon-box">
              <Bot size={22} />
            </div>
            <div>
              <h2>Crear Nueva Sesión de WhatsApp</h2>
              <span className="modal-subtitle">
                Vincula tu número escaneando el código QR o personaliza las funciones de tu Bot
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

        {/* MODE SELECTOR (Quick / Advanced) */}
        <div style={{ padding: '0.75rem 1.5rem 0', background: 'var(--bg-light, #f8fafc)' }}>
          <div className="creation-mode-switcher">
            <button
              type="button"
              className={`mode-switcher-btn ${creationMode === 'quick' ? 'active' : ''}`}
              onClick={() => setCreationMode('quick')}
            >
              <Zap size={16} />
              Creación Rápida (Sencillo)
            </button>
            <button
              type="button"
              className={`mode-switcher-btn ${creationMode === 'advanced' ? 'active' : ''}`}
              onClick={() => setCreationMode('advanced')}
            >
              <Sliders size={16} />
              Configuración Avanzada (IA, Roles y Flujos)
            </button>
          </div>
        </div>

        {/* QUICK CREATION VIEW */}
        {creationMode === 'quick' ? (
          <div className="modal-body create-session-modal-body" style={{ overflowY: 'auto' }}>
            <div className="quick-create-container">
              <div className="quick-create-card animate-fade-in">
                <div className="quick-create-icon-badge">
                  <Bot size={34} />
                </div>
                <h3>Crear Sesión Directa</h3>
                <p className="quick-create-desc">
                  Solo ingresa el nombre de tu bot o línea. Al hacer clic se creará la sesión y podrás escanear el código QR directamente sin configuraciones complejas.
                </p>

                <div className="form-group-unified" style={{ width: '100%', maxWidth: '460px', marginTop: '1rem', textAlign: 'left' }}>
                  <div className="field-label-row">
                    <label htmlFor="quick-session-name" style={{ fontWeight: 600 }}>
                      Nombre del Bot / Sesión: <span className="req-star">*</span>
                    </label>
                    <HelpTip text="Nombre interno para identificar esta línea (ej. bot-wifi, ventas-1, soporte-norte). Usa solo minúsculas, números y guiones." />
                  </div>
                  <input
                    id="quick-session-name"
                    type="text"
                    required
                    placeholder="ej. bot-wifi, ventas, soporte"
                    value={sessionName}
                    onChange={e => {
                      const clean = e.target.value.toLowerCase().replace(/\s+/g, '-');
                      setSessionName(clean);
                    }}
                    autoFocus
                    className={`wizard-large-input is-required ${nameIssues.length > 0 ? 'input-has-error' : ''}`}
                  />
                  <p className="input-hint" style={{ marginTop: '6px' }}>
                    💡 Formato: solo letras minúsculas, números y guiones.
                  </p>
                  {nameIssues.includes('format') && (
                    <p className="input-error-msg">⚠️ Solo se permiten letras minúsculas, números y guiones.</p>
                  )}
                  {nameIssues.includes('too-long') && (
                    <p className="input-error-msg">⚠️ El nombre de la sesión no puede superar los 32 caracteres.</p>
                  )}
                  {nameIssues.includes('duplicate') && (
                    <p className="input-error-msg">⚠️ Ya existe una sesión activa o guardada con este nombre.</p>
                  )}
                </div>

                <div style={{ marginTop: '2.5rem', display: 'flex', gap: '12px' }}>
                  <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '0.75rem 1.5rem' }}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn-primary btn-finish-bot"
                    onClick={handleSubmit}
                    disabled={!isValidName || isCreating}
                    style={{ padding: '0.75rem 2rem', fontSize: '0.95rem' }}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Creando Sesión...
                      </>
                    ) : (
                      <>
                        <Check size={18} />
                        Crear Sesión y Generar QR
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ADVANCED CREATION WIZARD */
          <>
            {/* STEPPER PROGRESS BAR & TABS */}
            <div className="wizard-stepper-container">
              <div className="wizard-steps-list">
                {WIZARD_STEPS.map(step => {
                  const StepIcon = step.icon;
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;

                  return (
                    <button
                      key={step.id}
                      type="button"
                      className={`wizard-step-tab ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                      onClick={() => setCurrentStep(step.id)}
                    >
                      <div className="step-tab-icon-wrap">
                        {isCompleted ? <CheckCircle2 size={18} className="step-check-icon" /> : <StepIcon size={16} />}
                      </div>
                      <div className="step-tab-text">
                        <span className="step-tab-num">Paso {step.id}</span>
                        <span className="step-tab-title">{step.title}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Body */}
            <div className="modal-body create-session-modal-body">
              {/* STEP 1: IDENTIDAD & CONEXIÓN */}
              {currentStep === 1 && (
                <div className="wizard-step-content animate-fade-in">
                  <div className="step-intro-banner">
                    <Info size={20} className="step-intro-icon" />
                    <div className="step-intro-text">
                      <h4>Paso 1: Nombre de la Sesión y Permisos del Bot</h4>
                      <p>
                        Asigna un identificador único para tu cuenta de WhatsApp (ej. <code>bot-ventas</code>). Al finalizar la
                        creación se generará el código QR para vincular el número desde tu teléfono.
                      </p>
                    </div>
                  </div>

                  <div className="wizard-card-section">
                    <div className="form-group-unified">
                      <div className="field-label-row">
                        <label htmlFor="wizard-session-name">
                          1. Identificador de la Sesión de WhatsApp: <span className="req-star">*</span>
                        </label>
                        <HelpTip text="Nombre interno para reconocer esta línea en el panel. Usa solo letras minúsculas, números y guiones. Ejemplo: soporte-fibra o bot-ventas-1." />
                      </div>
                      <input
                        id="wizard-session-name"
                        type="text"
                        required
                        placeholder="ej. bot-wifi, ventas-norte, soporte-cliente"
                        value={sessionName}
                        onChange={e => {
                          const clean = e.target.value.toLowerCase().replace(/\s+/g, '-');
                          setSessionName(clean);
                        }}
                        autoFocus
                        className={`wizard-large-input is-required ${nameIssues.length > 0 ? 'input-has-error' : ''}`}
                      />
                      <p className="input-hint">
                        💡 Formato permitido: minúsculas, números y guiones. <em>(Sin espacios ni caracteres especiales)</em>
                      </p>
                      {nameIssues.includes('format') && (
                        <p className="input-error-msg">⚠️ Solo se permiten letras minúsculas, números y guiones.</p>
                      )}
                      {nameIssues.includes('too-long') && (
                        <p className="input-error-msg">⚠️ El nombre de la sesión no puede superar los 32 caracteres.</p>
                      )}
                      {nameIssues.includes('duplicate') && (
                        <p className="input-error-msg">⚠️ Ya existe una sesión activa o guardada con este nombre.</p>
                      )}
                    </div>

                    <div className="wizard-toggles-grid">
                      <div className={`wizard-toggle-box ${enableAi ? 'active' : ''}`}>
                        <div className="toggle-box-header">
                          <div className="toggle-box-info">
                            <span className="toggle-box-title">🤖 Activar Asistente de IA</span>
                            <span className="toggle-box-desc">
                              Permite que la Inteligencia Artificial procese y entienda las consultas de los clientes.
                            </span>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={enableAi}
                              onChange={e => setEnableAi(e.target.checked)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                      </div>

                      {enableAi && (
                        <div className={`wizard-toggle-box ${autoPilot ? 'active' : ''}`}>
                          <div className="toggle-box-header">
                            <div className="toggle-box-info">
                              <span className="toggle-box-title">⚡ Piloto Automático (Auto-Responder)</span>
                              <span className="toggle-box-desc">
                                Envía respuestas automáticamente a WhatsApp en tiempo real sin intervención humana.
                              </span>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={autoPilot}
                                onChange={e => setAutoPilot(e.target.checked)}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: MULTI-ROL & MENU DE OPCIONES */}
              {currentStep === 2 && (
                <div className="wizard-step-content animate-fade-in">
                  <MultiRoleManager
                    config={multiRole}
                    onChange={setMultiRole}
                    businessName={businessName}
                  />
                </div>
              )}

              {/* STEP 3: EMPRESA & RESPUESTAS */}
              {currentStep === 3 && (
                <div className="wizard-step-content animate-fade-in">
                  <div className="step-intro-banner">
                    <FileText size={20} className="step-intro-icon" />
                    <div className="step-intro-text">
                      <h4>Paso 3: Información de tu Empresa y Base de Respuestas</h4>
                      <p>
                        Escribe los detalles de tus planes, precios, promociones y métodos de pago. La IA consultará estos
                        datos para responder con precisión a los clientes.
                      </p>
                    </div>
                  </div>

                  <div className="quick-templates-box">
                    <div className="quick-templates-title-row">
                      <span className="quick-templates-title">⚡ Plantillas rápidas de ejemplo con 1 clic:</span>
                      <HelpTip text="Haz clic en una de estas opciones para cargar automáticamente una base de conocimiento estándar según tu tipo de negocio." />
                    </div>
                    <div className="quick-templates-row">
                      {TEMPLATES.map((tpl, i) => (
                        <button key={i} type="button" className="btn-template-pill" onClick={() => applyTemplate(tpl)}>
                          {tpl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="wizard-card-section">
                    <div className="form-group-unified">
                      <div className="field-label-row">
                        <label htmlFor="wizard-business-name">Nombre de la Empresa o Marca:</label>
                        <HelpTip text="El nombre comercial que la IA usará para presentarse y referirse a la compañía." />
                      </div>
                      <input
                        id="wizard-business-name"
                        type="text"
                        placeholder="ej. WiFi Solution Pro"
                        value={businessName}
                        onChange={e => {
                          setBusinessName(e.target.value);
                          setMultiRole(prev => ({ ...prev, businessName: e.target.value }));
                        }}
                        className="wizard-large-input"
                      />
                    </div>

                    <div className="form-group-unified">
                      <div className="field-label-row">
                        <label htmlFor="wizard-business-context">Base de Conocimientos / Planes / Precios:</label>
                        <HelpTip text="Detalla todo lo que el bot debe saber: precios, velocidades, horarios, cuentas de banco, teléfonos de emergencia, etc." />
                      </div>
                      <textarea
                        id="wizard-business-context"
                        rows={6}
                        placeholder="Escribe la información detallada de tus servicios..."
                        value={businessContext}
                        onChange={e => setBusinessContext(e.target.value)}
                        className="wizard-textarea"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: ARCHIVOS & URLS */}
              {currentStep === 4 && (
                <div className="wizard-step-content animate-fade-in">
                  <div className="step-intro-banner">
                    <Layers size={20} className="step-intro-icon" />
                    <div className="step-intro-text">
                      <h4>Paso 4: Documentos PDF, Catálogos y Enlaces Web</h4>
                      <p>
                        Adjunta archivos de texto, PDFs de precios o enlaces a tu sitio web. La IA extraerá la información
                        relevante para responder dudas técnicas o comerciales.
                      </p>
                    </div>
                  </div>

                  <KnowledgeManager
                    documents={documents}
                    urls={urls}
                    onDocumentsChange={setDocuments}
                    onUrlsChange={setUrls}
                  />
                </div>
              )}

              {/* STEP 5: AUTOMATIZACION & PLANTILLAS */}
              {currentStep === 5 && (
                <div className="wizard-step-content animate-fade-in">
                  <div className="step-intro-banner">
                    <Workflow size={20} className="step-intro-icon" />
                    <div className="step-intro-text">
                      <h4>Paso 5: Automatización de Flujos y Plantillas Oficiales</h4>
                      <p>
                        Configura disparadores automáticos para enviar plantillas pre-aprobadas de WhatsApp (Meta) o diseña el
                        flujo visual de interacción con el cliente.
                      </p>
                    </div>
                  </div>

                  <div className="automation-subtabs-nav">
                    <button
                      type="button"
                      className={`automation-subtab-btn ${automationSubTab === 'triggers' ? 'active' : ''}`}
                      onClick={() => setAutomationSubTab('triggers')}
                    >
                      <Layers size={16} /> Disparadores de Plantillas Meta
                    </button>
                    <button
                      type="button"
                      className={`automation-subtab-btn ${automationSubTab === 'canvas' ? 'active' : ''}`}
                      onClick={() => setAutomationSubTab('canvas')}
                    >
                      <Workflow size={16} /> Diseñador de Flujos (Canvas)
                    </button>
                  </div>

                  {automationSubTab === 'triggers' && (
                    <TemplateAffiliationManager
                      triggers={templateTriggers}
                      onChange={setTemplateTriggers}
                      currentRole={selectedRole}
                      businessName={businessName}
                      sessionId={currentEffectiveName}
                    />
                  )}

                  {automationSubTab === 'canvas' && (
                    <WorkflowCanvas
                      config={{
                        chatId: '*',
                        sessionId: currentEffectiveName,
                        enabled: enableAi,
                        autoPilot,
                        role: selectedRole,
                        customRoleName,
                        customRolePrompt,
                        businessName,
                        businessContext,
                        multiRole,
                        documents,
                        urls,
                        templateTriggers,
                        llmConfig,
                        schedule,
                        updatedAt: new Date().toISOString(),
                      }}
                      onChange={newCfg => {
                        if (newCfg.templateTriggers) setTemplateTriggers(newCfg.templateTriggers);
                      }}
                      sessionId={currentEffectiveName}
                    />
                  )}
                </div>
              )}

              {/* STEP 6: MOTOR LLM, HORARIOS & RESUMEN FINAL */}
              {currentStep === 6 && (
                <div className="wizard-step-content animate-fade-in">
                  <div className="step-intro-banner">
                    <Clock size={20} className="step-intro-icon" />
                    <div className="step-intro-text">
                      <h4>Paso 6: Motor LLM, Horarios y Resumen</h4>
                      <p>
                        Ajusta el proveedor de IA, los horarios de atención y revisa la configuración general antes de crear tu sesión.
                      </p>
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="wizard-summary-card" style={{ marginBottom: '1.5rem' }}>
                    <div className="summary-item">
                      <span className="summary-label">📱 Nombre de Sesión:</span>
                      <span className="summary-val"><code>{currentEffectiveName}</code></span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">🎭 Modo Multi-Rol:</span>
                      <span className="summary-val">{multiRole.enabled ? `⚡ ${multiRole.departments.filter(d => d.enabled).length} Roles Asociados (Menú activo)` : 'Desactivado'}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">🏢 Empresa:</span>
                      <span className="summary-val">{businessName}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">🧠 Motor LLM:</span>
                      <span className="summary-val">{llmConfig.provider.toUpperCase()} ({llmConfig.model})</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">📋 Plantillas Meta:</span>
                      <span className="summary-val">{templateTriggers.filter(t => t.enabled).length} disparadores activos</span>
                    </div>
                  </div>

                  {/* LLM Engine Settings */}
                  <div className="wizard-card-section" style={{ marginBottom: '1.25rem' }}>
                    <div className="section-title-with-help">
                      <Cpu size={18} className="sec-icon" />
                      <h3>Motor de Inteligencia Artificial (LLM)</h3>
                      <HelpTip text="Selecciona qué proveedor de IA procesará los mensajes y ajusta la creatividad (temperatura) y memoria de la conversación." />
                    </div>
                    <LlmSettingsManager config={llmConfig} onChange={setLlmConfig} />
                  </div>

                  {/* Schedules */}
                  <div className="wizard-card-section">
                    <div className="section-title-with-help">
                      <Clock size={18} className="sec-icon" />
                      <h3>Horarios de Atención y Mensaje Fuera de Horario</h3>
                      <HelpTip text="Define los días y horas en que el bot atenderá activamente. Fuera de ese rango responderá con el mensaje configurado." />
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
                          className="wizard-time-input"
                        />
                      </div>
                      <div className="form-group-unified">
                        <label htmlFor="schedule-end-time">Hora de fin:</label>
                        <input
                          id="schedule-end-time"
                          type="time"
                          value={schedule.endHour}
                          onChange={e => setSchedule(s => ({ ...s, endHour: e.target.value }))}
                          className="wizard-time-input"
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
                        placeholder="Mensaje que se enviará automáticamente si un cliente escribe fuera del horario de atención..."
                        className="wizard-textarea"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Stepper Controls */}
            <div className="modal-footer wizard-modal-footer">
              <div className="wizard-footer-left">
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Cancelar
                </button>
                {currentStep > 1 && (
                  <button type="button" className="btn-secondary wizard-nav-btn" onClick={prevStep}>
                    <ArrowLeft size={16} /> Anterior
                  </button>
                )}
              </div>

              <div className="wizard-footer-right">
                {currentStep < WIZARD_STEPS_LEN ? (
                  <button
                    type="button"
                    className="btn-primary wizard-nav-btn"
                    onClick={nextStep}
                    disabled={currentStep === 1 && !isValidName}
                  >
                    Siguiente <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-primary btn-finish-bot"
                    onClick={handleSubmit}
                    disabled={!isValidName || isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Creando Sesión...
                      </>
                    ) : (
                      <>
                        <Check size={18} />
                        Crear Sesión & Bot
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CreateSessionModal;
