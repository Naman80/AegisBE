import { IsOptional, IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class ExecuteQueryDto {
  @IsString()
  @IsNotEmpty()
  namespace: string;

  @IsString()
  @IsNotEmpty()
  query: string;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;

  @IsOptional()
  @IsNumber()
  timeout?: number;
}
