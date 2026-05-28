import { Module } from '@nestjs/common';
import { InvoiceItService } from './invoice-it.service';
import { InvoiceItController } from './invoice-it.controller';

@Module({
  controllers: [InvoiceItController],
  providers: [InvoiceItService],
})
export class InvoiceItModule {}
