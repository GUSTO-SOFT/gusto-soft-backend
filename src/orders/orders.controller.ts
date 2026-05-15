import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtUser } from '../common/interfaces/jwt-user.interface';
import { CreatePedidoDto } from './dto/create-order.dto';
import { UpdateDetallesDto } from './dto/update-order-items.dto';
import { UpdateEstadoPedidoDto } from './dto/update-order-status.dto';
import { PedidosService } from './orders.service';

type AuthRequest = Request & { user: JwtUser };

@ApiTags('pedidos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Post()
  @Roles(Rol.ADMIN, Rol.MESERO)
  create(@Body() dto: CreatePedidoDto, @Req() req: AuthRequest) {
    return this.pedidosService.create(dto, req.user.sub);
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.MESERO, Rol.CHEF)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pedidosService.findById(id).then((pedido) => this.pedidosService.toResponse(pedido));
  }

  @Patch(':id/detalles')
  @Roles(Rol.ADMIN, Rol.MESERO)
  updateDetalles(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDetallesDto) {
    return this.pedidosService.updateDetalles(id, dto);
  }

  @Post(':id/enviar')
  @Roles(Rol.ADMIN, Rol.MESERO)
  enviar(@Param('id', ParseIntPipe) id: number) {
    return this.pedidosService.enviar(id);
  }

  @Patch(':id/estado')
  @Roles(Rol.ADMIN, Rol.CHEF)
  updateEstado(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEstadoPedidoDto) {
    return this.pedidosService.updateEstado(id, dto);
  }

  @Patch(':id/confirmar-entrega')
  @Roles(Rol.ADMIN, Rol.MESERO)
  confirmarEntrega(@Param('id', ParseIntPipe) id: number) {
    return this.pedidosService.confirmarEntrega(id);
  }

  @Get(':id/notificaciones')
  @Roles(Rol.ADMIN, Rol.MESERO)
  notificaciones(@Param('id', ParseIntPipe) id: number) {
    return this.pedidosService.notificaciones(id);
  }
}
