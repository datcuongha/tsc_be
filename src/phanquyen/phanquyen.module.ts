import { Module } from '@nestjs/common';
import { PhanquyenService } from './phanquyen.service';
import { PhanquyenController } from './phanquyen.controller';

@Module({
  controllers: [PhanquyenController],
  providers: [PhanquyenService],
})
export class PhanquyenModule {}
