import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { EmpresaService } from './company.service';
import { UpsertEmpresaDto } from './dto/upsert-company.dto';

@ApiTags('empresa')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('empresa')
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) {}

  @Get()
  @Roles(Rol.ADMIN)
  findCurrent() {
    return this.empresaService.findCurrent();
  }

  @Put('registro')
  @Roles(Rol.ADMIN)
  upsert(@Body() dto: UpsertEmpresaDto) {
    return this.empresaService.upsert(dto);
  }
}
