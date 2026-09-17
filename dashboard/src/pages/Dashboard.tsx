import { useState, useMemo, Suspense } from 'react';
import { lazyWithRetry as lazy } from '../utils/lazyWithRetry';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  Send,
  Activity,
  Loader2,
  Bot,
  Sparkles,
  Zap,
  Layers,
  Cpu,
  Smartphone,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  useSessionsQuery,
  useSessionStatsQuery,
  useWebhooksQuery,
  useStopSessionMutation,
  useStatsOverviewQuery,
} from '../hooks/queries';
import { PageHeader } from '../components/PageHeader';
import { getSessionAiConfig, AI_ROLES, type AiRoleType } from '../services/aiAssistant';
import './Dashboard.css';

// Lazy load analytics charts
const DashboardCharts = lazy(() => import('../components/DashboardCharts').then(m => ({ default: m.DashboardCharts })));

export function Dashboard() {
  const { t } = useTranslation();
  useDocumentTitle(t('dashboard.title'));
  const navigate = useNavigate();

  const { data: sessions = [], isLoading: loadingSessions, error: sessionsError } = useSessionsQuery();
  const { data: stats } = useSessionStatsQuery();
  const { data: webhooks = [] } = useWebhooksQuery();
  const { data: overview } = useStatsOverviewQuery();
  const stopMutation = useStopSessionMutation();

  // Selected bot/session filter: 'all' or specific sessionId
  const [selectedBotId, setSelectedBotId] = useState<string>('all');

  const messagesToday = overview ? overview.messages.today.sent + overview.messages.today.received : '—';
  const totalMessages = overview ? overview.messages.sent + overview.messages.received : '—';
  const loading = loadingSessions;
  const error =
    sessionsError instanceof Error ? sessionsError.message : sessionsError ? t('dashboard.loadError') : null;
  const webhookCount = webhooks.length;

  const handleDisconnect = async (id: string) => {
    try {
      await stopMutation.mutateAsync(id);
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  // Build bot information enriched with AI configurations
  const enrichedBots = useMemo(() => {
    return sessions.map(session => {
      const aiConf = getSessionAiConfig(session.id);
      const isConnected = session.status === 'ready';
      const roleDef = aiConf ? AI_ROLES[aiConf.role] : null;

      return {
        session,
        aiConf,
        isConnected,
        roleName: aiConf?.role === 'custom' && aiConf.customRoleName ? aiConf.customRoleName : roleDef?.name || 'Asistente Estándar',
        roleType: (aiConf?.role || 'support') as AiRoleType,
        businessName: aiConf?.businessName || session.name,
        autoPilot: aiConf?.autoPilot ?? false,
        aiEnabled: aiConf?.enabled ?? false,
        llmProvider: aiConf?.llmConfig?.provider || 'openai',
        llmModel: aiConf?.llmConfig?.model || 'gpt-4o-mini',
        docsCount: aiConf?.documents?.length || 0,
        urlsCount: aiConf?.urls?.length || 0,
        triggersCount: (aiConf?.templateTriggers || []).filter(t => t.enabled).length,
      };
    });
  }, [sessions]);

  // Selected bot info when a specific bot filter is active
  const selectedBotData = useMemo(() => {
    if (selectedBotId === 'all') return null;
    return enrichedBots.find(b => b.session.id === selectedBotId) || null;
  }, [enrichedBots, selectedBotId]);

  // Dynamic stat cards based on selection
  const dynamicStatsCards = useMemo(() => {
    if (!selectedBotData) {
      // Global overview cards
      const activeAiBotsCount = enrichedBots.filter(b => b.aiEnabled).length;

      return [
        {
          label: 'SESIONES CONECTADAS',
          value: stats?.ready ?? 0,
          icon: MessageSquare,
          detail: stats ? `${stats.active} en ejecución · ${stats.total} creadas en total` : undefined,
          badge: `${stats?.ready ?? 0} Online`,
        },
        {
          label: 'MENSAJES HOY',
          value: messagesToday,
          icon: Send,
          detail: 'Mensajes enviados y recibidos en todas las líneas',
        },
        {
          label: 'BOTS IA ACTIVOS',
          value: activeAiBotsCount,
          icon: Bot,
          detail: `${enrichedBots.filter(b => b.autoPilot).length} con Piloto Automático`,
        },
        {
          label: 'TOTAL MENSAJES',
          value: totalMessages,
          icon: Activity,
          detail: `${webhookCount} Webhooks enrutando eventos`,
        },
      ];
    } else {
      // Specific bot metrics
      const { session, isConnected, roleName, autoPilot, llmModel, llmProvider, triggersCount, docsCount } = selectedBotData;

      return [
        {
          label: `ESTADO: ${session.name}`,
          value: isConnected ? 'Conectado' : session.status.toUpperCase(),
          icon: MessageSquare,
          detail: `Teléfono: ${session.phone || 'Sin vincular'}`,
          badge: isConnected ? 'Online' : 'Offline',
          highlight: isConnected ? 'success' : 'warn',
        },
        {
          label: 'ROL INTELIGENTE',
          value: roleName,
          icon: Bot,
          detail: `Empresa: ${selectedBotData.businessName}`,
        },
        {
          label: 'PILOTO AUTOMÁTICO',
          value: autoPilot ? '⚡ Activo' : '⏸️ Pausado',
          icon: Zap,
          detail: `Motor: ${llmProvider.toUpperCase()} (${llmModel})`,
        },
        {
          label: 'BASE & PLANTILLAS',
          value: `${triggersCount} Plantillas`,
          icon: Layers,
          detail: `${docsCount} documentos y listas de precios`,
        },
      ];
    }
  }, [selectedBotData, enrichedBots, stats, messagesToday, totalMessages, webhookCount]);

  const formatLastActive = (date?: string | null) => {
    if (!date) return t('common.never');
    const diff = Date.now() - new Date(date).getTime();
    if (diff < 60000) return t('common.justNow');
    if (diff < 3600000) return t('common.minAgo', { count: Math.floor(diff / 60000) });
    if (diff < 86400000) return t('common.hoursAgo', { count: Math.floor(diff / 3600000) });
    return new Date(date).toLocaleDateString();
  };

  const formatStatus = (status: string) => t(`sessionStatus.${status}`, { defaultValue: status });

  if (loading) {
    return (
      <div
        className="dashboard"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}
      >
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard" style={{ padding: '2rem' }}>
        <div
          style={{ background: 'rgba(239, 68, 68, 0.12)', padding: '1rem', borderRadius: '8px', color: 'var(--error)' }}
        >
          {t('dashboard.errorPrefix', { message: error })}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <PageHeader
        title={t('dashboard.title')}
        subtitle="Monitorea el rendimiento, actividad y estadísticas detalladas de cada bot de WhatsApp en tiempo real"
        badge={
          <span className="status-badge connected">
            {stats?.ready ? `${stats.ready} Bots Conectados` : 'Sistema Activo'}
          </span>
        }
      />

      {/* BOT / SESSION FILTER SELECTOR BAR */}
      <div className="dashboard-bot-filter-bar">
        <div className="bot-filter-label">
          <Filter size={15} />
          <span>Filtrar por Bot / Sesión:</span>
        </div>

        <div className="bot-filter-pills-row">
          <button
            type="button"
            className={`bot-filter-pill ${selectedBotId === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedBotId('all')}
          >
            <span className="filter-pill-icon">🌐</span>
            <span className="filter-pill-name">Todos los Bots (Global)</span>
            <span className="filter-pill-count">{enrichedBots.length}</span>
          </button>

          {enrichedBots.map(b => (
            <button
              key={b.session.id}
              type="button"
              className={`bot-filter-pill ${selectedBotId === b.session.id ? 'active' : ''}`}
              onClick={() => setSelectedBotId(b.session.id)}
            >
              <span className={`status-dot-mini ${b.isConnected ? 'online' : 'offline'}`} />
              <span className="filter-pill-icon">🤖</span>
              <span className="filter-pill-name">{b.session.name}</span>
              <span className="filter-pill-role">({b.roleName})</span>
            </button>
          ))}
        </div>
      </div>

      {/* TOP STATS CARDS */}
      <div className="stats-grid">
        {dynamicStatsCards.map(({ label, value, icon: Icon, detail }) => (
          <div key={label} className="stat-card">
            <Icon className="stat-watermark" />
            <div className="stat-header">
              <span className="stat-label">{label}</span>
              <Icon size={20} className="stat-icon" />
            </div>
            <div className="stat-value">{typeof value === 'number' ? value.toLocaleString() : value}</div>
            {detail && <div className="stat-detail">{detail}</div>}
          </div>
        ))}
      </div>

      {/* DETAILED STATS BREAKDOWN PER BOT */}
      <section className="bots-breakdown-section">
        <div className="section-header">
          <div className="section-title-group">
            <Bot size={22} className="title-icon-primary" />
            <h2>
              {selectedBotData
                ? `Estadísticas de: ${selectedBotData.session.name}`
                : 'Estadísticas y Rendimiento por Bot Chat Creado'}
            </h2>
          </div>
          <span className="section-subtitle">
            {selectedBotData
              ? 'Detalle de configuración, rol inteligente y automatizaciones asignadas a esta sesión'
              : `${enrichedBots.length} bots registrados con roles y motores LLM independientes`}
          </span>
        </div>

        {enrichedBots.length === 0 ? (
          <div className="no-bots-card">
            <Bot size={40} style={{ opacity: 0.35, marginBottom: '0.75rem' }} />
            <h3>No hay Bots ni Sesiones creadas todavía</h3>
            <p>Crea tu primer bot de WhatsApp para comenzar a ver estadísticas y respuestas automáticas por separado.</p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate('/sessions')}
              style={{ marginTop: '1rem' }}
            >
              🚀 Crear mi Primer Bot IA
            </button>
          </div>
        ) : (
          <div className="bots-cards-grid">
            {(selectedBotId === 'all'
              ? enrichedBots
              : enrichedBots.filter(b => b.session.id === selectedBotId)
            ).map(b => (
              <div key={b.session.id} className={`bot-stat-card ${b.isConnected ? 'is-connected' : ''}`}>
                {/* Bot Card Header */}
                <div className="bot-card-header">
                  <div className="bot-card-title-wrap">
                    <div className="bot-avatar-box">
                      <Bot size={20} />
                    </div>
                    <div className="bot-title-texts">
                      <div className="bot-name-row">
                        <span className="bot-main-name">{b.session.name}</span>
                        <span className={`bot-conn-badge ${b.isConnected ? 'online' : 'offline'}`}>
                          {b.isConnected ? '● Conectado' : '● Desconectado'}
                        </span>
                      </div>
                      <span className="bot-phone-sub">
                        <Smartphone size={12} />
                        {b.session.phone ? b.session.phone : 'Sin teléfono vinculado'}
                      </span>
                    </div>
                  </div>

                  <div className="bot-role-tag">
                    <Sparkles size={13} />
                    <span>{b.roleName}</span>
                  </div>
                </div>

                {/* Bot Stats & Parameters Grid */}
                <div className="bot-card-metrics-grid">
                  <div className="bot-metric-item">
                    <span className="metric-label">Piloto Automático</span>
                    <span className="metric-value">
                      {b.autoPilot ? (
                        <span className="val-pill active">⚡ Auto-Responder</span>
                      ) : (
                        <span className="val-pill inactive">Pausado</span>
                      )}
                    </span>
                  </div>

                  <div className="bot-metric-item">
                    <span className="metric-label">Motor LLM</span>
                    <span className="metric-value code-font">
                      <Cpu size={13} /> {b.llmProvider.toUpperCase()}
                    </span>
                  </div>

                  <div className="bot-metric-item">
                    <span className="metric-label">Plantillas Meta</span>
                    <span className="metric-value">
                      📋 {b.triggersCount} {b.triggersCount === 1 ? 'disparador' : 'disparadores'}
                    </span>
                  </div>

                  <div className="bot-metric-item">
                    <span className="metric-label">Base de Conocimiento</span>
                    <span className="metric-value">
                      📂 {b.docsCount} archivos · {b.urlsCount} URLs
                    </span>
                  </div>
                </div>

                {/* Bot Quick Actions */}
                <div className="bot-card-footer-actions">
                  <button
                    type="button"
                    className="btn-bot-action"
                    onClick={() => navigate('/chats')}
                    title="Ver chats atendidos por este bot"
                  >
                    <MessageSquare size={14} />
                    <span>Abrir Chats</span>
                    <ChevronRight size={14} />
                  </button>

                  <button
                    type="button"
                    className="btn-bot-action secondary"
                    onClick={() => navigate('/sessions')}
                    title="Configurar rol, prompts y precios de este bot"
                  >
                    <span>Gestionar Bot</span>
                    <ExternalLink size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CHARTS COMPONENT */}
      <Suspense fallback={null}>
        <DashboardCharts />
      </Suspense>

      {/* SESSIONS TABLE */}
      <section className="sessions-section">
        <div className="section-header">
          <div className="section-title-group">
            <Smartphone size={20} className="title-icon-primary" />
            <h2>{t('dashboard.sessionsOverview')}</h2>
          </div>
          <span className="section-subtitle">
            {t('dashboard.showingSessions', { shown: sessions.length, total: stats?.total ?? 0 })}
          </span>
        </div>

        <div className="sessions-table">
          <div className="table-header">
            <span>{t('dashboard.columns.sessionId')}</span>
            <span>{t('dashboard.columns.phone')}</span>
            <span>{t('dashboard.columns.status')}</span>
            <span>{t('dashboard.columns.lastActive')}</span>
            <span>{t('dashboard.columns.actions')}</span>
          </div>
          {sessions.length === 0 ? (
            <div className="table-row" style={{ justifyContent: 'center', color: 'var(--text-muted)' }}>
              {t('dashboard.noSessions')}
            </div>
          ) : (
            sessions.map(session => (
              <div key={session.id} className="table-row">
                <div className="session-info-cell">
                  <span className="session-id">{session.id.substring(0, 12)}</span>
                  <span className="session-name" title={session.name}>
                    {session.name}
                  </span>
                </div>
                <span className="phone">{session.phone || '—'}</span>
                <span className={`status-pill ${session.status}`}>{formatStatus(session.status)}</span>
                <span className="last-active">{formatLastActive(session.lastActive)}</span>
                <div className="actions">
                  <button className="btn-sm" onClick={() => navigate('/sessions')}>
                    {t('dashboard.view')}
                  </button>
                  {['ready', 'initializing', 'qr_ready'].includes(session.status) && (
                    <button className="btn-sm danger" onClick={() => handleDisconnect(session.id)}>
                      {t('dashboard.disconnect')}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
