import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DatasourceService {
  constructor(private readonly prisma: PrismaService) {}

  async listDatasources() {
    const connections = await this.prisma.databaseConnection.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    });
    return connections.map(c => this.toResponse(c));
  }

  async getDatasource(id: string) {
    const datasource = await this.prisma.databaseConnection.findUnique({
      where: { id },
    });
    if (!datasource) throw new NotFoundException('Datasource not found');
    return datasource;
  }

  async createDatasource(dto: any) {
    const normalized = this.normalizeInput(dto);
    const shouldActivate = (await this.prisma.databaseConnection.count()) === 0;

    const connection = await this.prisma.databaseConnection.create({
      data: {
        ...normalized,
        isActive: shouldActivate,
      },
    });

    return this.toResponse(connection);
  }

  async updateDatasource(id: string, dto: any) {
    await this.getDatasource(id);
    const normalized = this.normalizeInput(dto);
    const connection = await this.prisma.databaseConnection.update({
      where: { id },
      data: normalized,
    });
    return this.toResponse(connection);
  }

  async deleteDatasource(id: string) {
    await this.getDatasource(id);
    await this.prisma.databaseConnection.delete({ where: { id } });
  }

  async setActive(id: string) {
    await this.getDatasource(id);
    await this.prisma.$transaction([
      this.prisma.databaseConnection.updateMany({
        data: { isActive: false },
      }),
      this.prisma.databaseConnection.update({
        where: { id },
        data: { isActive: true },
      }),
    ]);
    return this.getDatasource(id).then(c => this.toResponse(c));
  }

  private toResponse(connection: any) {
    const { password, ...safe } = connection;
    return safe;
  }

  private normalizeInput(dto: any) {
    // Simple normalization for now, can be expanded with URL parsing if needed
    if (!dto.host || !dto.port || !dto.database || !dto.username || !dto.password) {
      throw new BadRequestException('Missing required connection fields');
    }
    return {
      name: dto.name,
      type: dto.type,
      host: dto.host,
      port: dto.port,
      database: dto.database,
      username: dto.username,
      password: dto.password,
      sslMode: dto.sslMode ?? 'require',
    };
  }
}
