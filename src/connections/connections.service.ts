import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { DatabaseConnection } from '../../generated/prisma/client.js';
import { SslMode } from '../common/enums/ssl-mode.enum.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DatabaseAdapterService } from '../database-adapters/database-adapter.service.js';
import { CreateConnectionDto } from './dto/create-connection.dto.js';
import { TestConnectionDto } from './dto/test-connection.dto.js';
import { ConnectionEntryMode } from './enums/connection-entry-mode.enum.js';
import { parsePostgresConnectionUrl } from './utils/parse-postgres-connection-url.js';

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adapters: DatabaseAdapterService,
  ) {}

  async testConnection(dto: TestConnectionDto) {
    const normalized = this.normalizeConnectionInput(dto);
    const adapter = this.adapters.getAdapter(normalized);
    return adapter.testConnection(normalized);
  }

  async create(dto: CreateConnectionDto) {
    const normalized = this.normalizeConnectionInput(dto);
    const shouldActivate = (await this.prisma.databaseConnection.count()) === 0;

    const connection = await this.prisma.databaseConnection.create({
      data: {
        ...normalized,
        isActive: shouldActivate,
      },
    });

    return this.toResponse(connection);
  }

  async findAll() {
    const connections = await this.prisma.databaseConnection.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    });

    return connections.map((connection) => this.toResponse(connection));
  }

  async activate(id: string) {
    await this.ensureExists(id);

    await this.prisma.$transaction([
      this.prisma.databaseConnection.updateMany({
        data: { isActive: false },
      }),
      this.prisma.databaseConnection.update({
        where: { id },
        data: { isActive: true },
      }),
    ]);

    const active = await this.prisma.databaseConnection.findUnique({
      where: { id },
    });

    if (!active) {
      throw new NotFoundException(`Connection ${id} not found.`);
    }

    return this.toResponse(active);
  }

  async getActiveConnectionConfig() {
    const active = await this.prisma.databaseConnection.findFirst({
      where: { isActive: true },
    });

    if (!active) {
      throw new NotFoundException('No active database connection found.');
    }

    return active;
  }

  async getActive() {
    return this.toResponse(await this.getActiveConnectionConfig());
  }

  private async ensureExists(id: string) {
    const connection = await this.prisma.databaseConnection.findUnique({
      where: { id },
    });

    if (!connection) {
      throw new NotFoundException(`Connection ${id} not found.`);
    }
  }

  private toResponse(connection: DatabaseConnection) {
    const { password, ...safeConnection } = connection;
    return safeConnection;
  }

  private normalizeConnectionInput(dto: CreateConnectionDto | TestConnectionDto) {
    if (dto.mode === ConnectionEntryMode.URL) {
      if (!dto.connectionUrl) {
        throw new BadRequestException('Connection URL is required in URL mode.');
      }

      const parsed = parsePostgresConnectionUrl(dto.connectionUrl);

      return {
        name: dto.name,
        type: dto.type,
        connectionUrl: parsed.connectionUrl,
        host: parsed.host,
        port: parsed.port,
        database: parsed.database,
        username: parsed.username,
        password: parsed.password,
        sslMode: parsed.sslMode,
      };
    }

    if (
      !dto.host ||
      !dto.port ||
      !dto.database ||
      !dto.username ||
      !dto.password
    ) {
      throw new BadRequestException(
        'Host, port, database, username, and password are required in manual mode.',
      );
    }

    return {
      name: dto.name,
      type: dto.type,
      connectionUrl: null,
      host: dto.host,
      port: dto.port,
      database: dto.database,
      username: dto.username,
      password: dto.password,
      sslMode: dto.sslMode ?? SslMode.REQUIRE,
    };
  }
}
