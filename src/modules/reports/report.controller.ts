import { Controller, Get, Header, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { QueryAfluenciaDto, QueryDateRangeDto, QueryWasteReportDto } from './dto/query-report-date-range.dto';
import { ReportExportService } from './report-export.service';
import { ReportService } from './report.service';

@ApiTags('reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reportes')
export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    private readonly exportService: ReportExportService,
  ) {}

  @Get('productos-vendidos')
  @Roles(Rol.ADMIN)
  async productosVendidos(@Query() query: QueryDateRangeDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const data = await this.reportService.productosVendidos(query);
    return this.formatResponse(req, res, 'productos-vendidos', data);
  }

  @Get('desperdicio')
  @Roles(Rol.ADMIN)
  @Header('Content-Type', 'application/json')
  desperdicio(@Query() query: QueryWasteReportDto) {
    return this.reportService.desperdicio(query);
  }

  @Get('afluencia')
  @Roles(Rol.ADMIN)
  afluencia(@Query() query: QueryAfluenciaDto) {
    return this.reportService.afluencia(query);
  }

  private formatResponse(req: Request, res: Response, filename: string, data: Record<string, unknown>[]) {
    const accept = req.headers.accept ?? '';
    if (accept.includes('text/csv')) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return this.exportService.toCsv(data);
    }

    if (accept.includes('application/pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      return this.exportService.toPdf(filename, data);
    }

    return data;
  }
}
