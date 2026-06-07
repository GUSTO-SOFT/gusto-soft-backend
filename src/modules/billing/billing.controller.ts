import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { CloseAccountDto } from './dto/close-account.dto';
import { SendInvoiceEmailDto } from './dto/send-invoice-email.dto';
import { FacturacionService } from './billing.service';

type AuthRequest = Request & { user: JwtUser };

@ApiTags('facturacion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('mesas')
export class CuentasMesaController {
  constructor(private readonly facturacionService: FacturacionService) {}

  @Get(':id/cuenta')
  @Roles(Rol.CAJERO, Rol.ADMIN)
  cuentaMesa(@Param('id', ParseIntPipe) id: number) {
    return this.facturacionService.cuentaMesa(id);
  }
}

@ApiTags('facturacion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cuentas')
export class CuentasController {
  constructor(private readonly facturacionService: FacturacionService) {}

  @Post(':id/descuento')
  @Roles(Rol.CAJERO, Rol.ADMIN)
  aplicarDescuento(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApplyDiscountDto,
    @Req() req: AuthRequest,
  ) {
    return this.facturacionService.aplicarDescuento(id, dto, req.user.sub);
  }

  @Post(':id/cerrar')
  @Roles(Rol.CAJERO, Rol.ADMIN)
  cerrar(@Param('id', ParseIntPipe) id: number, @Body() dto: CloseAccountDto, @Req() req: AuthRequest) {
    return this.facturacionService.cerrarCuenta(id, req.user.sub, dto);
  }
}

@ApiTags('facturacion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('facturas')
export class FacturasController {
  constructor(private readonly facturacionService: FacturacionService) {}

  @Get(':id/estado')
  @Roles(Rol.CAJERO, Rol.ADMIN)
  estado(@Param('id', ParseIntPipe) id: number) {
    return this.facturacionService.estadoFactura(id);
  }

  @Patch(':id/enviar-correo')
  @Roles(Rol.CAJERO, Rol.ADMIN)
  enviarCorreo(@Param('id', ParseIntPipe) id: number, @Body() dto: SendInvoiceEmailDto) {
    return this.facturacionService.enviarFacturaCorreo(id, dto);
  }

  @Get(':id/envio')
  @Roles(Rol.CAJERO, Rol.ADMIN)
  envios(@Param('id', ParseIntPipe) id: number) {
    return this.facturacionService.enviosFactura(id);
  }
}
