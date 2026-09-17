import { useState } from 'react';
import { MessageSquare, Plus, X } from 'lucide-react';
import { AI_ROLES, type AiRoleType, type ChatAiConfig, DEFAULT_SCHEDULE, saveChatAiConfig } from '../../services/aiAssistant';
import './NewChatModal.css';

interface NewChatModalProps {
  isOpen?: boolean;
  onClose: () => void;
  sessionId: string;
  onChatCreated: (chatId: string, initialMessage?: string) => void;
}

export function NewChatModal({ isOpen = true, onClose, sessionId, onChatCreated }: NewChatModalProps) {
  const [phone, setPhone] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [enableAi, setEnableAi] = useState(true);
  const [selectedRole, setSelectedRole] = useState<AiRoleType>('support');
  const [businessName, setBusinessName] = useState('WiFi Solution Pro');
  const [businessContext, setBusinessContext] = useState(
    'Proveedor de internet de alta velocidad por fibra óptica, soporte técnico y planes residenciales y corporativos.',
  );
  const [autoPilot, setAutoPilot] = useState(false);

  if (!isOpen) return null;

  const handleStartChat = () => {
    let cleanPhone = phone.trim().replace(/[^0-9]/g, '');
    if (!cleanPhone) return;
    const chatId = `${cleanPhone}@c.us`;

    if (enableAi) {
      const config: ChatAiConfig = {
        chatId,
        sessionId,
        enabled: true,
        autoPilot,
        role: selectedRole,
        businessName: businessName.trim() || 'Mi Empresa',
        businessContext: businessContext.trim(),
        schedule: { ...DEFAULT_SCHEDULE },
        updatedAt: new Date().toISOString(),
      };
      saveChatAiConfig(config);
    }

    onChatCreated(chatId, initialMessage.trim() || undefined);
    onClose();
  };

  return (
    <div className="new-chat-modal-overlay" onClick={onClose}>
      <div className="new-chat-modal-container" onClick={e => e.stopPropagation()}>
        <div className="new-chat-modal-header">
          <div className="new-chat-title-group">
            <div className="new-chat-icon-circle">
              <MessageSquare size={22} />
            </div>
            <div>
              <h3>Nuevo Chat & Asistente</h3>
              <p className="new-chat-subtitle">Inicia una conversación y configura el rol de IA</p>
            </div>
          </div>
          <button type="button" className="new-chat-close" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="new-chat-modal-body">
          <div className="new-chat-form-group">
            <label>Número de WhatsApp del Destinatario:</label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+584121234567 o 584121234567"
              autoFocus
            />
            <span className="new-chat-hint">Ingresa el código de país y número (ej. +58 para Venezuela, +57 Colombia, etc.)</span>
          </div>

          <div className="new-chat-form-group">
            <label>Primer mensaje (Opcional):</label>
            <textarea
              rows={2}
              value={initialMessage}
              onChange={e => setInitialMessage(e.target.value)}
              placeholder="Escribe el primer mensaje a enviar o déjalo en blanco para abrir el chat..."
            />
          </div>

          {/* AI Assistant Assignment */}
          <div className="new-chat-ai-box">
            <label className="new-chat-ai-switch">
              <div className="new-chat-ai-switch-text">
                <span className="new-chat-ai-title">🤖 Asignar Asistente IA a este Chat</span>
                <span className="new-chat-ai-desc">
                  Permite responder con un rol especializado según el tipo de cliente.
                </span>
              </div>
              <input
                type="checkbox"
                checked={enableAi}
                onChange={e => setEnableAi(e.target.checked)}
              />
            </label>

            {enableAi && (
              <div className="new-chat-ai-settings">
                <div className="new-chat-form-group">
                  <label>Selecciona el Rol del Asistente:</label>
                  <div className="new-chat-roles-grid">
                    {(Object.keys(AI_ROLES) as AiRoleType[]).map(roleKey => {
                      const r = AI_ROLES[roleKey];
                      const isSelected = selectedRole === roleKey;
                      return (
                        <div
                          key={roleKey}
                          className={`new-chat-role-chip ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedRole(roleKey)}
                        >
                          <span className="new-chat-role-icon">{r.icon}</span>
                          <span className="new-chat-role-label">{r.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="new-chat-form-group">
                  <label>Nombre de la Empresa / Negocio:</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder="WiFi Solution Pro"
                  />
                </div>

                <div className="new-chat-form-group">
                  <label>Información / Prompt del Negocio:</label>
                  <textarea
                    rows={2}
                    value={businessContext}
                    onChange={e => setBusinessContext(e.target.value)}
                    placeholder="Describe los servicios, precios, planes o soporte para que la IA responda adecuadamente..."
                  />
                </div>

                <label className="new-chat-autopilot-row">
                  <input
                    type="checkbox"
                    checked={autoPilot}
                    onChange={e => setAutoPilot(e.target.checked)}
                  />
                  <span>⚡ Activar Piloto Automático (responder automáticamente los mensajes entrantes)</span>
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="new-chat-modal-footer">
          <button type="button" className="new-chat-btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="new-chat-btn-primary"
            onClick={handleStartChat}
            disabled={!phone.trim()}
          >
            <Plus size={16} />
            Iniciar Conversación
          </button>
        </div>
      </div>
    </div>
  );
}
export default NewChatModal;
