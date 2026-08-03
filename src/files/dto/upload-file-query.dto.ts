import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

function transformBooleanQuery(value: unknown): unknown {
  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return value;
}

export class UploadFileQueryDto {
  @ApiPropertyOptional({
    description: 'Queue the uploaded .xlsx file for sales processing.',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => transformBooleanQuery(value))
  @IsBoolean()
  processSales?: boolean;
}
