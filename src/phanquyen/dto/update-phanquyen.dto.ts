import { PartialType } from '@nestjs/mapped-types';
import { CreatePhanquyenDto } from './create-phanquyen.dto';

export class UpdatePhanquyenDto extends PartialType(CreatePhanquyenDto) {}
