import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Play,
  Trash2,
  Edit3,
  Copy,
  Sparkles,
  AlertCircle,
  Sliders,
  ShieldCheck,
  MessageSquare,
  Send,
  RefreshCw,
  X,
  Code2,
  Check,
  Globe,
  Zap,
} from 'lucide-react';
import {
  type ApiEndpointConfig,
  type HttpMethod,
  type ApiEndpointHeader,
  type ExtractedQueryContext,
  getCustomApiEndpoints,
  saveOrUpdateEndpoint,
  deleteEndpoint,
  toggleEndpointEnabled,
  executeApiEndpoint,
  extractContextFromMessage,
  DEFAULT_ENDPOINTS,
} from '../services/apiEndpointsService';
import './ApiEndpoints.css';

const PRESET_TEMPLATES: Array<{
  name: string;
  icon: string;
  desc: string;
  config: Partial<ApiEndpointConfig>;
}> = [
  {
    name: 'Consulta de Saldo',
    icon: '💳',
    desc: 'Devuelve deuda, plan y fecha de corte por WhatsApp',
    config: DEFAULT_ENDPOINTS[0],
  },
  {
    name: 'Diagnóstico ONT / Fibra',
    icon: '📶',
    desc: 'Verifica potencia dBm y estado de sincronización',
    config: DEFAULT_ENDPOINTS[1],
  },
  {
    name: 'Tickets de Soporte',
    icon: '🎫',
    desc: 'Consulta órdenes de servicio y cuadrillas técnicas',
    config: DEFAULT_ENDPOINTS[2],
  },
  {
    name: 'Reporte de Pago',
    icon: '📝',
    desc: 'Registra transferencias y pagos móviles por POST',
    config: DEFAULT_ENDPOINTS[3],
  },
];

