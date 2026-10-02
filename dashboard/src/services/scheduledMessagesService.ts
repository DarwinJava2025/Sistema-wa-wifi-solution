// Scheduled & Bulk Messages Service for OpenWA Dashboard

import { API_BASE_URL } from './api';

export type ScheduledCampaignType = 'birthday' | 'offer' | 'notice' | 'custom';
export type ScheduledRepeatFrequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type CampaignStatus = 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
export type CampaignMediaType = 'text' | 'image' | 'video' | 'audio' | 'document';

export interface CampaignContact {
  id: string;
  name: string;
  phone: string;
  date?: string; // YYYY-MM-DD or DD/MM for birthdays/notices
  customData?: Record<string, string>;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: string;
  error?: string;
}

export interface ScheduledCampaign {
  id: string;
  title: string;
  type: ScheduledCampaignType;
  sessionId: string;
  messageTemplate: string;
  mediaType?: CampaignMediaType;
  mediaUrl?: string; // public URL or data URL
  mediaBase64?: string; // raw base64 data
  mediaFilename?: string;
  mediaMimetype?: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  repeat: ScheduledRepeatFrequency;
  intervalSeconds: number; // anti-ban delay (e.g., 5-10s)
  contacts: CampaignContact[];
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  nextRunAt?: string;
  totalSent: number;
  totalFailed: number;
}

const STORAGE_KEY = 'openwa_scheduled_campaigns';

/** Get all scheduled campaigns from localStorage */
export function getScheduledCampaigns(): ScheduledCampaign[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save list of campaigns */
export function saveScheduledCampaigns(campaigns: ScheduledCampaign[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
  } catch (err) {
    console.error('Failed to save scheduled campaigns:', err);
  }
}

/** Add or update a campaign */
export function saveCampaign(campaign: ScheduledCampaign): void {
  const campaigns = getScheduledCampaigns();
  const index = campaigns.findIndex(c => c.id === campaign.id);
  if (index >= 0) {
    campaigns[index] = { ...campaign, updatedAt: new Date().toISOString() };
  } else {
    campaigns.unshift({ ...campaign, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  saveScheduledCampaigns(campaigns);
}

/** Delete a campaign */
export function deleteCampaign(id: string): void {
  const campaigns = getScheduledCampaigns().filter(c => c.id !== id);
  saveScheduledCampaigns(campaigns);
}

/** Parse contacts from CSV / TXT / Table text */
export function parseContactsFile(fileContent: string): CampaignContact[] {
  const lines = fileContent
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) return [];

  const contacts: CampaignContact[] = [];

  // Check if first row is header
  const firstLine = lines[0].toLowerCase();
  const isHeader =
    firstLine.includes('nombre') ||
    firstLine.includes('name') ||
    firstLine.includes('numero') ||
    firstLine.includes('telefono') ||
    firstLine.includes('phone');

  const dataRows = isHeader ? lines.slice(1) : lines;

  dataRows.forEach((row, idx) => {
    // Delimiters: comma, semicolon, tab or pipe
    const delimiter = row.includes('\t')
      ? '\t'
      : row.includes(';')
      ? ';'
      : row.includes('|')
      ? '|'
      : ',';

    const cols = row.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length === 0) return;

    let name = '';
    let phone = '';
    let date = '';

    if (cols.length === 1) {
      phone = cols[0];
      name = `Contacto #${idx + 1}`;
    } else if (cols.length === 2) {
      // Determine which column is phone
      if (/\d{7,}/.test(cols[0])) {
        phone = cols[0];
        name = cols[1];
      } else {
        name = cols[0];
        phone = cols[1];
      }
    } else {
      name = cols[0];
      phone = cols[1];
      date = cols[2] || '';
    }

    // Clean phone number
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length >= 7) {
      contacts.push({
        id: `contact_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        name: name || `Cliente ${cleanPhone}`,
        phone: cleanPhone,
        date: date,
        status: 'pending',
      });
    }
  });

  return contacts;
}

/** Generate a ready-to-use CSV template */
export function generateCsvTemplate(): string {
  return `Nombre,Numero,Fecha_Cumpleanos_o_Aviso,Plan_o_Nota
Carlos Perez,584121234567,1990-09-15,Plan Fibra 100M
Maria Gomez,584149876543,1995-10-20,Plan Fibra 50M
Roberto Sanchez,584245551234,1988-09-15,Plan Gamer 200M
Andrea Morales,584167778899,2000-12-05,Plan Corporativo`;
}

/** Render dynamic message template with contact variables */
export function renderMessageTemplate(
  template: string,
  contact: CampaignContact,
  businessName: string = 'WiFi Solution Pro',
): string {
  let text = template;
  text = text.replace(/\{nombre\}/gi, contact.name);
  text = text.replace(/\{numero\}/gi, contact.phone);
  text = text.replace(/\{fecha\}/gi, contact.date || 'hoy');
  text = text.replace(/\{empresa\}/gi, businessName);

  if (contact.customData) {
    Object.entries(contact.customData).forEach(([key, val]) => {
      text = text.replace(new RegExp(`\\{${key}\\}`, 'gi'), val);
    });
  }

  return text;
}

/** Send message (Text, Image, Video, Audio, or Document) via OpenWA backend */
export async function sendWhatsAppMessage(
  sessionId: string,
  phone: string,
  message: string,
  media?: {
    type: CampaignMediaType;
    url?: string;
    base64?: string;
    filename?: string;
    mimetype?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  const apiKey = typeof window !== 'undefined' ? sessionStorage.getItem('openwa_api_key') : '';
  const formattedChatId = phone.includes('@') ? phone : `${phone}@c.us`;

  try {
    // 1. Text Only
    if (!media || media.type === 'text') {
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

      if (res.ok) return { success: true };
      const errJson = await res.json().catch(() => null);
      return { success: false, error: errJson?.message || `Error ${res.status}` };
    }

    // 2. Multimedia (Image, Video, Audio, Document)
    let endpoint = 'send-image';
    if (media.type === 'video') endpoint = 'send-video';
    if (media.type === 'audio') endpoint = 'send-audio';
    if (media.type === 'document') endpoint = 'send-document';

    // Extract clean base64 data without data:*/*;base64, prefix if present
    let rawBase64 = media.base64;
    if (rawBase64 && rawBase64.includes(';base64,')) {
      rawBase64 = rawBase64.split(';base64,')[1];
    }

    const payload: Record<string, any> = {
      chatId: formattedChatId,
    };

    if (rawBase64) {
      payload.base64 = rawBase64;
      payload.mimetype = media.mimetype;
    } else if (media.url) {
      payload.url = media.url;
      if (media.mimetype) payload.mimetype = media.mimetype;
    }

    if (media.filename) {
      payload.filename = media.filename;
    }

    if (media.type === 'audio') {
      payload.ptt = true; // send as voice note
    } else {
      payload.caption = message;
    }

    const res = await fetch(`${API_BASE_URL}/api/sessions/${encodeURIComponent(sessionId)}/messages/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-API-Key': apiKey } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      // If it was an audio file and also had a text message, send text as follow-up
      if (media.type === 'audio' && message.trim().length > 0) {
        await fetch(`${API_BASE_URL}/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'X-API-Key': apiKey } : {}),
          },
          body: JSON.stringify({
            chatId: formattedChatId,
            text: message,
          }),
        }).catch(() => {});
      }
      return { success: true };
    }

    const errorJson = await res.json().catch(() => null);
    return {
      success: false,
      error: errorJson?.message || `Error ${res.status}: Falló el envío multimedia (${media.type})`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de conexión con el servidor' };
  }
}
