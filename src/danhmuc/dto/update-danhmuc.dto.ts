import { PartialType } from '@nestjs/mapped-types';
import { CreateDanhmucDto } from './create-danhmuc.dto';

export class UpdateDanhmucDto extends PartialType(CreateDanhmucDto) {}
