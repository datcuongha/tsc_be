import { Module } from '@nestjs/common';
import { SoHoaService } from './so-hoa.service';
import { SoHoaController } from './so-hoa.controller';

@Module({
  controllers: [SoHoaController],
  providers: [SoHoaService],
})
export class SoHoaModule {}
