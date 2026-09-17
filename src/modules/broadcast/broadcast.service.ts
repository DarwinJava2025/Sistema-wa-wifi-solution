import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { MessageService } from '../message/message.service';
import { createLogger } from '../../common/services/logger.service';
import {
  BroadcastGroupDto,
  CreateBroadcastGroupDto,
  SendGroupBroadcastDto,
  DirectBroadcastDto,
  BroadcastExecutionResultDto,
  BroadcastLogItemDto,
  BroadcastContactDto,
} from './dto/broadcast.dto';

const DEFAULT_GROUPS: BroadcastGroupDto[] = [
  {
    id: 'grp_support',
    name: '🛠️ Soporte Técnico',
    description: 'Clientes con reportes abiertos o mantenimiento de enlaces',
    icon: '🛠️',
    defaultTemplate:
      '🛠️ *Comunicado de Soporte Técnico - {empresa}:*\n\nEstimado(a) {nombre}, le informamos que las labores de mantenimiento en su zona han concluido exitosamente y el servicio se encuentra 100% operativo.\n\nSi experimenta lentitud, por favor reinicie su módem por 30 segundos. Para reportes responda a este chat.',
    contacts: [
      { name: 'Carlos Mendoza', phone: '584121112233', note: 'Ticket #ST-4821 - Falla de Fibra' },
      { name: 'María Paredes', phone: '584142223344', note: 'Ticket #ST-4902 - Cambio de Router' },
      { name: 'Jesús Silva', phone: '584163334455', note: 'Ticket #ST-5011 - Ping Alto' },
    ],
  },
  {
    id: 'grp_sales',
    name: '🔥 Ventas & Promociones',
    description: 'Prospectos interesados y promociones de aumento de velocidad',
    icon: '🔥',
    defaultTemplate:
      '🔥 *¡Promoción Exclusiva para ti, {nombre}!* 🚀\n\nEn {empresa} queremos premiarte: *Duplica tu velocidad de fibra óptica a 100 Mbps o 200 Mbps* manteniendo tu tarifa actual durante los próximos 3 meses.\n\n👉 Responde con la palabra *MEGAS* para activarlo de inmediato.',
    contacts: [
      { name: 'Alejandro Ruiz', phone: '584241119988', note: 'Consulta Plan 200M' },
      { name: 'Sofía Valero', phone: '584125556677', note: 'Leads Instagram' },
    ],
  },
  {
    id: 'grp_billing',
    name: '💳 Cobranzas & Facturación',
    description: 'Recordatorios de pago y notificación de corte',
    icon: '💳',
    defaultTemplate:
      '💳 *Aviso de Facturación - {empresa}:*\n\nEstimado(a) {nombre}, le recordamos que su fecha de corte se aproxima. Para evitar suspensión del servicio de internet, por favor reporte su comprobante de pago por este medio.',
    contacts: [
      { name: 'Fernando López', phone: '584147778899', note: 'Corte día 15 - Plan 50M' },
      { name: 'Daniela Castro', phone: '584128889900', note: 'Corte día 20 - Plan 100M' },
    ],
  },
  {
    id: 'grp_vip',
    name: '⭐ Clientes VIP / Dedicados',
    description: 'Clientes corporativos con enlaces dedicados simétricos',
    icon: '⭐',
    defaultTemplate:
      '⭐ *Notificación Corporativa - {empresa}:*\n\nEstimado(a) {nombre}, su enlace dedicado cuenta con monitoreo activo 24/7. Le informamos sobre mejoras de ancho de banda aplicadas a su troncal de red.',
    contacts: [
      { name: 'Inversiones Nova C.A.', phone: '584140001122', note: 'Enlace Dedicado 300M Simétrico' },
      { name: 'Corporación Alpha', phone: '584123332211', note: 'Enlace Dedicado 500M' },
    ],
  },
];

@Injectable()
export class BroadcastService {
  private readonly logger = createLogger('BroadcastService');
  private groups: Map<string, BroadcastGroupDto> = new Map();
  private history: BroadcastExecutionResultDto[] = [];

  constructor(private readonly messageService: MessageService) {
    for (const g of DEFAULT_GROUPS) {
      this.groups.set(g.id, { ...g });
    }
  }

  /**
   * List all predefined and custom broadcast groups.
   */
  getGroups(): BroadcastGroupDto[] {
    return Array.from(this.groups.values());
  }

  /**
   * Get a group by ID.
   */
  getGroupById(id: string): BroadcastGroupDto {
    const group = this.groups.get(id);
    if (!group) {
      throw new NotFoundException(`Broadcast group with ID "${id}" was not found.`);
    }
    return group;
  }

  /**
   * Create a new custom broadcast group.
   */
  createGroup(dto: CreateBroadcastGroupDto): BroadcastGroupDto {
    const id = 'grp_' + Date.now();
    const newGroup: BroadcastGroupDto = {
      id,
      name: dto.name.trim(),
      description: dto.description.trim(),
      icon: dto.icon || '👥',
      contacts: dto.contacts || [],
    };
    this.groups.set(id, newGroup);
    this.logger.log(`Created new broadcast group: ${newGroup.name} (${id})`);
    return newGroup;
  }

