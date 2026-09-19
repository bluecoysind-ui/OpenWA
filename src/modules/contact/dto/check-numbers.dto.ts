import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

export const CONTACT_CHECK_MAX_NUMBERS = 50;

export class CheckNumbersDto {
  @ApiProperty({
    type: [String],
    minItems: 1,
    maxItems: CONTACT_CHECK_MAX_NUMBERS,
    example: ['628123456789', '+62 812-345-6789'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(CONTACT_CHECK_MAX_NUMBERS)
  @IsString({ each: true })
  numbers!: string[];
}

export class NumberCheckItemDto {
  @ApiProperty({ example: '628123456789' })
  input!: string;

  @ApiProperty({ type: String, nullable: true, example: '628123456789' })
  normalized!: string | null;

  @ApiProperty({ example: true })
  exists!: boolean;

  @ApiProperty({ type: String, nullable: true, example: '628123456789@c.us' })
  chatId!: string | null;

  @ApiPropertyOptional({ example: 'invalid' })
  error?: string;
}

export class CheckNumbersResponseDto {
  @ApiProperty({ type: [NumberCheckItemDto] })
  results!: NumberCheckItemDto[];
}
