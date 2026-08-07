import { Module } from '@nestjs/common';
import { DanhmucService } from './danhmuc.service';
import { DanhmucController } from './danhmuc.controller';

@Module({
  controllers: [DanhmucController],
  providers: [DanhmucService],
})
export class DanhmucModule {}
