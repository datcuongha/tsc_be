import { PartialType } from '@nestjs/mapped-types';
import { CreateVaitroDto } from './create-vaitro.dto';

export class UpdateVaitroDto extends PartialType(CreateVaitroDto) {}
