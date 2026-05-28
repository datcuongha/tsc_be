import { Module } from '@nestjs/common';
import { BophanService } from './bophan.service';
import { BophanController } from './bophan.controller';

@Module({
  controllers: [BophanController],
  providers: [BophanService],
})
export class BophanModule {}
