import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionModule } from '../session/session.module';
import { Session } from '../session/entities/session.entity';
import { BluecoysCallbackService } from './bluecoys-callback.service';
import { BluecoysController } from './bluecoys.controller';
import { BluecoysHooksService } from './bluecoys-hooks.service';
import { BluecoysLinkService } from './bluecoys-link.service';
import { BluecoysQrStateService } from './bluecoys-qr-state.service';

@Module({
  imports: [SessionModule, TypeOrmModule.forFeature([Session], 'data')],
  controllers: [BluecoysController],
  providers: [BluecoysCallbackService, BluecoysLinkService, BluecoysHooksService, BluecoysQrStateService],
})
export class BluecoysModule {}
