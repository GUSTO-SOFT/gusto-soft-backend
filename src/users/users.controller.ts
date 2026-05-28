import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateMeseroDto, CreateUsuarioDto } from './dto/create-user.dto';
import { QueryUsuariosDto } from './dto/query-users.dto';
import { UpdateUsuarioDto, UpdateUsuarioEstadoDto, UpdateUsuarioRolDto } from './dto/update-user-admin.dto';
import { UsuariosService } from './users.service';

@ApiTags('usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @Roles(Rol.ADMIN)
  findAll(@Query() query: QueryUsuariosDto) {
    return this.usuariosService.findAll(query);
  }

  @Post()
  @Roles(Rol.ADMIN)
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.createByAdmin(dto);
  }

  @Post('meseros')
  @Roles(Rol.ADMIN)
  createMeseros(@Body() dtos: CreateMeseroDto[]) {
    return this.usuariosService.createMeseros(dtos);
  }

  @Get('meseros/disponibles')
  @Roles(Rol.ADMIN)
  meserosDisponibles() {
    return this.usuariosService.findEligibleMeseros();
  }

  @Patch(':id')
  @Roles(Rol.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUsuarioDto) {
    return this.usuariosService.updateByAdmin(id, dto);
  }

  @Patch(':id/rol')
  @Roles(Rol.ADMIN)
  updateRol(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUsuarioRolDto) {
    return this.usuariosService.updateRol(id, dto.rol);
  }

  @Patch(':id/estado')
  @Roles(Rol.ADMIN)
  updateEstado(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUsuarioEstadoDto) {
    return this.usuariosService.updateEstado(id, dto.estado);
  }
}
