import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PedidoEstado } from '../common/enums/order-status.enum';
import { Rol } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { PedidosService } from '../orders/orders.service';
import { QueryCocinaPedidosDto } from './dto/query-kitchen-orders.dto';

@ApiTags('cocina')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cocina')
export class CocinaController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Get('pedidos')
  @Roles(Rol.ADMIN, Rol.CHEF)
  findPedidos(@Query() query: QueryCocinaPedidosDto) {
    return this.pedidosService.findCocina(
      query.estado?.length ? query.estado : [PedidoEstado.PENDIENTE, PedidoEstado.EN_PREPARACION],
    );
  }
}
