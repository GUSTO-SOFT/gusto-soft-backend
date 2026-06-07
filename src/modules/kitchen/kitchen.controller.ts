import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PedidoEstado } from '../../common/enums/order-status.enum';
import { Rol } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { PedidosService } from '../orders/orders.service';
import { QueryCocinaPedidosDto } from './dto/query-kitchen-orders.dto';

type AuthRequest = Request & { user: JwtUser };

@ApiTags('cocina')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cocina')
export class CocinaController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Get('pedidos')
  @Roles(Rol.ADMIN, Rol.CHEF, Rol.MESERO)
  findPedidos(@Query() query: QueryCocinaPedidosDto, @Req() req: AuthRequest) {
    const estadosDefault = [PedidoEstado.PENDIENTE, PedidoEstado.EN_PREPARACION, PedidoEstado.LISTO];

    return this.pedidosService.findCocina(
      query.estado?.length ? query.estado : estadosDefault,
      req.user.rol === Rol.MESERO ? req.user.sub : undefined,
    );
  }
}
