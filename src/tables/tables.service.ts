import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MesaEstado, MesaEstadoColor } from '../common/enums/table-status.enum';
import { Rol } from '../common/enums/role.enum';
import { UsuarioEstado } from '../common/enums/user-status.enum';
import { errorBody } from '../common/utils/error-response';
import { minutesAgo } from '../common/utils/time';
import { UsuariosService } from '../users/users.service';
import { AsignarMeseroDto } from './dto/assign-waiter.dto';
import { CrearMesaDto } from './dto/create-table.dto';
import { QueryMesasDto } from './dto/query-tables.dto';
import { Mesa } from './entities/restaurant-table.entity';
import { MesasGateway } from './tables.gateway';

@Injectable()
export class MesasService {
  constructor(
    @InjectRepository(Mesa) private readonly mesasRepo: Repository<Mesa>,
    private readonly usuariosService: UsuariosService,
    private readonly mesasGateway: MesasGateway,
  ) {}

  async findAll(query: QueryMesasDto) {
    const [mesas, total] = await this.mesasRepo.findAndCount({
      where: query.estado ? { estado: query.estado } : {},
      relations: { mesero: true },
      order: { numero: 'ASC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      data: mesas.map((mesa) => this.toResponse(mesa)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        total_pages: Math.ceil(total / query.limit),
      },
    };
  }

  async create(dto: CrearMesaDto) {
    const duplicated = await this.mesasRepo.findOne({ where: { numero: dto.numero } });
    if (duplicated) {
      throw new ConflictException(errorBody('MESA_DUPLICADA', 'Ya existe una mesa con ese numero'));
    }

    const mesa = await this.mesasRepo.save(
      this.mesasRepo.create({
        numero: dto.numero,
        estado: MesaEstado.DISPONIBLE,
      }),
    );
    return this.toResponse(mesa);
  }

  async abrir(id: number) {
    const mesa = await this.getMesa(id);
    if (mesa.estado === MesaEstado.OCUPADA) {
      throw new ConflictException(errorBody('MESA_YA_OCUPADA', 'Esta mesa ya se encuentra ocupada'));
    }

    mesa.estado = MesaEstado.OCUPADA;
    mesa.openedAt = new Date();
    const saved = await this.mesasRepo.save(mesa);
    const response = this.toResponse(saved);
    this.mesasGateway.emitEstado({
      mesa_id: saved.id,
      estado: saved.estado,
      estado_color: MesaEstadoColor[saved.estado],
      mesero_id: saved.meseroId,
      opened_at: saved.openedAt,
    });
    return response;
  }

  async asignar(id: number, dto: AsignarMeseroDto) {
    const mesa = await this.getMesa(id);
    if (mesa.estado !== MesaEstado.OCUPADA || !mesa.openedAt) {
      throw new UnprocessableEntityException(
        errorBody('MESA_SIN_SESION_ACTIVA', 'No se puede asignar mesero a mesa sin sesion activa'),
      );
    }

    const mesero = await this.usuariosService.findById(dto.mesero_id);
    if (!mesero || mesero.rol !== Rol.MESERO || mesero.estado !== UsuarioEstado.ACTIVO) {
      throw new UnprocessableEntityException(
        errorBody('MESERO_INVALIDO', 'Debes asignar un mesero activo valido'),
      );
    }

    mesa.meseroId = mesero.id;
    mesa.mesero = mesero;
    const saved = await this.mesasRepo.save(mesa);
    const response = this.toResponse(saved);
    this.mesasGateway.emitEstado({
      mesa_id: saved.id,
      estado: saved.estado,
      estado_color: MesaEstadoColor[saved.estado],
      mesero_id: saved.meseroId,
      opened_at: saved.openedAt,
    });
    return response;
  }

  async getMesa(id: number) {
    const mesa = await this.mesasRepo.findOne({ where: { id }, relations: { mesero: true } });
    if (!mesa) {
      throw new NotFoundException(errorBody('MESA_NO_ENCONTRADA', 'Mesa no encontrada'));
    }
    return mesa;
  }

  toResponse(mesa: Mesa) {
    return {
      id: mesa.id,
      numero: mesa.numero,
      estado: mesa.estado,
      estado_color: MesaEstadoColor[mesa.estado],
      mesero_id: mesa.meseroId,
      mesero_nombre: mesa.mesero?.nombre ?? null,
      opened_at: mesa.openedAt,
      abierta_hace_minutos: minutesAgo(mesa.openedAt),
      created_at: mesa.createdAt,
      updated_at: mesa.updatedAt,
    };
  }
}
