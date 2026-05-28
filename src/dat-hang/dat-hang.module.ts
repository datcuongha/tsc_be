import { Module } from '@nestjs/common';
import { DatHangService } from './dat-hang.service';
import { DatHangController } from './dat-hang.controller';

@Module({
  controllers: [DatHangController],
  providers: [DatHangService],
})
export class DatHangModule {}
