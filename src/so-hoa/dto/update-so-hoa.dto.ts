import { PartialType } from '@nestjs/mapped-types';
import { CreateSoHoaDto } from './create-so-hoa.dto';

export class UpdateSoHoaDto extends PartialType(CreateSoHoaDto) {}
