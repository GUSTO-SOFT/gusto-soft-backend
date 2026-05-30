import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateProductoDto } from './dto/create-product.dto';
import { QueryProductosDto } from './dto/query-products.dto';
import { UpdateDisponibilidadDto, UpdateProductoDto } from './dto/update-product.dto';
import { MenuService } from './menu.service';
import { productImageUploadOptions } from './product-image-upload';

@ApiTags('menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('menu/productos')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Post()
  @Roles(Rol.ADMIN)
  create(@Body() dto: CreateProductoDto, @Request() req) {
    return this.menuService.create(dto, req.user.sub);
  }

  @Post('con-imagen')
  @Roles(Rol.ADMIN)
  @UseInterceptors(FileInterceptor('imagen', productImageUploadOptions))
  createWithImage(@Body() body: Record<string, unknown>, @UploadedFile() file, @Request() req) {
    return this.menuService.createFromMultipart(body, file?.filename, req.user.sub);
  }

  @Get()
  @Roles(Rol.ADMIN, Rol.MESERO, Rol.CHEF)
  findAll(@Query() query: QueryProductosDto) {
    return this.menuService.findAll(query);
  }

  @Get(':id')
  @Roles(Rol.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.findById(id).then((p) => this.menuService.toResponse(p));
  }

  // RF13
  @Put(':id')
  @Roles(Rol.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductoDto,
    @Request() req,
  ) {
    return this.menuService.update(id, dto, req.user.sub);
  }

  // RF13
  @Patch(':id/disponibilidad')
  @Roles(Rol.ADMIN)
  toggleDisponibilidad(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDisponibilidadDto,
    @Request() req,
  ) {
    return this.menuService.toggleDisponibilidad(id, dto.activo, req.user.sub);
  }

  @Patch(':id/imagen')
  @Roles(Rol.ADMIN)
  @UseInterceptors(FileInterceptor('imagen', productImageUploadOptions))
  updateImage(@Param('id', ParseIntPipe) id: number, @UploadedFile() file, @Request() req) {
    return this.menuService.updateImage(id, file?.filename, req.user.sub);
  }

  // RF17
  @Get(':id/bloqueo')
  @Roles(Rol.ADMIN)
  getBloqueo(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.getBloqueo(id);
  }
}
