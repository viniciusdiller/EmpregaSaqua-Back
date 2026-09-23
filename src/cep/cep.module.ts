import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { CepController } from './cep.controller.js';
import { CepService } from './cep.service.js';

@Module({
  imports: [
    HttpModule,
    CacheModule.register({
      store: 'memory',
    }),
  ],
  controllers: [CepController],
  providers: [CepService],
})
export class CepModule {}
