import { useState, useMemo, useRef, useEffect, Suspense } from 'react';
import { lazyWithRetry as lazy } from '../utils/lazyWithRetry';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  Send,
  Activity,
  Loader2,
  Smartphone,
  ChevronDown,
  Filter,
  Search,
  Check,
  Download,
  RefreshCw,
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  useSessionsQuery,
  useSessionStatsQuery,
  useWebhooksQuery,
  useStopSessionMutation,
  useStatsOverviewQuery,
  useSessionDetailedStatsQuery,
} from '../hooks/queries';
import { PageHeader } from '../components/PageHeader';
import { getSessionAiConfig, AI_ROLES, type AiRoleType } from '../services/aiAssistant';
import { downloadDashboardSummaryExcel } from '../utils/excelService';
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
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [botSearchQuery, setBotSearchQuery] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Fetch session-specific stats when a bot is selected
  const isBotFiltered = selectedBotId !== 'all';
  const { data: sessionDetailedStats } = useSessionDetailedStatsQuery(selectedBotId, isBotFiltered);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isDropdownOpen]);

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
      const aiConf = getSessionAiConfig(session.id, session.name);
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
      };
    });
  }, [sessions]);

  // Filter bots in dropdown search
  const filteredDropdownBots = useMemo(() => {
    if (!botSearchQuery.trim()) return enrichedBots;
    const q = botSearchQuery.toLowerCase();
    return enrichedBots.filter(
      b =>
        b.session.name.toLowerCase().includes(q) ||
        b.roleName.toLowerCase().includes(q) ||
        (b.session.phone && b.session.phone.toLowerCase().includes(q)) ||
        b.session.id.toLowerCase().includes(q),
    );
  }, [enrichedBots, botSearchQuery]);

  // Selected bot info when a specific bot filter is active
  const selectedBotData = useMemo(() => {
    if (selectedBotId === 'all') return null;
    return enrichedBots.find(b => b.session.id === selectedBotId) || null;
  }, [enrichedBots, selectedBotId]);

  // Standard metric cards (showing either global totals or filtered by selected bot)
  const statsCards = useMemo(() => {
    if (!isBotFiltered || !selectedBotData) {
      // Global Overview Mode
      const msgsToday = overview?.messages?.today
        ? overview.messages.today.sent + overview.messages.today.received
        : '—';
      const totalMsgs = overview?.messages
        ? overview.messages.sent + overview.messages.received
        : '—';
      const sentMsgs = overview?.messages?.sent ?? '—';

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
          value: msgsToday,
          icon: Send,
          detail: overview?.messages?.today
            ? `${overview.messages.today.sent} enviados · ${overview.messages.today.received} recibidos`
            : 'Mensajes enviados y recibidos hoy',
        },
        {
          label: 'MENSAJES ENVIADOS',
          value: sentMsgs,
          icon: Activity,
          detail: 'Salientes hacia clientes en todas las líneas',
        },
        {
          label: 'TOTAL MENSAJES',
          value: totalMsgs,
          icon: Activity,
          detail: overview?.messages
            ? `${overview.messages.received} recibidos · ${overview.messages.failed} fallidos`
            : `${webhookCount} Webhooks enrutando eventos`,
        },
      ];
    } else {
      // Specific Bot Filtered Mode (Showing the EXACT SAME 4 metric slots for the selected bot)
      const { session, isConnected } = selectedBotData;
      const msgs = sessionDetailedStats?.messages;
      const msgsToday = msgs ? msgs.today : '—';
      const sentMsgs = msgs ? msgs.sent : '—';
      const totalMsgs = msgs ? msgs.sent + msgs.received : '—';

      return [
        {
          label: 'ESTADO DE SESIÓN',
          value: isConnected ? '1 Online' : '0 Online',
          icon: MessageSquare,
          detail: `Bot: ${session.name} · ${session.phone || 'Sin vincular'}`,
          badge: isConnected ? 'Online' : 'Offline',
        },
        {
          label: 'MENSAJES HOY',
          value: msgsToday,
          icon: Send,
          detail: msgs ? `${msgs.today} mensajes procesados hoy por este bot` : 'Cargando mensajes de hoy...',
        },
        {
          label: 'MENSAJES ENVIADOS',
          value: sentMsgs,
          icon: Activity,
          detail: msgs ? `Respuestas y envíos de ${session.name}` : 'Cargando mensajes enviados...',
        },
        {
          label: 'TOTAL MENSAJES',
          value: totalMsgs,
          icon: Activity,
          detail: msgs
            ? `${msgs.received} recibidos · ${msgs.failed} fallidos`
            : 'Historial total de este bot',
        },
      ];
    }
  }, [isBotFiltered, selectedBotData, stats, overview, sessionDetailedStats, webhookCount]);

  const formatLastActive = (date?: string | null) => {
    if (!date) return t('common.never');
    const diff = Date.now() - new Date(date).getTime();
    if (diff < 60000) return t('common.justNow');
    if (diff < 3600000) return t('common.minAgo', { count: Math.floor(diff / 60000) });
    if (diff < 86400000) return t('common.hoursAgo', { count: Math.floor(diff / 3600000) });
    return new Date(date).toLocaleDateString();
  };

  const formatStatus = (status: string) => t(`sessionStatus.${status}`, { defaultValue: status });

  // Filter sessions table if a bot is selected
  const displayedSessions = useMemo(() => {
    if (selectedBotId === 'all') return sessions;
    return sessions.filter(s => s.id === selectedBotId);
  }, [sessions, selectedBotId]);

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

  return (
    <div className="dashboard">
      <PageHeader
        title={t('dashboard.title')}
        subtitle={
          selectedBotData
            ? `Mostrando métricas y estadísticas filtradas para el bot: ${selectedBotData.session.name}`
            : 'Monitorea el rendimiento, actividad y estadísticas detalladas de cada bot de WhatsApp en tiempo real'
        }
        badge={
          <span className="status-badge connected">
            {stats?.ready ? `${stats.ready} Bots Conectados` : 'Sistema Activo'}
          </span>
        }
        actions={
          <button
            type="button"
            className="btn-secondary"
            onClick={() => downloadDashboardSummaryExcel(stats, overview, sessions)}
            title="Descargar métricas y resumen general en formato Excel"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '13px',
            }}
          >
            <Download size={16} />
            <span>Descargar Resumen Excel</span>
          </button>
        }
      />

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            color: 'var(--error)',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid rgba(239, 68, 68, 0.25)',
          }}
        >
          <span>{t('dashboard.errorPrefix', { message: error })}</span>
          <button
            type="button"
            className="btn-sm"
            onClick={() => window.location.reload()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
          >
            <RefreshCw size={13} />
            <span>Reintentar</span>
          </button>
        </div>
      )}

      {/* BOT / SESSION FILTER DROPDOWN */}
      <div className="dashboard-bot-filter-bar">
        <div className="bot-filter-left">
          <div className="bot-filter-label">
            <Filter size={15} />
            <span>Filtrar por Bot / Sesión:</span>
          </div>

          {/* Custom Searchable Dropdown */}
          <div className="bot-select-dropdown-container" ref={dropdownRef}>
            <button
              type="button"
              className="bot-select-trigger-btn"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-expanded={isDropdownOpen}
            >
              <div className="trigger-content">
                {selectedBotData ? (
                  <>
                    <span className={`status-dot-mini ${selectedBotData.isConnected ? 'online' : 'offline'}`} />
                    <span className="trigger-icon">🤖</span>
                    <span className="trigger-bot-name">{selectedBotData.session.name}</span>
                    <span className="trigger-role-badge">{selectedBotData.roleName}</span>
                    {selectedBotData.session.phone && (
                      <span className="trigger-phone">({selectedBotData.session.phone})</span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="trigger-icon">🌐</span>
                    <span className="trigger-bot-name">Todos los Bots (Resumen Global)</span>
                    <span className="trigger-count-badge">{enrichedBots.length} creados</span>
                  </>
                )}
              </div>
              <ChevronDown size={16} className={`trigger-chevron ${isDropdownOpen ? 'open' : ''}`} />
            </button>

            {/* Dropdown Menu Popover */}
            {isDropdownOpen && (
              <div className="bot-select-menu-popover animate-fade-in">
                {enrichedBots.length > 4 && (
                  <div className="bot-search-box">
                    <Search size={14} />
                    <input
                      type="text"
                      placeholder="Buscar bot por nombre, rol o teléfono..."
                      value={botSearchQuery}
                      onChange={e => setBotSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </div>
                )}

                <div className="bot-options-list">
                  {/* Global "All" option */}
                  <div
                    className={`bot-option-item ${selectedBotId === 'all' ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedBotId('all');
                      setIsDropdownOpen(false);
                    }}
                  >
                    <div className="bot-option-left">
                      <span className="option-icon">🌐</span>
                      <div className="option-texts">
                        <span className="option-title">Todos los Bots (Resumen Global)</span>
                        <span className="option-sub">Métricas consolidadas de todas las líneas de WhatsApp</span>
                      </div>
                    </div>
                    <div className="option-right">
                      <span className="option-count">{enrichedBots.length}</span>
                      {selectedBotId === 'all' && <Check size={16} className="option-check" />}
                    </div>
                  </div>

                  <div className="bot-options-divider" />

                  {/* Individual bot options */}
                  {filteredDropdownBots.length === 0 ? (
                    <div className="bot-options-empty">No se encontraron bots coincidentes.</div>
                  ) : (
                    filteredDropdownBots.map(b => {
                      const isSelected = selectedBotId === b.session.id;
                      return (
                        <div
                          key={b.session.id}
                          className={`bot-option-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedBotId(b.session.id);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <div className="bot-option-left">
                            <span className={`status-dot-mini ${b.isConnected ? 'online' : 'offline'}`} />
                            <span className="option-icon">🤖</span>
                            <div className="option-texts">
                              <div className="option-name-row">
                                <span className="option-title">{b.session.name}</span>
                                <span className="option-role-tag">{b.roleName}</span>
                              </div>
                              <span className="option-sub">
                                {b.session.phone ? `📱 ${b.session.phone}` : '⚠️ Sin teléfono vinculado'} ·{' '}
                                {b.isConnected ? '🟢 Conectado' : '⚪ Desconectado'}
                              </span>
                            </div>
                          </div>

                          <div className="option-right">
                            {b.autoPilot && <span className="option-auto-pill">⚡ Auto</span>}
                            {isSelected && <Check size={16} className="option-check" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedBotId !== 'all' && (
          <button
            type="button"
            className="btn-reset-filter"
            onClick={() => setSelectedBotId('all')}
            title="Volver a la vista global de todos los bots"
          >
            Ver Global 🌐
          </button>
        )}
      </div>

      {/* TOP STATS CARDS */}
      <div className="stats-grid">
        {statsCards.map(({ label, value, icon: Icon, detail }) => (
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

      {/* CHARTS COMPONENT (FILTERED WHEN A BOT IS SELECTED) */}
      <Suspense fallback={null}>
        <DashboardCharts sessionId={selectedBotId !== 'all' ? selectedBotId : undefined} />
      </Suspense>

      {/* SESSIONS TABLE */}
      <section className="sessions-section">
        <div className="section-header">
          <div className="section-title-group">
            <Smartphone size={20} className="title-icon-primary" />
            <h2>{t('dashboard.sessionsOverview')}</h2>
          </div>
          <span className="section-subtitle">
            {selectedBotData
              ? `Mostrando sesión activa: ${selectedBotData.session.name}`
              : t('dashboard.showingSessions', { shown: displayedSessions.length, total: stats?.total ?? 0 })}
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
          {displayedSessions.length === 0 ? (
            <div className="table-row" style={{ justifyContent: 'center', color: 'var(--text-muted)' }}>
              {t('dashboard.noSessions')}
            </div>
          ) : (
            displayedSessions.map(session => (
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
