import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateIngredienteDto } from './dto/create-ingredient.dto';
import { UpdateIngredienteDto } from './dto/update-ingredient.dto';
import { ingredientImageUploadOptions } from './ingredient-image-upload';
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

  @Post('con-imagen')
  @Roles(Rol.ADMIN)
  @UseInterceptors(FileInterceptor('imagen', ingredientImageUploadOptions))
  createWithImage(@Body() body: Record<string, unknown>, @UploadedFile() file) {
    return this.inventarioService.createFromMultipart(body, file?.filename);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateIngredienteDto) {
    return this.inventarioService.update(id, dto);
  }

  @Patch(':id/imagen')
  @Roles(Rol.ADMIN)
  @UseInterceptors(FileInterceptor('imagen', ingredientImageUploadOptions))
  updateWithImage(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>, @UploadedFile() file) {
    return this.inventarioService.updateFromMultipart(id, body, file?.filename);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.inventarioService.remove(id);
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

@ApiTags('inventario')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventario/alertas')
export class InventarioAlertasController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  @Roles(Rol.ADMIN, Rol.CHEF)
  findActivas() {
    return this.stockService.findAlertasActivas();
  }
}
