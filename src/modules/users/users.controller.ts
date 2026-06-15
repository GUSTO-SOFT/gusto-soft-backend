import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateMeseroDto, CreateUsuarioDto } from './dto/create-user.dto';
import { QueryUsuariosDto } from './dto/query-users.dto';
import { CreateRegistrationCodeDto, RegisterUsuarioDto, VerifyUsuarioDto } from './dto/register-user.dto';
import { UpdateUsuarioDto, UpdateUsuarioEstadoDto, UpdateUsuarioRolDto } from './dto/update-user-admin.dto';
import { UsuariosService } from './users.service';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';

type RequestWithUser = { user: JwtUser };

@ApiTags('usuarios')
@ApiBearerAuth()
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post('registro')
  register(@Body() dto: RegisterUsuarioDto) {
    return this.usuariosService.register(dto);
  }

  @Post('registro/codigos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  createRegistrationCode(@Body() dto: CreateRegistrationCodeDto, @Req() req: RequestWithUser) {
    return this.usuariosService.createRegistrationCode(req.user.sub, dto.expires_in_minutes);
  }

  @Post(':id/verificar')
  verify(@Param('id', ParseIntPipe) id: number, @Body() dto: VerifyUsuarioDto) {
    return this.usuariosService.verify(id, dto);
  }

  @Post(':id/verificacion/reenviar')
  resendVerification(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.resendVerification(id);
  }

  @Get(':id/verificacion/estado')
  verificationStatus(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.verificationStatus(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  findAll(@Query() query: QueryUsuariosDto) {
    return this.usuariosService.findAll(query);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.createByAdmin(dto);
  }

  @Post('meseros')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  createMeseros(@Body() dtos: CreateMeseroDto[]) {
    return this.usuariosService.createMeseros(dtos);
  }

  @Get('meseros/disponibles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.MESERO)
  meserosDisponibles() {
    return this.usuariosService.findEligibleMeseros();
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUsuarioDto) {
    return this.usuariosService.updateByAdmin(id, dto);
  }

  @Patch(':id/rol')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  updateRol(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUsuarioRolDto, @Req() req: RequestWithUser) {
    return this.usuariosService.assignRol(id, dto.rol, req.user.sub);
  }

  @Patch(':id/estado')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  updateEstado(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUsuarioEstadoDto) {
    return this.usuariosService.updateEstado(id, dto.estado);
  }
}
