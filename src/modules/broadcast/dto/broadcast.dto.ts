import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BroadcastContactDto {
  @ApiProperty({
    description: 'Nombre del contacto / cliente',
    example: 'Carlos Mendoza',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Número de WhatsApp con código de país (ej. 584121234567 o 584121234567@c.us)',
    example: '584121234567',
  })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiPropertyOptional({
    description: 'Nota informativa, plan contratado o número de ticket',
    example: 'Plan 100M Fibra Óptica - Ticket #ST-4821',
  })
  @IsString()
  @IsOptional()
  note?: string;
}

export class CreateBroadcastGroupDto {
  @ApiProperty({
    description: 'Nombre identificador del grupo de difusión',
    example: 'Clientes Sector Norte - Fibra Óptica',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Descripción u objetivo del grupo segmentado',
    example: 'Clientes asignados al nodo central para avisos de mantenimiento y facturación',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({
    description: 'Ícono emoji representativo del grupo',
    example: '🌐',
    default: '👥',
  })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({
    description: 'Lista inicial de contactos pertenecientes al grupo',
    type: [BroadcastContactDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BroadcastContactDto)
  @IsOptional()
  contacts?: BroadcastContactDto[];
}

export class SendGroupBroadcastDto {
  @ApiProperty({
    description:
      'Identificador del grupo destino (ej. "grp_support", "grp_sales", "grp_billing", "grp_vip" o ID de grupo personalizado)',
    example: 'grp_support',
  })
  @IsString()
  @IsNotEmpty()
  groupId!: string;

  @ApiProperty({
    description:
      'Contenido del mensaje a difundir. Soporta variables automáticas: {nombre}, {empresa}, {grupo}, {telefono}',
    example:
      '🛠️ *Aviso de Soporte Técnico - {empresa}:*\n\nEstimado(a) {nombre}, le informamos que las labores de optimización de red han finalizado satisfactoriamente y su servicio se encuentra 100% activo.\n\nPara cualquier duda responda a este mensaje.',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({
    description: 'Nombre de la empresa para reemplazar la variable {empresa}',
    example: 'WiFi Solution Pro',
    default: 'WiFi Solution Pro',
  })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiPropertyOptional({
    description: 'Intervalo de espera anti-bloqueo (antiban) en segundos entre cada mensaje despachado',
    example: 4,
    default: 4,
    minimum: 1,
    maximum: 60,
  })
  @IsNumber()
  @Min(1)
  @Max(60)
  @IsOptional()
  intervalSeconds?: number;

  @ApiPropertyOptional({
    description: 'Contactos adicionales o personalizados para incluir en esta difusión',
    type: [BroadcastContactDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BroadcastContactDto)
  @IsOptional()
  contacts?: BroadcastContactDto[];
}

export class DirectBroadcastDto {
  @ApiProperty({
    description: 'Lista de destinatarios a los cuales enviar el mensaje masivo',
    type: [BroadcastContactDto],
    example: [
      { name: 'Ana Gómez', phone: '584121112233', note: 'Ventas VIP' },
      { name: 'Roberto Díaz', phone: '584149998877', note: 'Soporte Residencial' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BroadcastContactDto)
  recipients!: BroadcastContactDto[];

  @ApiProperty({
    description:
      'Texto del mensaje a enviar con variables dinámicas: {nombre}, {empresa}, {telefono}',
    example:
      '🔥 ¡Hola {nombre}! En {empresa} tenemos una oferta especial para ti. Responde MEGAS para más info.',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({
    description: 'Nombre de la empresa para la variable {empresa}',
    example: 'WiFi Solution Pro',
    default: 'WiFi Solution Pro',
  })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiPropertyOptional({
    description: 'Intervalo antiban en segundos entre envíos',
    example: 4,
    default: 4,
    minimum: 1,
    maximum: 60,
  })
  @IsNumber()
  @Min(1)
  @Max(60)
  @IsOptional()
  intervalSeconds?: number;
}

export class BroadcastLogItemDto {
  @ApiProperty({ example: 'Carlos Mendoza' })
  name!: string;

  @ApiProperty({ example: '584121234567' })
  phone!: string;

  @ApiProperty({ example: 'success', enum: ['success', 'failed'] })
  status!: 'success' | 'failed';

  @ApiPropertyOptional({ example: 'Timeout or unreachable recipient' })
  error?: string;

  @ApiProperty({ example: '11:42:15' })
  time!: string;
}

export class BroadcastExecutionResultDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'bcast_1726412891234' })
  broadcastId!: string;

  @ApiProperty({ example: 'session-principal' })
  sessionId!: string;

  @ApiProperty({ example: '🛠️ Soporte Técnico' })
  groupName!: string;

  @ApiProperty({ example: 15 })
  totalContacts!: number;

  @ApiProperty({ example: 14 })
  sentCount!: number;

  @ApiProperty({ example: 1 })
  failedCount!: number;

  @ApiProperty({ example: 56.4 })
  durationSeconds!: number;

  @ApiProperty({ type: [BroadcastLogItemDto] })
  logs!: BroadcastLogItemDto[];
}

export class BroadcastGroupDto {
  @ApiProperty({ example: 'grp_support' })
  id!: string;

  @ApiProperty({ example: '🛠️ Soporte Técnico' })
  name!: string;

  @ApiProperty({ example: 'Clientes con reportes o incidencias técnicas de red' })
  description!: string;

  @ApiProperty({ example: '🛠️' })
  icon!: string;

  @ApiProperty({ type: [BroadcastContactDto] })
  contacts!: BroadcastContactDto[];

  @ApiPropertyOptional({
    example: '🛠️ Comunicado de Soporte Técnico - {empresa}: Estimado(a) {nombre}...',
  })
  defaultTemplate?: string;
}
