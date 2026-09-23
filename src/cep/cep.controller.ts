import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CepService } from './cep.service.js';
import { ParseCepPipe } from './cep.pipe.js';
import { CepResponseDto } from './cep.dto.js';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@Controller('cep')
@UseGuards(ThrottlerGuard)
export class CepController {
  constructor(private readonly cepService: CepService) {}

  @Get(':cep')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getCep(@Param('cep', ParseCepPipe) cep: string): Promise<CepResponseDto> {
    return this.cepService.findAddressByCep(cep);
  }
}