export function ApiEndpoints() {
  const [endpoints, setEndpoints] = useState<ApiEndpointConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  
  // Modals
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<ApiEndpointConfig | null>(null);
  
  // Live Tester Modal
  const [isTesterOpen, setIsTesterOpen] = useState(false);
  const [testingEndpoint, setTestingEndpoint] = useState<ApiEndpointConfig | null>(null);
  const [testPhone, setTestPhone] = useState('584121234567');
  const [testCedula, setTestCedula] = useState('V-18452910');
  const [testQuery, setTestQuery] = useState('Hola, quisiera saber cuanto debo y consultar mi saldo');
  const [testResult, setTestResult] = useState<any | null>(null);
  const [isTestingLoading, setIsTestingLoading] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  // Form State for Endpoint Editor
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formRole, setFormRole] = useState('all');
  const [formKeywords, setFormKeywords] = useState('');
  const [formMethod, setFormMethod] = useState<HttpMethod>('GET');
  const [formUrl, setFormUrl] = useState('');
  const [formHeaders, setFormHeaders] = useState<ApiEndpointHeader[]>([
    { key: 'Accept', value: 'application/json' },
  ]);
  const [formBodyContent, setFormBodyContent] = useState('');
  const [formResponseTemplate, setFormResponseTemplate] = useState('');
  const [formFallbackMessage, setFormFallbackMessage] = useState('');
  const [formMockJson, setFormMockJson] = useState('');
  const [formButtons, setFormButtons] = useState<string>('');
  const [formMockFallback, setFormMockFallback] = useState(true);

  // Load endpoints on mount
  useEffect(() => {
    setEndpoints(getCustomApiEndpoints());
  }, []);

  const handleToggle = (id: string, current: boolean) => {
    const updated = toggleEndpointEnabled(id, !current);
    setEndpoints(updated);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este endpoint API?')) {
      const updated = deleteEndpoint(id);
      setEndpoints(updated);
    }
  };

  const handleOpenCreateModal = (preset?: Partial<ApiEndpointConfig>) => {
    setEditingEndpoint(null);
    if (preset) {
      setFormName(preset.name || '');
      setFormDesc(preset.description || '');
      setFormRole(preset.roleAffiliation || 'all');
      setFormKeywords((preset.keywords || []).join(', '));
      setFormMethod(preset.method || 'GET');
      setFormUrl(preset.url || '');
      setFormHeaders(preset.headers || [{ key: 'Accept', value: 'application/json' }]);
      setFormBodyContent(preset.bodyContent || '');
      setFormResponseTemplate(preset.responseTemplate || '');
      setFormFallbackMessage(preset.fallbackMessage || '');
      setFormMockJson(preset.mockResponseJson || '');
      setFormButtons((preset.buttons || []).map(b => b.text).join(', '));
      setFormMockFallback(preset.enableMockFallback ?? true);
    } else {
      setFormName('');
      setFormDesc('');
      setFormRole('all');
      setFormKeywords('saldo, cuanto debo, factura, deuda');
      setFormMethod('GET');
      setFormUrl('https://api.miempresa.com/v1/billing/balance?phone={phone}');
      setFormHeaders([{ key: 'Accept', value: 'application/json' }]);
      setFormBodyContent('');
      setFormResponseTemplate(`💳 *Estado de Cuenta - {empresa}*\nHola *{cliente_nombre}*, tu saldo actual es *${'{saldo}'}*.\nFecha de corte: {fecha_corte}.`);
      setFormFallbackMessage('⚠️ No encontramos registros asociados a tu número {phone}.');
      setFormMockJson('{\n  "status": "success",\n  "data": {\n    "cliente_nombre": "Juan Pérez",\n    "saldo": "25.00",\n    "fecha_corte": "30 de este mes"\n  }\n}');
      setFormButtons('💳 Reportar Pago, 👨‍💼 Contactar Asesor');
      setFormMockFallback(true);
    }
    setIsEditorOpen(true);
  };

  const handleOpenEditModal = (ep: ApiEndpointConfig) => {
    setEditingEndpoint(ep);
    setFormName(ep.name);
    setFormDesc(ep.description);
    setFormRole(ep.roleAffiliation || 'all');
    setFormKeywords((ep.keywords || []).join(', '));
    setFormMethod(ep.method);
    setFormUrl(ep.url);
    setFormHeaders(ep.headers && ep.headers.length > 0 ? ep.headers : [{ key: 'Accept', value: 'application/json' }]);
    setFormBodyContent(ep.bodyContent || '');
    setFormResponseTemplate(ep.responseTemplate);
    setFormFallbackMessage(ep.fallbackMessage || '');
    setFormMockJson(ep.mockResponseJson || '');
    setFormButtons((ep.buttons || []).map(b => b.text).join(', '));
    setFormMockFallback(ep.enableMockFallback ?? true);
    setIsEditorOpen(true);
  };

  const handleSaveEndpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formUrl.trim() || !formResponseTemplate.trim()) {
      alert('Por favor completa los campos obligatorios (Nombre, URL y Plantilla de Respuesta).');
      return;
    }

    const keywordsArray = formKeywords
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);

    const buttonsArray = formButtons
      .split(',')
      .map(b => b.trim())
      .filter(Boolean)
      .map((text, idx) => ({ text, value: `BTN_OPT_${idx + 1}` }));

    const newEndpoint: ApiEndpointConfig = {
      id: editingEndpoint ? editingEndpoint.id : `ep_${Date.now()}`,
      name: formName.trim(),
      description: formDesc.trim(),
      enabled: editingEndpoint ? editingEndpoint.enabled : true,
      roleAffiliation: formRole,
      keywords: keywordsArray.length > 0 ? keywordsArray : ['consulta'],
      method: formMethod,
      url: formUrl.trim(),
      headers: formHeaders.filter(h => h.key.trim()),
      bodyType: formMethod === 'POST' || formMethod === 'PUT' ? 'json' : 'none',
      bodyContent: formBodyContent.trim(),
      responseTemplate: formResponseTemplate.trim(),
      fallbackMessage: formFallbackMessage.trim(),
      mockResponseJson: formMockJson.trim(),
      enableMockFallback: formMockFallback,
      buttons: buttonsArray.length > 0 ? buttonsArray : undefined,
      totalExecutions: editingEndpoint?.totalExecutions || 0,
      createdAt: editingEndpoint?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = saveOrUpdateEndpoint(newEndpoint);
    setEndpoints(updated);
    setIsEditorOpen(false);
  };

  // Live Tester Trigger
  const handleOpenTester = (ep: ApiEndpointConfig) => {
    setTestingEndpoint(ep);
    setTestResult(null);
    setIsTesterOpen(true);
  };

  const handleRunLiveTest = async () => {
    if (!testingEndpoint) return;
    setIsTestingLoading(true);
    setTestResult(null);

    const context: ExtractedQueryContext = extractContextFromMessage(
      testQuery,
      `${testPhone}@c.us`,
      'WiFi Solution Pro',
    );
    // Override with explicit inputs
    context.cedula = testCedula || context.cedula;

    try {
      const res = await executeApiEndpoint(testingEndpoint, context);
      setTestResult(res);
      // Refresh executions count in list
      setEndpoints(getCustomApiEndpoints());
    } catch (err: any) {
      setTestResult({
        success: false,
        formattedMessage: `Error al probar el endpoint: ${err.message || err}`,
        isMock: false,
        durationMs: 0,
      });
    } finally {
      setIsTestingLoading(false);
    }
  };

  // Add/Remove header row in form
  const handleAddHeaderRow = () => {
    setFormHeaders([...formHeaders, { key: '', value: '' }]);
  };

  const handleRemoveHeaderRow = (index: number) => {
    setFormHeaders(formHeaders.filter((_, i) => i !== index));
  };

  const handleHeaderChange = (index: number, field: 'key' | 'value', val: string) => {
    const next = [...formHeaders];
    next[index][field] = val;
    setFormHeaders(next);
  };

  const insertVariableIntoTemplate = (variable: string) => {
    setFormResponseTemplate(prev => prev + ` {${variable}}`);
  };

  const insertVariableIntoUrl = (variable: string) => {
    setFormUrl(prev => prev + `{${variable}}`);
  };

  // Filtered list
  const filteredEndpoints = endpoints.filter(ep => {
    const matchesSearch =
      ep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole =
      selectedRoleFilter === 'all' ||
      !ep.roleAffiliation ||
      ep.roleAffiliation === 'all' ||
      ep.roleAffiliation === selectedRoleFilter;

    return matchesSearch && matchesRole;
  });

  const activeCount = endpoints.filter(e => e.enabled).length;
  const totalCalls = endpoints.reduce((sum, e) => sum + (e.totalExecutions || 0), 0);

  return (
    <div className="api-endpoints-page">
      {/* Header */}
      <div className="api-endpoints-header">
        <div className="api-endpoints-title-box">
          <h1>
            <Globe className="text-emerald-400" size={28} />
            Integraciones API & Endpoints
          </h1>
          <p>
            Registra endpoints externos (Consultas de Saldo, Diagnóstico ONT, Facturación, Tickets) para que tus Chatbots y Asistentes de WhatsApp consulten tus APIs en tiempo real y respondan a tus clientes con datos personalizados.
          </p>
        </div>
        <div className="api-endpoints-actions">
          <button className="btn-create-endpoint" onClick={() => handleOpenCreateModal()}>
            <Plus size={18} />
            Nuevo Endpoint API
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="api-stats-grid">
        <div className="api-stat-card">
          <div className="stat-icon-wrapper green">
            <Zap size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{activeCount} / {endpoints.length}</div>
            <div className="stat-label">Endpoints Activos</div>
          </div>
        </div>

        <div className="api-stat-card">
          <div className="stat-icon-wrapper blue">
            <Send size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{totalCalls}</div>
            <div className="stat-label">Consultas Procesadas</div>
          </div>
        </div>

        <div className="api-stat-card">
          <div className="stat-icon-wrapper purple">
            <MessageSquare size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">100%</div>
            <div className="stat-label">Respuestas Personalizadas</div>
          </div>
        </div>

        <div className="api-stat-card">
          <div className="stat-icon-wrapper amber">
            <ShieldCheck size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">&lt; 400ms</div>
            <div className="stat-label">Latencia Promedio</div>
          </div>
        </div>
      </div>

      {/* Quick Presets Banner */}
      <div className="presets-banner">
        <div className="presets-info">
          <Sparkles className="presets-info-icon" size={22} />
          <div>
            <div className="presets-info-title">Plantillas de Endpoints Preconfiguradas (1 Clic)</div>
            <div className="presets-info-desc">Crea integraciones listas para producción con plantillas de WhatsApp comprobadas:</div>
          </div>
        </div>
        <div className="presets-chips">
          {PRESET_TEMPLATES.map((preset, i) => (
            <button
              key={i}
              className="preset-chip-btn"
              onClick={() => handleOpenCreateModal(preset.config)}
              title={preset.desc}
            >
              <span>{preset.icon}</span>
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="api-filter-bar">
        <div className="api-search-box">
          <Search className="search-icon-abs" size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre, URL o palabra clave (ej. saldo, factura)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="api-role-tabs">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'billing', label: '💳 Cobranzas' },
            { id: 'support', label: '🛠️ Soporte' },
            { id: 'sales', label: '🚀 Ventas' },
            { id: 'customer_care', label: '🏢 Atención' },
          ].map(tab => (
            <button
              key={tab.id}
              className={`api-role-tab ${selectedRoleFilter === tab.id ? 'active' : ''}`}
              onClick={() => setSelectedRoleFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Endpoints Grid */}
      <div className="endpoints-list-grid">
        {filteredEndpoints.map(ep => (
          <div key={ep.id} className={`endpoint-card ${!ep.enabled ? 'disabled' : ''}`}>
            <div>
              <div className="endpoint-card-header">
                <div className="endpoint-title-row">
                  <span className={`method-badge ${ep.method}`}>{ep.method}</span>
                  <h3 className="endpoint-name">{ep.name}</h3>
                </div>
                <div className="switch-box">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={ep.enabled}
                      onChange={() => handleToggle(ep.id, ep.enabled)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <p className="endpoint-desc">{ep.description}</p>
            </div>

            <div className="endpoint-url-box" title={ep.url}>
              {ep.url}
            </div>

            <div className="endpoint-keywords-row">
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Keywords:</span>
              {ep.keywords.slice(0, 5).map((kw, i) => (
                <span key={i} className="keyword-tag">
                  {kw}
                </span>
              ))}
              {ep.keywords.length > 5 && (
                <span className="keyword-tag" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  +{ep.keywords.length - 5}
                </span>
              )}
            </div>

            <div className="endpoint-meta-info">
              <span>📊 Consultas: <strong>{ep.totalExecutions || 0}</strong></span>
              <span>{ep.lastExecutedAt ? `Última: ${new Date(ep.lastExecutedAt).toLocaleTimeString()}` : 'Sin ejecuciones'}</span>
            </div>

            <div className="endpoint-card-footer">
              <div className="endpoint-actions-left">
                <button className="btn-test-ep" onClick={() => handleOpenTester(ep)}>
                  <Play size={14} />
                  Probar API
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className="btn-icon-ep"
                  onClick={() => handleOpenEditModal(ep)}
                  title="Editar Configuración"
                >
                  <Edit3 size={15} />
                </button>
                <button
                  className="btn-icon-ep danger"
                  onClick={() => handleDelete(ep.id)}
                  title="Eliminar Endpoint"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredEndpoints.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <AlertCircle size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
          <h3>No se encontraron endpoints API</h3>
          <p>Crea un nuevo endpoint o ajusta los filtros de búsqueda.</p>
        </div>
      )}

      {/* Modal: Create & Edit Endpoint */}
      {isEditorOpen && (
        <div className="ep-modal-backdrop" onClick={() => setIsEditorOpen(false)}>
          <div className="ep-modal-container" onClick={e => e.stopPropagation()}>
            <div className="ep-modal-header">
              <h2>
                <Code2 size={22} className="text-emerald-400" />
                {editingEndpoint ? 'Configurar Endpoint API' : 'Nuevo Endpoint API Personalizado'}
              </h2>
              <button className="ep-modal-close-btn" onClick={() => setIsEditorOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEndpoint} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="ep-modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      Nombre del Endpoint <span className="required-star">*</span>
                    </label>
                    <input
                      type="text"
                      className="is-required"
                      placeholder="Ej. Consulta de Saldo de Internet"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Rol Asociado del Bot</label>
                    <select value={formRole} onChange={e => setFormRole(e.target.value)}>
                      <option value="all">🌐 Todos los Roles / General</option>
                      <option value="billing">💳 Cobranzas y Facturación</option>
                      <option value="support">🛠️ Soporte Técnico</option>
                      <option value="sales">🚀 Ventas y Contrataciones</option>
                      <option value="customer_care">🏢 Atención al Cliente</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Descripción / Propósito</label>
                  <input
                    type="text"
                    placeholder="Ej. Consulta en el backend el saldo vencido del cliente por su número"
                    value={formDesc}
                    onChange={e => setFormDesc(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>
                    <span>Palabras Clave de Disparo (separadas por comas) <span className="required-star">*</span></span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Activarán la llamada a la API</span>
                  </label>
                  <input
                    type="text"
                    className="is-required"
                    placeholder="saldo, deuda, cuanto debo, factura, balance, pagar, corte"
                    value={formKeywords}
                    onChange={e => setFormKeywords(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row-3">
                  <div className="form-group">
                    <label>Método HTTP</label>
                    <select value={formMethod} onChange={e => setFormMethod(e.target.value as HttpMethod)}>
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>
                      <span>URL del Endpoint <span className="required-star">*</span></span>
                      <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>Inserta variables:</span>
                    </label>
                    <input
                      type="text"
                      className="is-required"
                      placeholder="https://api.tuempresa.com/v1/clientes/{phone}/saldo"
                      value={formUrl}
                      onChange={e => setFormUrl(e.target.value)}
                      required
                    />
                    <div className="variables-helper-bar">
                      <span className="var-badge" onClick={() => insertVariableIntoUrl('phone')}>+ {'{phone}'}</span>
                      <span className="var-badge" onClick={() => insertVariableIntoUrl('cleanPhone')}>+ {'{cleanPhone}'}</span>
                      <span className="var-badge" onClick={() => insertVariableIntoUrl('cedula')}>+ {'{cedula}'}</span>
                      <span className="var-badge" onClick={() => insertVariableIntoUrl('query')}>+ {'{query}'}</span>
                    </div>
                  </div>
                </div>

                {/* Headers Section */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ margin: 0 }}>Headers HTTP (Autenticación / Tokens)</label>
                    <button
                      type="button"
                      onClick={handleAddHeaderRow}
                      style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      + Añadir Header
                    </button>
                  </div>
                  {formHeaders.map((h, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 32px', gap: '8px', marginTop: '6px' }}>
                      <input
                        type="text"
                        placeholder="Header (ej. Authorization, X-API-Key)"
                        value={h.key}
                        onChange={e => handleHeaderChange(idx, 'key', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Valor (ej. Bearer token123)"
                        value={h.value}
                        onChange={e => handleHeaderChange(idx, 'value', e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveHeaderRow(idx)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* POST/PUT Body Content */}
                {(formMethod === 'POST' || formMethod === 'PUT') && (
                  <div className="form-group">
                    <label>JSON Body Payload (para POST / PUT)</label>
                    <textarea
                      rows={4}
                      value={formBodyContent}
                      onChange={e => setFormBodyContent(e.target.value)}
                      placeholder={'{\n  "phone": "{phone}",\n  "cedula": "{cedula}",\n  "query": "{query}"\n}'}
                    />
                  </div>
                )}

                {/* WhatsApp Response Template */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ margin: 0 }}>
                      Plantilla de Respuesta WhatsApp Personalizada <span className="required-star">*</span>
                    </label>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Usa los campos de tu JSON como variables</span>
                  </div>
                  <textarea
                    rows={6}
                    className="is-required"
                    value={formResponseTemplate}
                    onChange={e => setFormResponseTemplate(e.target.value)}
                    placeholder={`💳 *Estado de Cuenta - {empresa}*\nHola *{cliente_nombre}*, tu saldo es *${'{saldo_pendiente}'}*.\nFecha de corte: {fecha_corte}.\nEstatus: {estatus_servicio}`}
                    required
                  />
                  <div className="variables-helper-bar">
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Variables comunes:</span>
                    <span className="var-badge" onClick={() => insertVariableIntoTemplate('empresa')}>+{'{empresa}'}</span>
                    <span className="var-badge" onClick={() => insertVariableIntoTemplate('cliente_nombre')}>+{'{cliente_nombre}'}</span>
                    <span className="var-badge" onClick={() => insertVariableIntoTemplate('saldo_pendiente')}>+{'{saldo_pendiente}'}</span>
                    <span className="var-badge" onClick={() => insertVariableIntoTemplate('fecha_corte')}>+{'{fecha_corte}'}</span>
                    <span className="var-badge" onClick={() => insertVariableIntoTemplate('plan_nombre')}>+{'{plan_nombre}'}</span>
                  </div>
                </div>

                {/* Fallback Message */}
                <div className="form-group">
                  <label>Mensaje Fallback (si la API da error o cliente no existe)</label>
                  <input
                    type="text"
                    value={formFallbackMessage}
                    onChange={e => setFormFallbackMessage(e.target.value)}
                    placeholder="⚠️ No encontramos registros asociados a tu número {phone}. Indícanos tu cédula."
                  />
                </div>

                {/* Buttons / Poll Options */}
                <div className="form-group">
                  <label>Botones de Acción Rápida para WhatsApp (Opcional, separados por comas)</label>
                  <input
                    type="text"
                    value={formButtons}
                    onChange={e => setFormButtons(e.target.value)}
                    placeholder="💳 Pagar Saldo, 📋 Ver Factura, 👨‍💼 Hablar con Asesor"
                  />
                </div>

                {/* Mock JSON Data */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ margin: 0 }}>Simulación / Mock JSON de Respuesta (Respaldo offline/demo)</label>
                    <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formMockFallback}
                        onChange={e => setFormMockFallback(e.target.checked)}
                      />
                      Habilitar fallback de prueba
                    </label>
                  </div>
                  <textarea
                    rows={4}
                    value={formMockJson}
                    onChange={e => setFormMockJson(e.target.value)}
                    placeholder={'{\n  "status": "success",\n  "data": {\n    "cliente_nombre": "Carlos Mendoza",\n    "saldo_pendiente": "35.00",\n    "fecha_corte": "25 del mes"\n  }\n}'}
                  />
                </div>
              </div>

              <div className="ep-modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsEditorOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingEndpoint ? 'Guardar Cambios' : 'Crear Endpoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Live API Tester & WhatsApp Simulator */}
      {isTesterOpen && testingEndpoint && (
        <div className="ep-modal-backdrop" onClick={() => setIsTesterOpen(false)}>
          <div className="ep-modal-container" onClick={e => e.stopPropagation()}>
            <div className="ep-modal-header">
              <h2>
                <Play size={20} className="text-emerald-400" />
                Simulador & Probador en Vivo: {testingEndpoint.name}
              </h2>
              <button className="ep-modal-close-btn" onClick={() => setIsTesterOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="ep-modal-body">
              <div className="tester-modal-grid">
                {/* Left Column: Request Inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <h4 style={{ margin: 0, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sliders size={16} /> Parámetros de Prueba del Cliente
                  </h4>

                  <div className="form-group">
                    <label>Teléfono WhatsApp del Cliente</label>
                    <input
                      type="text"
                      value={testPhone}
                      onChange={e => setTestPhone(e.target.value)}
                      placeholder="584121234567"
                    />
                  </div>

                  <div className="form-group">
                    <label>Cédula / DNI Extraído</label>
                    <input
                      type="text"
                      value={testCedula}
                      onChange={e => setTestCedula(e.target.value)}
                      placeholder="V-18452910"
                    />
                  </div>

                  <div className="form-group">
                    <label>Mensaje Escrito por el Cliente en WhatsApp</label>
                    <textarea
                      rows={3}
                      value={testQuery}
                      onChange={e => setTestQuery(e.target.value)}
                      placeholder="Hola quiero consultar mi saldo"
                    />
                  </div>

                  <button
                    className="btn-primary"
                    onClick={handleRunLiveTest}
                    disabled={isTestingLoading}
                    style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    {isTestingLoading ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
                    {isTestingLoading ? 'Consultando API...' : '⚡ Ejecutar Consulta y Formatear'}
                  </button>

                  {testResult && (
                    <div style={{ marginTop: '10px', fontSize: '0.82rem', color: '#94a3b8' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Status: <strong>{testResult.statusCode || 200} OK</strong></span>
                        <span>Tiempo: <strong>{testResult.durationMs}ms</strong></span>
                        <span>Origen: <strong>{testResult.isMock ? 'Mock Demo' : 'API Real'}</strong></span>
                      </div>
                    </div>
                  )}

                  {testResult?.rawResponse && (
                    <div className="form-group">
                      <label>Respuesta JSON Devuelta:</label>
                      <div className="json-viewer-box">
                        <pre style={{ margin: 0 }}>{testResult.rawResponse}</pre>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: WhatsApp Live Bubble Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <h4 style={{ margin: 0, color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={16} /> Previsualización en WhatsApp del Cliente
                  </h4>

                  <div className="whatsapp-preview-box">
                    <div className="wa-preview-header">
                      <span>🟢 WhatsApp Business Auto-Reply</span>
                    </div>

                    {/* Customer incoming bubble */}
                    <div
                      style={{
                        background: '#005c4b',
                        color: '#fff',
                        borderRadius: '8px 8px 0 8px',
                        padding: '8px 12px',
                        fontSize: '0.85rem',
                        alignSelf: 'flex-end',
                        maxWidth: '85%',
                      }}
                    >
                      {testQuery || 'Hola, quiero consultar mi saldo'}
                    </div>

                    {/* Bot response bubble */}
                    {testResult ? (
                      <div>
                        <div className="wa-bubble-received">
                          {testResult.formattedMessage}
                        </div>
                        {testResult.poll && (
                          <div className="wa-poll-box">
                            <div className="wa-poll-title">{testResult.poll.name}</div>
                            {testResult.poll.options.map((opt: string, idx: number) => (
                              <div key={idx} className="wa-poll-option">
                                🔘 {opt}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ color: '#8696a0', fontSize: '0.85rem', textAlign: 'center', margin: 'auto' }}>
                        Haz clic en <strong>"⚡ Ejecutar Consulta"</strong> para probar la respuesta dinámica.
                      </div>
                    )}
                  </div>

                  {testResult && (
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(testResult.formattedMessage);
                        setCopiedResponse(true);
                        setTimeout(() => setCopiedResponse(false), 2000);
                      }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      {copiedResponse ? <Check size={16} /> : <Copy size={16} />}
                      {copiedResponse ? 'Copiado al portapapeles' : 'Copiar Texto de Respuesta'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="ep-modal-footer">
              <button className="btn-secondary" onClick={() => setIsTesterOpen(false)}>
                Cerrar Simulador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
