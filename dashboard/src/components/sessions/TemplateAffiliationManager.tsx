import { useState } from 'react';
import {
  Zap,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  Smartphone,
  Sliders,
  RotateCcw,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  MessageSquare,
  Bot,
} from 'lucide-react';
import {
  type TemplateTriggerMapping,
  type TriggerIntentType,
  type AiRoleType,
  getDefaultTemplateTriggers,
} from '../../services/aiAssistant';
import './TemplateAffiliationManager.css';

export interface TemplateAffiliationManagerProps {
  triggers: TemplateTriggerMapping[];
  onChange: (newTriggers: TemplateTriggerMapping[]) => void;
  currentRole: AiRoleType;
  businessName?: string;
  sessionId?: string;
}

const INTENT_OPTIONS: Array<{
  type: TriggerIntentType;
  label: string;
  icon: string;
  defaultKeywords: string[];
}> = [
  {
    type: 'greeting',
    label: '👋 Saludo & Bienvenida',
    icon: '👋',
    defaultKeywords: ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'saludos', 'inicio', 'menu'],
  },
  {
    type: 'balance',
    label: '💳 Consulta de Saldo & Facturación',
    icon: '💳',
    defaultKeywords: ['saldo', 'deuda', 'factura', 'pagar', 'recibo', 'cuenta', 'cuanto debo', 'corte', 'pago'],
  },
  {
    type: 'plans',
    label: '⚡ Planes & Tarifas de Internet',
    icon: '⚡',
    defaultKeywords: ['planes', 'precios', 'costo', 'fibra', 'megas', 'promocion', 'contratar', 'velocidad', 'tarifas'],
  },
  {
    type: 'support',
    label: '🛠️ Soporte Técnico & Fallas',
    icon: '🛠️',
    defaultKeywords: ['soporte', 'falla', 'sin internet', 'lento', 'averia', 'luz roja', 'router', 'problema', 'los', 'pon'],
  },
  {
    type: 'agent',
    label: '👤 Transferencia a Asesor Humano',
    icon: '👤',
    defaultKeywords: ['asesor', 'humano', 'operador', 'agente', 'persona', 'atencion humana'],
  },
  {
    type: 'custom',
    label: '🎯 Trigger Personalizado',
    icon: '🎯',
    defaultKeywords: ['informacion', 'consulta'],
  },
];

