import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateProductoDto } from './dto/create-product.dto';
import { QueryProductosDto } from './dto/query-products.dto';
import { MenuService } from './menu.service';

@ApiTags('menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('menu/productos')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Post()
  @Roles(Rol.ADMIN)
  create(@Body() dto: CreateProductoDto) {
    return this.menuService.create(dto);
  }

  @Get()
  @Roles(Rol.ADMIN, Rol.MESERO)
  findAll(@Query() query: QueryProductosDto) {
    return this.menuService.findAll(query);
  }

  @Get(':id')
  @Roles(Rol.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.findById(id).then((producto) => this.menuService.toResponse(producto));
  }
}
