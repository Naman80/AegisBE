import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { DatabaseType } from '../../common/enums/database-type.enum.js';
import { SslMode } from '../../common/enums/ssl-mode.enum.js';
import { ConnectionEntryMode } from '../enums/connection-entry-mode.enum.js';

export class CreateConnectionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(DatabaseType)
  type: DatabaseType = DatabaseType.POSTGRES;

  @IsEnum(ConnectionEntryMode)
  mode: ConnectionEntryMode;

  @ValidateIf((dto: CreateConnectionDto) => dto.mode === ConnectionEntryMode.URL)
  @IsString()
  @IsNotEmpty()
  connectionUrl?: string;

  @ValidateIf((dto: CreateConnectionDto) => dto.mode === ConnectionEntryMode.MANUAL)
  @IsString()
  @IsNotEmpty()
  host?: string;

  @ValidateIf((dto: CreateConnectionDto) => dto.mode === ConnectionEntryMode.MANUAL)
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number = 5432;

  @ValidateIf((dto: CreateConnectionDto) => dto.mode === ConnectionEntryMode.MANUAL)
  @IsString()
  @IsNotEmpty()
  database?: string;

  @ValidateIf((dto: CreateConnectionDto) => dto.mode === ConnectionEntryMode.MANUAL)
  @IsString()
  @IsNotEmpty()
  username?: string;

  @ValidateIf((dto: CreateConnectionDto) => dto.mode === ConnectionEntryMode.MANUAL)
  @IsString()
  @IsNotEmpty()
  password?: string;

  @IsOptional()
  @IsEnum(SslMode)
  sslMode?: SslMode = SslMode.REQUIRE;
}
