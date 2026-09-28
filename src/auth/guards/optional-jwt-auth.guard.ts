import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Preenche req.user quando há um token válido, mas nunca bloqueia (rotas públicas que mudam a resposta para dono/admin). */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<T>(_err: unknown, user: T | false): T | null {
    return user || null;
  }
}
