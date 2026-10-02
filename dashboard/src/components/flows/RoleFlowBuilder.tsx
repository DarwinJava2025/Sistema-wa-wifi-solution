import React, { useState, useEffect } from 'react';
import {
  GitFork,
  Play,
  Plus,
  Trash2,
  Check,
  ArrowRight,
  ArrowLeft,
  Send,
  Code,
  CheckCircle2,
  RefreshCw,
  Copy,
  Save,
  Smartphone,
  Zap,
} from 'lucide-react';
import type { CustomTemplate } from '../../pages/Templates';
import { sendWhatsAppMessage } from '../../services/scheduledMessagesService';
import { sessionApi, type Session } from '../../services/api';
import './RoleFlowBuilder.css';

export interface FlowNodeDefinition {
  id: string;
  type: 'trigger' | 'classifier' | 'datasource' | 'transformer' | 'template' | 'output';
  label: string;
  subLabel: string;
  icon: string;
  description: string;
  configSummary: string;
}

export interface FlowRoleRule {
  id: string;
  name: string;
  role: 'support' | 'sales' | 'billing' | 'agent' | 'general';
  roleLabel: string;
  roleIcon: string;
  intentKeywords: string[];
  templateId: number;
  templateName: string;
  templateSource: 'meta' | 'local';
  customResponseText?: string;
  dataSource: {
    type: 'api_webhook' | 'database_sql' | 'crm_internal';
    url: string;
    method: 'GET' | 'POST';
    headers?: string;
    bodyPayload?: string;
    responseMapping: {
      varKey: string;
      jsonPath: string;
      description: string;
      fallbackValue: string;
    }[];
    mockData?: string;
  };
  isActive: boolean;
  notes?: string;
}

const STORAGE_KEY = 'wifi_role_flow_rules_v2';

export const DEFAULT_FLOW_RULES: FlowRoleRule[] = [
  {
    id: 'flow_rule_billing_balance',
    name: 'Consulta de Saldo y Deuda de Cliente',
    role: 'billing',
    roleLabel: '💳 Cobranzas y Facturación',
    roleIcon: '💳',
    intentKeywords: ['saldo', 'deuda', 'cuanto debo', 'factura', 'pagar', 'cuenta', 'corte', 'mes'],
    templateId: 102,
    templateName: 'Aviso de Saldo Pendiente',
    templateSource: 'meta',
    customResponseText:
      'Hola *{{1}}* 👋\n\nTu saldo actual al día de hoy es de *${{2}}*.\nEstado del servicio: *{{3}}*\n\nRecuerda cancelar antes del día *{{4}}* para evitar suspensión.\n\nWiFi Solution Pro • Sistema Automatizado',
    dataSource: {
      type: 'api_webhook',
      url: 'https://api.wifisolution.com/v1/billing/balance?phone={{phone}}',
      method: 'GET',
      headers: '{\n  "Authorization": "Bearer token_secreto_isp",\n  "Content-Type": "application/json"\n}',
      bodyPayload: '{\n  "phone": "{{phone}}",\n  "query_type": "balance"\n}',
      responseMapping: [
        { varKey: '1', jsonPath: 'data.client_name', description: 'Nombre del Abonado', fallbackValue: 'Carlos Mendoza' },
        { varKey: '2', jsonPath: 'data.amount_due', description: 'Monto Pendiente (USD)', fallbackValue: '25.00' },
        { varKey: '3', jsonPath: 'data.service_status', description: 'Estado del Servicio', fallbackValue: 'Activo' },
        { varKey: '4', jsonPath: 'data.due_date', description: 'Fecha Límite de Pago', fallbackValue: '25 de Septiembre' },
      ],
      mockData:
        '{\n  "status": "success",\n  "data": {\n    "client_name": "Carlos Mendoza",\n    "amount_due": "25.00",\n    "service_status": "Activo",\n    "due_date": "25 de Septiembre"\n  }\n}',
    },
    isActive: true,
    notes: 'Dispara consulta inmediata a la API de facturación por número de teléfono.',
  },
  {
    id: 'flow_rule_support_ticket',
    name: 'Reporte de Falla de Internet / Ticket',
    role: 'support',
    roleLabel: '🛠️ Soporte Técnico',
    roleIcon: '🛠️',
    intentKeywords: ['sin internet', 'lento', 'no funciona', 'caida', 'falla', 'router rojo', 'intermitencia'],
    templateId: 104,
    templateName: 'Ticket de Soporte Generado',
    templateSource: 'meta',
    customResponseText:
      'Estimado *{{1}}*,\n\nHemos registrado su reporte con el Ticket *#{{2}}*.\nEstado del nodo: *{{3}}*\nTiempo estimado de atención: *{{4}}*.\n\nUn técnico está monitoreando su enlace.',
    dataSource: {
      type: 'api_webhook',
      url: 'https://api.wifisolution.com/v1/noc/diagnose',
      method: 'POST',
      headers: '{\n  "Authorization": "Bearer token_noc_gateway",\n  "Content-Type": "application/json"\n}',
      bodyPayload: '{\n  "phone": "{{phone}}",\n  "issue": "{{message}}"\n}',
      responseMapping: [
        { varKey: '1', jsonPath: 'data.client_name', description: 'Nombre del Abonado', fallbackValue: 'Abonado' },
        { varKey: '2', jsonPath: 'data.ticket_number', description: 'N° de Ticket Generado', fallbackValue: 'TK-2026-991' },
        { varKey: '3', jsonPath: 'data.node_status', description: 'Estado del Nodo / OLT', fallbackValue: 'Operativo (Prueba en curso)' },
        { varKey: '4', jsonPath: 'data.eta_resolution', description: 'Tiempo Estimado', fallbackValue: '30 - 45 minutos' },
      ],
      mockData:
        '{\n  "status": "success",\n  "data": {\n    "client_name": "Ing. Roberto Diaz",\n    "ticket_number": "TK-2026-991",\n    "node_status": "Operativo (Prueba de enlace en curso)",\n    "eta_resolution": "30 - 45 minutos"\n  }\n}',
    },
    isActive: true,
    notes: 'Crea ticket en el NOC e inyecta el número de ticket y estado del nodo en la plantilla.',
  },
  {
    id: 'flow_rule_sales_plans',
    name: 'Cotización de Planes y Cobertura',
    role: 'sales',
    roleLabel: '⚡ Ventas y Nuevos Planes',
    roleIcon: '⚡',
    intentKeywords: ['planes', 'precios', 'megas', 'velocidad', 'instalacion', 'cobertura', 'contratar'],
    templateId: 103,
    templateName: 'Planes de Fibra Óptica',
    templateSource: 'local',
    customResponseText:
      '¡Hola! 🚀 Estos son nuestros planes de *Fibra Óptica Simétrica* para tu zona:\n\n• *Plan 50 Mbps:* $25/mes\n• *Plan 100 Mbps:* $35/mes (Más Popular ⭐)\n• *Plan 200 Mbps:* $50/mes (Gamer)\n\nInstalación rápida en 24h con router WiFi 6 incluido. ¿Deseas solicitar cobertura?',
    dataSource: {
      type: 'crm_internal',
      url: 'https://api.wifisolution.com/v1/plans/catalog',
      method: 'GET',
      headers: '{}',
      bodyPayload: '{}',
      responseMapping: [
        { varKey: '1', jsonPath: 'data.best_plan', description: 'Plan Recomendado', fallbackValue: 'Fibra 100 Mbps' },
        { varKey: '2', jsonPath: 'data.promo_price', description: 'Precio Promocional', fallbackValue: '$35/mes' },
      ],
      mockData: '{\n  "status": "success",\n  "data": {\n    "best_plan": "Fibra 100 Mbps",\n    "promo_price": "$35/mes"\n  }\n}',
    },
    isActive: true,
    notes: 'Envía el catálogo actualizado de planes y tarifas por zona.',
  },
];

