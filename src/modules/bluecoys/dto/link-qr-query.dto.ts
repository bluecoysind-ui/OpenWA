import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength, MaxLength } from 'class-validator';

export class LinkQrQueryDto {
  @ApiProperty({ example: 'jane.doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  username!: string;

  @ApiProperty({ example: '919608079512', description: 'Digits only, international format' })
  @IsString()
  @Matches(/^\d{8,15}$/, { message: 'phone_number must be 8-15 digits' })
  phone_number!: string;
}
