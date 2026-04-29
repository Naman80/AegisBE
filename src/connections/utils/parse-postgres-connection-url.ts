import { BadRequestException } from '@nestjs/common';
import { SslMode } from '../../common/enums/ssl-mode.enum.js';

export interface ParsedConnectionUrl {
  connectionUrl: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslMode: SslMode;
}

export function parsePostgresConnectionUrl(rawUrl: string): ParsedConnectionUrl {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new BadRequestException('Invalid PostgreSQL connection URL format.');
  }

  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new BadRequestException(
      'Unsupported connection URL scheme. Use postgres:// or postgresql://.',
    );
  }

  const database = url.pathname.replace(/^\/+/, '');

  if (!url.hostname) {
    throw new BadRequestException('Connection URL is missing a host.');
  }

  if (!database) {
    throw new BadRequestException('Connection URL is missing a database name.');
  }

  if (!url.username) {
    throw new BadRequestException('Connection URL is missing a username.');
  }

  if (!url.password) {
    throw new BadRequestException('Connection URL is missing a password.');
  }

  const sslMode = parseSslMode(url.searchParams.get('sslmode'));

  return {
    connectionUrl: rawUrl,
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432,
    database,
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    sslMode,
  };
}

function parseSslMode(value: string | null): SslMode {
  if (!value) {
    return SslMode.REQUIRE;
  }

  switch (value) {
    case SslMode.DISABLE:
      return SslMode.DISABLE;
    case SslMode.ALLOW:
      return SslMode.ALLOW;
    case SslMode.PREFER:
      return SslMode.PREFER;
    case SslMode.REQUIRE:
      return SslMode.REQUIRE;
    case SslMode.VERIFY_CA:
      return SslMode.VERIFY_CA;
    case SslMode.VERIFY_FULL:
      return SslMode.VERIFY_FULL;
    default:
      return SslMode.REQUIRE;
  }
}