export interface RoleFlowBuilderProps {
  localTemplates: CustomTemplate[];
  onSelectTemplateForEdit?: (templateId: string) => void;
}

export function RoleFlowBuilder({ localTemplates, onSelectTemplateForEdit }: RoleFlowBuilderProps) {
  // Flow rules list
  const [rules, setRules] = useState<FlowRoleRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error reading saved flow rules:', e);
    }
    return DEFAULT_FLOW_RULES;
  });

  const [selectedRuleId, setSelectedRuleId] = useState<string>(rules[0]?.id || 'flow_rule_billing_balance');
  const [activeStep, setActiveStep] = useState<number>(1); // Step 1 to 5 (maps to Node 1 to 5)

  // Feedback notifications
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // New Keyword input helper
  const [newKeywordInput, setNewKeywordInput] = useState('');

  // Connected Sessions for real WhatsApp testing
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionName, setSelectedSessionName] = useState<string>('');
  const [testRealPhone, setTestRealPhone] = useState('584121234567');
  const [isSendingRealTest, setIsSendingRealTest] = useState(false);
  const [realSendStatus, setRealSendStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Live Simulator state
  const [simPhone, setSimPhone] = useState('5491123456789');
  const [simMessage, setSimMessage] = useState('Hola, ¿cuánto debo de mi servicio de internet?');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStepIndex, setSimStepIndex] = useState<number>(-1);
  const [simResults, setSimResults] = useState<{
    matchedRule: FlowRoleRule | null;
    matchedConfidence: number;
    fetchedData: Record<string, any>;
    mappedVars: Record<string, string>;
    renderedMessage: string;
    metaPayload: Record<string, any> | null;
    latencyMs: number;
    logs: string[];
  } | null>(null);

  // Load connected sessions
  useEffect(() => {
    sessionApi
      .list()
      .then((list) => {
        setSessions(list || []);
        if (list && list.length > 0) {
          const ready = list.find((s) => s.status === 'ready') || list[0];
          setSelectedSessionName(ready.name);
        }
      })
      .catch(() => {});
  }, []);

  // Save rules to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    } catch (e) {
      console.error('Error saving flow rules:', e);
    }
  }, [rules]);

  // Current active rule
  const activeRule = rules.find((r) => r.id === selectedRuleId) || rules[0] || DEFAULT_FLOW_RULES[0];

  // Helper to extract nested values
  const getNestedValue = (obj: any, path: string): any => {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let curr = obj;
    for (const p of parts) {
      if (curr && typeof curr === 'object' && p in curr) {
        curr = curr[p];
      } else {
        return undefined;
      }
    }
    return curr;
  };

  // Build rendered sample text for WhatsApp preview
  const getRenderedPreviewText = (textTemplate: string, rule: FlowRoleRule): string => {
    let result = textTemplate || '';
    let parsedMock: Record<string, any> = {};
    try {
      parsedMock = JSON.parse(rule.dataSource.mockData || '{}');
    } catch {
      parsedMock = {};
    }

    rule.dataSource.responseMapping.forEach((m) => {
      const val = getNestedValue(parsedMock, m.jsonPath) || m.fallbackValue;
      result = result.replaceAll(`{{${m.varKey}}}`, String(val));
    });

    result = result.replaceAll('{{phone}}', '+584121234567');
    result = result.replaceAll('{{message}}', 'Consulta de cliente');
    return result;
  };

  // Update a field in the active rule
  const handleUpdateActiveRule = (updater: (prev: FlowRoleRule) => FlowRoleRule) => {
    const updated = rules.map((r) => (r.id === activeRule.id ? updater(r) : r));
    setRules(updated);
  };

  // Save current rule changes
  const handleSaveCurrentRule = () => {
    setSaveNotice('¡Flujo guardado con éxito!');
    setTimeout(() => setSaveNotice(null), 2500);
  };

  // Add Keyword
  const handleAddKeyword = () => {
    const trimmed = newKeywordInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!activeRule.intentKeywords.includes(trimmed)) {
      handleUpdateActiveRule((r) => ({
        ...r,
        intentKeywords: [...r.intentKeywords, trimmed],
      }));
    }
    setNewKeywordInput('');
  };

  // Remove Keyword
  const handleRemoveKeyword = (kw: string) => {
    handleUpdateActiveRule((r) => ({
      ...r,
      intentKeywords: r.intentKeywords.filter((k) => k !== kw),
    }));
  };

  // Add New Flow Rule
  const handleCreateNewFlow = () => {
    const newRule: FlowRoleRule = {
      id: `flow_rule_${Date.now()}`,
      name: 'Nuevo Flujo Automatizado',
      role: 'support',
      roleLabel: '🛠️ Soporte Técnico',
      roleIcon: '🛠️',
      intentKeywords: ['ayuda', 'informacion', 'servicio'],
      templateId: localTemplates[0]?.templateNumber || 101,
      templateName: localTemplates[0]?.name || 'Plantilla de Respuesta',
      templateSource: 'meta',
      customResponseText:
        'Hola *{{1}}* 👋 Le informamos sobre su requerimiento: *{{2}}*.\n\nWiFi Solution Pro • Atención al Cliente',
      dataSource: {
        type: 'api_webhook',
        url: 'https://api.wifisolution.com/v1/cliente/datos?phone={{phone}}',
        method: 'GET',
        headers: '{\n  "Content-Type": "application/json"\n}',
        bodyPayload: '{\n  "phone": "{{phone}}"\n}',
        responseMapping: [
          { varKey: '1', jsonPath: 'data.nombre', description: 'Nombre de Cliente', fallbackValue: 'Carlos Mendoza' },
          { varKey: '2', jsonPath: 'data.informacion', description: 'Dato o Saldo', fallbackValue: 'Servicio Activo' },
        ],
        mockData: '{\n  "status": "success",\n  "data": {\n    "nombre": "Carlos Mendoza",\n    "informacion": "Servicio Activo"\n  }\n}',
      },
      isActive: true,
      notes: 'Flujo creado por el usuario.',
    };
    setRules([newRule, ...rules]);
    setSelectedRuleId(newRule.id);
    setActiveStep(1);
    setSaveNotice('¡Nuevo flujo creado! Configura cada paso a continuación.');
    setTimeout(() => setSaveNotice(null), 3000);
  };

  // Duplicate Rule
  const handleDuplicateFlow = () => {
    const duplicated: FlowRoleRule = {
      ...JSON.parse(JSON.stringify(activeRule)),
      id: `flow_rule_${Date.now()}`,
      name: `${activeRule.name} (Copia)`,
    };
    setRules([duplicated, ...rules]);
    setSelectedRuleId(duplicated.id);
    setSaveNotice('¡Flujo duplicado con éxito!');
    setTimeout(() => setSaveNotice(null), 2500);
  };

  // Delete Rule
  const handleDeleteFlow = () => {
    if (rules.length <= 1) {
      alert('Debes mantener al menos un flujo configurado.');
      return;
    }
    if (confirm(`¿Estás seguro de eliminar el flujo "${activeRule.name}"?`)) {
      const remaining = rules.filter((r) => r.id !== activeRule.id);
      setRules(remaining);
      setSelectedRuleId(remaining[0].id);
    }
  };

  // Send real test WhatsApp message
  const handleSendRealWhatsAppTest = async () => {
    if (!testRealPhone.trim() || !selectedSessionName) return;
    setIsSendingRealTest(true);
    setRealSendStatus(null);

    const messageToSend = getRenderedPreviewText(activeRule.customResponseText || '', activeRule);

    try {
      const res = await sendWhatsAppMessage(selectedSessionName, testRealPhone, messageToSend);
      if (res.success) {
        setRealSendStatus({ success: true, message: `✅ Mensaje de prueba enviado exitosamente a +${testRealPhone}` });
      } else {
        setRealSendStatus({ success: false, message: `⚠️ Error al enviar: ${res.error || 'Verifica que la sesión esté conectada'}` });
      }
    } catch (err: any) {
      setRealSendStatus({ success: false, message: `⚠️ Error de conexión: ${err.message || 'Error'}` });
    } finally {
      setIsSendingRealTest(false);
    }
  };

  // Run Flow Simulator Step-by-Step
  const handleRunSimulator = async () => {
    setIsSimulating(true);
    setSimStepIndex(0);
    setSimResults(null);

    const logs: string[] = [];
    const startTime = performance.now();

    logs.push(`[00:00.000] 📥 Ingress: Mensaje entrante recibido de +${simPhone}`);
    logs.push(`[00:00.010] 💬 Texto: "${simMessage}"`);

    // Step 1: Trigger
    await new Promise((r) => setTimeout(r, 250));
    setSimStepIndex(1);

    // Step 2: Classifier
    const msgLower = simMessage.toLowerCase();
    let matched: FlowRoleRule | null = null;
    let maxMatch = 0;

    for (const rule of rules.filter((r) => r.isActive)) {
      let count = 0;
      for (const kw of rule.intentKeywords) {
        if (msgLower.includes(kw.toLowerCase())) {
          count++;
        }
      }
      if (count > maxMatch) {
        maxMatch = count;
        matched = rule;
      }
    }

    if (!matched) {
      matched = activeRule;
    }

    logs.push(`[00:00.060] 🧠 Clasificador IA: Regla emparejada -> "${matched.name}" (Rol: ${matched.roleLabel})`);

    // Step 3: Data Source
    await new Promise((r) => setTimeout(r, 300));
    setSimStepIndex(2);

    let fetchedData: Record<string, any> = {};
    try {
      fetchedData = JSON.parse(matched.dataSource.mockData || '{}');
      logs.push(`[00:00.120] 🌐 API Externa: Petición ${matched.dataSource.method} a ${matched.dataSource.url}`);
      logs.push(`[00:00.220] 📦 Respuesta API HTTP 200 OK (${Object.keys(fetchedData).length} campos recibidos)`);
    } catch {
      fetchedData = {};
    }

    // Step 4: Variable Mapping & Template
    await new Promise((r) => setTimeout(r, 250));
    setSimStepIndex(3);

    const mappedVars: Record<string, string> = {};
    matched.dataSource.responseMapping.forEach((m) => {
      const val = getNestedValue(fetchedData, m.jsonPath) || m.fallbackValue;
      mappedVars[m.varKey] = String(val);
      logs.push(`[00:00.250] 🔄 Mapeo: {{${m.varKey}}} = "${val}" (de ${m.jsonPath})`);
    });

    const renderedMsg = getRenderedPreviewText(matched.customResponseText || '', matched);
    logs.push(`[00:00.280] 📝 Inyector: Plantilla #${matched.templateId} ensamblada exitosamente`);

    // Step 5: Output Dispatch
    await new Promise((r) => setTimeout(r, 250));
    setSimStepIndex(4);
    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);

    const metaPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: simPhone,
      type: 'template',
      template: {
        name: matched.templateName.toLowerCase().replace(/\s+/g, '_'),
        language: { code: 'es' },
        components: [
          {
            type: 'body',
            parameters: Object.entries(mappedVars).map(([_, v]) => ({
              type: 'text',
              text: v,
            })),
          },
        ],
      },
    };

    logs.push(`[00:00.320] 🚀 Entrega Final: Mensaje despachado a WhatsApp (+${simPhone})`);
    logs.push(`[00:00.330] ✅ Flujo completado en ${latency}ms`);

    setSimResults({
      matchedRule: matched,
      matchedConfidence: maxMatch > 0 ? 0.95 : 0.85,
      fetchedData,
      mappedVars,
      renderedMessage: renderedMsg,
      metaPayload,
      latencyMs: latency,
      logs,
    });
    setIsSimulating(false);
  };

  // Node definitions for the 5-step n8n visual canvas
  const FLOW_NODES = [
    {
      step: 1,
      num: 'Paso 1',
      title: 'Disparador (Trigger)',
      sub: 'Mensaje Entrante WhatsApp',
      icon: '📥',
      badge: 'Ingreso',
      color: '#10b981',
      desc: 'Escucha mensajes entrantes de clientes en WhatsApp y extrae {{phone}} y {{message}}.',
    },
    {
      step: 2,
      num: 'Paso 2',
      title: 'Clasificador IA & Rol',
      sub: activeRule.roleLabel,
      icon: '🧠',
      badge: `${activeRule.intentKeywords.length} Palabras`,
      color: '#8b5cf6',
      desc: 'Detecta la intención del cliente comparando palabras clave para activar este flujo.',
    },
    {
      step: 3,
      num: 'Paso 3',
      title: 'Origen de Datos (API)',
      sub: `${activeRule.dataSource.method} • ${activeRule.dataSource.type.toUpperCase()}`,
      icon: '🌐',
      badge: `${activeRule.dataSource.responseMapping.length} Variables`,
      color: '#3b82f6',
      desc: 'Consulta tu API REST, Webhook o base de datos en tiempo real con el teléfono del cliente.',
    },
    {
      step: 4,
      num: 'Paso 4',
      title: 'Plantilla & Respuesta',
      sub: `Plantilla #${activeRule.templateId}`,
      icon: '📝',
      badge: activeRule.templateSource === 'meta' ? 'Meta Cloud' : 'Local',
      color: '#f59e0b',
      desc: 'Inyecta los datos de la API en el cuerpo del mensaje de respuesta de WhatsApp.',
    },
    {
      step: 5,
      num: 'Paso 5',
      title: 'Entrega WhatsApp & Pruebas',
      sub: 'Despacho al Cliente',
      icon: '🚀',
      badge: 'Simulador / Real',
      color: '#ec4899',
      desc: 'Despacha la respuesta final al cliente y permite probar en simulador o WhatsApp real.',
    },
  ];

  return (
    <div className="role-flow-container animate-fade-in">
      {/* Save Success Notice */}
      {saveNotice && (
        <div className="save-success-banner animate-fade-in">
          <CheckCircle2 size={18} />
          <span>{saveNotice}</span>
        </div>
      )}

      {/* TOP COMPACT TOOLBAR: Flow Selector & Main Actions */}
      <div className="flow-unified-top-bar">
        <div className="flow-selector-group">
          <div className="selector-label">
            <GitFork size={16} color="#3b82f6" />
            <span>Flujo Activo:</span>
          </div>
          <select
            className="flow-rule-select"
            value={selectedRuleId}
            onChange={(e) => {
              setSelectedRuleId(e.target.value);
              setActiveStep(1);
            }}
          >
            {rules.map((r) => (
              <option key={r.id} value={r.id}>
                {r.roleIcon} {r.name} (#{r.templateId}) {!r.isActive ? '[Pausado]' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flow-top-actions">
          <button
            type="button"
            className={`btn-toggle-status ${activeRule.isActive ? 'active' : 'inactive'}`}
            onClick={() => handleUpdateActiveRule((r) => ({ ...r, isActive: !r.isActive }))}
            title={activeRule.isActive ? 'Pausar este flujo' : 'Activar este flujo'}
          >
            <span className="dot" />
            <span>{activeRule.isActive ? 'Activo (ON)' : 'Pausado (OFF)'}</span>
          </button>

          <button
            type="button"
            className="btn-flow-action secondary"
            onClick={handleCreateNewFlow}
            title="Crear un nuevo flujo automatizado"
          >
            <Plus size={15} />
            <span>Nuevo Flujo</span>
          </button>

          <button
            type="button"
            className="btn-flow-action secondary"
            onClick={handleDuplicateFlow}
            title="Duplicar este flujo"
          >
            <Copy size={15} />
            <span>Duplicar</span>
          </button>

          <button
            type="button"
            className="btn-flow-action primary"
            onClick={handleSaveCurrentRule}
            title="Guardar todos los cambios de este flujo"
          >
            <Save size={15} />
            <span>Guardar Flujo</span>
          </button>

          {rules.length > 1 && (
            <button
              type="button"
              className="btn-flow-action danger-icon"
              onClick={handleDeleteFlow}
              title="Eliminar este flujo"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5-STEP N8N VISUAL FLOW PIPELINE (Interactive Nodes) */}
      {/* ========================================================================= */}
      <div className="n8n-guided-canvas-wrapper">
        <div className="canvas-header-info">
          <div className="canvas-title">
            <span className="canvas-badge">Constructor Visual n8n</span>
            <h3>{activeRule.name}</h3>
          </div>
          <span className="canvas-hint">
            Haz clic en cualquier nodo para configurar ese paso guiado directamente 👇
          </span>
        </div>

        <div className="n8n-nodes-row">
          {FLOW_NODES.map((node, index) => {
            const isSelected = activeStep === node.step;
            const isSimulatingThis = simStepIndex === index;

            return (
              <React.Fragment key={node.step}>
                <div
                  className={`n8n-flow-node-card ${isSelected ? 'active-node' : ''} ${
                    isSimulatingThis ? 'simulating-node' : ''
                  }`}
                  onClick={() => setActiveStep(node.step)}
                  style={{ '--node-accent': node.color } as React.CSSProperties}
                >
                  <div className="node-top-bar">
                    <span className="node-step-tag">{node.num}</span>
                    <span className="node-badge-chip">{node.badge}</span>
                  </div>

                  <div className="node-main-content">
                    <span className="node-icon-emoji">{node.icon}</span>
                    <div className="node-text-block">
                      <strong className="node-title-text">{node.title}</strong>
                      <span className="node-sub-text">{node.sub}</span>
                    </div>
                  </div>

                  {isSelected && <div className="node-active-glow" />}
                </div>

                {index < FLOW_NODES.length - 1 && (
                  <div className={`n8n-connector-pipe ${isSimulating ? 'pulsing' : ''}`}>
                    <div className="pipe-line" />
                    <div className="pipe-dot" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GUIDED STEP CONFIGURATION PANEL (Changes based on activeStep 1..5) */}
      {/* ========================================================================= */}
      <div className="guided-step-container">
        {/* STEP 1: TRIGGER */}
        {activeStep === 1 && (
          <div className="step-panel animate-fade-in">
            <div className="step-panel-header">
              <div className="step-title-group">
                <span className="step-number-circle">1</span>
                <div>
                  <h4>Paso 1: Disparador de WhatsApp (Trigger)</h4>
                  <p>Este nodo escucha los mensajes entrantes de los clientes para iniciar el flujo.</p>
                </div>
              </div>
            </div>

            <div className="step-panel-body">
              <div className="info-card-step">
                <div className="info-row-item">
                  <span className="info-key">Evento Escuchado:</span>
                  <strong className="info-val">📥 Mensaje Entrante de WhatsApp (Any Incoming Message)</strong>
                </div>
                <div className="info-row-item">
                  <span className="info-key">Variables Extraídas Automáticamente:</span>
                  <div className="var-tags-row">
                    <span className="var-pill-code"><code>{"{{phone}}"}</code> (Número del Cliente)</span>
                    <span className="var-pill-code"><code>{"{{message}}"}</code> (Texto Escrito)</span>
                  </div>
                </div>
                <div className="info-row-item">
                  <span className="info-key">Canales Compatibles:</span>
                  <span className="info-val">📱 Meta WhatsApp Cloud API Oficial & 🟢 Sesiones Locales</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: CLASSIFIER & ROLE */}
        {activeStep === 2 && (
          <div className="step-panel animate-fade-in">
            <div className="step-panel-header">
              <div className="step-title-group">
                <span className="step-number-circle">2</span>
                <div>
                  <h4>Paso 2: Clasificador IA y Palabras Clave Disparadoras</h4>
                  <p>Define qué departamento atiende y qué palabras activan este flujo automáticamente.</p>
                </div>
              </div>
            </div>

            <div className="step-panel-body">
              <div className="form-two-cols-step">
                <div className="form-group-step">
                  <label>Nombre del Flujo:</label>
                  <input
                    type="text"
                    value={activeRule.name}
                    onChange={(e) => handleUpdateActiveRule((r) => ({ ...r, name: e.target.value }))}
                    placeholder="Ej: Consulta de Saldo y Deuda"
                  />
                </div>

                <div className="form-group-step">
                  <label>Rol Asignado:</label>
                  <select
                    value={activeRule.role}
                    onChange={(e) => {
                      const role = e.target.value as FlowRoleRule['role'];
                      const labels: Record<string, { label: string; icon: string }> = {
                        billing: { label: '💳 Cobranzas y Facturación', icon: '💳' },
                        support: { label: '🛠️ Soporte Técnico', icon: '🛠️' },
                        sales: { label: '⚡ Ventas y Nuevos Planes', icon: '⚡' },
                        agent: { label: '👤 Asesor Humano / Escalación', icon: '👤' },
                        general: { label: '🎧 Atención General', icon: '🎧' },
                      };
                      const item = labels[role] || labels.general;
                      handleUpdateActiveRule((r) => ({
                        ...r,
                        role,
                        roleLabel: item.label,
                        roleIcon: item.icon,
                      }));
                    }}
                  >
                    <option value="billing">💳 Cobranzas y Facturación</option>
                    <option value="support">🛠️ Soporte Técnico</option>
                    <option value="sales">⚡ Ventas y Nuevos Planes</option>
                    <option value="agent">👤 Asesor Humano / Escalación</option>
                    <option value="general">🎧 Atención al Cliente General</option>
                  </select>
                </div>
              </div>

              {/* Keywords Tagging Box */}
              <div className="keywords-management-box">
                <label>Palabras Clave que Disparan este Flujo:</label>
                <div className="keyword-input-action-row">
                  <input
                    type="text"
                    value={newKeywordInput}
                    onChange={(e) => setNewKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                    placeholder="Escribe una palabra o frase y presiona Enter..."
                  />
                  <button type="button" className="btn-add-tag" onClick={handleAddKeyword}>
                    <Plus size={15} />
                    <span>Agregar</span>
                  </button>
                </div>

                <div className="tags-display-row">
                  {activeRule.intentKeywords.map((kw) => (
                    <span key={kw} className="kw-tag-badge">
                      <span>{kw}</span>
                      <button type="button" onClick={() => handleRemoveKeyword(kw)}>
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: DATA SOURCE API */}
        {activeStep === 3 && (
          <div className="step-panel animate-fade-in">
            <div className="step-panel-header">
              <div className="step-title-group">
                <span className="step-number-circle">3</span>
                <div>
                  <h4>Paso 3: Integración de Datos (API REST / Webhook)</h4>
                  <p>Realiza peticiones HTTP para obtener saldo, tickets o datos del cliente en tiempo real.</p>
                </div>
              </div>
            </div>

            <div className="step-panel-body">
              <div className="form-two-cols-step">
                <div className="form-group-step">
                  <label>Método HTTP:</label>
                  <select
                    value={activeRule.dataSource.method}
                    onChange={(e) =>
                      handleUpdateActiveRule((r) => ({
                        ...r,
                        dataSource: { ...r.dataSource, method: e.target.value as 'GET' | 'POST' },
                      }))
                    }
                  >
                    <option value="GET">GET (Consulta por URL)</option>
                    <option value="POST">POST (Envío de Payload JSON)</option>
                  </select>
                </div>

                <div className="form-group-step">
                  <label>URL del Endpoint / Webhook:</label>
                  <input
                    type="text"
                    value={activeRule.dataSource.url}
                    onChange={(e) =>
                      handleUpdateActiveRule((r) => ({
                        ...r,
                        dataSource: { ...r.dataSource, url: e.target.value },
                      }))
                    }
                    placeholder="https://api.wifisolution.com/v1/billing/balance?phone={{phone}}"
                  />
                </div>
              </div>

              {/* Mappings Table */}
              <div className="mappings-step-table">
                <div className="table-title-row">
                  <label>Mapeo de Campos JSON ➔ Variables de Plantilla:</label>
                </div>

                <div className="mappings-rows-list">
                  {activeRule.dataSource.responseMapping.map((m, idx) => (
                    <div key={idx} className="mapping-row-item">
                      <span className="var-pill">{`{{${m.varKey}}}`}</span>
                      <ArrowRight size={14} className="arrow" />
                      <input
                        type="text"
                        value={m.jsonPath}
                        onChange={(e) => {
                          const updatedMaps = [...activeRule.dataSource.responseMapping];
                          updatedMaps[idx] = { ...m, jsonPath: e.target.value };
                          handleUpdateActiveRule((r) => ({
                            ...r,
                            dataSource: { ...r.dataSource, responseMapping: updatedMaps },
                          }));
                        }}
                        placeholder="ej: data.amount_due"
                        title="Ruta en la respuesta JSON"
                      />
                      <input
                        type="text"
                        value={m.description}
                        onChange={(e) => {
                          const updatedMaps = [...activeRule.dataSource.responseMapping];
                          updatedMaps[idx] = { ...m, description: e.target.value };
                          handleUpdateActiveRule((r) => ({
                            ...r,
                            dataSource: { ...r.dataSource, responseMapping: updatedMaps },
                          }));
                        }}
                        placeholder="Descripción"
                        title="Descripción de la variable"
                      />
                      <input
                        type="text"
                        value={m.fallbackValue}
                        onChange={(e) => {
                          const updatedMaps = [...activeRule.dataSource.responseMapping];
                          updatedMaps[idx] = { ...m, fallbackValue: e.target.value };
                          handleUpdateActiveRule((r) => ({
                            ...r,
                            dataSource: { ...r.dataSource, responseMapping: updatedMaps },
                          }));
                        }}
                        placeholder="Valor de muestra"
                        title="Valor por defecto si la API no lo devuelve"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: TEMPLATE & RESPONSE INJECTOR */}
        {activeStep === 4 && (
          <div className="step-panel animate-fade-in">
            <div className="step-panel-header">
              <div className="step-title-group">
                <span className="step-number-circle">4</span>
                <div>
                  <h4>Paso 4: Inyector de Plantilla y Personalización de Respuesta</h4>
                  <p>Selecciona qué plantilla responder y edita el mensaje inyectando las variables de la API.</p>
                </div>
              </div>
            </div>

            <div className="step-panel-body">
              <div className="template-editor-grid">
                {/* Left Side: Form Inputs */}
                <div className="editor-left-form">
                  <div className="form-two-cols-step">
                    <div className="form-group-step">
                      <label>Seleccionar Plantilla (#ID):</label>
                      <select
                        value={activeRule.templateId}
                        onChange={(e) => {
                          const num = Number(e.target.value);
                          const t = localTemplates.find((lt) => lt.templateNumber === num);
                          handleUpdateActiveRule((r) => ({
                            ...r,
                            templateId: num,
                            templateName: t ? t.name : `Plantilla #${num}`,
                            templateSource: t?.source || r.templateSource,
                            customResponseText: t?.body || r.customResponseText,
                          }));
                        }}
                      >
                        {localTemplates.map((tpl) => (
                          <option key={tpl.id} value={tpl.templateNumber || 100}>
                            #{tpl.templateNumber || 100} - {tpl.name} ({tpl.source === 'meta' ? 'Meta Cloud' : 'Local'})
                          </option>
                        ))}
                        {localTemplates.length === 0 && (
                          <option value={activeRule.templateId}>
                            #{activeRule.templateId} - {activeRule.templateName}
                          </option>
                        )}
                      </select>
                      {onSelectTemplateForEdit && (
                        <button
                          type="button"
                          onClick={() => onSelectTemplateForEdit(String(activeRule.templateId))}
                          className="btn-open-designer-link"
                        >
                          <Code size={12} />
                          <span>Abrir en Diseñador de Plantillas</span>
                        </button>
                      )}
                    </div>

                    <div className="form-group-step">
                      <label>Canal de Envío:</label>
                      <select
                        value={activeRule.templateSource}
                        onChange={(e) =>
                          handleUpdateActiveRule((r) => ({
                            ...r,
                            templateSource: e.target.value as 'meta' | 'local',
                          }))
                        }
                      >
                        <option value="meta">🔵 Meta WhatsApp Cloud API Oficial</option>
                        <option value="local">🟢 Sesión Local WhatsApp</option>
                      </select>
                    </div>
                  </div>

                  {/* Variables Helper Pills */}
                  <div className="variables-helper-bar">
                    <span className="var-bar-title">Insertar Variables al Mensaje:</span>
                    <div className="var-pills-row">
                      {activeRule.dataSource.responseMapping.map((m) => (
                        <button
                          key={m.varKey}
                          type="button"
                          className="var-insert-btn"
                          onClick={() => {
                            const current = activeRule.customResponseText || '';
                            handleUpdateActiveRule((r) => ({
                              ...r,
                              customResponseText: current ? `${current} {{${m.varKey}}}` : `{{${m.varKey}}}`,
                            }));
                          }}
                        >
                          + {`{{${m.varKey}}}`} <span className="desc">({m.description})</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        className="var-insert-btn sys"
                        onClick={() => {
                          const current = activeRule.customResponseText || '';
                          handleUpdateActiveRule((r) => ({
                            ...r,
                            customResponseText: current ? `${current} {{phone}}` : `{{phone}}`,
                          }));
                        }}
                      >
                        + {`{{phone}}`}
                      </button>
                    </div>
                  </div>

                  {/* Message Response Textarea */}
                  <div className="form-group-step" style={{ marginTop: 12 }}>
                    <label>Texto del Mensaje de Respuesta (Soporta *negrita*, _cursiva_, saltos de línea):</label>
                    <textarea
                      rows={6}
                      value={activeRule.customResponseText || ''}
                      onChange={(e) =>
                        handleUpdateActiveRule((r) => ({ ...r, customResponseText: e.target.value }))
                      }
                      placeholder="Escribe el mensaje de respuesta con variables dinámicas..."
                    />
                  </div>
                </div>

                {/* Right Side: Live WhatsApp Phone Mockup */}
                <div className="editor-right-preview">
                  <div className="preview-card-header">
                    <Smartphone size={16} />
                    <span>Vista Previa en Vivo de WhatsApp</span>
                  </div>

                  <div className="wa-mockup-phone compact">
                    <div className="wa-phone-header">
                      <div className="wa-avatar">🤖</div>
                      <div className="wa-contact-info">
                        <span className="wa-contact-name">WiFi Solution Pro</span>
                        <span className="wa-contact-status">Plantilla #{activeRule.templateId}</span>
                      </div>
                    </div>

                    <div className="wa-phone-body">
                      <div className="wa-bubble bot animate-fade-in">
                        <div className="wa-bubble-header-tag">
                          #{activeRule.templateId} • {activeRule.templateName}
                        </div>
                        <p className="wa-rendered-text">
                          {getRenderedPreviewText(activeRule.customResponseText || '', activeRule)}
                        </p>
                        <div className="wa-bubble-footer-tag">WiFi Solution Pro • Sistema Automatizado</div>
                        <span className="wa-time-mini">10:45 AM ✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: OUTPUT DISPATCH & TESTING */}
        {activeStep === 5 && (
          <div className="step-panel animate-fade-in">
            <div className="step-panel-header">
              <div className="step-title-group">
                <span className="step-number-circle">5</span>
                <div>
                  <h4>Paso 5: Despacho y Pruebas en Vivo</h4>
                  <p>Prueba el flujo completo en el simulador o envía un mensaje de prueba a un WhatsApp real.</p>
                </div>
              </div>
            </div>

            <div className="step-panel-body">
              <div className="testing-grid-two-cols">
                {/* Left: Interactive Simulator */}
                <div className="test-sub-card">
                  <div className="test-sub-header">
                    <Play size={16} color="#10b981" />
                    <strong>1. Simulador de Flujo en Vivo</strong>
                  </div>

                  <div className="form-group-step">
                    <label>Teléfono del Cliente a Simular:</label>
                    <input
                      type="text"
                      value={simPhone}
                      onChange={(e) => setSimPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="5491123456789"
                    />
                  </div>

                  <div className="form-group-step">
                    <label>Mensaje del Cliente a Simular:</label>
                    <textarea
                      rows={2}
                      value={simMessage}
                      onChange={(e) => setSimMessage(e.target.value)}
                      placeholder="Escribe el mensaje de prueba del cliente..."
                    />
                  </div>

                  <button
                    type="button"
                    className="btn-run-sim"
                    onClick={handleRunSimulator}
                    disabled={isSimulating}
                  >
                    {isSimulating ? <RefreshCw size={15} className="spin" /> : <Play size={15} />}
                    <span>{isSimulating ? 'Simulando ejecución...' : 'Ejecutar Simulación'}</span>
                  </button>

                  {/* Sim Results */}
                  {simResults && (
                    <div className="sim-results-box animate-fade-in">
                      <div className="sim-badge-row">
                        <span className="res-pill ok">✅ Flujo Ejecutado</span>
                        <span className="res-pill latency">⚡ {simResults.latencyMs}ms</span>
                        <span className="res-pill rule">🎯 {simResults.matchedRule?.name}</span>
                      </div>

                      <div className="sim-rendered-output">
                        <label>Respuesta que recibirá el cliente:</label>
                        <p>{simResults.renderedMessage}</p>
                      </div>

                      <div className="sim-logs-mini">
                        <label>Registro de Trazabilidad:</label>
                        <pre>
                          {simResults.logs.map((l, i) => (
                            <div key={i}>{l}</div>
                          ))}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Real WhatsApp Test Sender */}
                <div className="test-sub-card">
                  <div className="test-sub-header">
                    <Zap size={16} color="#f59e0b" />
                    <strong>2. Enviar Prueba Real a WhatsApp</strong>
                  </div>

                  {sessions.length > 0 && (
                    <div className="form-group-step">
                      <label>Sesión de WhatsApp Emisora:</label>
                      <select
                        value={selectedSessionName}
                        onChange={(e) => setSelectedSessionName(e.target.value)}
                      >
                        {sessions.map((s) => (
                          <option key={s.id || s.name} value={s.name}>
                            📱 {s.name} ({s.status === 'ready' ? 'Online' : s.status})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group-step">
                    <label>Teléfono de Destino (con código de país):</label>
                    <input
                      type="text"
                      value={testRealPhone}
                      onChange={(e) => setTestRealPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="584121234567"
                    />
                  </div>

                  <button
                    type="button"
                    className="btn-send-real-test-lg"
                    onClick={handleSendRealWhatsAppTest}
                    disabled={isSendingRealTest}
                  >
                    {isSendingRealTest ? <RefreshCw size={15} className="spin" /> : <Send size={15} />}
                    <span>{isSendingRealTest ? 'Enviando a WhatsApp...' : 'Enviar Prueba a WhatsApp'}</span>
                  </button>

                  {realSendStatus && (
                    <div className={`real-send-alert ${realSendStatus.success ? 'ok' : 'err'} animate-fade-in`}>
                      {realSendStatus.message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GUIDED BOTTOM STEP NAVIGATION */}
        <div className="guided-step-footer-nav">
          <div className="footer-nav-left">
            {activeStep > 1 ? (
              <button
                type="button"
                className="btn-step-nav prev"
                onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
              >
                <ArrowLeft size={16} />
                <span>Paso Anterior: {FLOW_NODES[activeStep - 2]?.title}</span>
              </button>
            ) : (
              <span className="step-indicator-text">Paso 1 de 5</span>
            )}
          </div>

          <div className="footer-nav-right">
            {activeStep < 5 ? (
              <button
                type="button"
                className="btn-step-nav next"
                onClick={() => setActiveStep((prev) => Math.min(5, prev + 1))}
              >
                <span>Siguiente: {FLOW_NODES[activeStep]?.title}</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="btn-step-nav finish"
                onClick={handleSaveCurrentRule}
              >
                <Check size={16} />
                <span>Guardar y Publicar Flujo</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoleFlowBuilder;