  /**
   * Delete a custom group.
   */
  deleteGroup(id: string): { success: boolean; message: string } {
    if (!this.groups.has(id)) {
      throw new NotFoundException(`Broadcast group with ID "${id}" was not found.`);
    }
    this.groups.delete(id);
    return { success: true, message: `Group ${id} deleted successfully.` };
  }

  /**
   * Get history of broadcast executions.
   */
  getHistory(): BroadcastExecutionResultDto[] {
    return this.history;
  }

  /**
   * Format phone number to WhatsApp JID.
   */
  private formatChatId(phone: string): string {
    const digitsOnly = phone.replace(/[^0-9]/g, '');
    if (!digitsOnly) return phone;
    return `${digitsOnly}@c.us`;
  }

  /**
   * Send a broadcast to a predefined or configured group from a specific WhatsApp session.
   */
  async sendGroupBroadcast(
    sessionId: string,
    dto: SendGroupBroadcastDto,
  ): Promise<BroadcastExecutionResultDto> {
    const group = this.groups.get(dto.groupId);
    if (!group && (!dto.contacts || dto.contacts.length === 0)) {
      throw new NotFoundException(
        `Group "${dto.groupId}" not found and no ad-hoc contacts were provided.`,
      );
    }

    const groupName = group?.name || `Grupo personalizado (${dto.groupId})`;
    const targetContacts: BroadcastContactDto[] = [
      ...(group?.contacts || []),
      ...(dto.contacts || []),
    ];

    if (targetContacts.length === 0) {
      throw new BadRequestException(`El grupo "${groupName}" no tiene contactos para enviar la difusión.`);
    }

    return this.executeBroadcast(
      sessionId,
      targetContacts,
      dto.message,
      groupName,
      dto.businessName || 'WiFi Solution Pro',
      dto.intervalSeconds ?? 4,
    );
  }

  /**
   * Send direct broadcast to a list of recipients.
   */
  async sendDirectBroadcast(
    sessionId: string,
    dto: DirectBroadcastDto,
  ): Promise<BroadcastExecutionResultDto> {
    if (!dto.recipients || dto.recipients.length === 0) {
      throw new BadRequestException('Se requiere al menos un destinatario para la difusión.');
    }

    return this.executeBroadcast(
      sessionId,
      dto.recipients,
      dto.message,
      'Difusión Directa',
      dto.businessName || 'WiFi Solution Pro',
      dto.intervalSeconds ?? 4,
    );
  }

  /**
   * Internal runner with variable substitution and anti-ban delay.
   */
  private async executeBroadcast(
    sessionId: string,
    contacts: BroadcastContactDto[],
    templateMessage: string,
    groupName: string,
    businessName: string,
    intervalSeconds: number,
  ): Promise<BroadcastExecutionResultDto> {
    const startTime = Date.now();
    const broadcastId = 'bcast_' + Date.now();
    const logs: BroadcastLogItemDto[] = [];
    let sentCount = 0;
    let failedCount = 0;

    this.logger.log(
      `Starting group broadcast ${broadcastId} to ${contacts.length} recipients via session "${sessionId}" (interval: ${intervalSeconds}s)`,
    );

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const chatId = this.formatChatId(contact.phone);

      // Personalize message with variables
      let personalized = templateMessage;
      personalized = personalized.replace(/\{nombre\}/gi, contact.name);
      personalized = personalized.replace(/\{empresa\}/gi, businessName);
      personalized = personalized.replace(/\{grupo\}/gi, groupName);
      personalized = personalized.replace(/\{telefono\}/gi, contact.phone);

      const timeStr = new Date().toLocaleTimeString();

      try {
        await this.messageService.sendText(sessionId, {
          chatId,
          text: personalized,
        });

        sentCount++;
        logs.push({
          name: contact.name,
          phone: contact.phone,
          status: 'success',
          time: timeStr,
        });
      } catch (err: any) {
        failedCount++;
        const errMsg = err?.message || 'Error al despachar mensaje';
        this.logger.warn(`Failed broadcast item to ${contact.phone}: ${errMsg}`);
        logs.push({
          name: contact.name,
          phone: contact.phone,
          status: 'failed',
          error: errMsg,
          time: timeStr,
        });
      }

      // Anti-ban delay between sequential dispatches
      if (i < contacts.length - 1 && intervalSeconds > 0) {
        await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000));
      }
    }

    const durationSeconds = Number(((Date.now() - startTime) / 1000).toFixed(2));
    const result: BroadcastExecutionResultDto = {
      success: sentCount > 0,
      broadcastId,
      sessionId,
      groupName,
      totalContacts: contacts.length,
      sentCount,
      failedCount,
      durationSeconds,
      logs,
    };

    this.history.unshift(result);
    // Keep max 100 historical records in memory
    if (this.history.length > 100) this.history.pop();

    this.logger.log(
      `Completed broadcast ${broadcastId}: ${sentCount}/${contacts.length} sent, ${failedCount} failed in ${durationSeconds}s`,
    );

    return result;
  }
}
