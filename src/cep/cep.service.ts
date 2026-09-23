import { Injectable, Inject, Logger, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { CepResponseDto } from './cep.dto.js';

@Injectable()
export class CepService {
  private readonly logger = new Logger(CepService.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findAddressByCep(cep: string): Promise<CepResponseDto> {
    const cacheKey = `cep:${cep}`;
    const cachedData = await this.cacheManager.get<CepResponseDto>(cacheKey);

    if (cachedData) {
      this.logger.log(`Cache hit for CEP: ${cep}`);
      return cachedData;
    }

    let result: CepResponseDto;

    try {
      this.logger.log(`Fetching from primary source (ViaCEP) for CEP: ${cep}`);
      result = await this.fetchFromViaCep(cep);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.warn(`ViaCEP failed or timed out for CEP ${cep}. Trying Fallback (BrasilAPI)...`);
      try {
        result = await this.fetchFromBrasilApi(cep);
      } catch (fallbackError) {
        this.logger.error(`Both ViaCEP and BrasilAPI failed for CEP ${cep}`);
        if (fallbackError instanceof NotFoundException) {
          throw fallbackError;
        }
        throw new HttpException(
          'Failed to fetch CEP data from all available sources',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    }

    if (result) {
      // 7 days in milliseconds
      await this.cacheManager.set(cacheKey, result, 7 * 24 * 60 * 60 * 1000);
    }

    return result;
  }

  private async fetchFromViaCep(cep: string): Promise<CepResponseDto> {
    const url = `https://viacep.com.br/ws/${cep}/json/`;
    
    const response = await firstValueFrom(
      this.httpService.get(url).pipe(
        timeout(4000),
      ),
    );

    const data = response.data;
    if (data.erro) {
      throw new NotFoundException('CEP not found in ViaCEP');
    }

    return {
      cep: data.cep.replace('-', ''),
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
    };
  }

  private async fetchFromBrasilApi(cep: string): Promise<CepResponseDto> {
    const url = `https://brasilapi.com.br/api/cep/v1/${cep}`;
    
    const response = await firstValueFrom(
      this.httpService.get(url).pipe(
        timeout(4000),
        catchError((error) => {
          if (error.response?.status === 404) {
            throw new NotFoundException('CEP not found in BrasilAPI');
          }
          throw error;
        }),
      ),
    );

    const data = response.data;

    return {
      cep: data.cep,
      street: data.street || '',
      neighborhood: data.neighborhood || '',
      city: data.city || '',
      state: data.state || '',
    };
  }
}
