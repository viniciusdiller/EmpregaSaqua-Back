import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseCepPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!value) {
      throw new BadRequestException('CEP is required');
    }

    const cepRegex = /^\d{8}$/;
    if (!cepRegex.test(value)) {
      throw new BadRequestException('CEP must contain exactly 8 numeric digits');
    }

    return value;
  }
}
