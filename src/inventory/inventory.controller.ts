import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateIngredienteDto } from './dto/create-ingredient.dto';
import { InventarioService } from './inventory.service';

@ApiTags('inventario')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventario/ingredientes')
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Get()
  @Roles(Rol.ADMIN, Rol.MESERO)
  findAll() {
    return this.inventarioService.findAll();
  }

  @Post()
  @Roles(Rol.ADMIN)
  create(@Body() dto: CreateIngredienteDto) {
    return this.inventarioService.create(dto);
  }
}
