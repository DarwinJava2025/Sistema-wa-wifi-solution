import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Smartphone,
  Eye,
  Bot,
  FileText,
  Zap,
} from 'lucide-react';
import {
  type MultiRoleConfig,
  type MultiRoleDepartment,
  type DepartmentResponseMode,
  type AiRoleType,
  AI_ROLES,
  getDefaultMultiRoleConfig,
  generateMenuGreetingFromDepartments,
  formatDepartmentTemplate,
} from '../../services/aiAssistant';
import './MultiRoleManager.css';

export interface MultiRoleManagerProps {
  config: MultiRoleConfig;
  onChange: (newConfig: MultiRoleConfig) => void;
  businessName?: string;
}

export const MultiRoleManager: React.FC<MultiRoleManagerProps> = ({
  config,
  onChange,
  businessName = 'WiFi Solution Pro',
}) => {
  const [editingDept, setEditingDept] = useState<MultiRoleDepartment | null>(null);
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(null);
  const [keywordInput, setKeywordInput] = useState('');
  const [previewInput, setPreviewInput] = useState('hola');
  const [previewOutput, setPreviewOutput] = useState('');
  const [simulatedDept, setSimulatedDept] = useState<MultiRoleDepartment | null>(null);

  const currentConfig = config && config.departments ? config : getDefaultMultiRoleConfig(businessName);

  const handleToggleEnabled = (enabled: boolean) => {
    onChange({
      ...currentConfig,
      enabled,
    });
  };

  const handleUpdateGreeting = (menuGreeting: string) => {
    onChange({
      ...currentConfig,
      menuGreeting,
    });
  };

  const handleAutoGenerateGreeting = () => {
    const generated = generateMenuGreetingFromDepartments(currentConfig.departments, businessName);
    onChange({
      ...currentConfig,
      menuGreeting: generated,
    });
  };

  const handleResetToDefault = () => {
    if (window.confirm('¿Deseas restaurar la configuración multi-rol y el menú inicial a los valores recomendados por defecto?')) {
      onChange(getDefaultMultiRoleConfig(businessName));
    }
  };

  const handleToggleDepartment = (deptId: string, enabled: boolean) => {
    const updated = currentConfig.departments.map(d => (d.id === deptId ? { ...d, enabled } : d));
    onChange({
      ...currentConfig,
      departments: updated,
    });
  };

  const handleDeleteDepartment = (deptId: string) => {
    if (window.confirm('¿Estás seguro de eliminar este departamento / rol asociado?')) {
      const updated = currentConfig.departments.filter(d => d.id !== deptId);
      onChange({
        ...currentConfig,
        departments: updated,
      });
      if (expandedDeptId === deptId) setExpandedDeptId(null);
    }
  };

  const handleSaveDepartment = (dept: MultiRoleDepartment) => {
    const exists = currentConfig.departments.some(d => d.id === dept.id);
    let updated: MultiRoleDepartment[];
    if (exists) {
      updated = currentConfig.departments.map(d => (d.id === dept.id ? dept : d));
    } else {
      updated = [...currentConfig.departments, dept];
    }
    onChange({
      ...currentConfig,
      departments: updated,
    });
    setEditingDept(null);
  };

  const handleAddNewDepartment = () => {
    const nextNum = currentConfig.departments.length + 1;
    const newDept: MultiRoleDepartment = {
      id: `dept_custom_${Date.now()}`,
      role: 'custom',
      name: `Nuevo Rol / Depto ${nextNum}`,
      description: 'Atención personalizada para solicitudes específicas de los clientes.',
      icon: '🏢',
      optionKey: String(nextNum),
      keywords: [String(nextNum), `opcion ${nextNum}`, 'nuevo'],
      responseMode: 'hybrid',
      presetResponse: `👋 ¡Hola {{cliente}}! Te atiende el área de *Nuevo Rol ${nextNum}* en *{{empresa}}*.\n\n¿En qué te podemos asesorar o ayudar el día de hoy?\n\n_Escribe *MENU* para volver al selector de opciones._`,
      prompt: AI_ROLES.custom.defaultPrompt,
      enabled: true,
    };
    setEditingDept(newDept);
  };

  const insertVariableIntoGreeting = (variable: string) => {
    handleUpdateGreeting(`${currentConfig.menuGreeting} ${variable}`);
  };

  const insertVariableIntoPreset = (variable: string) => {
    if (!editingDept) return;
    setEditingDept({
      ...editingDept,
      presetResponse: `${editingDept.presetResponse || ''} ${variable}`,
    });
  };

  const testSimulatedMenu = (input: string) => {
    const clean = input.toLowerCase().trim();
    if (clean === 'menu' || clean === 'inicio' || clean === '0' || clean === 'volver' || clean === 'hola') {
      const formatted = currentConfig.menuGreeting
        .replace(/\{\{empresa\}\}/gi, businessName)
        .replace(/\{\{cliente\}\}/gi, 'Carlos Rodríguez');
      setPreviewOutput(formatted);
      return;
    }

    const matched = currentConfig.departments.find(
      d => d.enabled && (d.optionKey === clean || (d.keywords && d.keywords.some(kw => clean.includes(kw.toLowerCase().trim())))),
    );

    if (matched) {
      const mode = matched.responseMode || 'hybrid';
      const modeTag = mode === 'template' ? '📄 [Modo Plantilla Predeterminada]' : mode === 'ai' ? '🤖 [Modo Inteligencia Artificial]' : '⚡ [Modo Híbrido: Plantilla + IA]';
      const formattedAck = formatDepartmentTemplate(matched, businessName, 'Carlos Rodríguez', '7842');
      setPreviewOutput(`✅ *Enrutado con éxito*\n🏷️ ${modeTag}\n\n${formattedAck}`);
    } else {
      setPreviewOutput(
        `⚠️ Opción no reconocida. El bot reenvía el menú inicial de opciones:\n\n` +
          currentConfig.menuGreeting
            .replace(/\{\{empresa\}\}/gi, businessName)
            .replace(/\{\{cliente\}\}/gi, 'Carlos Rodríguez'),
      );
    }
  };

  return (
    <div className="multirole-manager-container">
      {/* Header Info */}
      <div className="multirole-header">
        <div className="multirole-header-left">
          <div className="multirole-icon-box">
            <Layers size={24} />
          </div>
          <div>
            <h3 className="multirole-title">Enrutador Multi-Rol & Menú Interactivo (Un Solo Número)</h3>
            <p className="multirole-subtitle">
              Permite que un <strong>solo número de WhatsApp</strong> gestione múltiples departamentos (Ventas, Soporte, Atención al Cliente, Cobranzas y otros). Cada rol puede responder con <strong>Plantillas Predeterminadas</strong> o con <strong>Inteligencia Artificial (IA)</strong>.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn-outline-sm"
          onClick={handleResetToDefault}
          title="Restaurar saludo y roles por defecto"
        >
          <RotateCcw size={14} /> Restaurar Por Defecto
        </button>
      </div>

      {/* Main Switch Card */}
      <div className="multirole-switch-card">
        <label className="multirole-toggle-row">
          <div className="toggle-info">
            <span className="toggle-main-title">🎭 Activar Modo Multi-Rol con Menú de Saludo Inicial</span>
            <span className="toggle-main-desc">
              Cuando el cliente escribe por primera vez o escribe palabras clave como <code>MENU</code> o <code>HOLA</code>, el bot le enviará el saludo inicial con las opciones de los roles configurados.
            </span>
          </div>
          <input
            type="checkbox"
            checked={currentConfig.enabled}
            onChange={e => handleToggleEnabled(e.target.checked)}
          />
        </label>
      </div>

      {currentConfig.enabled && (
        <>
          {/* Greeting Menu Editor & Live Preview */}
          <div className="multirole-greeting-section">
            <div className="greeting-editor-col">
              <div className="section-sub-header">
                <MessageSquare size={16} />
                <h4>1. Mensaje de Saludo Inicial & Menú de Opciones</h4>
              </div>
              <p className="field-hint">
                Este es el primer mensaje interactivo que recibirá el usuario. Lista los roles y departamentos disponibles.
              </p>

              <div className="var-quick-bar">
                <span className="var-label">Insertar variables:</span>
                <button type="button" className="var-btn" onClick={() => insertVariableIntoGreeting('{{empresa}}')}>
                  + {'{{empresa}}'}
                </button>
                <button type="button" className="var-btn" onClick={() => insertVariableIntoGreeting('{{cliente}}')}>
                  + {'{{cliente}}'}
                </button>
                <button
                  type="button"
                  className="var-btn-generate"
                  onClick={handleAutoGenerateGreeting}
                  title="Construye el menú automáticamente a partir de la lista de departamentos activos"
                >
                  <Sparkles size={13} /> Auto-generar Saludo desde Roles
                </button>
              </div>

              <textarea
                className="greeting-textarea"
                rows={8}
                value={currentConfig.menuGreeting}
                onChange={e => handleUpdateGreeting(e.target.value)}
                placeholder="Escribe el mensaje de bienvenida y las opciones de atención..."
              />

              <div className="reset-keywords-box">
                <label className="reset-kw-label">Palabras clave para reiniciar y volver al Menú Principal:</label>
                <div className="kw-tags-list">
                  {currentConfig.resetKeywords.map((kw, i) => (
                    <span key={i} className="kw-tag">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Live WhatsApp Simulator with Interactive Buttons */}
            <div className="greeting-preview-col">
              <div className="section-sub-header">
                <Smartphone size={16} />
                <h4>Vista Previa en Vivo (WhatsApp)</h4>
              </div>

              <div className="wa-simulator-container">
                {/* Initial Menu Message */}
                <div className="wa-bubble-preview">
                  <div className="wa-bubble-header">
                    <Sparkles size={13} />
                    <span>WhatsApp • {businessName}</span>
                  </div>
                  <div className="wa-bubble-body">
                    {currentConfig.menuGreeting
                      .replace(/\{\{empresa\}\}/gi, businessName)
                      .replace(/\{\{cliente\}\}/gi, 'Carlos Rodríguez')}
                  </div>
                  <div className="wa-bubble-footer">
                    <span>12:00 PM • Entregado</span>
                  </div>
                </div>

                {/* Interactive Selection Buttons */}
                <div className="wa-interactive-buttons-panel">
                  <div className="wa-buttons-title">🔘 Botones Interactivos de WhatsApp (Toca uno para probar):</div>
                  <div className="wa-buttons-grid">
                    {currentConfig.departments.filter(d => d.enabled).map(dept => {
                      const isDeptSelected = simulatedDept?.id === dept.id;
                      const roleDef = AI_ROLES[dept.role] || AI_ROLES.custom;
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          className={`wa-interactive-btn-pill ${isDeptSelected ? 'selected' : ''}`}
                          onClick={() => setSimulatedDept(dept)}
                          title={`Toca para simular selección de ${dept.name}`}
                        >
                          <span className="wa-btn-icon">{dept.icon || roleDef.icon || '🔘'}</span>
                          <span className="wa-btn-label">{dept.name}</span>
                          <span className="wa-btn-arrow">➔</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Simulated Interaction after clicking a button */}
                {simulatedDept && (
                  <div className="wa-simulated-thread">
                    {/* User message simulated */}
                    <div className="wa-user-bubble">
                      <div className="wa-user-text">
                        {simulatedDept.icon || '🔘'} {simulatedDept.name}
                      </div>
                      <div className="wa-bubble-footer user">
                        <span>12:01 PM • ✓✓</span>
                      </div>
                    </div>

                    {/* Bot response routed by role */}
                    <div className="wa-bubble-preview routed">
                      <div className="wa-bubble-header routed">
                        <span className="wa-route-tag">
                          {simulatedDept.responseMode === 'template' ? '📄 Respuesta Plantilla' : simulatedDept.responseMode === 'ai' ? '🤖 Respuesta IA' : '⚡ Híbrido (Plantilla + IA)'}
                        </span>
                        <span>{simulatedDept.name}</span>
                      </div>
                      <div className="wa-bubble-body">
                        {formatDepartmentTemplate(simulatedDept, businessName, 'Carlos Rodríguez', 'ST-4091')}
                      </div>
                      <div className="wa-bubble-footer">
                        <span>12:01 PM • Atendido por Rol</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="wa-reset-sim-btn"
                      onClick={() => setSimulatedDept(null)}
                    >
                      <RotateCcw size={13} /> Reiniciar Menú Principal
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Department List */}
          <div className="multirole-departments-section">
            <div className="departments-section-header">
              <div>
                <div className="section-sub-header">
                  <Layers size={16} />
                  <h4>2. Roles & Departamentos Configurados en este Bot</h4>
                </div>
                <p className="field-hint">
                  Define cómo responderá cada rol cuando el cliente seleccione su opción (vía <strong>Plantilla Predeterminada</strong> o <strong>IA</strong>).
                </p>
              </div>
              <button
                type="button"
                className="btn-primary-sm"
                onClick={handleAddNewDepartment}
              >
                <Plus size={15} /> Agregar Rol / Departamento
              </button>
            </div>

            <div className="departments-grid">
              {currentConfig.departments.map(dept => {
                const isExpanded = expandedDeptId === dept.id;
                const roleDef = AI_ROLES[dept.role] || AI_ROLES.custom;
                const mode: DepartmentResponseMode = dept.responseMode || 'hybrid';

                return (
                  <div
                    key={dept.id}
                    className={`dept-card ${dept.enabled ? 'active' : 'disabled'} ${isExpanded ? 'expanded' : ''}`}
                  >
                    <div className="dept-card-header">
                      <div className="dept-card-left">
                        <span className="dept-option-badge">Opción {dept.optionKey}</span>
                        <span className="dept-icon">{dept.icon || roleDef.icon}</span>
                        <div>
                          <div className="dept-name-row">
                            <h5 className="dept-name">{dept.name}</h5>
                            <span
                              className="dept-role-pill"
                              style={{ background: `${roleDef.badgeColor}22`, color: roleDef.badgeColor, border: `1px solid ${roleDef.badgeColor}44` }}
                            >
                              {roleDef.name}
                            </span>
                            <span className={`dept-mode-badge ${mode}`}>
                              {mode === 'ai' && <>🤖 Modo IA</>}
                              {mode === 'template' && <>📄 Modo Plantilla</>}
                              {mode === 'hybrid' && <>⚡ Híbrido (Plantilla + IA)</>}
                            </span>
                          </div>
                          <p className="dept-desc">{dept.description}</p>
                        </div>
                      </div>

                      <div className="dept-card-actions">
                        <label className="toggle-switch-compact" title={dept.enabled ? 'Desactivar área' : 'Activar área'}>
                          <input
                            type="checkbox"
                            checked={dept.enabled}
                            onChange={e => handleToggleDepartment(dept.id, e.target.checked)}
                          />
                        </label>
                        <button
                          type="button"
                          className="btn-icon-compact"
                          onClick={() => setEditingDept({ ...dept })}
                          title="Editar parámetros, plantilla y prompt del rol"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon-compact danger"
                          onClick={() => handleDeleteDepartment(dept.id)}
                          title="Eliminar departamento"
                        >
                          <Trash2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon-compact"
                          onClick={() => setExpandedDeptId(isExpanded ? null : dept.id)}
                          title={isExpanded ? 'Contraer detalles' : 'Ver directivas, plantilla y palabras clave'}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Collapsible details */}
                    {isExpanded && (
                      <div className="dept-card-body">
                        <div className="dept-detail-item">
                          <span className="detail-tag-label">Palabras Clave de Activación:</span>
                          <div className="dept-kw-list">
                            {dept.keywords.map((k, idx) => (
                              <span key={idx} className="kw-pill">
                                {k}
                              </span>
                            ))}
                          </div>
                        </div>

                        {(mode === 'template' || mode === 'hybrid') && (
                          <div className="dept-detail-item">
                            <span className="detail-tag-label">📄 Plantilla de Respuesta Determinada:</span>
                            <pre className="dept-preset-preview">
                              {dept.presetResponse || 'Plantilla de respuesta predeterminada estándar.'}
                            </pre>
                          </div>
                        )}

                        {(mode === 'ai' || mode === 'hybrid') && (
                          <div className="dept-detail-item">
                            <span className="detail-tag-label">🤖 Directivas / Prompt del Rol IA:</span>
                            <pre className="dept-prompt-preview">{dept.prompt || roleDef.defaultPrompt}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Routing Tester */}
          <div className="multirole-test-box">
            <div className="section-sub-header">
              <Eye size={16} />
              <h4>3. Simulador de Enrutamiento en Vivo</h4>
            </div>
            <p className="field-hint">
              Escribe un mensaje de prueba (ej: <code>hola</code>, <code>1</code>, <code>2</code>, <code>soporte</code>, <code>ventas</code>, <code>menu</code>) para verificar en tiempo real cómo responderá el bot según su rol y modo:
            </p>
            <div className="test-input-row">
              <input
                type="text"
                className="test-input-field"
                value={previewInput}
                onChange={e => setPreviewInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && testSimulatedMenu(previewInput)}
                placeholder="Escribe: 1, 2, soporte, factura, menu..."
              />
              <button
                type="button"
                className="btn-primary-sm"
                onClick={() => testSimulatedMenu(previewInput)}
              >
                Simular Respuesta
              </button>
            </div>

            {previewOutput && (
              <div className="simulated-result-bubble">
                <div className="sim-bubble-title">Respuesta Simulada del Bot WhatsApp:</div>
                <div className="sim-bubble-text">{previewOutput}</div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Edit / Create Department Modal */}
      {editingDept && (
        <div className="modal-overlay-inner" onClick={() => setEditingDept(null)}>
          <div className="dept-edit-dialog" onClick={e => e.stopPropagation()}>
            <div className="dialog-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} />
                <h4>Configurar Rol / Departamento Asociado</h4>
              </div>
              <button type="button" className="btn-icon-compact" onClick={() => setEditingDept(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="dialog-body">
              {/* Row 1: Name and Option Key */}
              <div className="form-row-2">
                <div className="form-group-unified">
                  <label>Nombre del Departamento / Área:</label>
                  <input
                    type="text"
                    value={editingDept.name}
                    onChange={e => setEditingDept({ ...editingDept, name: e.target.value })}
                    placeholder="Ej: Soporte Técnico, Ventas, Atención al Cliente"
                  />
                </div>

                <div className="form-group-unified">
                  <label>Opción Numérica / Atajo:</label>
                  <input
                    type="text"
                    value={editingDept.optionKey}
                    onChange={e => setEditingDept({ ...editingDept, optionKey: e.target.value })}
                    placeholder="Ej: 1, 2, 3, 4"
                  />
                </div>
              </div>

              {/* Row 2: Base AI Role & Icon */}
              <div className="form-row-2">
                <div className="form-group-unified">
                  <label>Rol Base de Atención:</label>
                  <select
                    value={editingDept.role}
                    onChange={e => {
                      const r = e.target.value as AiRoleType;
                      setEditingDept({
                        ...editingDept,
                        role: r,
                        prompt: AI_ROLES[r]?.defaultPrompt || '',
                      });
                    }}
                  >
                    {(Object.keys(AI_ROLES) as AiRoleType[]).map(rk => (
                      <option key={rk} value={rk}>
                        {AI_ROLES[rk].icon} {AI_ROLES[rk].name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group-unified">
                  <label>Icono / Emoji:</label>
                  <input
                    type="text"
                    value={editingDept.icon || ''}
                    onChange={e => setEditingDept({ ...editingDept, icon: e.target.value })}
                    placeholder="Ej: 🛠️, 💼, 🤝, 💳, 🚀"
                  />
                </div>
              </div>

              {/* Row 3: Description */}
              <div className="form-group-unified">
                <label>Descripción corta para el menú del cliente:</label>
                <input
                  type="text"
                  value={editingDept.description || ''}
                  onChange={e => setEditingDept({ ...editingDept, description: e.target.value })}
                  placeholder="Ej: Diagnóstico técnico paso a paso y seguimiento con ticket."
                />
              </div>

              {/* Response Mode Selector (Tabs) */}
              <div className="form-group-unified">
                <label className="mode-selector-label">
                  ⚙️ Modo de Respuesta de este Rol:
                </label>
                <div className="response-mode-selector-grid">
                  <button
                    type="button"
                    className={`mode-select-card ${(editingDept.responseMode || 'hybrid') === 'hybrid' ? 'active' : ''}`}
                    onClick={() => setEditingDept({ ...editingDept, responseMode: 'hybrid' })}
                  >
                    <div className="mode-card-header">
                      <Zap size={18} className="mode-icon hybrid" />
                      <strong>Modo Híbrido (Recomendado)</strong>
                    </div>
                    <p>Envía la plantilla de respuesta inicial predeterminada y utiliza la IA para resolver cualquier consulta libre del cliente.</p>
                  </button>

                  <button
                    type="button"
                    className={`mode-select-card ${(editingDept.responseMode || 'hybrid') === 'template' ? 'active' : ''}`}
                    onClick={() => setEditingDept({ ...editingDept, responseMode: 'template' })}
                  >
                    <div className="mode-card-header">
                      <FileText size={18} className="mode-icon template" />
                      <strong>Respuesta Determinada / Plantilla</strong>
                    </div>
                    <p>Envía exclusivamente respuestas predefinidas con variables personalizadas (sin consumo de tokens de IA).</p>
                  </button>

                  <button
                    type="button"
                    className={`mode-select-card ${(editingDept.responseMode || 'hybrid') === 'ai' ? 'active' : ''}`}
                    onClick={() => setEditingDept({ ...editingDept, responseMode: 'ai' })}
                  >
                    <div className="mode-card-header">
                      <Bot size={18} className="mode-icon ai" />
                      <strong>Solo Inteligencia Artificial (IA)</strong>
                    </div>
                    <p>La IA asume la personalidad del rol y genera respuestas dinámicas siguiendo estrictamente sus directivas.</p>
                  </button>
                </div>
              </div>

              {/* Preset Response Editor (if template or hybrid) */}
              {((editingDept.responseMode || 'hybrid') === 'template' || (editingDept.responseMode || 'hybrid') === 'hybrid') && (
                <div className="form-group-unified preset-editor-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>📄 Plantilla / Mensaje de Respuesta Predeterminada:</label>
                    <div className="var-quick-bar-mini">
                      <button type="button" className="var-btn-mini" onClick={() => insertVariableIntoPreset('{{cliente}}')}>
                        + {'{{cliente}}'}
                      </button>
                      <button type="button" className="var-btn-mini" onClick={() => insertVariableIntoPreset('{{empresa}}')}>
                        + {'{{empresa}}'}
                      </button>
                      <button type="button" className="var-btn-mini" onClick={() => insertVariableIntoPreset('{{ticket}}')}>
                        + {'{{ticket}}'}
                      </button>
                      <button type="button" className="var-btn-mini" onClick={() => insertVariableIntoPreset('{{saldo}}')}>
                        + {'{{saldo}}'}
                      </button>
                      <button type="button" className="var-btn-mini" onClick={() => insertVariableIntoPreset('{{fecha}}')}>
                        + {'{{fecha}}'}
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={6}
                    value={editingDept.presetResponse || ''}
                    onChange={e => setEditingDept({ ...editingDept, presetResponse: e.target.value })}
                    placeholder="Escribe la respuesta predeterminada que recibirá el cliente al seleccionar este rol..."
                  />
                  <p className="field-hint">
                    Puedes personalizar este mensaje con variables automáticas como <code>{'{{cliente}}'}</code>, <code>{'{{empresa}}'}</code>, <code>{'{{ticket}}'}</code>, <code>{'{{saldo}}'}</code>.
                  </p>
                </div>
              )}

              {/* AI Directives / Prompt Editor (if AI or hybrid) */}
              {((editingDept.responseMode || 'hybrid') === 'ai' || (editingDept.responseMode || 'hybrid') === 'hybrid') && (
                <div className="form-group-unified">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>🤖 Instrucciones de Personalidad y Directivas (Prompt del Rol):</label>
                    <button
                      type="button"
                      className="btn-text-sm"
                      onClick={() =>
                        setEditingDept({
                          ...editingDept,
                          prompt: AI_ROLES[editingDept.role]?.defaultPrompt || '',
                        })
                      }
                    >
                      Restaurar Prompt de {AI_ROLES[editingDept.role]?.name}
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={editingDept.prompt}
                    onChange={e => setEditingDept({ ...editingDept, prompt: e.target.value })}
                    placeholder="Instrucciones específicas que seguirá la IA al atender clientes en este departamento..."
                  />
                </div>
              )}

              {/* Keywords Section */}
              <div className="form-group-unified">
                <label>Palabras clave que activan este departamento:</label>
                <div className="kw-editor-box">
                  <div className="kw-input-row">
                    <input
                      type="text"
                      value={keywordInput}
                      onChange={e => setKeywordInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && keywordInput.trim()) {
                          e.preventDefault();
                          if (!editingDept.keywords.includes(keywordInput.trim().toLowerCase())) {
                            setEditingDept({
                              ...editingDept,
                              keywords: [...editingDept.keywords, keywordInput.trim().toLowerCase()],
                            });
                          }
                          setKeywordInput('');
                        }
                      }}
                      placeholder="Escribe una palabra clave (ej: averia, saldo, precio) y presiona Enter..."
                    />
                    <button
                      type="button"
                      className="btn-primary-sm"
                      onClick={() => {
                        if (keywordInput.trim() && !editingDept.keywords.includes(keywordInput.trim().toLowerCase())) {
                          setEditingDept({
                            ...editingDept,
                            keywords: [...editingDept.keywords, keywordInput.trim().toLowerCase()],
                          });
                          setKeywordInput('');
                        }
                      }}
                    >
                      <Plus size={14} /> Añadir
                    </button>
                  </div>
                  <div className="kw-chips">
                    {editingDept.keywords.map((kw, i) => (
                      <span key={i} className="kw-chip">
                        {kw}
                        <button
                          type="button"
                          onClick={() =>
                            setEditingDept({
                              ...editingDept,
                              keywords: editingDept.keywords.filter((_, idx) => idx !== i),
                            })
                          }
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="dialog-footer">
              <button type="button" className="btn-secondary" onClick={() => setEditingDept(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleSaveDepartment(editingDept)}
              >
                <Check size={16} /> Guardar Departamento / Rol
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
