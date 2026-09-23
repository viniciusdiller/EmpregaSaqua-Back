import { Test, TestingModule } from '@nestjs/testing';
import { CepService } from './cep.service.js';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { of, throwError } from 'rxjs';
import { NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';

describe('CepService', () => {
  let service: CepService;
  let httpService: HttpService;
  let cacheManager: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CepService,
        {
          provide: HttpService,
          useValue: {
            get: vi.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: vi.fn(),
            set: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CepService>(CepService);
    httpService = module.get<HttpService>(HttpService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return from cache if available', async () => {
    const mockCepData = {
      cep: '12345678',
      street: 'Rua Cache',
      neighborhood: 'Bairro Cache',
      city: 'Cidade Cache',
      state: 'UF',
    };
    cacheManager.get.mockResolvedValue(mockCepData);

    const result = await service.findAddressByCep('12345678');

    expect(cacheManager.get).toHaveBeenCalledWith('cep:12345678');
    expect(result).toEqual(mockCepData);
    expect(httpService.get).not.toHaveBeenCalled();
  });

  it('should fetch from ViaCEP on cache miss', async () => {
    cacheManager.get.mockResolvedValue(null);
    const mockViaCepResponse = {
      data: {
        cep: '12345-678',
        logradouro: 'Rua ViaCEP',
        bairro: 'Bairro ViaCEP',
        localidade: 'Cidade ViaCEP',
        uf: 'VC',
      },
    };
    vi.spyOn(httpService, 'get').mockReturnValue(of(mockViaCepResponse) as any);

    const result = await service.findAddressByCep('12345678');

    expect(httpService.get).toHaveBeenCalledWith('https://viacep.com.br/ws/12345678/json/');
    expect(result).toEqual({
      cep: '12345678',
      street: 'Rua ViaCEP',
      neighborhood: 'Bairro ViaCEP',
      city: 'Cidade ViaCEP',
      state: 'VC',
    });
    expect(cacheManager.set).toHaveBeenCalledWith(
      'cep:12345678',
      result,
      7 * 24 * 60 * 60 * 1000,
    );
  });

  it('should fallback to BrasilAPI when ViaCEP times out or fails', async () => {
    cacheManager.get.mockResolvedValue(null);
    
    // First call (ViaCEP) fails
    const mockViaCepError = new Error('Timeout');
    
    // Second call (BrasilAPI) succeeds
    const mockBrasilApiResponse = {
      data: {
        cep: '12345678',
        street: 'Rua BrasilAPI',
        neighborhood: 'Bairro BrasilAPI',
        city: 'Cidade BrasilAPI',
        state: 'BA',
      },
    };

    vi.spyOn(httpService, 'get')
      .mockReturnValueOnce(throwError(() => mockViaCepError) as any) // ViaCEP
      .mockReturnValueOnce(of(mockBrasilApiResponse) as any); // BrasilAPI

    const result = await service.findAddressByCep('12345678');

    expect(httpService.get).toHaveBeenCalledTimes(2);
    expect(httpService.get).toHaveBeenNthCalledWith(1, 'https://viacep.com.br/ws/12345678/json/');
    expect(httpService.get).toHaveBeenNthCalledWith(2, 'https://brasilapi.com.br/api/cep/v1/12345678');
    
    expect(result).toEqual({
      cep: '12345678',
      street: 'Rua BrasilAPI',
      neighborhood: 'Bairro BrasilAPI',
      city: 'Cidade BrasilAPI',
      state: 'BA',
    });
  });

  it('should throw NotFoundException if BrasilAPI returns 404 on fallback', async () => {
    cacheManager.get.mockResolvedValue(null);
    
    // First call (ViaCEP) fails
    const mockViaCepError = new Error('Timeout');
    
    // Second call (BrasilAPI) returns 404
    const mockBrasilApiError = { response: { status: 404 } };

    vi.spyOn(httpService, 'get')
      .mockReturnValueOnce(throwError(() => mockViaCepError) as any)
      .mockReturnValueOnce(throwError(() => mockBrasilApiError) as any);

    await expect(service.findAddressByCep('12345678')).rejects.toThrow(NotFoundException);
  });
});
