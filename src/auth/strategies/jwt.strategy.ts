import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Sem segredo forte o token é forjável: melhor falhar no boot do que subir inseguro. */
export function requireJwtSecret(secret: string | undefined): string {
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET ausente ou curto (mínimo 32 caracteres). Defina no .env.');
  }
  return secret;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(configService.get<string>('JWT_SECRET')),
    });
  }

  async validate(payload: any) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
