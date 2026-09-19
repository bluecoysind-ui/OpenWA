import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotConfig } from './entities/bot-config.entity';
import { BotConfigService, botInboundPortProvider } from './bot-config.service';
import { BotConfigController } from './bot-config.controller';
import { BotCommandsService } from './bot-commands.service';

/**
 * Must not be imported by SessionModule: this module may resolve MessageService via ModuleRef, and
 * MessageModule imports SessionModule. AppModule imports us; inbound access/welcome is reached
 * through BOT_INBOUND_PORT (lazy ModuleRef) so the session graph stays acyclic.
 */
@Module({
  imports: [TypeOrmModule.forFeature([BotConfig], 'data')],
  controllers: [BotConfigController],
  providers: [BotConfigService, BotCommandsService, botInboundPortProvider],
  exports: [BotConfigService],
})
export class BotModule {}
