import { IsString, IsNotEmpty, ValidateIf, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ToStrictBoolean } from '../../../common/utils/strict-boolean';

/**
 * Media to convert, in the same url-or-base64 shape every other media endpoint accepts.
 *
 * No `mimetype` field: ffmpeg identifies the input from its contents, so a declared type would be
 * ignored at best and misleading at worst. The OUTPUT type is fixed by the endpoint, and is returned
 * in the response.
 */
export class ConvertMediaDto {
  @ApiPropertyOptional({
    description: 'Public http(s) URL of the media to convert (server-fetched, SSRF-guarded).',
    example: 'https://example.com/note.m4a',
  })
  @ValidateIf((dto: ConvertMediaDto) => dto.base64 === undefined || dto.url !== undefined)
  @IsString()
  @IsNotEmpty()
  url?: string;

  @ApiPropertyOptional({
    description: 'Base64-encoded media to convert. Takes precedence when both are supplied.',
    example: 'SUQzBAAAAAAA...',
  })
  @ValidateIf((dto: ConvertMediaDto) => dto.url === undefined || dto.base64 !== undefined)
  @IsString()
  @IsNotEmpty()
  base64?: string;
}

export class ConvertStickerDto extends ConvertMediaDto {
  @ApiPropertyOptional({ description: 'Sticker pack display name (WebP EXIF).', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  packName?: string;

  @ApiPropertyOptional({ description: 'Sticker pack author (WebP EXIF).', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  author?: string;

  @ApiPropertyOptional({
    description: 'Strip the background via remove.bg before converting. Requires REMOVE_BG_API_KEY.',
    default: false,
  })
  @IsOptional()
  @ToStrictBoolean()
  @IsBoolean()
  removeBg?: boolean;
}
