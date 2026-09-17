import { useState } from 'react';
import { Key, Globe, Eye, EyeOff, Sparkles, Check, Loader2, Play, Zap } from 'lucide-react';
import {
  type LlmConfig,
  type LlmProviderType,
  LLM_PROVIDERS,
  DEFAULT_API_KEYS,
  generateAiChatResponse,
  type ChatAiConfig,
  DEFAULT_SCHEDULE,
} from '../../services/aiAssistant';
import './LlmSettingsManager.css';

interface LlmSettingsManagerProps {
  config: LlmConfig;
  onChange: (newConfig: LlmConfig) => void;
}

const RECOMMENDED_MODELS: Record<LlmProviderType, Array<{ id: string; label: string }>> = {
  openai: [
    { id: 'gpt-4o-mini', label: 'gpt-4o-mini (Recomendado / Rápido)' },
    { id: 'gpt-4o', label: 'gpt-4o (Máxima Capacidad)' },
    { id: 'gpt-3.5-turbo', label: 'gpt-3.5-turbo' },
  ],
  gemini: [
    { id: 'gemini-1.5-flash', label: 'gemini-1.5-flash (Ultra Rápido)' },
    { id: 'gemini-2.0-flash', label: 'gemini-2.0-flash (Última Gen)' },
    { id: 'gemini-1.5-pro', label: 'gemini-1.5-pro (Documentos Extensos)' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile' },
    { id: 'mixtral-8x7b-32768', label: 'mixtral-8x7b-32768' },
  ],
  openrouter: [
    { id: 'deepseek/deepseek-chat', label: 'deepseek-chat (R1)' },
    { id: 'anthropic/claude-3.5-sonnet', label: 'claude-3.5-sonnet' },
  ],
  ollama: [
    { id: 'llama3:latest', label: 'llama3:latest' },
    { id: 'mistral:latest', label: 'mistral:latest' },
  ],
  offline: [],
};

export function LlmSettingsManager({ config, onChange }: LlmSettingsManagerProps) {
  const [showKey, setShowKey] = useState(false);
  const [testPrompt, setTestPrompt] = useState('Hola, quiero consultar el precio de sus planes de internet y saber cómo contrato.');
  const [testResult, setTestResult] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const handleProviderChange = (provider: LlmProviderType) => {
    const info = LLM_PROVIDERS[provider];
    const defaultKey = DEFAULT_API_KEYS[provider] || '';
    
    // If current key is empty or matches another default key, pre-fill with the new provider's default key
    const isOtherDefaultKey = Object.values(DEFAULT_API_KEYS).includes(config.apiKey);
    const newApiKey = !config.apiKey || isOtherDefaultKey ? defaultKey : config.apiKey;

    onChange({
      ...config,
      provider,
      apiKey: newApiKey,
      model: info.defaultModel,
      baseUrl: info.defaultUrl,
    });
  };

  const handleRunLlmTest = async () => {
    if (!testPrompt.trim()) return;
    setIsTesting(true);
    setTestResult('');
    try {
      const mockChatConfig: ChatAiConfig = {
        chatId: '*',
        sessionId: 'test_session',
        enabled: true,
        autoPilot: true,
        role: 'sales',
        businessName: 'WiFi Solution Pro',
        businessContext: 'Planes de fibra óptica: 50M ($25), 100M ($35), 200M ($50). Métodos de pago: Pago Móvil, Zelle, Transferencias.',
        llmConfig: config,
        schedule: { ...DEFAULT_SCHEDULE },
        updatedAt: new Date().toISOString(),
      };

      const reply = await generateAiChatResponse(
        [{ body: testPrompt, fromMe: false }],
        mockChatConfig,
      );
      setTestResult(reply);
    } catch (err: any) {
      setTestResult(`Error al conectar con el LLM: ${err.message || err}`);
    } finally {
      setIsTesting(false);
    }
  };

  const currentModels = RECOMMENDED_MODELS[config.provider] || [];

  return (
    <div className="llm-settings-manager">
      <div>
        <h3 className="section-heading">Motor de Inteligencia Artificial (LLM) & Memoria</h3>
        <p className="section-subheading">
          Conecta tus chatbots a modelos de lenguaje avanzados (OpenAI ChatGPT, Google Gemini, Groq, Ollama) para respuestas inteligentes, cierre de ventas y diagnóstico de soporte en tiempo real.
        </p>
      </div>

      {/* Provider Selector Cards */}
      <div className="llm-providers-grid">
        {(Object.keys(LLM_PROVIDERS) as LlmProviderType[]).map(pKey => {
          const p = LLM_PROVIDERS[pKey];
          const isSelected = config.provider === pKey;
          return (
            <div
              key={pKey}
              className={`llm-provider-card ${isSelected ? 'selected' : ''}`}
              onClick={() => handleProviderChange(pKey)}
            >
              <div className="llm-provider-header">
                <span className="llm-provider-name">{p.name}</span>
                <div className={`role-card-radio ${isSelected ? 'checked' : ''}`}>
                  {isSelected && <Check size={14} />}
                </div>
              </div>
              <p className="llm-provider-desc">{p.desc}</p>
              <span className="llm-model-badge">Modelo: {p.defaultModel}</span>
            </div>
          );
        })}
      </div>

      {/* API Key & Model Configuration */}
      {config.provider !== 'offline' && (
        <div className="llm-config-panel">
          <div className="form-group-unified">
            <label htmlFor="llm-api-key">
              Clave de API ({LLM_PROVIDERS[config.provider]?.name}):
            </label>
            <div className="key-input-wrapper">
              <Key size={16} className="key-icon" />
              <input
                id="llm-api-key"
                type={showKey ? 'text' : 'password'}
                placeholder={LLM_PROVIDERS[config.provider]?.placeholder || 'Pega tu clave de API aquí...'}
                value={config.apiKey}
                onChange={e => onChange({ ...config, apiKey: e.target.value })}
              />
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? 'Ocultar' : 'Mostrar'}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span className="input-hint">
              {DEFAULT_API_KEYS[config.provider] && config.apiKey === DEFAULT_API_KEYS[config.provider] ? (
                <span style={{ color: 'var(--success, #10b981)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={13} /> Clave preconfigurada desde variables de entorno (.env) activa.
                </span>
              ) : (
                'Tu clave de API se almacena de forma segura en tu navegador y se comunica directamente con el proveedor.'
              )}
            </span>
          </div>

          <div className="time-grid-row">
            <div className="form-group-unified">
              <label htmlFor="llm-model">Modelo de IA:</label>
              <input
                id="llm-model"
                type="text"
                placeholder="ej. gpt-4o-mini, gemini-1.5-flash, llama-3.3-70b-versatile"
                value={config.model}
                onChange={e => onChange({ ...config, model: e.target.value })}
              />
              {currentModels.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {currentModels.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onChange({ ...config, model: m.id })}
                      style={{
                        background: config.model === m.id ? 'var(--primary, #2563eb)' : 'var(--bg-light, #f1f5f9)',
                        color: config.model === m.id ? '#fff' : 'var(--text-main, #334155)',
                        border: '1px solid var(--border, #e2e8f0)',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Zap size={10} />
                      {m.id}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group-unified">
              <label htmlFor="llm-temperature">Temperatura / Creatividad: {config.temperature || 0.7}</label>
              <input
                id="llm-temperature"
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={config.temperature || 0.7}
                onChange={e => onChange({ ...config, temperature: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          {/* Base URL for Ollama / Custom Proxies */}
          {(config.provider === 'ollama' || config.provider === 'openrouter') && (
            <div className="form-group-unified">
              <label htmlFor="llm-base-url">Endpoint URL / Base URL:</label>
              <div className="key-input-wrapper">
                <Globe size={16} className="key-icon" />
                <input
                  id="llm-base-url"
                  type="text"
                  placeholder="ej. http://localhost:11434/v1/chat/completions"
                  value={config.baseUrl || ''}
                  onChange={e => onChange({ ...config, baseUrl: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Memory & Context Tracking Switch */}
      <div className="config-card-box">
        <label className="toggle-switch-row">
          <div className="toggle-switch-info">
            <span className="toggle-title">🧠 Memoria Conversacional & Seguimiento Continuo</span>
            <span className="toggle-description">
              Permite que la IA recuerde nombres de clientes, números de ticket, direcciones y cotizaciones a lo largo de toda la conversación sin perder el rol.
            </span>
          </div>
          <input
            type="checkbox"
            checked={config.memoryEnabled !== false}
            onChange={e => onChange({ ...config, memoryEnabled: e.target.checked })}
          />
        </label>
      </div>

      {/* Realtime LLM Test Box */}
      <div className="llm-test-panel">
        <div className="llm-test-header">
          <Sparkles size={16} />
          <span>Probar respuesta directa con el modelo ({config.model || 'Integrado'}):</span>
        </div>
        <div className="test-input-row">
          <input
            type="text"
            placeholder="Escribe una pregunta para probar el LLM..."
            value={testPrompt}
            onChange={e => setTestPrompt(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={handleRunLlmTest}
            disabled={isTesting || !testPrompt.trim()}
          >
            {isTesting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Probar LLM
          </button>
        </div>

        {testResult && (
          <div className="test-output-card">
            <span className="test-output-badge">
              🤖 Respuesta Generada por {config.provider.toUpperCase()} ({config.model}):
            </span>
            <p className="test-output-text">{testResult}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default LlmSettingsManager;
