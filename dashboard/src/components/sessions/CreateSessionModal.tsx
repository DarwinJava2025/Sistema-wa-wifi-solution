import { useState } from 'react';
import {
  Bot,
  Check,
  X,
  Loader2,
  Play,
  Wrench,
  ShoppingBag,
  Users,
  CreditCard,
  Edit3,
  Maximize2,
  Minimize2,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Layers,
  FileText,
  Clock,
  Cpu,
  Workflow,
  CheckCircle2,
  Info,
} from 'lucide-react';
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

const SAMPLE_PROMPTS_BY_ROLE: Record<AiRoleType, string[]> = {
  sales: [
    'Hola, ¿qué planes de internet tienen y cuánto cuestan?',
    '¿Tienen cobertura en mi zona y cuánto tarda la instalación?',
    'Quiero contratar el plan de 100 megas hoy mismo.',
  ],
  support: [
    'Hola, no tengo señal de internet y la luz PON de la ONT está parpadeando en rojo.',
    'El wifi está muy lento desde ayer, ¿cómo puedo reiniciar el router?',
    'Se fue la luz y ahora el equipo no conecta a internet.',
  ],
  customer_care: [
    'Hola, ¿dónde queda su oficina y en qué horario atienden?',
    'Buenas tardes, ¿cómo puedo hablar con un asesor humano?',
  ],
  billing: [
    'Hola, ¿a qué cuenta puedo transferir o hacer pago móvil del mes?',
    'Ya realicé el pago del servicio, ¿cómo reporto el comprobante para reactivar?',
  ],
  custom: [
    'Hola, necesito información detallada sobre sus servicios.',
    '¿Qué opciones de contratación tienen disponibles?',
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

// Wizard steps definition
const WIZARD_STEPS = [
  { id: 1, key: 'general', title: 'Identidad', subtitle: 'Nombre & Permisos', icon: Bot },
  { id: 2, key: 'role', title: 'Rol & Estilo', subtitle: 'Comportamiento IA', icon: Sparkles },
  { id: 3, key: 'business', title: 'Empresa', subtitle: 'Planes & Respuestas', icon: FileText },
  { id: 4, key: 'knowledge', title: 'Archivos & URLs', subtitle: 'Precios y PDFs', icon: Layers },
  { id: 5, key: 'flow', title: 'Automatización', subtitle: 'Flujo & Plantillas', icon: Workflow },
  { id: 6, key: 'settings', title: 'Motor & Horarios', subtitle: 'LLM y Disponibilidad', icon: Clock },
  { id: 7, key: 'test', title: 'Simulador', subtitle: 'Probar y Finalizar', icon: Play },
];

const WIZARD_STEPS_LEN = WIZARD_STEPS.length;

export function CreateSessionModal({
  isOpen,
  onClose,
  existingSessionNames,
  onSessionCreated,
  isCreating,
}: CreateSessionModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionName, setSessionName] = useState(() => getDefaultSessionName(existingSessionNames));
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sub-tab for Step 5 (Automation)
  const [automationSubTab, setAutomationSubTab] = useState<'triggers' | 'canvas'>('triggers');

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
  const [testQuery, setTestQuery] = useState('Hola, ¿qué planes de internet tienen y cuánto cuestan?');
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
      setCurrentStep(1);
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
        return <Wrench size={22} />;
      case 'sales':
        return <ShoppingBag size={22} />;
      case 'customer_care':
        return <Users size={22} />;
      case 'billing':
        return <CreditCard size={22} />;
      case 'custom':
        return <Edit3 size={22} />;
    }
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
              <h2>Asistente de Creación: Sesión & Bot IA</h2>
              <span className="modal-subtitle">
                Paso a paso guiado para configurar tu línea de WhatsApp inteligente en minutos
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
                    placeholder="ej. bot-wifi, ventas-norte, soporte-cliente"
                    value={sessionName}
                    onChange={e => {
                      const clean = e.target.value.toLowerCase().replace(/\s+/g, '-');
                      setSessionName(clean);
                    }}
                    autoFocus
                    className={`wizard-large-input ${nameIssues.length > 0 ? 'input-has-error' : ''}`}
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

          {/* STEP 2: ROL & PERSONALIDAD */}
          {currentStep === 2 && (
            <div className="wizard-step-content animate-fade-in">
              <div className="step-intro-banner">
                <Sparkles size={20} className="step-intro-icon" />
                <div className="step-intro-text">
                  <h4>Paso 2: Rol y Objetivo de la Inteligencia Artificial</h4>
                  <p>
                    Selecciona el perfil de atención del bot. Cada rol viene optimizado con un prompt especializado para
                    cerrar ventas, guiar diagnósticos técnicos de internet o gestionar cobranzas.
                  </p>
                </div>
              </div>

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
                        <div className="role-card-icon-container">{getRoleIcon(roleKey)}</div>
                        <div className="role-card-title-group">
                          <span className="role-card-name">{r.name}</span>
                        </div>
                        <div className={`role-card-radio ${isSelected ? 'checked' : ''}`}>
                          {isSelected && <Check size={14} />}
                        </div>
                      </div>
                      <p className="role-card-description">{r.description}</p>
                      <div className="role-card-behavior-badge">
                        {roleKey === 'sales' && '🎯 Objetivo: Cotizar planes, velocidad y cerrar venta'}
                        {roleKey === 'support' && '🛠️ Objetivo: Diagnóstico de fibra, luces ONT y soporte'}
                        {roleKey === 'billing' && '💳 Objetivo: Métodos de pago, bancos y reactivación'}
                        {roleKey === 'customer_care' && '🤝 Objetivo: Información, ubicación y cordialidad'}
                        {roleKey === 'custom' && '✏️ Rol con instrucciones 100% a tu medida'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedRole === 'custom' && (
                <div className="custom-role-panel">
                  <h4 className="custom-role-heading">
                    <Edit3 size={16} /> Configuración de Rol Personalizado
                    <HelpTip text="Escribe las instrucciones exactas que debe seguir el bot al conversar con los usuarios." />
                  </h4>
                  <div className="form-group-unified">
                    <label htmlFor="custom-role-name">Nombre del Rol que adoptará la IA:</label>
                    <input
                      id="custom-role-name"
                      type="text"
                      placeholder="ej. Agente de Renovaciones VIP, Consultor Técnico Senior"
                      value={customRoleName}
                      onChange={e => setCustomRoleName(e.target.value)}
                    />
                  </div>
                  <div className="form-group-unified">
                    <label htmlFor="custom-role-prompt">Prompt / Directivas de Comportamiento:</label>
                    <textarea
                      id="custom-role-prompt"
                      rows={4}
                      placeholder="Escribe aquí las directivas que debe seguir la IA (ej. Sé breve, solicita el número de contrato, ofrece 10% de descuento en planes anuales)..."
                      value={customRolePrompt}
                      onChange={e => setCustomRolePrompt(e.target.value)}
                    />
                  </div>
                </div>
              )}
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
                    datos para responder con precisión médica a los clientes.
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
                    onChange={e => setBusinessName(e.target.value)}
                    className="wizard-large-input"
                  />
                </div>

                <div className="form-group-unified">
                  <div className="field-label-row">
                    <label htmlFor="wizard-business-context">
                      Base de Conocimiento Principal (Planes, Precios, Cobertura, FAQs):
                    </label>
                    <HelpTip text="Detalla aquí tus planes de megas, tarifas mensuales, bancos para pagar, costo de instalación, tiempos de espera y preguntas frecuentes." />
                  </div>
                  <textarea
                    id="wizard-business-context"
                    rows={8}
                    placeholder="Escribe los planes de internet, precios, métodos de pago, horarios, promociones y políticas del servicio..."
                    value={businessContext}
                    onChange={e => setBusinessContext(e.target.value)}
                    className="wizard-textarea"
                  />
                  <span className="field-subtext">
                    💡 Consejo: Cuanto más claros sean tus precios y condiciones, más precisas y comerciales serán las
                    respuestas de la IA.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: ARCHIVOS, PRECIOS & URLS */}
          {currentStep === 4 && (
            <div className="wizard-step-content animate-fade-in">
              <div className="step-intro-banner">
                <Layers size={20} className="step-intro-icon" />
                <div className="step-intro-text">
                  <h4>Paso 4: Archivos de Precios, Catálogos PDF y Enlaces Web</h4>
                  <p>
                    Puedes adjuntar archivos PDF, catálogos, hojas de tarifas o URLs de tu sitio web para que la IA extraiga
                    conocimiento complementario automáticamente.
                  </p>
                </div>
              </div>

              <div className="wizard-card-section">
                <KnowledgeManager
                  documents={documents}
                  urls={urls}
                  onDocumentsChange={setDocuments}
                  onUrlsChange={setUrls}
                />
              </div>
            </div>
          )}

          {/* STEP 5: AUTOMATIZACIÓN & PLANTILLAS */}
          {currentStep === 5 && (
            <div className="wizard-step-content animate-fade-in">
              <div className="step-intro-banner">
                <Workflow size={20} className="step-intro-icon" />
                <div className="step-intro-text">
                  <h4>Paso 5: Automatización de Flujos y Plantillas Oficiales de WhatsApp</h4>
                  <p>
                    Configura disparadores automáticos mediante palabras clave para enviar plantillas estructuradas de Meta
                    o diseña bifurcaciones visuales en el canvas de decisiones.
                  </p>
                </div>
              </div>

              {/* Sub-nav tabs */}
              <div className="automation-subnav-tabs">
                <button
                  type="button"
                  className={`subnav-tab-btn ${automationSubTab === 'triggers' ? 'active' : ''}`}
                  onClick={() => setAutomationSubTab('triggers')}
                >
                  📋 Afiliar Plantillas ({templateTriggers.filter(t => t.enabled).length} activas)
                </button>
                <button
                  type="button"
                  className={`subnav-tab-btn ${automationSubTab === 'canvas' ? 'active' : ''}`}
                  onClick={() => setAutomationSubTab('canvas')}
                >
                  ⚡ Flujo Visual de Decisiones (n8n Studio)
                </button>
              </div>

              <div className="wizard-card-section">
                {automationSubTab === 'triggers' ? (
                  <TemplateAffiliationManager
                    triggers={templateTriggers}
                    onChange={setTemplateTriggers}
                    currentRole={selectedRole}
                    businessName={businessName}
                    sessionId={sessionName || 'nueva_sesion'}
                  />
                ) : (
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
              </div>
            </div>
          )}

          {/* STEP 6: MOTOR LLM & HORARIOS */}
          {currentStep === 6 && (
            <div className="wizard-step-content animate-fade-in">
              <div className="step-intro-banner">
                <Clock size={20} className="step-intro-icon" />
                <div className="step-intro-text">
                  <h4>Paso 6: Configuración del Motor LLM y Horarios de Atención</h4>
                  <p>
                    Ajusta el modelo de Inteligencia Artificial (OpenAI, Groq, Claude), la memoria conversacional y los días
                    y horas de atención con mensaje automático fuera de horario.
                  </p>
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

          {/* STEP 7: SIMULADOR & FINALIZAR */}
          {currentStep === 7 && (
            <div className="wizard-step-content animate-fade-in">
              <div className="step-intro-banner">
                <Play size={20} className="step-intro-icon" />
                <div className="step-intro-text">
                  <h4>Paso 7: Simulador en Vivo y Confirmación</h4>
                  <p>
                    Prueba cómo responderá tu bot a preguntas reales de clientes antes de activarlo. Si todo está en orden,
                    haz clic en <strong>"Crear Sesión & Bot"</strong> para generar tu bot y vincular WhatsApp.
                  </p>
                </div>
              </div>

              {/* Quick Summary Card */}
              <div className="wizard-summary-card">
                <div className="summary-item">
                  <span className="summary-label">📱 Nombre de Sesión:</span>
                  <span className="summary-val"><code>{currentEffectiveName}</code></span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">🎭 Rol Seleccionado:</span>
                  <span className="summary-val">{selectedRole === 'custom' && customRoleName ? customRoleName : AI_ROLES[selectedRole].name}</span>
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

              <div className="wizard-card-section">
                <h3 className="section-heading">Probar Consultas de Clientes en Vivo</h3>

                <div className="sample-prompts-container">
                  <span className="sample-prompts-label">Preguntas sugeridas según tu rol:</span>
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
                    className="wizard-large-input"
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
                      <div className="test-output-header">
                        {matched ? (
                          <span className="test-output-badge template">
                            🎯 Plantilla Disparada: {matched.trigger.name} ({matched.trigger.templateName})
                          </span>
                        ) : (
                          <span className="test-output-badge ai">
                            🧠 Motor IA LLM ({selectedRole === 'custom' && customRoleName ? customRoleName : AI_ROLES[selectedRole].name})
                          </span>
                        )}
                      </div>
                      <p className="test-output-text">{testResponse}</p>
                    </div>
                  );
                })()}
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
      </div>
    </div>
  );
}

export default CreateSessionModal;
