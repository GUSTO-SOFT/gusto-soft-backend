import {
  BadRequestException,
  ConflictException,
  GoneException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomInt } from 'crypto';
import * as nodemailer from 'nodemailer';
import { MoreThan, Repository } from 'typeorm';
import { UsuarioEstado } from '../../common/enums/user-status.enum';
import { errorBody } from '../../common/utils/error-response';
import { envBoolean, envNumber, envString } from '../../config/env';
import { Usuario } from './entities/user.entity';
import { VerificationCode } from './entities/verification-code.entity';
import { VerificationEmailDelivery, VerificationEmailStatus } from './entities/verification-email-delivery.entity';

@Injectable()
export class UserVerificationService {
  constructor(
    @InjectRepository(VerificationCode)
    private readonly codesRepo: Repository<VerificationCode>,
    @InjectRepository(VerificationEmailDelivery)
    private readonly deliveriesRepo: Repository<VerificationEmailDelivery>,
  ) {}

  async createAndSendCode(usuario: Usuario) {
    const plainCode = this.generateCode();
    const expiresAt = this.expiresAt();

    const verificationCode = await this.codesRepo.save(
      this.codesRepo.create({
        usuarioId: usuario.id,
        codigoHash: this.hashCode(plainCode),
        expiresAt,
      }),
    );

    await this.sendWithRetries(usuario, plainCode, this.expirationMinutes());
    return verificationCode;
  }

  async resend(usuario: Usuario) {
    if (usuario.estado === UsuarioEstado.ACTIVO) {
      throw new ConflictException(errorBody('USUARIO_YA_VERIFICADO', 'El usuario ya esta verificado'));
    }

    if (usuario.estado !== UsuarioEstado.PENDIENTE_VERIFICACION) {
      throw new ConflictException(errorBody('CODIGO_NO_DISPONIBLE', 'Codigo no disponible'));
    }

    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await this.codesRepo.count({
      where: {
        usuarioId: usuario.id,
        createdAt: MoreThan(since),
      },
    });

    if (recentCount >= 3) {
      throw new HttpException(
        errorBody('LIMITE_REENVIO_EXCEDIDO', 'Limite de reenvio excedido'),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.codesRepo.update({ usuarioId: usuario.id, usado: false }, { usado: true });
    const code = await this.createAndSendCode(usuario);
    return {
      usuario_id: usuario.id,
      expires_at: code.expiresAt,
    };
  }

  async verify(usuario: Usuario, codigo: string) {
    if (usuario.estado !== UsuarioEstado.PENDIENTE_VERIFICACION) {
      throw new ConflictException(errorBody('CODIGO_NO_DISPONIBLE', 'Codigo no disponible'));
    }

    const currentCode = await this.findCurrentCode(usuario.id);
    if (!currentCode) {
      throw new ConflictException(errorBody('CODIGO_NO_DISPONIBLE', 'Codigo no disponible'));
    }

    const now = new Date();
    this.resetFailedAttemptsIfWindowExpired(currentCode, now);

    if (this.isTemporarilyBlocked(currentCode, now)) {
      throw new HttpException(
        errorBody('DEMASIADOS_INTENTOS', 'Demasiados intentos de verificacion'),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (currentCode.expiresAt.getTime() <= now.getTime()) {
      throw new GoneException(errorBody('CODIGO_EXPIRADO', 'Codigo expirado'));
    }

    if (currentCode.codigoHash !== this.hashCode(codigo)) {
      currentCode.failedAttempts += 1;
      currentCode.lastFailedAt = now;
      await this.codesRepo.save(currentCode);

      if (currentCode.failedAttempts >= 3) {
        throw new HttpException(
          errorBody('DEMASIADOS_INTENTOS', 'Demasiados intentos de verificacion'),
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new BadRequestException(errorBody('CODIGO_INCORRECTO', 'Codigo incorrecto'));
    }

    currentCode.usado = true;
    await this.codesRepo.manager.transaction(async (manager) => {
      await manager.save(VerificationCode, currentCode);
      await manager.update(Usuario, usuario.id, {
        estado: UsuarioEstado.ACTIVO,
        verifiedAt: now,
      });
    });

    return {
      usuario_id: usuario.id,
      rol: usuario.rol,
      estado: UsuarioEstado.ACTIVO,
    };
  }

  async status(usuarioId: number) {
    const code = await this.codesRepo.findOne({
      where: { usuarioId },
      order: { createdAt: 'DESC' },
    });
    const delivery = await this.deliveriesRepo.findOne({
      where: { usuarioId },
      order: { sentAt: 'DESC' },
    });

    return {
      usuario_id: usuarioId,
      codigo_disponible: Boolean(code && !code.usado && code.expiresAt.getTime() > Date.now()),
      expires_at: code?.expiresAt ?? null,
      envio_estado: delivery?.estado ?? null,
      detalle_error: delivery?.detalleError ?? null,
      sent_at: delivery?.sentAt ?? null,
    };
  }

  private async findCurrentCode(usuarioId: number) {
    return this.codesRepo.findOne({
      where: { usuarioId, usado: false },
      order: { createdAt: 'DESC' },
    });
  }

  private isTemporarilyBlocked(code: VerificationCode, now: Date) {
    if (code.failedAttempts < 3 || !code.lastFailedAt) {
      return false;
    }
    return now.getTime() - code.lastFailedAt.getTime() <= 15 * 60 * 1000;
  }

  private resetFailedAttemptsIfWindowExpired(code: VerificationCode, now: Date) {
    if (!code.lastFailedAt) {
      return;
    }

    if (now.getTime() - code.lastFailedAt.getTime() > 15 * 60 * 1000) {
      code.failedAttempts = 0;
      code.lastFailedAt = null;
    }
  }

  private generateCode() {
    return randomInt(0, 1000000).toString().padStart(6, '0');
  }

  private hashCode(code: string) {
    return createHash('sha256').update(code).digest('hex');
  }

  private expirationMinutes() {
    return envNumber('VERIFICATION_CODE_EXPIRATION_MINUTES', 10);
  }

  private expiresAt() {
    return new Date(Date.now() + this.expirationMinutes() * 60 * 1000);
  }

  private async sendWithRetries(usuario: Usuario, code: string, minutes: number) {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await this.sendMail(usuario, code, minutes);
        await this.saveDelivery(usuario.id, VerificationEmailStatus.ENVIADO, null);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
        }
      }
    }

    await this.saveDelivery(usuario.id, VerificationEmailStatus.ERROR, this.errorMessage(lastError));
  }

  private async sendMail(usuario: Usuario, code: string, minutes: number) {
    if (envBoolean('SMTP_DISABLED', false)) {
      return;
    }

    const user = envString('SMTP_USER');
    const pass = envString('SMTP_PASS');
    const transporter = nodemailer.createTransport({
      host: envString('SMTP_HOST', 'smtp.gmail.com'),
      port: envNumber('SMTP_PORT', 587),
      secure: envBoolean('SMTP_SECURE', false),
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from: envString('SMTP_FROM', user),
      to: usuario.email,
      subject: 'Codigo de verificacion Gusto Soft',
      text: `Hola ${usuario.nombre}, tu codigo de verificacion es ${code}. Tiene vigencia de ${minutes} minutos.`,
    });
  }

  private saveDelivery(usuarioId: number, estado: VerificationEmailStatus, detalleError: string | null) {
    return this.deliveriesRepo.save(
      this.deliveriesRepo.create({
        usuarioId,
        estado,
        detalleError,
        sentAt: new Date(),
      }),
    );
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
