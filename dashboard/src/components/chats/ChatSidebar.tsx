import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  CircleDashed,
  Loader2,
  Megaphone,
  Plus,
  Search,
  MessageSquare,
  Users,
  User,
  BellRing,
  Bot,
  Layers,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { Channel, Chat, ContactStatusGroup, Session } from '../../services/api';
import { getEffectiveAiConfig } from '../../services/aiAssistant';
import ChatAvatar from './ChatAvatar';

export type ChatsTab = 'chats' | 'channels' | 'status';
export type ChatCategory = 'active' | 'unread' | 'ai' | 'individual' | 'group' | 'all';

interface ChatSidebarProps {
  sessions: Session[];
  selectedSessionId: string;
  onSelectSession: (sessionId: string) => void;
  activeTab: ChatsTab;
  onSwitchTab: (tab: ChatsTab) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onComposeStatus: () => void;
  formatChatTime: (timestamp?: number) => string;
  chatsTab: {
    loading: boolean;
    chats: Chat[];
    activeChatId?: string;
    pictures?: Record<string, string | null>;
    onSelectChat: (chat: Chat) => void;
  };
  channelsTab: {
    engineLoading: boolean;
    supported: boolean;
    query: UseQueryResult<Channel[], Error>;
    channels: Channel[];
    activeChannelId?: string;
    onSelectChannel: (channel: Channel) => void;
  };
  statusTab: {
    loading: boolean;
    error: boolean;
    groups: ContactStatusGroup[];
    activeContactId: string | null;
    onSelectContact: (contactId: string) => void;
  };
}

