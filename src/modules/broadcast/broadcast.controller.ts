import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { BroadcastService } from './broadcast.service';
import {
  BroadcastGroupDto,
  CreateBroadcastGroupDto,
  SendGroupBroadcastDto,
  DirectBroadcastDto,
  BroadcastExecutionResultDto,
} from './dto/broadcast.dto';
import { RequireRole } from '../auth/decorators/auth.decorators';
import { ApiKeyRole } from '../auth/entities/api-key.entity';

@ApiTags('broadcast')
@Controller()
export class BroadcastController {
  constructor(private readonly broadcastService: BroadcastService) {}

  @Get('broadcast/groups')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({
    summary: 'Listar todos los grupos de difusión disponibles y segmentados',
    description:
      'Retorna los grupos predefinidos (Soporte Técnico, Ventas, Cobranzas, VIP) y los grupos personalizados creados por el usuario, con sus plantillas y lista de contactos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de grupos de difusión',
    type: [BroadcastGroupDto],
  })
  getGroups(): BroadcastGroupDto[] {
    return this.broadcastService.getGroups();
  }

  @Post('broadcast/groups')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({
    summary: 'Crear un nuevo grupo de difusión segmentado',
    description:
      'Permite registrar un nuevo grupo con nombre, objetivo/descripción, ícono emoji y lista inicial de contactos.',
  })
  @ApiBody({ type: CreateBroadcastGroupDto })
  @ApiResponse({
    status: 201,
    description: 'Grupo creado exitosamente',
    type: BroadcastGroupDto,
  })
  createGroup(@Body() dto: CreateBroadcastGroupDto): BroadcastGroupDto {
    return this.broadcastService.createGroup(dto);
  }

  @Delete('broadcast/groups/:id')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({
    summary: 'Eliminar un grupo de difusión',
    description: 'Elimina un grupo de difusión según su identificador.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador del grupo (ej. grp_1726412891234)',
    example: 'grp_1726412891234',
  })
  @ApiResponse({
    status: 200,
    description: 'Grupo eliminado exitosamente',
  })
  deleteGroup(@Param('id') id: string) {
    return this.broadcastService.deleteGroup(id);
  }

  @Get('broadcast/history')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({
    summary: 'Obtener historial y registro de ejecuciones de difusión',
    description:
      'Retorna el historial de campañas de difusión despachadas, estadísticas de éxito/error y detalles por contacto.',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial de difusiones',
    type: [BroadcastExecutionResultDto],
  })
  getHistory(): BroadcastExecutionResultDto[] {
    return this.broadcastService.getHistory();
  }

  @Post('sessions/:sessionId/broadcast/send')
  @HttpCode(HttpStatus.OK)
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({
    summary: 'Enviar difusión masiva a un grupo de clientes desde una sesión de WhatsApp',
    description:
      'Ejecuta el envío automatizado a todos los contactos del grupo seleccionado (ej. "grp_support", "grp_sales", "grp_billing", "grp_vip"). ' +
      'Reemplaza en tiempo real las variables dinámicas {nombre}, {empresa}, {grupo}, {telefono} y aplica un intervalo anti-bloqueo entre envíos.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Nombre o ID de la sesión / chatbot remitente conectado',
    example: 'session-principal',
  })
  @ApiBody({ type: SendGroupBroadcastDto })
  @ApiResponse({
    status: 200,
    description: 'Resultado de la ejecución de la difusión con logs de entrega',
    type: BroadcastExecutionResultDto,
  })
  async sendGroupBroadcast(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendGroupBroadcastDto,
  ): Promise<BroadcastExecutionResultDto> {
    return this.broadcastService.sendGroupBroadcast(sessionId, dto);
  }

  @Post('sessions/:sessionId/broadcast/direct')
  @HttpCode(HttpStatus.OK)
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({
    summary: 'Enviar difusión directa a una lista personalizada de destinatarios',
    description:
      'Permite enviar un mensaje masivo directamente a un arreglo de números y nombres con sustitución de variables y control anti-bloqueo.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Nombre o ID de la sesión / chatbot remitente',
    example: 'session-principal',
  })
  @ApiBody({ type: DirectBroadcastDto })
  @ApiResponse({
    status: 200,
    description: 'Resultado de la ejecución de la difusión directa',
    type: BroadcastExecutionResultDto,
  })
  async sendDirectBroadcast(
    @Param('sessionId') sessionId: string,
    @Body() dto: DirectBroadcastDto,
  ): Promise<BroadcastExecutionResultDto> {
    return this.broadcastService.sendDirectBroadcast(sessionId, dto);
  }
}
