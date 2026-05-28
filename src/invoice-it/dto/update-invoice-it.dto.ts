import { PartialType } from '@nestjs/mapped-types';
import { CreateInvoiceItDto } from './create-invoice-it.dto';

export class UpdateInvoiceItDto extends PartialType(CreateInvoiceItDto) {}
