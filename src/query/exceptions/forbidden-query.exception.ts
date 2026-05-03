import { BadRequestException } from '@nestjs/common';

export class ForbiddenQueryException extends BadRequestException {
  constructor(query: string) {
    super(`Query blocked by safety guard: ${query}`);
  }
}
