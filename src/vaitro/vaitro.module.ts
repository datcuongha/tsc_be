import { Module } from '@nestjs/common';
import { VaitroService } from './vaitro.service';
import { VaitroController } from './vaitro.controller';

@Module({
  controllers: [VaitroController],
  providers: [VaitroService],
})
export class VaitroModule {}
