import { Module } from '@nestjs/common';
import { PythonService } from './python.service';
import { PythonController } from './python.controller';

@Module({
  controllers: [PythonController],
  providers: [PythonService],
})
export class PythonModule {}
