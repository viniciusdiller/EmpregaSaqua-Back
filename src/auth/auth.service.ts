import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import { MailService } from '../mail/mail.service.js';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dtos/login.dto.js';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dtos/create-user.dto.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mail: MailService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(pass, user.password_hash)) {
      const { password_hash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async register(createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    const payload = { email: user.email, sub: user.id, role: user.role };

    // Best-effort: e-mail de boas-vindas nunca pode derrubar o cadastro.
    this.sendWelcomeEmail(user.email, user.role).catch((err) =>
      this.logger.error(`Falha ao enviar e-mail de boas-vindas para ${user.email}: ${err instanceof Error ? err.message : String(err)}`),
    );

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  private async sendWelcomeEmail(email: string, role: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://empregasaqua.com';
    const isEmployer = role === 'EMPLOYER';
    const welcomeMessage = isEmployer
      ? 'publicar vagas e acompanhar suas candidaturas'
      : 'buscar vagas em Saquarema e se candidatar em poucos cliques';
    const ctaLink = `${frontendUrl}${isEmployer ? '/empresa/perfil' : '/candidato/perfil'}`;

    const html = await this.mail.renderTemplate('boas-vindas', { welcomeMessage, ctaLink, frontendUrl });
    await this.mail.send(email, 'Bem-vindo ao EmpregaSaquá', html);
  }
}
