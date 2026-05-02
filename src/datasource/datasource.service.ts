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
    const normalized = { ...dto };

    if (dto.mode === 'url' && dto.connectionUrl) {
      try {
        const url = new URL(dto.connectionUrl);
        normalized.host = url.hostname;
        normalized.port = url.port ? parseInt(url.port) : 5432;
        normalized.database = url.pathname.replace(/^\//, '');
        normalized.username = decodeURIComponent(url.username);
        normalized.password = decodeURIComponent(url.password);

        const sslMode = url.searchParams.get('sslmode');
        if (sslMode) {
          normalized.sslMode = sslMode;
        }
      } catch (e) {
        throw new BadRequestException('Invalid connection URL format');
      }
    }

    const requiredFields = ['name', 'host', 'port', 'database', 'username', 'password'];
    const missingFields = requiredFields.filter((f) => !normalized[f]);

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Missing required fields: ${missingFields.join(', ')}`,
      );
    }

    return {
      name: normalized.name,
      type: normalized.type || 'POSTGRES',
      host: normalized.host,
      port: normalized.port,
      database: normalized.database,
      username: normalized.username,
      password: normalized.password,
      sslMode: normalized.sslMode ?? 'require',
    };
  }
}
