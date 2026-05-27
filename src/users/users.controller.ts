import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateMeseroDto, CreateUsuarioDto } from './dto/create-user.dto';
import { QueryUsuariosDto } from './dto/query-users.dto';
import { UsuariosService } from './users.service';

@ApiTags('usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @Roles(Rol.ADMIN, Rol.MESERO)
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
}
