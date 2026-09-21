import { ApiProperty } from '@nestjs/swagger';

/**
 * Response shapes for the profile routes — the raw handler value, no envelope.
 * Decorated properties avoid named utility types: emitDecoratorMetadata wraps a named type in a
 * runtime guard whose other arm can never execute, leaving an uncoverable branch.
 */

export class ProfileAckResponseDto {
  @ApiProperty({ description: 'Always true — a failure is reported as a non-2xx status, not as false.', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Human-readable confirmation of what was changed.', example: 'Profile name updated' })
  message!: string;
}

/** Logged-in account profile. No adapter internals. */
export class OwnProfileDto {
  @ApiProperty({ type: String, nullable: true, example: '628123456789' })
  phone!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Ada' })
  pushName!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Busy' })
  about!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'https://pps.whatsapp.net/v/t61.24694-24/n.jpg',
  })
  profilePictureUrl!: string | null;
}
