import { useState } from 'react';
import {
  GitFork,
  Bot,
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
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  Layers,
  Hash,
  Share2,
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
  const [zoomLevel, setZoomLevel] = useState<number>(0.95);
  const [testMessage, setTestMessage] = useState<string>('Hola, ¿qué precio tienen los planes de internet de 100 megas?');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionSteps, setExecutionSteps] = useState<FlowExecutionStep[]>([]);
  const [finalOutput, setFinalOutput] = useState<string | null>(null);
  const [activeSimulatedBranch, setActiveSimulatedBranch] = useState<string | null>(null);
  const [newDocName, setNewDocName] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [newUrlLink, setNewUrlLink] = useState('');
  const [newUrlTitle, setNewUrlTitle] = useState('');

  const roleDef = AI_ROLES[config.role] || AI_ROLES.support;
  const roleName = config.role === 'custom' && config.customRoleName?.trim() ? config.customRoleName.trim() : roleDef.name;
  const docs = config.documents || [];
  const urls = config.urls || [];
  const activeTriggers = config.templateTriggers && config.templateTriggers.length > 0
    ? config.templateTriggers
    : getDefaultTemplateTriggers(config.role);

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
    } else if (nodeId.startsWith('node-branch-') || nodeId === 'node-templates') {
      setInspectorTab('triggers');
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

    const matchedTrigger = findMatchingTemplateTrigger(testMessage, activeTriggers, undefined, config);
    const branchKey = (matchedTrigger && matchedTrigger.trigger.roleAffiliation && matchedTrigger.trigger.roleAffiliation !== 'all')
      ? matchedTrigger.trigger.roleAffiliation
      : config.role || 'support';
    setActiveSimulatedBranch(`branch-${branchKey}`);

    const steps: FlowExecutionStep[] = [
      {
        nodeId: 'node-trigger',
        nodeName: '1. Evento WhatsApp (Mensaje / Botón)',
        status: 'pending',
        summary: `Entrada capturada: "${testMessage}"`,
      },
      {
        nodeId: 'node-router',
        nodeName: '2. Enrutador & Clasificador de Rol',
        status: 'pending',
        summary: 'Analizando intención y departamento destino...',
      },
      {
        nodeId: `node-branch-${branchKey}`,
        nodeName: `3. Rama Departamento: ${branchKey.toUpperCase()}`,
        status: 'pending',
        summary: matchedTrigger
          ? `Mapeado a Plantilla #${matchedTrigger.trigger.templateNumber || '100'} ("${matchedTrigger.trigger.name}")`
          : `Consulta libre enrutada al Rol ${AI_ROLES[branchKey as keyof typeof AI_ROLES]?.name || branchKey}`,
      },
      {
        nodeId: 'node-decision-mode',
        nodeName: `4. Decisión: ${matchedTrigger?.trigger.action === 'send_template' ? 'Solo Plantilla Meta' : matchedTrigger?.trigger.action === 'pure_ai' ? 'Solo IA LLM' : 'Híbrido IA + Plantilla'}`,
        status: 'pending',
        summary: 'Resolviendo variables y consultando Base de Conocimiento RAG...',
      },
      {
        nodeId: 'node-output',
        nodeName: '5. Gateway de Salida con Botones Interactivos',
        status: 'pending',
        summary: 'Formateo y despacho de mensaje y botones WhatsApp.',
      },
    ];

    setExecutionSteps([...steps]);

    // Step 1: Trigger
    await new Promise(r => setTimeout(r, 300));
    steps[0].status = 'completed';
    setExecutionSteps([...steps]);

    // Step 2: Router Decision
    await new Promise(r => setTimeout(r, 400));
    steps[1].status = 'active';
    setExecutionSteps([...steps]);

    if (matchedTrigger) {
      steps[1].summary = `🎯 Coincidencia por palabra clave: Rol [${matchedTrigger.trigger.roleAffiliation || 'General'}] → Plantilla #${matchedTrigger.trigger.templateNumber || '101'}`;
    } else {
      steps[1].summary = `Pregunta general consultiva → Asignada a Rol por defecto [${roleName}] con soporte RAG.`;
    }
    steps[1].status = 'completed';
    setExecutionSteps([...steps]);

    // Step 3: Department Branch Execution
    await new Promise(r => setTimeout(r, 350));
    steps[2].status = 'completed';
    setExecutionSteps([...steps]);

    // Step 4: Decision & Generation
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
      steps[3].summary = `⚡ Despacho Exacto Meta: Plantilla #${matchedTrigger.trigger.templateNumber || '101'} renderizada sin alteraciones.`;
    } else if (matchedTrigger && matchedTrigger.trigger.action === 'ai_hybrid') {
      steps[3].summary = `⚡ Híbrido IA: Plantilla #${matchedTrigger.trigger.templateNumber || '101'} enriquecida con información de documentos.`;
    } else {
      steps[3].summary = `🧠 100% IA LLM: Respuesta generada (${responseText.length} caracteres) con rol ${roleName}.`;
    }
    steps[3].status = 'completed';
    setExecutionSteps([...steps]);

    // Step 5: Output
    await new Promise(r => setTimeout(r, 300));
    steps[4].status = 'completed';
    steps[4].summary = `🚀 Despachado al cliente vía WhatsApp Gateway con ${matchedTrigger?.trigger.buttons?.length || 3} botones interactivos.`;
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
            <Share2 size={20} />
          </div>
          <div>
            <div className="header-title-row">
              <h4>Pipeline Visual de Decisiones (n8n Studio)</h4>
              <span className="live-badge">🟢 En Vivo</span>
            </div>
            <p className="header-subtitle">
              Orquesta el flujo visual: Enrutamiento por Departamento, Plantillas Numeradas (#101, #102...) y Decisión Plantilla Meta vs IA.
            </p>
          </div>
        </div>

        {/* Strategy Selector */}
        <div className="header-strategy-selector">
          <span className="strategy-label">Estrategia Global:</span>
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
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.1, 0.6))}
              title="Alejar (Zoom Out)"
            >
              <ZoomOut size={16} />
            </button>
            <button
              type="button"
              className="canvas-tool-btn"
              onClick={() => setZoomLevel(0.95)}
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
              {isExecuting ? 'Ejecutando Flujo...' : 'Probar Flujo'}
            </button>
          </div>

          {/* Canvas Interactive Grid Container */}
          <div
            className="canvas-interactive-area n8n-canvas-wide"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
          >
            {/* SVG Connecting Cables */}
            <svg className="flow-svg-connections" width="100%" height="100%">
              <defs>
                <linearGradient id="cableTrigger" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
                <linearGradient id="cableBranchVentas" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <linearGradient id="cableBranchCobranzas" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
                <linearGradient id="cableBranchSoporte" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
                <linearGradient id="cableBranchAtencion" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>

              {/* Wire 1: Trigger -> Router */}
              <path
                d="M 450 90 L 450 140"
                className={`svg-wire ${isExecuting ? 'active-pulse' : ''}`}
                stroke="url(#cableTrigger)"
              />

              {/* Wire 2A: Router -> Ventas (#103) */}
              <path
                d="M 360 220 C 360 260, 120 260, 120 295"
                className={`svg-wire ${activeSimulatedBranch === 'branch-sales' ? 'active-pulse highlight-branch' : ''}`}
                stroke="url(#cableBranchVentas)"
              />

              {/* Wire 2B: Router -> Cobranzas (#102) */}
                <path
                d="M 420 220 C 420 260, 340 260, 340 295"
                className={`svg-wire ${activeSimulatedBranch === 'branch-billing' ? 'active-pulse highlight-branch' : ''}`}
                stroke="url(#cableBranchCobranzas)"
              />

              {/* Wire 2C: Router -> Soporte (#104) */}
              <path
                d="M 480 220 C 480 260, 560 260, 560 295"
                className={`svg-wire ${activeSimulatedBranch === 'branch-support' ? 'active-pulse highlight-branch' : ''}`}
                stroke="url(#cableBranchSoporte)"
              />

              {/* Wire 2D: Router -> Atención (#101) */}
              <path
                d="M 540 220 C 540 260, 780 260, 780 295"
                className={`svg-wire ${activeSimulatedBranch === 'branch-custom' ? 'active-pulse highlight-branch' : ''}`}
                stroke="url(#cableBranchAtencion)"
              />

              {/* Wires from Branches -> Decision Node */}
              <path
                d="M 120 405 C 120 450, 380 450, 420 480"
                className="svg-wire"
                stroke="#10b981"
                strokeDasharray="4 4"
              />
              <path
                d="M 340 405 C 340 445, 430 450, 440 480"
                className="svg-wire"
                stroke="#f59e0b"
                strokeDasharray="4 4"
              />
              <path
                d="M 560 405 C 560 445, 470 450, 460 480"
                className="svg-wire"
                stroke="#ef4444"
                strokeDasharray="4 4"
              />
              <path
                d="M 780 405 C 780 450, 520 450, 480 480"
                className="svg-wire"
                stroke="#8b5cf6"
                strokeDasharray="4 4"
              />

              {/* Wire: Decision Node -> Output */}
              <path
                d="M 450 580 L 450 625"
                className={`svg-wire ${isExecuting ? 'active-pulse' : ''}`}
                stroke="#14b8a6"
              />
            </svg>

            {/* NODE 1: WhatsApp Trigger */}
            <div
              className={`studio-node trigger-node ${selectedNodeId === 'node-trigger' ? 'is-selected' : ''}`}
              style={{ left: '310px', top: '10px', width: '280px' }}
              onClick={() => handleSelectNode('node-trigger')}
            >
              <div className="node-port port-top" />
              <div className="node-badge-tag green">⚡ 1. EVENTO DISPARADOR</div>
              <div className="node-main-header">
                <div className="node-icon-wrapper green">
                  <MessageSquare size={18} />
                </div>
                <div className="node-header-text">
                  <h5>WhatsApp Inbound</h5>
                  <span className="node-tech-label">Texto / Botón Interactivo</span>
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

            {/* NODE 2: Multi-Role Router */}
            <div
              className={`studio-node router-node ${selectedNodeId === 'node-router' ? 'is-selected' : ''}`}
              style={{ left: '290px', top: '140px', width: '320px' }}
              onClick={() => handleSelectNode('node-router')}
            >
              <div className="node-port port-top" />
              <div className="node-badge-tag blue">🔀 2. CLASIFICADOR MULTI-ROL</div>
              <div className="node-main-header">
                <div className="node-icon-wrapper blue">
                  <GitFork size={18} />
                </div>
                <div className="node-header-text">
                  <h5>Enrutador de Departamento</h5>
                  <span className="node-tech-label">Intención & Coincidencia de Reglas</span>
                </div>
              </div>
              <div className="node-content-summary">
                <div className="summary-pill">
                  <span>4 Departamentos Configurados</span>
                </div>
                <div className="summary-pill">
                  <Clock size={12} /> {config.schedule?.enabled ? 'Horario Comercial' : '24/7 Activo'}
                </div>
              </div>
              <div className="node-port port-bottom-left" />
              <div className="node-port port-bottom-right" />
            </div>

            {/* BRANCH 1: Ventas & Planes (#103) */}
            <div
              className={`studio-node branch-node branch-green ${selectedNodeId === 'node-branch-sales' ? 'is-selected' : ''} ${activeSimulatedBranch === 'branch-sales' ? 'branch-active-glow' : ''}`}
              style={{ left: '15px', top: '295px', width: '210px' }}
              onClick={() => handleSelectNode('node-branch-sales')}
            >
              <div className="node-port port-top" />
              <div className="node-badge-tag emerald">💼 VENTAS</div>
              <div className="node-main-header">
                <div className="node-header-text">
                  <div className="branch-title-row">
                    <span className="template-num-badge">#103</span>
                    <span className="branch-name">Planes Fibra</span>
                  </div>
                  <span className="node-tech-label">Modo Híbrido IA</span>
                </div>
              </div>
              <div className="node-content-summary mini">
                <div className="summary-pill">
                  <span>📄 Listas de Precios RAG</span>
                </div>
                <div className="summary-pill">
                  <span>🔘 Botón "Contratar"</span>
                </div>
              </div>
              <div className="node-port port-bottom" />
            </div>

            {/* BRANCH 2: Cobranzas & Facturación (#102) */}
            <div
              className={`studio-node branch-node branch-amber ${selectedNodeId === 'node-branch-billing' ? 'is-selected' : ''} ${activeSimulatedBranch === 'branch-billing' ? 'branch-active-glow' : ''}`}
              style={{ left: '235px', top: '295px', width: '210px' }}
              onClick={() => handleSelectNode('node-branch-billing')}
            >
              <div className="node-port port-top" />
              <div className="node-badge-tag amber">💳 COBRANZAS</div>
              <div className="node-main-header">
                <div className="node-header-text">
                  <div className="branch-title-row">
                    <span className="template-num-badge">#102</span>
                    <span className="branch-name">Saldo & Pagos</span>
                  </div>
                  <span className="node-tech-label">Plantilla Meta Directa</span>
                </div>
              </div>
              <div className="node-content-summary mini">
                <div className="summary-pill">
                  <span>🏦 Datos Bancarios & Link</span>
                </div>
                <div className="summary-pill">
                  <span>🔘 Botón "Enviar Comprobante"</span>
                </div>
              </div>
              <div className="node-port port-bottom" />
            </div>

            {/* BRANCH 3: Soporte Técnico (#104) */}
            <div
              className={`studio-node branch-node branch-red ${selectedNodeId === 'node-branch-support' ? 'is-selected' : ''} ${activeSimulatedBranch === 'branch-support' ? 'branch-active-glow' : ''}`}
              style={{ left: '455px', top: '295px', width: '210px' }}
              onClick={() => handleSelectNode('node-branch-support')}
            >
              <div className="node-port port-top" />
              <div className="node-badge-tag rose">🛠️ SOPORTE</div>
              <div className="node-main-header">
                <div className="node-header-text">
                  <div className="branch-title-row">
                    <span className="template-num-badge">#104</span>
                    <span className="branch-name">Diagnóstico ONT</span>
                  </div>
                  <span className="node-tech-label">Híbrido / Falla Red</span>
                </div>
              </div>
              <div className="node-content-summary mini">
                <div className="summary-pill">
                  <span>🔴 Verificación Luces PON/LOS</span>
                </div>
                <div className="summary-pill">
                  <span>🔘 Botón "Abrir Ticket"</span>
                </div>
              </div>
              <div className="node-port port-bottom" />
            </div>

            {/* BRANCH 4: Atención General (#101) */}
            <div
              className={`studio-node branch-node branch-purple ${selectedNodeId === 'node-branch-custom' ? 'is-selected' : ''} ${activeSimulatedBranch === 'branch-custom' ? 'branch-active-glow' : ''}`}
              style={{ left: '675px', top: '295px', width: '210px' }}
              onClick={() => handleSelectNode('node-branch-custom')}
            >
              <div className="node-port port-top" />
              <div className="node-badge-tag purple">🤝 ATENCIÓN</div>
              <div className="node-main-header">
                <div className="node-header-text">
                  <div className="branch-title-row">
                    <span className="template-num-badge">#101</span>
                    <span className="branch-name">Menú Principal</span>
                  </div>
                  <span className="node-tech-label">Plantilla / Encuesta</span>
                </div>
              </div>
              <div className="node-content-summary mini">
                <div className="summary-pill">
                  <span>👋 Saludo & Opciones</span>
                </div>
                <div className="summary-pill">
                  <span>🔘 Botones de Roles</span>
                </div>
              </div>
              <div className="node-port port-bottom" />
            </div>

            {/* NODE 4: Decision & Generation Matrix (Meta Templates vs AI Engine) */}
            <div
              className={`studio-node decision-node ${selectedNodeId === 'node-decision' ? 'is-selected' : ''}`}
              style={{ left: '260px', top: '480px', width: '380px' }}
              onClick={() => handleSelectNode('node-decision')}
            >
              <div className="node-port port-top" />
              <div className="node-badge-tag cyan">⚖️ 4. MATRIZ DE RESPUESTA & IA</div>
              <div className="node-main-header">
                <div className="node-icon-wrapper cyan">
                  <Sparkles size={18} />
                </div>
                <div className="node-header-text">
                  <h5>Bifurcador de Generación</h5>
                  <span className="node-tech-label">Plantilla Oficial Meta ⚡ Híbrido 🧠 Motor LLM</span>
                </div>
              </div>
              <div className="node-content-summary">
                <div className="summary-pill">
                  <Database size={12} /> {docs.length} Documentos RAG + {urls.length} URLs
                </div>
                <div className="summary-pill">
                  <Bot size={12} /> {config.llmConfig?.model || 'gpt-4o-mini'} ({config.llmConfig?.provider || 'ChatGPT'})
                </div>
              </div>
              <div className="node-port port-bottom" />
            </div>

            {/* NODE 5: WhatsApp Output Gateway */}
            <div
              className={`studio-node output-node ${selectedNodeId === 'node-output' ? 'is-selected' : ''}`}
              style={{ left: '300px', top: '625px', width: '300px' }}
              onClick={() => handleSelectNode('node-output')}
            >
              <div className="node-port port-top" />
              <div className="node-badge-tag teal">🚀 5. GATEWAY DE SALIDA WHATSAPP</div>
              <div className="node-main-header">
                <div className="node-icon-wrapper teal">
                  <Send size={18} />
                </div>
                <div className="node-header-text">
                  <h5>Despacho con Botones Interactivos</h5>
                  <span className="node-tech-label">WhatsApp Poll / Quick Reply Buttons</span>
                </div>
              </div>
              <div className="node-content-summary">
                <div className="summary-pill">
                  <CheckCircle2 size={12} /> Despacho Instantáneo
                </div>
                <div className="summary-pill">
                  <span>🔘 Botones de Elección Única</span>
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
              <Play size={14} /> Simulador
            </button>
            <button
              type="button"
              className={`insp-tab-btn ${inspectorTab === 'triggers' ? 'active' : ''}`}
              onClick={() => setInspectorTab('triggers')}
            >
              <Hash size={14} /> Plantillas #{activeTriggers.length}
            </button>
            <button
              type="button"
              className={`insp-tab-btn ${inspectorTab === 'knowledge' ? 'active' : ''}`}
              onClick={() => setInspectorTab('knowledge')}
            >
              <Database size={14} /> RAG ({docs.length + urls.length})
            </button>
            <button
              type="button"
              className={`insp-tab-btn ${inspectorTab === 'node' ? 'active' : ''}`}
              onClick={() => setInspectorTab('node')}
            >
              <Sliders size={14} /> Inspector
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
                  Prueba cómo el bot enruta cada consulta entre los roles, selecciona la plantilla numerada (#101, #102, #103, #104) o invoca a la IA.
                </p>
              </div>

              {/* Test Input */}
              <div className="simulator-input-card">
                <label className="input-label">Mensaje o Clic de Botón:</label>
                <textarea
                  className="test-textarea"
                  rows={3}
                  value={testMessage}
                  onChange={e => setTestMessage(e.target.value)}
                  placeholder="Escribe una consulta de prueba o simula clic de botón..."
                />
                <div className="quick-prompts-row">
                  <button
                    type="button"
                    className="quick-chip"
                    onClick={() => setTestMessage('Hola buenas tardes')}
                  >
                    👋 #101 Menú Principal
                  </button>
                  <button
                    type="button"
                    className="quick-chip"
                    onClick={() => setTestMessage('Hola, ¿cuánto debo de mi mensualidad?')}
                  >
                    💳 #102 Saldo & Pagos
                  </button>
                  <button
                    type="button"
                    className="quick-chip"
                    onClick={() => setTestMessage('¿Qué planes y precios tienen disponibles?')}
                  >
                    🚀 #103 Planes Fibra
                  </button>
                  <button
                    type="button"
                    className="quick-chip"
                    onClick={() => setTestMessage('No tengo internet y la luz LOS está roja')}
                  >
                    🔧 #104 Soporte Técnico
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-run-simulation"
                  onClick={handleRunFlowSimulation}
                  disabled={isExecuting || !testMessage.trim()}
                >
                  <Play size={16} />
                  {isExecuting ? 'Simulando ejecución en vivo...' : 'Ejecutar Simulación del Flujo'}
                </button>
              </div>

              {/* Execution Steps Trace */}
              {executionSteps.length > 0 && (
                <div className="execution-trace-card">
                  <h5>Trazabilidad de Nodos en Ejecución:</h5>
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
                    <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{finalOutput}</p>
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
                      <h4>Nodo: Clasificador Multi-Rol</h4>
                    </div>
                    <p>Enruta automáticamente entre departamentos y evalúa si despachar plantilla numerada o invocar a la IA.</p>
                  </div>

                  <div className="rule-card">
                    <span className="rule-badge">💼 Rama #103: Ventas</span>
                    <p>Palabras clave de planes, precios, contratar, cobertura → Dispara Asesor de Ventas o Plantilla #103.</p>
                  </div>

                  <div className="rule-card">
                    <span className="rule-badge">💳 Rama #102: Cobranzas</span>
                    <p>Palabras clave de pagar, saldo, factura, bancos → Dispara Plantilla Oficial Meta #102 de Estado de Cuenta.</p>
                  </div>

                  <div className="rule-card">
                    <span className="rule-badge">🛠️ Rama #104: Soporte Técnico</span>
                    <p>Palabras clave de sin internet, luz roja, caída, lentitud → Dispara Diagnóstico ONT #104.</p>
                  </div>

                  <div className="rule-card">
                    <span className="rule-badge">🤝 Rama #101: Menú Principal</span>
                    <p>Saludos o bienvenida → Despacha Menú con Botones de Selección #101.</p>
                  </div>
                </div>
              )}

              {selectedNodeId.startsWith('node-branch-') && (
                <div className="node-props-block">
                  <div className="inspector-title-box">
                    <div className="title-row">
                      <Layers size={16} className="title-icon purple" />
                      <h4>Nodo: Rama de Departamento</h4>
                    </div>
                    <p>Configura las plantillas numeradas y el comportamiento asignado a este rol.</p>
                  </div>
                  <div className="prop-field">
                    <span className="prop-label">Nodo ID:</span>
                    <span className="prop-value font-mono">{selectedNodeId}</span>
                  </div>
                  <div className="prop-field">
                    <span className="prop-label">Configuración Rápida:</span>
                    <button
                      type="button"
                      className="btn-add-source"
                      onClick={() => setInspectorTab('triggers')}
                    >
                      <Hash size={14} /> Administrar Plantillas Afiliadas
                    </button>
                  </div>
                </div>
              )}

              {selectedNodeId === 'node-decision' && (
                <div className="node-props-block">
                  <div className="inspector-title-box">
                    <div className="title-row">
                      <Sparkles size={16} className="title-icon cyan" />
                      <h4>Nodo: Matriz de Respuesta</h4>
                    </div>
                    <p>Define cómo se genera la respuesta final según el modo elegido en cada plantilla.</p>
                  </div>
                  <div className="prop-field">
                    <span className="prop-label">Modo Solo Plantilla:</span>
                    <span className="prop-value">Envío exacto del formato Meta/Local sin alterar texto</span>
                  </div>
                  <div className="prop-field">
                    <span className="prop-label">Modo Híbrido IA:</span>
                    <span className="prop-value">Estructura base enriquecida con datos dinámicos RAG</span>
                  </div>
                  <div className="prop-field">
                    <span className="prop-label">Modo Solo IA:</span>
                    <span className="prop-value">Generación adaptativa 100% por LLM ({config.llmConfig?.provider?.toUpperCase()})</span>
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
                    <p>Envía la respuesta final formateada directamente a la conversación del cliente en WhatsApp con botones interactivos.</p>
                  </div>
                  <div className="prop-field">
                    <span className="prop-label">Canal de Salida:</span>
                    <span className="prop-value">WhatsApp Cloud API Gateway</span>
                  </div>
                  <div className="prop-field">
                    <span className="prop-label">Formato Interactivo:</span>
                    <span className="prop-value">🟢 Encuestas WhatsApp de Opción Única (Compatibilidad 100%)</span>
                  </div>
                  <div className="prop-field">
                    <span className="prop-label">Memoria de Conversación:</span>
                    <span className="prop-value">🟢 Habilitada</span>
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

