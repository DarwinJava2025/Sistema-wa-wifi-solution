// Group Broadcast Service for OpenWA Dashboard

import { API_BASE_URL } from './api';
import type { AiRoleType } from './aiAssistant';

export interface GroupContact {
  id: string;
  name: string;
  phone: string;
  note?: string;
}

export interface ContactGroup {
  id: string;
  name: string;
  description: string;
  roleAssociation?: AiRoleType | 'all';
  icon?: string;
  contacts: GroupContact[];
  createdAt: string;
  updatedAt: string;
}

export interface BroadcastLogItem {
  phone: string;
  name: string;
  status: 'success' | 'failed';
  error?: string;
  time: string;
}

export interface BroadcastRecord {
  id: string;
  groupId: string;
  groupName: string;
  sessionId: string;
  message: string;
  totalContacts: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  logs: BroadcastLogItem[];
}

const GROUPS_STORAGE_KEY = 'openwa_broadcast_groups';
const HISTORY_STORAGE_KEY = 'openwa_broadcast_history';

export const DEFAULT_GROUPS: ContactGroup[] = [
  {
    id: 'grp_support',
    name: '🛠️ Grupo de Soporte Técnico',
    description: 'Clientes con reportes técnicos activos, fallas de internet o seguimiento de tickets.',
    roleAssociation: 'support',
    icon: '🛠️',
    contacts: [
      { id: 'c1', name: 'Carlos Mendoza', phone: '584121112233', note: 'Ticket #ST-4821 - Falla luz PON' },
      { id: 'c2', name: 'Maria Rodriguez', phone: '584149998877', note: 'Revisión Router WiFi' },
      { id: 'c3', name: 'Pedro Gonzalez', phone: '584245556677', note: 'Reinicio ONT pendiente' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'grp_sales',
    name: '💼 Grupo de Ventas y Prospectos',
    description: 'Leads y prospectos interesados en cotizaciones de planes de fibra óptica y promociones.',
    roleAssociation: 'sales',
    icon: '💼',
    contacts: [
      { id: 'c4', name: 'Andrea Morales', phone: '584167778899', note: 'Interesada en Plan 100M' },
      { id: 'c5', name: 'Luis Fernandez', phone: '584123334455', note: 'Cotización Sector Norte' },
      { id: 'c6', name: 'Elena Ramirez', phone: '584142223344', note: 'Solicitó promo instalación' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'grp_billing',
    name: '💳 Grupo de Cobranzas y Pagos',
    description: 'Clientes con recordatorio de fecha de corte o reporte de transferencias bancarias.',
    roleAssociation: 'billing',
    icon: '💳',
    contacts: [
      { id: 'c7', name: 'Roberto Sanchez', phone: '584245551234', note: 'Corte día 20' },
      { id: 'c8', name: 'Gabriela Silva', phone: '584128889900', note: 'Pago Móvil pendiente' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'grp_vip',
    name: '⭐ Clientes VIP & Corporativos',
    description: 'Empresas y enlaces dedicados con soporte prioritario y avisos especiales.',
    roleAssociation: 'all',
    icon: '⭐',
    contacts: [
      { id: 'c9', name: 'Inversiones Tecnológicas C.A.', phone: '584140001122', note: 'Plan 500M Dedicado' },
      { id: 'c10', name: 'Distribuidora Global', phone: '584127776655', note: 'Enlace Corporativo' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/** Get all contact groups from storage */
export function getContactGroups(): ContactGroup[] {
  if (typeof window === 'undefined') return DEFAULT_GROUPS;
  try {
    const raw = localStorage.getItem(GROUPS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(DEFAULT_GROUPS));
      return DEFAULT_GROUPS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_GROUPS;
  }
}

/** Save list of contact groups */
export function saveContactGroups(groups: ContactGroup[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
  } catch (err) {
    console.error('Failed to save contact groups:', err);
  }
}

/** Save or update a single group */
export function saveGroup(group: ContactGroup): void {
  const groups = getContactGroups();
  const index = groups.findIndex(g => g.id === group.id);
  if (index >= 0) {
    groups[index] = { ...group, updatedAt: new Date().toISOString() };
  } else {
    groups.unshift({ ...group, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  saveContactGroups(groups);
}

/** Delete a group */
export function deleteGroup(id: string): void {
  const groups = getContactGroups().filter(g => g.id !== id);
  saveContactGroups(groups);
}

/** Get broadcast history */
export function getBroadcastHistory(): BroadcastRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save a broadcast record to history */
export function recordBroadcast(record: BroadcastRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const history = getBroadcastHistory();
    history.unshift(record);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
  } catch (err) {
    console.error('Failed to save broadcast history:', err);
  }
}

/** Build live cURL command string */
export function buildBroadcastCurl(
  sessionId: string,
  samplePhone: string,
  message: string,
): string {
  const apiKey = (typeof window !== 'undefined' ? sessionStorage.getItem('openwa_api_key') : '') || 'owa_k1_sample_key';
  const targetSession = sessionId || 'soporte-cliente';
  const targetPhone = samplePhone ? (samplePhone.includes('@') ? samplePhone : `${samplePhone}@c.us`) : '584121234567@c.us';
  const escapedMessage = message.replace(/"/g, '\\"').replace(/\n/g, '\\n');

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:2785';
  const endpoint = `${origin}/api/sessions/${encodeURIComponent(targetSession)}/messages/send-text`;

  return `curl -X POST "${endpoint}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey}" \\
  -d '{
    "chatId": "${targetPhone}",
    "text": "${escapedMessage}"
  }'`;
}

/** Send text message via session API */
export async function sendGroupMessage(
  sessionId: string,
  phone: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  const apiKey = typeof window !== 'undefined' ? sessionStorage.getItem('openwa_api_key') : '';
  const formattedChatId = phone.includes('@') ? phone : `${phone}@c.us`;

  try {
    const res = await fetch(`${API_BASE_URL}/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-API-Key': apiKey } : {}),
      },
      body: JSON.stringify({
        chatId: formattedChatId,
        text: message,
      }),
    });

    if (res.ok) {
      return { success: true };
    }

    const fallbackRes = await fetch(`${API_BASE_URL}/api/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-API-Key': apiKey } : {}),
      },
      body: JSON.stringify({
        sessionId,
        to: phone,
        message,
      }),
    });

    if (fallbackRes.ok) {
      return { success: true };
    }

    const errorJson = await res.json().catch(() => null);
    return {
      success: false,
      error: errorJson?.message || `Error ${res.status}: Falló el envío`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de conexión' };
  }
}
