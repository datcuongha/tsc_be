import { Module } from '@nestjs/common';
import { DatHangService } from './dat-hang.service';
import { DatHangController } from './dat-hang.controller';
import { SocketGateway } from 'src/config/gateway';

@Module({
  controllers: [DatHangController],
  providers: [DatHangService, SocketGateway],
})
export class DatHangModule {}
