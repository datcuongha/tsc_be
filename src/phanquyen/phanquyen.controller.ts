import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PhanquyenService } from './phanquyen.service';

@Controller('api/phanquyen')
export class PhanquyenController {
  constructor(private readonly phanquyenService: PhanquyenService) {}

  @Get('getAllPq')
  getAllPq() {
    return this.phanquyenService.getAllPq();
  }
}
