import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtUser } from '../common/interfaces/jwt-user.interface';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateIngredienteDto } from './dto/create-ingredient.dto';
import { InventarioService } from './inventory.service';
import { StockService } from './stock.service';

type AuthRequest = Request & { user: JwtUser };

@ApiTags('inventario')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventario/ingredientes')
export class InventarioController {
  constructor(
    private readonly inventarioService: InventarioService,
    private readonly stockService: StockService,
  ) {}

  @Get()
  @Roles(Rol.ADMIN, Rol.MESERO)
  findAll(@Query() query: PaginationDto) {
    return this.inventarioService.findAll(query);
  }

  @Post()
  @Roles(Rol.ADMIN)
  create(@Body() dto: CreateIngredienteDto) {
    return this.inventarioService.create(dto);
  }

  @Post(':id/ajuste')
  @Roles(Rol.ADMIN)
  ajustar(@Param('id', ParseIntPipe) id: number, @Body() dto: AdjustStockDto, @Req() req: AuthRequest) {
    return this.stockService.ajustarStock(id, dto, req.user.sub);
  }

  @Get(':id/movimientos')
  @Roles(Rol.ADMIN)
  movimientos(@Param('id', ParseIntPipe) id: number, @Query() query: PaginationDto) {
    return this.stockService.findMovimientos(id, query);
  }
}