export function ChatSidebar({
  sessions,
  selectedSessionId,
  onSelectSession,
  activeTab,
  onSwitchTab,
  searchQuery,
  onSearchQueryChange,
  onComposeStatus,
  formatChatTime,
  chatsTab,
  channelsTab,
  statusTab,
}: ChatSidebarProps) {
  const { t } = useTranslation();
  // Default to showing only chats with real message interactions (not empty synced contacts)
  const [chatCategory, setChatCategory] = useState<ChatCategory>('active');

  const formatLastMessageSnippet = (chat: Chat) => chat.lastMessage || '';

  // Helper to check if chat has real message interaction
  const hasRealMessage = (chat: Chat) => {
    const msg = (chat.lastMessage || '').trim();
    const hasMsg = msg !== '' && msg !== 'Aún sin mensajes' && msg !== 'No message yet';
    const hasUnread = (chat.unreadCount || 0) > 0;
    const hasValidTimestamp = (chat.timestamp || 0) > 0;
    return hasMsg || hasUnread || hasValidTimestamp;
  };

  // Calculate counts for section filters
  const counts = useMemo(() => {
    const list = chatsTab.chats;
    const activeList = list.filter(hasRealMessage);
    const unread = list.filter(c => c.unreadCount > 0).length;
    const individual = activeList.filter(c => c.kind === 'individual' || (!c.isGroup && c.kind !== 'group')).length;
    const group = activeList.filter(c => c.isGroup || c.kind === 'group').length;
    const ai = list.filter(c => {
      if (!selectedSessionId) return false;
      const conf = getEffectiveAiConfig(selectedSessionId, c.id);
      return conf.enabled;
    }).length;

    return { active: activeList.length, unread, individual, group, ai, all: list.length };
  }, [chatsTab.chats, selectedSessionId]);

  // Filter chats by category
  const filteredCategoryChats = useMemo(() => {
    const list = chatsTab.chats;
    switch (chatCategory) {
      case 'active':
        return list.filter(hasRealMessage);
      case 'unread':
        return list.filter(c => c.unreadCount > 0);
      case 'ai':
        return list.filter(c => {
          if (!selectedSessionId) return false;
          const conf = getEffectiveAiConfig(selectedSessionId, c.id);
          return conf.enabled;
        });
      case 'individual':
        return list.filter(c => (c.kind === 'individual' || (!c.isGroup && c.kind !== 'group')) && hasRealMessage(c));
      case 'group':
        return list.filter(c => (c.isGroup || c.kind === 'group') && hasRealMessage(c));
      case 'all':
      default:
        return list;
    }
  }, [chatsTab.chats, chatCategory, selectedSessionId]);

  // Split into visual chronological / priority sections when viewing 'active' or 'all'
  const chatSections = useMemo(() => {
    if (chatCategory !== 'all' && chatCategory !== 'active') {
      return [{ title: null, items: filteredCategoryChats }];
    }

    const unreadList = filteredCategoryChats.filter(c => c.unreadCount > 0);
    const readList = filteredCategoryChats.filter(c => (c.unreadCount || 0) === 0);

    const nowSec = Math.floor(Date.now() / 1000);
    const oneDayAgo = nowSec - 86400;

    const todayList = readList.filter(c => (c.timestamp || 0) >= oneDayAgo);
    const earlierList = readList.filter(c => (c.timestamp || 0) < oneDayAgo);

    const sections: Array<{ title: string | null; icon?: string; badgeClass?: string; items: Chat[] }> = [];

    if (unreadList.length > 0) {
      sections.push({
        title: `No Leídos (${unreadList.length})`,
        icon: '🔴',
        badgeClass: 'badge-unread',
        items: unreadList,
      });
    }

    if (todayList.length > 0) {
      sections.push({
        title: `Mensajes Recientes (${todayList.length})`,
        icon: '💬',
        badgeClass: 'badge-today',
        items: todayList,
      });
    }

    if (earlierList.length > 0) {
      sections.push({
        title: `Conversaciones Anteriores (${earlierList.length})`,
        icon: '📅',
        badgeClass: 'badge-earlier',
        items: earlierList,
      });
    }

    if (sections.length === 0 && filteredCategoryChats.length > 0) {
      sections.push({ title: null, items: filteredCategoryChats });
    }

    return sections;
  }, [filteredCategoryChats, chatCategory]);

  const activeSessionObj = sessions.find(s => s.id === selectedSessionId);

  const renderChatRow = (chat: Chat) => {
    const isActive = chatsTab.activeChatId === chat.id;
    const isAiActive = selectedSessionId && getEffectiveAiConfig(selectedSessionId, chat.id).enabled;

    return (
      <div
        key={chat.id}
        role="button"
        tabIndex={0}
        aria-current={isActive ? 'true' : undefined}
        className={`chat-item-card ${isActive ? 'active' : ''} ${chat.unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => chatsTab.onSelectChat(chat)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            chatsTab.onSelectChat(chat);
          }
        }}
      >
        <div className="chat-avatar-wrap">
          <ChatAvatar pictureUrl={chatsTab.pictures?.[chat.id]} kind={chat.kind} />
          {chat.unreadCount > 0 && <span className="avatar-unread-dot" />}
        </div>

        <div className="chat-item-info">
          <div className="chat-item-top">
            <span className="chat-item-name" title={chat.name || chat.id}>
              {chat.name || chat.id.split('@')[0]}
            </span>
            {chat.timestamp ? <span className="chat-item-time">{formatChatTime(chat.timestamp)}</span> : null}
          </div>

          <div className="chat-item-bottom">
            <span className="chat-item-snippet" title={formatLastMessageSnippet(chat)}>
              {formatLastMessageSnippet(chat) || <span className="no-message">{t('chats.noMessageYet')}</span>}
            </span>

            <div className="chat-item-badges">
              {isAiActive && (
                <span className="chat-ai-pill" title="Asistente IA activo en este chat">
                  <Sparkles size={11} />
                  IA
                </span>
              )}

              {chat.kind === 'group' && (
                <span className="chat-group-pill" title="Grupo de WhatsApp">
                  <Users size={11} />
                </span>
              )}

              {chat.unreadCount > 0 && (
                <span
                  className="chat-unread-badge"
                  title={t('chats.unreadBadge', { count: chat.unreadCount })}
                  aria-label={t('chats.unreadBadge', { count: chat.unreadCount })}
                >
                  {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside className="chats-sidebar">
      <div className="sidebar-header-box">
        {/* Session Switcher Card */}
        <div className="session-select-group">
          <div className="session-select-header">
            <span className="session-select-title">
              <Smartphone size={14} className="session-icon" />
              <span>Línea / Bot Activo:</span>
            </span>
            {activeSessionObj && (
              <span className="session-status-dot online" title="Sesión conectada">
                ● Conectado
              </span>
            )}
          </div>

          <select
            id="csb-1"
            value={selectedSessionId}
            onChange={e => onSelectSession(e.target.value)}
            className="session-selector"
          >
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                🤖 {s.name} ({s.phone || 'Sin número asignado'})
              </option>
            ))}
          </select>

          {sessions.length > 1 && (
            <div className="session-quick-pills" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
              {sessions.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectSession(s.id)}
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.7rem',
                    fontWeight: s.id === selectedSessionId ? 700 : 500,
                    borderRadius: '4px',
                    border: s.id === selectedSessionId ? '1px solid #3b82f6' : '1px solid var(--border)',
                    background: s.id === selectedSessionId ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-light)',
                    color: s.id === selectedSessionId ? '#60a5fa' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  🤖 {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chats / Channels / Status segmented control */}
        <div className="chats-tabs" role="tablist">
          {(['chats', 'channels', 'status'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={`chats-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => onSwitchTab(tab)}
            >
              {tab === 'chats' && <MessageSquare size={14} />}
              {tab === 'channels' && <Megaphone size={14} />}
              {tab === 'status' && <CircleDashed size={14} />}
              <span>{t(`chats.tab.${tab}`)}</span>
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="chat-search-input">
          <Search size={16} />
          <input
            type="text"
            placeholder={t('chats.searchPlaceholder')}
            value={searchQuery}
            onChange={e => onSearchQueryChange(e.target.value)}
          />
        </div>

        {/* Sub-Filters by Category / Section */}
        {activeTab === 'chats' && (
          <div className="chat-category-pills">
            <button
              type="button"
              className={`cat-pill ${chatCategory === 'active' ? 'active' : ''}`}
              onClick={() => setChatCategory('active')}
              title="Solo conversaciones con mensajes reales enviados o recibidos"
            >
              <MessageSquare size={13} />
              <span>Con Mensajes</span>
              <span className="cat-count">{counts.active}</span>
            </button>

            <button
              type="button"
              className={`cat-pill ${chatCategory === 'unread' ? 'active' : ''} ${counts.unread > 0 ? 'highlight-unread' : ''}`}
              onClick={() => setChatCategory('unread')}
            >
              <BellRing size={13} />
              <span>No leídos</span>
              {counts.unread > 0 && <span className="cat-count unread">{counts.unread}</span>}
            </button>

            <button
              type="button"
              className={`cat-pill ${chatCategory === 'ai' ? 'active' : ''}`}
              onClick={() => setChatCategory('ai')}
              title="Chats con Bot IA activado"
            >
              <Bot size={13} />
              <span>Bot IA</span>
              {counts.ai > 0 && <span className="cat-count">{counts.ai}</span>}
            </button>

            <button
              type="button"
              className={`cat-pill ${chatCategory === 'individual' ? 'active' : ''}`}
              onClick={() => setChatCategory('individual')}
            >
              <User size={13} />
              <span>Directos</span>
              <span className="cat-count">{counts.individual}</span>
            </button>

            <button
              type="button"
              className={`cat-pill ${chatCategory === 'group' ? 'active' : ''}`}
              onClick={() => setChatCategory('group')}
            >
              <Users size={13} />
              <span>Grupos</span>
              <span className="cat-count">{counts.group}</span>
            </button>

            <button
              type="button"
              className={`cat-pill ${chatCategory === 'all' ? 'active' : ''}`}
              onClick={() => setChatCategory('all')}
              title="Ver todos los contactos sincronizados de WhatsApp"
            >
              <Layers size={13} />
              <span>Sincronizados</span>
              <span className="cat-count">{counts.all}</span>
            </button>
          </div>
        )}

        {/* Compose a new status — only meaningful on the Status tab. */}
        {activeTab === 'status' && (
          <button type="button" className="btn-primary status-compose-trigger" onClick={onComposeStatus}>
            <Plus size={16} />
            {t('chats.status.compose')}
          </button>
        )}
      </div>

      {/* Chat list with separate visual sections */}
      {activeTab === 'chats' && (
        <div className="chats-list">
          {chatsTab.loading ? (
            <div className="chats-list-loading">
              <Loader2 className="animate-spin" size={24} />
              <span>{t('chats.loadingChats')}</span>
            </div>
          ) : filteredCategoryChats.length === 0 ? (
            <div className="chats-list-empty">
              <MessageSquare size={32} style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
              <span>
                {chatCategory === 'active'
                  ? 'No hay conversaciones activas con mensajes aún'
                  : 'No hay conversaciones en esta sección'}
              </span>
              {chatCategory === 'active' && counts.all > 0 && (
                <button
                  type="button"
                  onClick={() => setChatCategory('all')}
                  style={{
                    marginTop: '8px',
                    fontSize: '0.75rem',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    cursor: 'pointer',
                    color: '#60a5fa',
                    fontWeight: 600,
                  }}
                >
                  Ver todos los contactos sincronizados ({counts.all})
                </button>
              )}
            </div>
          ) : (
            chatSections.map((section, sIdx) => (
              <div key={section.title || sIdx} className="chat-section-group">
                {section.title && (
                  <div className={`chat-section-header ${section.badgeClass || ''}`}>
                    <span>
                      {section.icon} {section.title}
                    </span>
                  </div>
                )}
                {section.items.map(renderChatRow)}
              </div>
            ))
          )}
        </div>
      )}

      {/* Channels list */}
      {activeTab === 'channels' && (
        <div className="chats-list">
          {channelsTab.engineLoading ? (
            <div className="chats-list-loading">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : !channelsTab.supported ? (
            <div className="chats-list-empty">
              <span>{t('chats.channels.notSupported')}</span>
            </div>
          ) : channelsTab.query.isLoading ? (
            <div className="chats-list-loading">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : channelsTab.query.error ? (
            <div className="chats-list-empty">
              <AlertCircle size={24} className="text-warn" />
              <span>{t('chats.channels.notReady')}</span>
            </div>
          ) : (channelsTab.query.data?.length ?? 0) === 0 ? (
            <div className="chats-list-empty">
              <span>{t('chats.channels.empty')}</span>
            </div>
          ) : (
            channelsTab.channels.map(ch => (
              <div
                key={ch.id}
                role="button"
                tabIndex={0}
                aria-current={channelsTab.activeChannelId === ch.id ? 'true' : undefined}
                className={`chat-item-card ${channelsTab.activeChannelId === ch.id ? 'active' : ''}`}
                onClick={() => channelsTab.onSelectChannel(ch)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    channelsTab.onSelectChannel(ch);
                  }
                }}
              >
                <div className="chat-avatar">
                  <Megaphone size={20} />
                </div>
                <div className="chat-item-info">
                  <div className="chat-item-top">
                    <span className="chat-item-name">{ch.name}</span>
                  </div>
                  {ch.subscriberCount != null && (
                    <div className="chat-item-bottom">
                      <span className="chat-item-snippet">
                        {t('chats.channels.subscribers', { count: ch.subscriberCount })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Status list */}
      {activeTab === 'status' && (
        <div className="chats-list">
          {statusTab.loading ? (
            <div className="chats-list-loading">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : statusTab.error ? (
            <div className="chats-list-empty">
              <AlertCircle size={24} className="text-warn" />
              <span>{t('chats.status.loadError')}</span>
            </div>
          ) : statusTab.groups.length === 0 ? (
            <div className="chats-list-empty">
              <span>{t('chats.status.empty')}</span>
            </div>
          ) : (
            statusTab.groups.map(group => (
              <div
                key={group.contact.id}
                role="button"
                tabIndex={0}
                aria-current={statusTab.activeContactId === group.contact.id ? 'true' : undefined}
                className={`chat-item-card ${statusTab.activeContactId === group.contact.id ? 'active' : ''}`}
                onClick={() => statusTab.onSelectContact(group.contact.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    statusTab.onSelectContact(group.contact.id);
                  }
                }}
              >
                <div className="chat-avatar">
                  <CircleDashed size={20} />
                </div>
                <div className="chat-item-info">
                  <div className="chat-item-top">
                    <span className="chat-item-name">
                      {group.contact.name ?? group.contact.pushName ?? group.contact.id}
                    </span>
                    <span className="chat-item-time">
                      {formatChatTime(Math.floor(new Date(group.latest).getTime() / 1000))}
                    </span>
                  </div>
                  <div className="chat-item-bottom">
                    <span className="chat-item-snippet">
                      {t('chats.status.itemCount', { count: group.items.length })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </aside>
  );
}

export default ChatSidebar;
