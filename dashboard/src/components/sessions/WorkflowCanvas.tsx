import { useState } from 'react';
import {
  GitFork,
  Bot,
  FileText,
  MessageSquare,
  Play,
  CheckCircle2,
  Clock,
  Sparkles,
  Database,
  Link,
  Plus,
  Trash2,
  Send,
  Zap,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import {
  type ChatAiConfig,
  type KnowledgeDocument,
  type KnowledgeUrl,
  AI_ROLES,
  generateAiChatResponse,
  findMatchingTemplateTrigger,
  getDefaultTemplateTriggers,
} from '../../services/aiAssistant';
import { useTemplatesQuery } from '../../hooks/queries';
import { TemplateAffiliationManager } from './TemplateAffiliationManager';
import './WorkflowCanvas.css';

export interface WorkflowCanvasProps {
  config: ChatAiConfig;
  onChange: (newConfig: ChatAiConfig) => void;
  sessionId: string;
}

export type RoutingMode = 'hybrid' | 'ai_first' | 'template_first';

export interface FlowExecutionStep {
  nodeId: string;
  nodeName: string;
  status: 'pending' | 'active' | 'completed' | 'skipped';
  summary: string;
  data?: any;
}

export function WorkflowCanvas({ config, onChange, sessionId }: WorkflowCanvasProps) {
  const [routingMode, setRoutingMode] = useState<RoutingMode>('hybrid');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-router');
  const [inspectorTab, setInspectorTab] = useState<'simulator' | 'triggers' | 'knowledge' | 'node'>('simulator');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [testMessage, setTestMessage] = useState<string>('Hola, ¿qué precio tienen los planes de internet de 100 megas?');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionSteps, setExecutionSteps] = useState<FlowExecutionStep[]>([]);
  const [finalOutput, setFinalOutput] = useState<string | null>(null);
  const [newDocName, setNewDocName] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [newUrlLink, setNewUrlLink] = useState('');
  const [newUrlTitle, setNewUrlTitle] = useState('');

  // Fetch templates for this session
  const { data: templates = [] } = useTemplatesQuery(sessionId, !!sessionId);

  const roleDef = AI_ROLES[config.role] || AI_ROLES.support;
  const roleName = config.role === 'custom' && config.customRoleName?.trim() ? config.customRoleName.trim() : roleDef.name;
  const docs = config.documents || [];
  const urls = config.urls || [];

  // Handle adding documents directly from the flow canvas
  const handleAddQuickDocument = () => {
    if (!newDocName.trim() || !newDocContent.trim()) return;
    const newDoc: KnowledgeDocument = {
      id: `doc_${Date.now()}`,
      name: newDocName.trim(),
      size: newDocContent.length,
      type: 'text/plain',
      uploadedAt: new Date().toISOString(),
      isPriceList: /precio|tarifa|plan|costo/i.test(newDocName + ' ' + newDocContent),
      content: newDocContent.trim(),
    };
    onChange({
      ...config,
      documents: [...docs, newDoc],
    });
    setNewDocName('');
    setNewDocContent('');
  };

  // Handle adding URLs directly from the flow canvas
  const handleAddQuickUrl = () => {
    if (!newUrlLink.trim()) return;
    const newU: KnowledgeUrl = {
      id: `url_${Date.now()}`,
      url: newUrlLink.trim(),
      title: newUrlTitle.trim() || newUrlLink.trim(),
      content: 'Contenido y catálogo indexado desde enlace web.',
      addedAt: new Date().toISOString(),
    };
    onChange({
      ...config,
      urls: [...urls, newU],
    });
    setNewUrlLink('');
    setNewUrlTitle('');
  };

  const handleRemoveDoc = (id: string) => {
    onChange({
      ...config,
      documents: docs.filter(d => d.id !== id),
    });
  };

  const handleRemoveUrl = (id: string) => {
    onChange({
      ...config,
      urls: urls.filter(u => u.id !== id),
    });
  };

  // Node click handler with inspector auto-switch
  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    if (nodeId === 'node-knowledge') {
      setInspectorTab('knowledge');
    } else {
      setInspectorTab('node');
    }
  };

  // Run a real-time n8n-style workflow execution simulation
  const handleRunFlowSimulation = async () => {
    if (!testMessage.trim()) return;
    setIsExecuting(true);
    setFinalOutput(null);
    setInspectorTab('simulator');

    const steps: FlowExecutionStep[] = [
      {
        nodeId: 'node-trigger',
        nodeName: '1. WhatsApp Incoming Message',
        status: 'pending',
        summary: `Mensaje recibido: "${testMessage}"`,
      },
      {
        nodeId: 'node-router',
        nodeName: '2. Clasificador & Enrutador',
        status: 'pending',
        summary: 'Analizando intención y coincidencia de palabras clave...',
      },
      {
        nodeId: 'node-knowledge',
        nodeName: '3. Extracción RAG & Documentos',
        status: 'pending',
        summary: `Consultando ${docs.length} documentos y ${urls.length} URLs...`,
      },
      {
        nodeId: 'node-ai',
        nodeName: `4. Invocación LLM (${config.llmConfig?.provider?.toUpperCase() || 'CHATGPT'})`,
        status: 'pending',
        summary: `Generando respuesta con rol ${roleName}...`,
      },
      {
        nodeId: 'node-output',
        nodeName: '5. Gateway de Salida WhatsApp',
        status: 'pending',
        summary: 'Envío de respuesta al cliente.',
      },
    ];

    setExecutionSteps([...steps]);

    // Step 1: Trigger
    await new Promise(r => setTimeout(r, 350));
    steps[0].status = 'completed';
    setExecutionSteps([...steps]);

    // Step 2: Router Decision
    await new Promise(r => setTimeout(r, 450));
    steps[1].status = 'active';
    setExecutionSteps([...steps]);

    const triggers = config.templateTriggers && config.templateTriggers.length > 0
      ? config.templateTriggers
      : getDefaultTemplateTriggers(config.role);

    const matchedTrigger = findMatchingTemplateTrigger(testMessage, triggers, undefined, config);

    if (matchedTrigger) {
      steps[1].summary = `🎯 Coincidencia con Trigger: "${matchedTrigger.trigger.name}" -> Plantilla: "${matchedTrigger.trigger.templateName}"`;
    } else {
      steps[1].summary = `Pregunta consultiva general detectada. Enrutando hacia Motor IA con RAG.`;
    }
    steps[1].status = 'completed';
    setExecutionSteps([...steps]);

    // Step 3: Knowledge Base
    await new Promise(r => setTimeout(r, 400));
    steps[2].status = 'active';
    setExecutionSteps([...steps]);

    if (matchedTrigger && matchedTrigger.trigger.action === 'send_template') {
      steps[2].summary = `⚡ Despacho Oficial Directo: Omitiendo consulta a fuentes RAG para entrega instantánea.`;
    } else {
      const relevantDocs = docs.filter(d =>
        d.isPriceList || /precio|tarifa|plan|soporte/i.test(d.name + ' ' + d.content),
      );
      steps[2].summary = `Recuperados ${relevantDocs.length} documentos relevantes y contexto de "${config.businessName}".`;
    }
    steps[2].status = 'completed';
    setExecutionSteps([...steps]);

    // Step 4: AI Response Generation
    await new Promise(r => setTimeout(r, 500));
    steps[3].status = 'active';
    setExecutionSteps([...steps]);

    let responseText = '';
    try {
      responseText = await generateAiChatResponse(
        [{ body: testMessage, fromMe: false }],
        config,
      );
    } catch {
      responseText = matchedTrigger
        ? matchedTrigger.formattedText
        : `Hola, como asesor de ${roleName} en ${config.businessName}, te informo que tenemos planes de fibra óptica de alta velocidad ideales para tu hogar o empresa. ¿Te gustaría conocer los precios?`;
    }

    if (matchedTrigger && matchedTrigger.trigger.action === 'send_template') {
      steps[3].summary = `📦 Plantilla oficial renderizada con cabecera ${matchedTrigger.trigger.headerType.toUpperCase()} y variables dinámicas resueltas.`;
    } else {
      steps[3].summary = `Respuesta IA generada (${responseText.length} caracteres) respetando rol ${roleName}.`;
    }
    steps[3].status = 'completed';
    setExecutionSteps([...steps]);

    // Step 5: Output
    await new Promise(r => setTimeout(r, 300));
    steps[4].status = 'completed';
    steps[4].summary = `🚀 Despachado al cliente vía WhatsApp Gateway con ${matchedTrigger?.trigger.buttons?.length || 0} botones interactivos.`;
    setExecutionSteps([...steps]);

    setFinalOutput(responseText);
    setIsExecuting(false);
  };

  return (
    <div className="workflow-studio-container">
      {/* Studio Top Navigation Bar */}
      <div className="workflow-studio-header">
        <div className="header-left">
          <div className="header-icon-box">
            <Zap size={20} />
          </div>
          <div>
            <div className="header-title-row">
              <h4>Pipeline Visual de Decisiones (n8n Studio)</h4>
              <span className="live-badge">🟢 En Vivo</span>
            </div>
            <p className="header-subtitle">
              Configura el flujo automatizado: bifurcación entre Plantillas Oficiales de Meta e IA Multimodal con Base de Conocimiento.
            </p>
          </div>
        </div>

        {/* Strategy Pills */}
        <div className="header-strategy-selector">
          <span className="strategy-label">Estrategia:</span>
          <div className="strategy-buttons">
            <button
              type="button"
              className={`strat-btn ${routingMode === 'hybrid' ? 'active' : ''}`}
              onClick={() => setRoutingMode('hybrid')}
              title="Usa IA para responder fluidamente citando plantillas y precios de documentos"
            >
              ⚡ Híbrido Inteligente
            </button>
            <button
              type="button"
              className={`strat-btn ${routingMode === 'template_first' ? 'active' : ''}`}
              onClick={() => setRoutingMode('template_first')}
              title="Intenta enviar plantilla de Meta primero; si no coincide invoca a la IA"
            >
              📑 Plantilla Primero
            </button>
            <button
              type="button"
              className={`strat-btn ${routingMode === 'ai_first' ? 'active' : ''}`}
              onClick={() => setRoutingMode('ai_first')}
              title="100% IA Generativa con RAG y documentos"
            >
              🧠 100% IA LLM
            </button>
          </div>
        </div>
      </div>

      {/* Studio Main Workspace: Canvas (Left) + Inspector Drawer (Right) */}
      <div className="workflow-studio-body">
        {/* Visual Interactive Canvas Viewport */}
        <div className="workflow-canvas-viewport">
          {/* Canvas Toolbar overlay */}
          <div className="canvas-floating-toolbar">
            <button
              type="button"
              className="canvas-tool-btn"
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.1, 1.3))}
              title="Acercar (Zoom In)"
            >
              <ZoomIn size={16} />
            </button>
            <span className="zoom-text">{Math.round(zoomLevel * 100)}%</span>
            <button
              type="button"
              className="canvas-tool-btn"
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.1, 0.75))}
              title="Alejar (Zoom Out)"
            >
              <ZoomOut size={16} />
            </button>
            <button
              type="button"
              className="canvas-tool-btn"
              onClick={() => setZoomLevel(1)}
              title="Restablecer Vista"
            >
              <RotateCcw size={15} />
            </button>
            <div className="toolbar-separator" />
            <button
              type="button"
              className="btn-quick-run-flow"
              onClick={handleRunFlowSimulation}
              disabled={isExecuting}
            >
              <Play size={14} />
              {isExecuting ? 'Ejecutando...' : 'Probar Flujo'}
            </button>
          </div>

          {/* Canvas Interactive Grid Container */}
          <div
            className="canvas-interactive-area"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
          >
            {/* SVG Connecting Cables */}
            <svg className="flow-svg-connections" width="100%" height="100%">
              <defs>
                <linearGradient id="cableGradGreen" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
                <linearGradient id="cableGradBlueLeft" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
                <linearGradient id="cableGradBlueRight" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>

              {/* Wire 1: Trigger to Router */}
              <path
                d="M 400 112 L 400 158"
                className={`svg-wire ${isExecuting ? 'active-pulse' : ''}`}
                stroke="url(#cableGradGreen)"
              />

              {/* Wire 2: Router to Template Node (Left Branch) */}
              <path
                d="M 340 258 C 340 288, 200 288, 200 320"
                className={`svg-wire ${isExecuting && routingMode === 'template_first' ? 'active-pulse' : ''}`}
                stroke="url(#cableGradBlueLeft)"
              />

              {/* Wire 3: Router to AI Node (Right Branch) */}
              <path
                d="M 460 258 C 460 288, 610 288, 610 320"
                className={`svg-wire ${isExecuting && routingMode !== 'template_first' ? 'active-pulse' : ''}`}
                stroke="url(#cableGradBlueRight)"
              />

              {/* Wire 4: Template Node to Output */}
              <path
                d="M 200 440 C 200 490, 340 505, 360 535"
                className="svg-wire"
                stroke="#f59e0b"
                strokeDasharray="4 4"
              />

              {/* Wire 5: AI Node to Output */}
              <path
                d="M 610 500 C 610 520, 440 515, 440 535"
                className="svg-wire"
                stroke="#a855f7"
                strokeDasharray="4 4"
              />
            </svg>

            {/* NODE 1: WhatsApp Trigger */}
            <div
              className={`studio-node trigger-node ${selectedNodeId === 'node-trigger' ? 'is-selected' : ''}`}
              style={{ left: '260px', top: '15px', width: '280px' }}
              onClick={() => handleSelectNode('node-trigger')}
            >
              <div className="node-port port-top" />
              <div className="node-badge-tag green">⚡ EVENTO DISPARADOR</div>
              <div className="node-main-header">
                <div className="node-icon-wrapper green">
                  <MessageSquare size={18} />
                </div>
                <div className="node-header-text">
                  <h5>Mensaje Entrante</h5>
                  <span className="node-tech-label">WhatsApp Cloud Webhook</span>
                </div>
              </div>
              <div className="node-content-summary">
                <div className="summary-pill">
                  <span className="dot green" /> Auto-Pilot: {config.autoPilot ? 'Activo' : 'Manual'}
                </div>
                <div className="summary-pill">
                  <span>📱 {sessionId || 'Sesión Principal'}</span>
                </div>
              </div>
              <div className="node-port port-bottom" />
            </div>

            {/* NODE 2: Decision Logic & Router */}
            <div
              className={`studio-node router-node ${selectedNodeId === 'node-router' ? 'is-selected' : ''}`}
              style={{ left: '250px', top: '160px', width: '300px' }}
              onClick={() => handleSelectNode('node-router')}
            >
              <div className="node-port port-top" />
              <div className="node-badge-tag blue">🔀 ENRUTADOR INTELIGENTE</div>
              <div className="node-main-header">
                <div className="node-icon-wrapper blue">
                  <GitFork size={18} />
                </div>
                <div className="node-header-text">
                  <h5>Clasificador de Intención</h5>
                  <span className="node-tech-label">¿Plantilla Oficial o IA LLM?</span>
                </div>
              </div>
              <div className="node-content-summary">
                <div className="summary-pill">
                  <span>Modo: {routingMode === 'hybrid' ? '⚡ Híbrido' : routingMode === 'template_first' ? '📑 Plantilla' : '🧠 100% IA'}</span>
                </div>
                <div className="summary-pill">
                  <Clock size={12} /> {config.schedule?.enabled ? 'Horario Comercial' : '24/7 Activo'}
                </div>
              </div>
              <div className="node-port port-bottom-left" title="Salida Rama Plantillas" />
              <div className="node-port port-bottom-right" title="Salida Rama IA" />
            </div>

            {/* BRANCH A (Left): Meta WhatsApp Templates */}
            <div
              className={`studio-node template-node ${selectedNodeId === 'node-templates' ? 'is-selected' : ''}`}
              style={{ left: '60px', top: '320px', width: '280px' }}
              onClick={() => handleSelectNode('node-templates')}
            >
              <div className="node-port port-top" />
              <div className="node-badge-tag amber">📑 RESPUESTA OFICIAL META</div>
              <div className="node-main-header">
                <div className="node-icon-wrapper amber">
                  <FileText size={18} />
                </div>
                <div className="node-header-text">
                  <h5>Plantillas WhatsApp</h5>
                  <span className="node-tech-label">Avisos y Formatos Aprobados</span>
                </div>
              </div>
              <div className="node-content-summary">
                <div className="summary-pill">
                  <span>📋 {templates.length} plantillas activas</span>
                </div>
                <div className="summary-pill">
                  <span>🖼️ Botones & Multimedia</span>
                </div>
              </div>
              <div className="node-port port-bottom" />
            </div>

            {/* BRANCH B (Right): Generative AI Engine + Knowledge Subnode */}
            <div
              className={`studio-node ai-node ${selectedNodeId === 'node-ai' ? 'is-selected' : ''}`}
              style={{ left: '460px', top: '290px', width: '300px' }}
              onClick={() => handleSelectNode('node-ai')}
            >
              <div className="node-port port-top" />
              <div className="node-badge-tag purple">🧠 MOTOR IA MULTIMODAL</div>
              <div className="node-main-header">
                <div className="node-icon-wrapper purple">
                  <Bot size={18} />
                </div>
                <div className="node-header-text">
                  <h5>IA {config.llmConfig?.provider?.toUpperCase() || 'CHATGPT'}</h5>
                  <span className="node-tech-label">Rol: {roleName}</span>
                </div>
              </div>
              <div className="node-content-summary">
                <div className="summary-pill">
                  <Sparkles size={12} /> Modelo: {config.llmConfig?.model || 'gpt-4o-mini'}
                </div>
                <div className="summary-pill">
                  <span>🌡️ Temp: {config.llmConfig?.temperature || 0.7}</span>
                </div>
              </div>

              {/* Sub-node attached: RAG Knowledge base */}
              <div
                className={`knowledge-subcard ${selectedNodeId === 'node-knowledge' ? 'is-active-sub' : ''}`}
                onClick={e => {
                  e.stopPropagation();
                  handleSelectNode('node-knowledge');
                }}
              >
                <div className="subcard-header">
                  <Database size={14} />
                  <span>Base de Conocimientos (RAG)</span>
                </div>
                <div className="subcard-tags">
                  <span className="k-tag">📄 {docs.length} Documentos / Precios</span>
                  <span className="k-tag">🌐 {urls.length} URLs Web</span>
                </div>
              </div>

              <div className="node-port port-bottom" />
            </div>

            {/* NODE 5: WhatsApp Output Gateway */}
            <div
              className={`studio-node output-node ${selectedNodeId === 'node-output' ? 'is-selected' : ''}`}
              style={{ left: '260px', top: '510px', width: '280px' }}
              onClick={() => handleSelectNode('node-output')}
            >
              <div className="node-port port-top" />
              <div className="node-badge-tag teal">🚀 SALIDA WHATSAPP</div>
              <div className="node-main-header">
                <div className="node-icon-wrapper teal">
                  <Send size={18} />
                </div>
                <div className="node-header-text">
                  <h5>Despacho al Cliente</h5>
                  <span className="node-tech-label">API Gateway & Memoria</span>
                </div>
              </div>
              <div className="node-content-summary">
                <div className="summary-pill">
                  <CheckCircle2 size={12} /> Entrega garantizada
                </div>
                <div className="summary-pill">
                  <span>💬 Historial de chat actualizado</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Studio Right Inspector Drawer (Tabbed) */}
        <div className="workflow-studio-inspector">
          {/* Inspector Tabs */}
          <div className="inspector-tabs-nav">
            <button
              type="button"
              className={`insp-tab-btn ${inspectorTab === 'simulator' ? 'active' : ''}`}
              onClick={() => setInspectorTab('simulator')}
            >
              <Play size={14} /> Simulador en Vivo
            </button>
            <button
              type="button"
              className={`insp-tab-btn ${inspectorTab === 'triggers' ? 'active' : ''}`}
              onClick={() => setInspectorTab('triggers')}
            >
              <Zap size={14} /> Plantillas Afiliadas ({config.templateTriggers?.filter(t => t.enabled).length || 5})
            </button>
            <button
              type="button"
              className={`insp-tab-btn ${inspectorTab === 'knowledge' ? 'active' : ''}`}
              onClick={() => setInspectorTab('knowledge')}
            >
              <Database size={14} /> Fuentes RAG ({docs.length + urls.length})
            </button>
            <button
              type="button"
              className={`insp-tab-btn ${inspectorTab === 'node' ? 'active' : ''}`}
              onClick={() => setInspectorTab('node')}
            >
              <Sliders size={14} /> Propiedades Nodo
            </button>
          </div>

          {/* TAB: PLANTILLAS AFILIADAS */}
          {inspectorTab === 'triggers' && (
            <div className="inspector-panel-content">
              <TemplateAffiliationManager
                triggers={config.templateTriggers || getDefaultTemplateTriggers(config.role)}
                onChange={newTrigs => onChange({ ...config, templateTriggers: newTrigs })}
                currentRole={config.role}
                businessName={config.businessName}
                sessionId={sessionId}
              />
            </div>
          )}

          {/* TAB 1: LIVE SIMULATOR */}
          {inspectorTab === 'simulator' && (
            <div className="inspector-panel-content">
              <div className="inspector-title-box">
                <div className="title-row">
                  <Play size={16} className="title-icon green" />
                  <h4>Simulador Interactivo de Flujo</h4>
                </div>
                <p>
                  Escribe un mensaje de cliente para probar el flujo de ejecución completo en tiempo real.
                </p>
              </div>

              {/* Test Input */}
              <div className="simulator-input-card">
                <label className="input-label">Mensaje de Prueba del Cliente:</label>
                <textarea
                  className="test-textarea"
                  rows={3}
                  value={testMessage}
                  onChange={e => setTestMessage(e.target.value)}
                  placeholder="Escribe una consulta de prueba..."
                />
                <div className="quick-prompts-row">
                  <button
                    type="button"
                    className="quick-chip"
                    onClick={() => setTestMessage('Hola buenas tardes')}
                  >
                    👋 Saludo
                  </button>
                  <button
                    type="button"
                    className="quick-chip"
                    onClick={() => setTestMessage('Hola, ¿cuánto debo de mi mensualidad?')}
                  >
                    💳 Consulta Saldo
                  </button>
                  <button
                    type="button"
                    className="quick-chip"
                    onClick={() => setTestMessage('¿Qué planes y precios tienen disponibles?')}
                  >
                    🚀 Planes Fibra
                  </button>
                  <button
                    type="button"
                    className="quick-chip"
                    onClick={() => setTestMessage('No tengo internet y la luz LOS está roja')}
                  >
                    🔧 Soporte / Fallas
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-run-simulation"
                  onClick={handleRunFlowSimulation}
                  disabled={isExecuting || !testMessage.trim()}
                >
                  <Play size={16} />
                  {isExecuting ? 'Simulando ejecución...' : 'Simular Flujo Completo'}
                </button>
              </div>

              {/* Execution Steps Trace */}
              {executionSteps.length > 0 && (
                <div className="execution-trace-card">
                  <h5>Trazabilidad de Nodos:</h5>
                  <div className="steps-list">
                    {executionSteps.map(s => (
                      <div key={s.nodeId} className={`trace-step-item status-${s.status}`}>
                        <div className="step-indicator">
                          {s.status === 'completed' ? (
                            <CheckCircle2 size={16} className="text-success" />
                          ) : s.status === 'active' ? (
                            <span className="step-spinner" />
                          ) : (
                            <span className="step-dot" />
                          )}
                        </div>
                        <div className="step-text">
                          <span className="step-title">{s.nodeName}</span>
                          <span className="step-desc">{s.summary}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* WhatsApp Response Bubble */}
              {finalOutput && (
                <div className="final-whatsapp-card">
                  <div className="bubble-header">
                    <span className="bubble-from">WhatsApp Bot ({roleName}):</span>
                    <span className="bubble-time">Ahora</span>
                  </div>
                  <div className="whatsapp-bubble-box">
                    <p>{finalOutput}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: KNOWLEDGE BASE (RAG) */}
          {inspectorTab === 'knowledge' && (
            <div className="inspector-panel-content">
              <div className="inspector-title-box">
                <div className="title-row">
                  <Database size={16} className="title-icon amber" />
                  <h4>Base de Conocimiento Indexada</h4>
                </div>
                <p>
                  Adjunta documentos de precios, catálogos o enlaces web que el motor de IA consultará antes de responder.
                </p>
              </div>

              {/* Add document card */}
              <div className="quick-add-card">
                <h6>📄 Adjuntar Documento o Lista de Precios</h6>
                <input
                  type="text"
                  className="card-input"
                  placeholder="Título (ej. Planes_Fibra_Optica_2026.txt)"
                  value={newDocName}
                  onChange={e => setNewDocName(e.target.value)}
                />
                <textarea
                  className="card-input"
                  placeholder="Pega aquí los precios, políticas, manuales o especificaciones técnicas..."
                  rows={3}
                  value={newDocContent}
                  onChange={e => setNewDocContent(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-add-source"
                  onClick={handleAddQuickDocument}
                  disabled={!newDocName.trim() || !newDocContent.trim()}
                >
                  <Plus size={14} /> Guardar Documento en el Flujo
                </button>
              </div>

              {/* Add URL card */}
              <div className="quick-add-card">
                <h6>🌐 Indexar Página Web / Catálogo Online</h6>
                <input
                  type="text"
                  className="card-input"
                  placeholder="Título (ej. Página Oficial de Tarifas)"
                  value={newUrlTitle}
                  onChange={e => setNewUrlTitle(e.target.value)}
                />
                <input
                  type="text"
                  className="card-input"
                  placeholder="URL (https://tusitio.com/precios)"
                  value={newUrlLink}
                  onChange={e => setNewUrlLink(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-add-source"
                  onClick={handleAddQuickUrl}
                  disabled={!newUrlLink.trim()}
                >
                  <Link size={14} /> Indexar URL en el Flujo
                </button>
              </div>

              {/* Active list */}
              <div className="active-sources-container">
                <h6>Fuentes Activas ({docs.length + urls.length}):</h6>
                {docs.length === 0 && urls.length === 0 && (
                  <p className="empty-sources-msg">No hay fuentes adjuntas todavía. Agrega una arriba para potenciar las respuestas de la IA.</p>
                )}
                {docs.map(d => (
                  <div key={d.id} className="active-source-row">
                    <div className="source-info">
                      <span className="source-title">📄 {d.name}</span>
                      <span className="source-meta">
                        {d.isPriceList ? '🏷️ [LISTA DE PRECIOS]' : 'Documento'} • {(d.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-trash-source"
                      onClick={() => handleRemoveDoc(d.id)}
                      title="Eliminar documento"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {urls.map(u => (
                  <div key={u.id} className="active-source-row">
                    <div className="source-info">
                      <span className="source-title">🌐 {u.title || u.url}</span>
                      <span className="source-meta">{u.url}</span>
                    </div>
                    <button
                      type="button"
                      className="btn-trash-source"
                      onClick={() => handleRemoveUrl(u.id)}
                      title="Eliminar URL"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: NODE PROPERTIES */}
          {inspectorTab === 'node' && (
            <div className="inspector-panel-content">
              {selectedNodeId === 'node-trigger' && (
                <div className="node-props-block">
                  <div className="inspector-title-box">
                    <div className="title-row">
                      <MessageSquare size={16} className="title-icon green" />
                      <h4>Nodo: Disparador WhatsApp</h4>
                    </div>
                    <p>Captura todos los eventos y mensajes entrantes desde la API de WhatsApp.</p>
                  </div>
                  <div className="prop-field">
                    <span className="prop-label">ID de Sesión:</span>
                    <span className="prop-value">{sessionId || 'Sesión en Creación'}</span>
                  </div>
                  <div className="prop-field">
                    <span className="prop-label">Estado de Piloto Automático:</span>
                    <span className="prop-value">{config.autoPilot ? '🟢 Encendido (Responde Automático)' : '⚪ Manual'}</span>
                  </div>
                  <div className="prop-field">
                    <span className="prop-label">Webhook URL:</span>
                    <span className="prop-value font-mono">/api/webhooks/whatsapp</span>
                  </div>
                </div>
              )}

              {selectedNodeId === 'node-router' && (
                <div className="node-props-block">
                  <div className="inspector-title-box">
                    <div className="title-row">
                      <GitFork size={16} className="title-icon blue" />
                      <h4>Nodo: Enrutador Inteligente</h4>
                    </div>
                    <p>Clasifica la intención del cliente para decidir si despacha una Plantilla de Meta o invoca a la IA.</p>
                  </div>

                  <div className="rule-card">
                    <span className="rule-badge">Regla 1: Plantillas Oficiales</span>
                    <p>Si el usuario solicita información estructurada o avisos formales, selecciona la plantilla de Meta correspondiente.</p>
                  </div>

                  <div className="rule-card">
                    <span className="rule-badge">Regla 2: Preguntas y Dudas Abiertas</span>
                    <p>Si el cliente hace preguntas abiertas o consultas sobre planes, invoca al motor de IA con los documentos de precios adjuntos.</p>
                  </div>

                  <div className="rule-card">
                    <span className="rule-badge">Regla 3: Fuera de Horario</span>
                    <p>Si está fuera del horario comercial, envía el mensaje de aviso o plantilla de fuera de horario configurada.</p>
                  </div>
                </div>
              )}

              {selectedNodeId === 'node-templates' && (
                <div className="node-props-block">
                  <div className="inspector-title-box">
                    <div className="title-row">
                      <FileText size={16} className="title-icon amber" />
                      <h4>Nodo: Plantillas Oficiales Meta</h4>
                    </div>
                    <p>Plantillas multimedia sincronizadas directamente con WhatsApp Cloud API.</p>
                  </div>
                  <div className="templates-mini-list">
                    {templates.length === 0 ? (
                      <p className="empty-sources-msg">No hay plantillas creadas todavía. Puedes crearlas en el menú Plantillas.</p>
                    ) : (
                      templates.map(t => (
                        <div key={t.id} className="template-mini-row">
                          <span className="t-name">📑 {t.name}</span>
                          <span className="t-status">{(t as any).status || 'APPROVED'}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {selectedNodeId === 'node-ai' && (
                <div className="node-props-block">
                  <div className="inspector-title-box">
                    <div className="title-row">
                      <Bot size={16} className="title-icon purple" />
                      <h4>Nodo: Motor IA ({config.llmConfig?.provider?.toUpperCase() || 'CHATGPT'})</h4>
                    </div>
                    <p>Genera respuestas inteligentes basadas en el rol asignado y la base de conocimiento.</p>
                  </div>
                  <div className="prop-field">
                    <span className="prop-label">Rol Activo:</span>
                    <span className="prop-value">{roleName}</span>
                  </div>
                  <div className="prop-field">
                    <span className="prop-label">Modelo:</span>
                    <span className="prop-value font-mono">{config.llmConfig?.model || 'gpt-4o-mini'}</span>
                  </div>
                  <div className="prop-field">
                    <span className="prop-label">Temperatura:</span>
                    <span className="prop-value">{config.llmConfig?.temperature || 0.7} (Equilibrio)</span>
                  </div>
                  <div className="prop-field">
                    <span className="prop-label">Empresa:</span>
                    <span className="prop-value">{config.businessName}</span>
                  </div>
                </div>
              )}

              {selectedNodeId === 'node-output' && (
                <div className="node-props-block">
                  <div className="inspector-title-box">
                    <div className="title-row">
                      <Send size={16} className="title-icon teal" />
                      <h4>Nodo: Despacho WhatsApp</h4>
                    </div>
                    <p>Envía la respuesta final formateada directamente a la conversación del cliente en WhatsApp.</p>
                  </div>
                  <div className="prop-field">
                    <span className="prop-label">Canal de Salida:</span>
                    <span className="prop-value">WhatsApp Cloud API</span>
                  </div>
                  <div className="prop-field">
                    <span className="prop-label">Memoria de Conversación:</span>
                    <span className="prop-value">🟢 Habilitada (Persiste contexto)</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
