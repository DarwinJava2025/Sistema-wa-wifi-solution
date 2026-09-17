import { useState, useEffect } from 'react';
import { Bot, Sparkles, Clock, Building2, Check, X, MessageSquare } from 'lucide-react';
import {
  AI_ROLES,
  type AiRoleType,
  type ChatAiConfig,
  getChatAiConfig,
  saveChatAiConfig,
  generateAiChatResponse,
} from '../../services/aiAssistant';
import './AiAssistantModal.css';

interface AiAssistantModalProps {
  isOpen?: boolean;
  onClose: () => void;
  sessionId: string;
  chatId: string;
  chatName?: string;
  onConfigSaved?: (config: ChatAiConfig) => void;
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

export function AiAssistantModal({
  isOpen = true,
  onClose,
  sessionId,
  chatId,
  chatName,
  onConfigSaved,
}: AiAssistantModalProps) {
  const [config, setConfig] = useState<ChatAiConfig>(() => getChatAiConfig(sessionId, chatId));
  const [testQuery, setTestQuery] = useState('Hola, ¿qué planes tienen disponibles?');
  const [testResponse, setTestResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<'role' | 'business' | 'schedule' | 'test'>('role');

  useEffect(() => {
    if (isOpen) {
      const loaded = getChatAiConfig(sessionId, chatId);
      setConfig(loaded);
      setTestResponse('');
    }
  }, [isOpen, sessionId, chatId]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveChatAiConfig(config);
    if (onConfigSaved) onConfigSaved(config);
    onClose();
  };

  const handleToggleDay = (dayIndex: number) => {
    const currentDays = config.schedule.days;
    const nextDays = currentDays.includes(dayIndex)
      ? currentDays.filter(d => d !== dayIndex)
      : [...currentDays, dayIndex].sort();
    setConfig(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        days: nextDays,
      },
    }));
  };

  const handleRunTest = async () => {
    if (!testQuery.trim()) return;
    setIsTesting(true);
    try {
      const res = await generateAiChatResponse([{ body: testQuery, fromMe: false }], config);
      setTestResponse(res);
    } catch {
      setTestResponse('Error al generar respuesta de prueba.');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal-container" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="ai-modal-header">
          <div className="ai-modal-title-group">
            <div className="ai-icon-circle">
              <Bot size={22} />
            </div>
            <div>
              <h3>Asistente IA y Roles de Chat</h3>
              <p className="ai-modal-subtitle">
                Configura el rol, contexto del negocio y horarios para <strong>{chatName || chatId}</strong>
              </p>
            </div>
          </div>
          <button type="button" className="ai-modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* Global toggles */}
        <div className="ai-modal-toggles-card">
          <label className="ai-switch-row">
            <div className="ai-switch-info">
              <span className="ai-switch-title">Activar Asistente IA para este chat</span>
              <span className="ai-switch-desc">
                Habilita sugerencias inteligentes en el compositor de mensajes y roles personalizados.
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={e => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
            />
          </label>

          {config.enabled && (
            <label className="ai-switch-row sub-switch">
              <div className="ai-switch-info">
                <span className="ai-switch-title">⚡ Piloto Automático (Auto-Responder)</span>
                <span className="ai-switch-desc">
                  La IA responderá automáticamente los mensajes entrantes de este cliente según su rol.
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.autoPilot}
                onChange={e => setConfig(prev => ({ ...prev, autoPilot: e.target.checked }))}
              />
            </label>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="ai-modal-tabs">
          <button
            type="button"
            className={`ai-tab-btn ${activeTab === 'role' ? 'active' : ''}`}
            onClick={() => setActiveTab('role')}
          >
            <Sparkles size={16} />
            1. Rol de la IA ({AI_ROLES[config.role].name})
          </button>
          <button
            type="button"
            className={`ai-tab-btn ${activeTab === 'business' ? 'active' : ''}`}
            onClick={() => setActiveTab('business')}
          >
            <Building2 size={16} />
            2. Información del Negocio
          </button>
          <button
            type="button"
            className={`ai-tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            <Clock size={16} />
            3. Horarios de Atención
          </button>
          <button
            type="button"
            className={`ai-tab-btn ${activeTab === 'test' ? 'active' : ''}`}
            onClick={() => setActiveTab('test')}
          >
            <MessageSquare size={16} />
            4. Probar Respuesta
          </button>
        </div>

        {/* Body per Tab */}
        <div className="ai-modal-body">
          {/* TAB 1: ROLES */}
          {activeTab === 'role' && (
            <div className="ai-tab-content">
              <h4 className="ai-section-title">Selecciona el Rol del Asistente:</h4>
              <div className="ai-roles-grid">
                {(Object.keys(AI_ROLES) as AiRoleType[]).map(roleKey => {
                  const r = AI_ROLES[roleKey];
                  const isSelected = config.role === roleKey;
                  return (
                    <div
                      key={roleKey}
                      className={`ai-role-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setConfig(prev => ({ ...prev, role: roleKey }))}
                    >
                      <div className="ai-role-card-header">
                        <span className="ai-role-icon">{r.icon}</span>
                        <span className="ai-role-name">{r.name}</span>
                        {isSelected && <span className="ai-role-check"><Check size={14} /></span>}
                      </div>
                      <p className="ai-role-desc">{r.description}</p>
                      <div className="ai-role-sample">
                        <strong>Ejemplo:</strong> "{r.samplePrompt}"
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="ai-form-group" style={{ marginTop: '1.25rem' }}>
                <label>Instrucciones específicas / Directivas adicionales (Opcional):</label>
                <textarea
                  rows={3}
                  value={config.customRolePrompt || ''}
                  onChange={e => setConfig(prev => ({ ...prev, customRolePrompt: e.target.value }))}
                  placeholder="Ej: Saludar mencionando el 10% de descuento en el primer mes, responder siempre en tono cordial..."
                />
              </div>
            </div>
          )}

          {/* TAB 2: BUSINESS CONTEXT */}
          {activeTab === 'business' && (
            <div className="ai-tab-content">
              <div className="ai-form-group">
                <label>Nombre de la Empresa / Negocio:</label>
                <input
                  type="text"
                  value={config.businessName}
                  onChange={e => setConfig(prev => ({ ...prev, businessName: e.target.value }))}
                  placeholder="Ej: WiFi Solution Pro / Mi Empresa"
                />
              </div>

              <div className="ai-form-group">
                <label>Información del Negocio, Planes, Precios y Políticas:</label>
                <span className="ai-field-hint">
                  Esta información servirá como base de conocimiento para que la IA responda preguntas precisas sobre tu negocio.
                </span>
                <textarea
                  rows={7}
                  value={config.businessContext}
                  onChange={e => setConfig(prev => ({ ...prev, businessContext: e.target.value }))}
                  placeholder="Ej: Ofrecemos planes de fibra óptica de 50Mbps ($25), 100Mbps ($35) y 200Mbps ($50). Métodos de pago: Zelle, Pago Móvil y Efectivo. Cobertura en toda la ciudad..."
                />
              </div>
            </div>
          )}

          {/* TAB 3: SCHEDULE */}
          {activeTab === 'schedule' && (
            <div className="ai-tab-content">
              <label className="ai-switch-row" style={{ marginBottom: '1.25rem' }}>
                <div className="ai-switch-info">
                  <span className="ai-switch-title">Habilitar Horarios de Atención</span>
                  <span className="ai-switch-desc">
                    Controla cómo responde el asistente cuando está fuera del horario comercial.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.schedule.enabled}
                  onChange={e =>
                    setConfig(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule, enabled: e.target.checked },
                    }))
                  }
                />
              </label>

              {config.schedule.enabled && (
                <>
                  <div className="ai-form-group">
                    <label>Días Laborales Activos:</label>
                    <div className="ai-days-selector">
                      {DAYS_OF_WEEK.map(d => {
                        const isSelected = config.schedule.days.includes(d.id);
                        return (
                          <button
                            key={d.id}
                            type="button"
                            className={`ai-day-pill ${isSelected ? 'active' : ''}`}
                            onClick={() => handleToggleDay(d.id)}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="ai-form-row">
                    <div className="ai-form-group">
                      <label>Hora Inicio:</label>
                      <input
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
                    <div className="ai-form-group">
                      <label>Hora Fin:</label>
                      <input
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

                  <div className="ai-form-group">
                    <label>Mensaje Automático Fuera de Horario:</label>
                    <textarea
                      rows={4}
                      value={config.schedule.outOfHoursMessage}
                      onChange={e =>
                        setConfig(prev => ({
                          ...prev,
                          schedule: { ...prev.schedule, outOfHoursMessage: e.target.value },
                        }))
                      }
                      placeholder="Mensaje cordial informando que el equipo está fuera de servicio..."
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 4: TEST */}
          {activeTab === 'test' && (
            <div className="ai-tab-content">
              <div className="ai-form-group">
                <label>Simular Mensaje del Cliente:</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={testQuery}
                    onChange={e => setTestQuery(e.target.value)}
                    placeholder="Escribe una pregunta para probar..."
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="ai-btn-primary"
                    onClick={handleRunTest}
                    disabled={isTesting || !testQuery.trim()}
                  >
                    <Sparkles size={16} />
                    {isTesting ? 'Generando...' : 'Generar'}
                  </button>
                </div>
              </div>

              {testResponse && (
                <div className="ai-test-result-card">
                  <div className="ai-test-header">
                    <span className="ai-test-badge">
                      {AI_ROLES[config.role].icon} {AI_ROLES[config.role].name}
                    </span>
                    <span className="ai-test-time">Ahora</span>
                  </div>
                  <div className="ai-test-body">{testResponse}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ai-modal-footer">
          <button type="button" className="ai-btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="ai-btn-primary" onClick={handleSave}>
            <Check size={16} />
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
}
export default AiAssistantModal;
