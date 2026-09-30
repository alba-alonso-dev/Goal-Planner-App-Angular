import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity.js';
import { ChangePasswordDto, LoginDto, RegisterDto } from './dto/auth.dto.js';
import { hashPassword, verifyPassword } from './password.js';

// Hash de una contraseña aleatoria: se usa cuando el email no existe para que el tiempo de respuesta
// no revele si una cuenta está registrada
const DUMMY_HASH_PROMISE = hashPassword('dummy-password-for-timing');

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @Inject(JwtService) private readonly jwt: JwtService
  ) {}

  async register(dto: RegisterDto): Promise<User> {
    if (await this.users.existsBy({ email: dto.emailId })) {
      throw new ConflictException('An account with this email already exists');
    }
    const user = this.users.create({
      email: dto.emailId,
      fullName: dto.fullName,
      mobileNo: dto.mobileNo,
      passwordHash: await hashPassword(dto.password),
      sessionVersion: 0
    });
    return this.users.save(user);
  }

  async login(dto: LoginDto): Promise<User> {
    const user = await this.users.findOneBy({ email: dto.emailId });
    const valid = await verifyPassword(dto.password, user?.passwordHash ?? (await DUMMY_HASH_PROMISE));
    if (!user || !valid) throw new UnauthorizedException('Invalid email or password');
    return user;
  }

  /** Usuario de la sesión actual; 401 si la cuenta ya no existe. */
  async findUser(userId: number): Promise<User> {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  /**
   * Cambia la contraseña y cierra las demás sesiones (sube `sessionVersion`). Devuelve el usuario
   * actualizado para emitir una sesión nueva en este dispositivo.
   */
  async changePassword(userId: number, dto: ChangePasswordDto): Promise<User> {
    const user = await this.findUser(userId);
    if (!(await verifyPassword(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Current password is incorrect');
    }
    user.passwordHash = await hashPassword(dto.newPassword);
    user.sessionVersion += 1;
    return this.users.save(user);
  }

  /** JWT de sesión: `ver` deja de coincidir cuando se cambia la contraseña. */
  signSession(user: Pick<User, 'id' | 'sessionVersion'>): Promise<string> {
    return this.jwt.signAsync({ sub: user.id, ver: user.sessionVersion });
  }

  /** ¿Sigue vigente una sesión emitida con esta versión? */
  async isSessionCurrent(userId: number, version: number): Promise<boolean> {
    const user = await this.users.findOne({ select: { id: true, sessionVersion: true }, where: { id: userId } });
    return user !== null && user.sessionVersion === version;
  }
}
