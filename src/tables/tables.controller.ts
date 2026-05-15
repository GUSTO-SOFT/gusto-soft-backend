import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { AsignarMeseroDto } from './dto/assign-waiter.dto';
import { QueryMesasDto } from './dto/query-tables.dto';
import { MesasService } from './tables.service';

@ApiTags('mesas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('mesas')
export class MesasController {
  constructor(private readonly mesasService: MesasService) {}

  @Get()
  @Roles(Rol.ADMIN, Rol.MESERO, Rol.CHEF)
  findAll(@Query() query: QueryMesasDto) {
    return this.mesasService.findAll(query);
  }

  @Post(':id/abrir')
  @Roles(Rol.ADMIN, Rol.MESERO)
  abrir(@Param('id', ParseIntPipe) id: number) {
    return this.mesasService.abrir(id);
  }

  @Patch(':id/asignar')
  @Roles(Rol.ADMIN, Rol.MESERO)
  asignar(@Param('id', ParseIntPipe) id: number, @Body() dto: AsignarMeseroDto) {
    return this.mesasService.asignar(id, dto);
  }
}