export function TemplateAffiliationManager({
  triggers,
  onChange,
  currentRole,
  businessName = 'WiFi Solution Pro',
  sessionId: _sessionId = 'sesion_actual',
}: TemplateAffiliationManagerProps) {
  const [editingTrigger, setEditingTrigger] = useState<TemplateTriggerMapping | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedIntentFilter, setSelectedIntentFilter] = useState<string>('all');
  const [keywordInput, setKeywordInput] = useState('');
  const [activePreviewId, setActivePreviewId] = useState<string | null>(triggers[0]?.id || null);

  // Load saved local custom templates from localStorage
  const savedCustomTemplates = (() => {
    try {
      const raw = localStorage.getItem('openwa_local_custom_templates_v2');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  })();

  const handleToggleTrigger = (id: string) => {
    onChange(
      triggers.map(t => (t.id === id ? { ...t, enabled: !t.enabled } : t)),
    );
  };

  const handleDeleteTrigger = (id: string) => {
    onChange(triggers.filter(t => t.id !== id));
    if (activePreviewId === id) {
      setActivePreviewId(null);
    }
  };

  const handleResetDefaults = () => {
    const defaults = getDefaultTemplateTriggers(currentRole);
    onChange(defaults);
    setActivePreviewId(defaults[0]?.id || null);
  };

  const handleStartCreate = () => {
    const newTrig: TemplateTriggerMapping = {
      id: `trig_${Date.now()}`,
      enabled: true,
      name: 'Nueva Plantilla Afiliada',
      intentType: 'greeting',
      keywords: ['hola', 'bienvenida'],
      roleAffiliation: 'all',
      templateName: 'Plantilla Personalizada',
      headerType: 'text',
      headerText: '✨ ATENCIÓN AL CLIENTE',
      body: '¡Hola {{cliente}}! Gracias por comunicarte con *{{empresa}}*.\n\n¿En qué podemos ayudarte el día de hoy?',
      footer: `${businessName} • Conectividad Total`,
      buttons: [{ text: 'Ver Opciones', type: 'QUICK_REPLY', value: 'OPCIONES' }],
      action: 'send_template',
      dynamicAiMatch: true,
    };
    setEditingTrigger(newTrig);
    setIsCreating(true);
    setKeywordInput('');
  };

  const handleSaveTrigger = () => {
    if (!editingTrigger) return;
    if (isCreating) {
      onChange([...triggers, editingTrigger]);
      setActivePreviewId(editingTrigger.id);
    } else {
      onChange(triggers.map(t => (t.id === editingTrigger.id ? editingTrigger : t)));
    }
    setEditingTrigger(null);
    setIsCreating(false);
  };

  const handleAddKeyword = () => {
    if (!keywordInput.trim() || !editingTrigger) return;
    const clean = keywordInput.trim().toLowerCase();
    if (!editingTrigger.keywords.includes(clean)) {
      setEditingTrigger({
        ...editingTrigger,
        keywords: [...editingTrigger.keywords, clean],
      });
    }
    setKeywordInput('');
  };

  const handleRemoveKeyword = (kw: string) => {
    if (!editingTrigger) return;
    setEditingTrigger({
      ...editingTrigger,
      keywords: editingTrigger.keywords.filter(k => k !== kw),
    });
  };

  const handleSelectPredefinedTemplate = (tpl: any) => {
    if (!editingTrigger) return;
    setEditingTrigger({
      ...editingTrigger,
      templateName: tpl.name || 'Plantilla Seleccionada',
      headerType: tpl.headerType || 'none',
      headerText: tpl.headerText || '',
      mediaUrl: tpl.mediaUrl || '',
      body: tpl.body || '',
      footer: tpl.footer || '',
      buttons: tpl.buttons || [],
    });
  };

  const filteredTriggers = triggers.filter(t => {
    if (selectedIntentFilter === 'all') return true;
    return t.intentType === selectedIntentFilter;
  });

  const previewTrigger = triggers.find(t => t.id === activePreviewId) || triggers[0];

  return (
    <div className="template-affiliation-container">
      {/* Top Banner Header */}
      <div className="affiliation-header-card">
        <div className="affiliation-title-row">
          <div className="affiliation-icon-box">
            <Zap size={22} />
          </div>
          <div>
            <h3>Afiliación de Plantillas & Triggers para el Chatbot</h3>
            <p className="affiliation-subtitle">
              Asocia plantillas generadas (saludo, saldo, planes, soporte) a números y roles. La IA decidirá inteligentemente cuándo enviar la plantilla o generar respuesta natural.
            </p>
          </div>
        </div>
        <div className="affiliation-actions-row">
          <button className="btn-affiliation-reset" onClick={handleResetDefaults} title="Restablecer triggers predeterminados según el rol">
            <RotateCcw size={14} /> Predeterminados
          </button>
          <button className="btn-affiliation-add" onClick={handleStartCreate}>
            <Plus size={16} /> Afiliar Nueva Plantilla
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="affiliation-filter-bar">
        <button
          className={`filter-tab ${selectedIntentFilter === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedIntentFilter('all')}
        >
          Todos ({triggers.length})
        </button>
        {INTENT_OPTIONS.map(opt => {
          const count = triggers.filter(t => t.intentType === opt.type).length;
          return (
            <button
              key={opt.type}
              className={`filter-tab ${selectedIntentFilter === opt.type ? 'active' : ''}`}
              onClick={() => setSelectedIntentFilter(opt.type)}
            >
              {opt.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Main Grid: Triggers List + Live WhatsApp Bubble Preview */}
      <div className="affiliation-main-layout">
        {/* Left Side: Triggers Cards */}
        <div className="affiliation-list">
          {filteredTriggers.length === 0 ? (
            <div className="affiliation-empty">
              <Sparkles size={32} />
              <p>No hay plantillas afiliadas en esta categoría.</p>
              <button className="btn-affiliation-add" onClick={handleStartCreate}>
                <Plus size={16} /> Crear primer Trigger
              </button>
            </div>
          ) : (
            filteredTriggers.map(trig => {
              const intentMeta = INTENT_OPTIONS.find(i => i.type === trig.intentType) || INTENT_OPTIONS[0];
              const isSelected = previewTrigger?.id === trig.id;

              return (
                <div
                  key={trig.id}
                  className={`affiliation-card ${trig.enabled ? 'active' : 'disabled'} ${isSelected ? 'selected' : ''}`}
                  onClick={() => setActivePreviewId(trig.id)}
                >
                  <div className="card-top-header">
                    <div className="card-intent-info">
                      <span className="intent-badge-icon">{intentMeta.icon}</span>
                      <div>
                        <h4 className="card-title">{trig.name}</h4>
                        <span className="card-tpl-name">
                          Plantilla: <strong>{trig.templateName}</strong>
                        </span>
                      </div>
                    </div>
                    <div className="card-toggle-group" onClick={e => e.stopPropagation()}>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={trig.enabled}
                          onChange={() => handleToggleTrigger(trig.id)}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>
                  </div>

                  {/* Metadata Tags */}
                  <div className="card-tags-row">
                    <span className="meta-tag header-tag">
                      {trig.headerType === 'image' && <ImageIcon size={12} />}
                      {trig.headerType === 'video' && <Video size={12} />}
                      {trig.headerType === 'audio' && <Music size={12} />}
                      {trig.headerType === 'document' && <FileText size={12} />}
                      {trig.headerType === 'text' && <MessageSquare size={12} />}
                      {trig.headerType.toUpperCase()}
                    </span>

                    <span className={`meta-tag action-tag ${trig.action === 'send_template' ? 'direct' : 'hybrid'}`}>
                      {trig.action === 'send_template' ? '⚡ Envío Directo' : '✨ Híbrido IA'}
                    </span>

                    {trig.dynamicAiMatch && (
                      <span className="meta-tag ai-tag">
                        <Bot size={12} /> Detección IA Activa
                      </span>
                    )}

                    {trig.buttons && trig.buttons.length > 0 && (
                      <span className="meta-tag btn-count-tag">
                        🔘 {trig.buttons.length} Botones
                      </span>
                    )}
                  </div>

                  {/* Keywords pills */}
                  <div className="card-keywords-container">
                    <span className="keywords-label">Palabras clave / Triggers:</span>
                    <div className="keywords-wrap">
                      {trig.keywords.map((kw, i) => (
                        <span key={i} className="keyword-chip">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="card-footer-actions" onClick={e => e.stopPropagation()}>
                    <button
                      className="btn-card-edit"
                      onClick={() => {
                        setEditingTrigger(trig);
                        setIsCreating(false);
                      }}
                    >
                      <Edit2 size={13} /> Configurar
                    </button>
                    <button
                      className="btn-card-delete"
                      onClick={() => handleDeleteTrigger(trig.id)}
                      title="Eliminar Trigger"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: WhatsApp Mobile Simulation Preview */}
        <div className="affiliation-preview-panel">
          <div className="preview-panel-header">
            <Smartphone size={16} />
            <span>Vista Previa WhatsApp en Vivo</span>
          </div>

          {previewTrigger ? (
            <div className="mobile-preview-device">
              <div className="mobile-screen-header">
                <div className="wa-avatar">🤖</div>
                <div className="wa-header-text">
                  <h5>{businessName}</h5>
                  <span>{previewTrigger.enabled ? '🟢 En línea • Bot Auto-Pilot' : '⚪ Trigger Desactivado'}</span>
                </div>
              </div>

              <div className="wa-chat-canvas">
                <div className="wa-incoming-sample">
                  <p>
                    {previewTrigger.keywords[0]
                      ? `Hola, ${previewTrigger.keywords[0]}`
                      : 'Hola, consulta'}
                  </p>
                  <span className="wa-time">10:45 AM</span>
                </div>

                <div className="wa-bubble-container">
                  {/* Media Header Preview */}
                  {previewTrigger.headerType === 'image' && (
                    <div className="wa-bubble-media">
                      <img
                        src={previewTrigger.mediaUrl || 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&auto=format&fit=crop'}
                        alt="Header"
                      />
                    </div>
                  )}

                  {previewTrigger.headerType === 'video' && (
                    <div className="wa-bubble-media video-mock">
                      <span>🎬 Video de Plantilla</span>
                    </div>
                  )}

                  {previewTrigger.headerType === 'text' && previewTrigger.headerText && (
                    <div className="wa-bubble-title">
                      <strong>{previewTrigger.headerText}</strong>
                    </div>
                  )}

                  {/* Body Text */}
                  <div className="wa-bubble-body">
                    {previewTrigger.body
                      .replace(/\{\{cliente\}\}/gi, 'Carlos Mendoza')
                      .replace(/\{\{nombre\}\}/gi, 'Carlos Mendoza')
                      .replace(/\{\{empresa\}\}/gi, businessName)
                      .replace(/\{\{ticket\}\}/gi, 'ST-4821')
                      .replace(/\{\{saldo\}\}/gi, '25.00')
                      .replace(/\{\{fecha\}\}/gi, '15/09/2026')
                      .replace(/\{\{contrato\}\}/gi, 'CT-88421')
                      .replace(/\{\{plan\}\}/gi, 'Fibra 100 Mbps')}
                  </div>

                  {/* Footer */}
                  {previewTrigger.footer && (
                    <div className="wa-bubble-footer">{previewTrigger.footer}</div>
                  )}

                  <div className="wa-bubble-time">10:45 AM • ✓✓</div>
                </div>

                {/* Interactive Buttons */}
                {previewTrigger.buttons && previewTrigger.buttons.length > 0 && (
                  <div className="wa-buttons-stack">
                    {previewTrigger.buttons.map((btn, idx) => (
                      <div key={idx} className="wa-action-btn">
                        🔘 {btn.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="preview-info-box">
                <p>
                  ⚡ <strong>Disparo Automático:</strong> Se enviará cuando un usuario escriba{' '}
                  <code>{previewTrigger.keywords.slice(0, 4).join(', ')}</code> o por clasificación semántica IA.
                </p>
              </div>
            </div>
          ) : (
            <div className="preview-placeholder">
              <p>Selecciona un trigger para ver su previsualización en WhatsApp.</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit / Create Trigger Modal */}
      {editingTrigger && (
        <div className="trigger-modal-overlay">
          <div className="trigger-modal-content">
            <div className="trigger-modal-header">
              <div className="header-icon">
                <Sliders size={20} />
              </div>
              <div>
                <h4>{isCreating ? 'Afiliar Nueva Plantilla a Trigger' : 'Editar Configuración de Trigger'}</h4>
                <p>Configura las palabras clave, plantilla asociada y comportamiento del chatbot.</p>
              </div>
              <button className="btn-close-modal" onClick={() => setEditingTrigger(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="trigger-modal-body">
              {/* Quick Select from Saved Templates */}
              {savedCustomTemplates.length > 0 && (
                <div className="form-group saved-tpl-selector">
                  <label>📦 Cargar desde Mis Plantillas Guardadas:</label>
                  <select
                    onChange={e => {
                      const found = savedCustomTemplates.find((t: any) => t.id === e.target.value);
                      if (found) handleSelectPredefinedTemplate(found);
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Seleccionar una plantilla existente...
                    </option>
                    {savedCustomTemplates.map((tpl: any) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} ({tpl.headerType} • {tpl.category})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Form Grid */}
              <div className="form-grid-2col">
                <div className="form-group">
                  <label>Nombre Identificador del Trigger:</label>
                  <input
                    type="text"
                    value={editingTrigger.name}
                    onChange={e => setEditingTrigger({ ...editingTrigger, name: e.target.value })}
                    placeholder="Ej: Saludo de Bienvenida Clientes"
                  />
                </div>

                <div className="form-group">
                  <label>Intención / Categoría:</label>
                  <select
                    value={editingTrigger.intentType}
                    onChange={e => {
                      const newType = e.target.value as TriggerIntentType;
                      const intentDef = INTENT_OPTIONS.find(i => i.type === newType);
                      setEditingTrigger({
                        ...editingTrigger,
                        intentType: newType,
                        keywords: intentDef ? intentDef.defaultKeywords : editingTrigger.keywords,
                      });
                    }}
                  >
                    {INTENT_OPTIONS.map(opt => (
                      <option key={opt.type} value={opt.type}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Keywords Tag Input */}
              <div className="form-group">
                <label>Palabras Clave Disparadoras (escribe y presiona Enter o Agregar):</label>
                <div className="keyword-input-row">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={e => setKeywordInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddKeyword();
                      }
                    }}
                    placeholder="Ej: saldo, pagar, cuenta, cuanto debo..."
                  />
                  <button type="button" className="btn-add-tag" onClick={handleAddKeyword}>
                    <Plus size={14} /> Agregar
                  </button>
                </div>
                <div className="keywords-editor-wrap">
                  {editingTrigger.keywords.map((kw, i) => (
                    <span key={i} className="keyword-tag-editable">
                      {kw}
                      <button type="button" onClick={() => handleRemoveKeyword(kw)}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Behavior & Dynamic AI */}
              <div className="form-grid-2col">
                <div className="form-group">
                  <label>Comportamiento de Respuesta:</label>
                  <select
                    value={editingTrigger.action}
                    onChange={e =>
                      setEditingTrigger({
                        ...editingTrigger,
                        action: e.target.value as 'send_template' | 'ai_hybrid',
                      })
                    }
                  >
                    <option value="send_template">⚡ Enviar Plantilla Oficial Directa (Recomendado)</option>
                    <option value="ai_hybrid">✨ Híbrido: IA redacta usando la plantilla como base</option>
                  </select>
                </div>

                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={editingTrigger.dynamicAiMatch}
                      onChange={e =>
                        setEditingTrigger({
                          ...editingTrigger,
                          dynamicAiMatch: e.target.checked,
                        })
                      }
                    />
                    <span>Detección semántica IA (activa el trigger si el cliente expresa la intención aunque use otras palabras)</span>
                  </label>
                </div>
              </div>

              {/* Template Content Editor */}
              <div className="form-grid-2col">
                <div className="form-group">
                  <label>Tipo de Encabezado Multimedia:</label>
                  <select
                    value={editingTrigger.headerType}
                    onChange={e =>
                      setEditingTrigger({
                        ...editingTrigger,
                        headerType: e.target.value as any,
                      })
                    }
                  >
                    <option value="none">Sin Encabezado</option>
                    <option value="text">Texto en Negrita</option>
                    <option value="image">🖼️ Imagen (URL)</option>
                    <option value="video">🎬 Video (URL)</option>
                    <option value="audio">🎵 Audio (URL)</option>
                    <option value="document">📄 Documento / PDF (URL)</option>
                  </select>
                </div>

                {editingTrigger.headerType === 'text' && (
                  <div className="form-group">
                    <label>Texto del Encabezado:</label>
                    <input
                      type="text"
                      value={editingTrigger.headerText || ''}
                      onChange={e => setEditingTrigger({ ...editingTrigger, headerText: e.target.value })}
                      placeholder="Ej: 💳 ESTADO DE CUENTA"
                    />
                  </div>
                )}

                {['image', 'video', 'audio', 'document'].includes(editingTrigger.headerType) && (
                  <div className="form-group">
                    <label>URL del Recurso Multimedia:</label>
                    <input
                      type="url"
                      value={editingTrigger.mediaUrl || ''}
                      onChange={e => setEditingTrigger({ ...editingTrigger, mediaUrl: e.target.value })}
                      placeholder="https://servidor.com/imagen.png"
                    />
                  </div>
                )}
              </div>

              {/* Body Text */}
              <div className="form-group">
                <label>
                  Cuerpo del Mensaje (Soporta variables: <code>{'{{cliente}}'}</code>, <code>{'{{empresa}}'}</code>, <code>{'{{saldo}}'}</code>, <code>{'{{ticket}}'}</code>, <code>{'{{fecha}}'}</code>):
                </label>
                <textarea
                  rows={5}
                  value={editingTrigger.body}
                  onChange={e => setEditingTrigger({ ...editingTrigger, body: e.target.value })}
                  placeholder="Escribe el mensaje de la plantilla..."
                />
              </div>

              {/* Footer */}
              <div className="form-group">
                <label>Pie de Página (Footer):</label>
                <input
                  type="text"
                  value={editingTrigger.footer || ''}
                  onChange={e => setEditingTrigger({ ...editingTrigger, footer: e.target.value })}
                  placeholder="Ej: WiFi Solution Pro • Atención al Cliente"
                />
              </div>
            </div>

            <div className="trigger-modal-footer">
              <button className="btn-cancel" onClick={() => setEditingTrigger(null)}>
                Cancelar
              </button>
              <button className="btn-save" onClick={handleSaveTrigger}>
                <Check size={16} /> Guardar Trigger & Afiliación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplateAffiliationManager;
