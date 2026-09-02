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

  // ----- LẤY TÂT CẢ PHÂN QUYỀN ----- //
  @Get('getAllPq')
  getAllPq() {
    return this.phanquyenService.getAllPq();
  }

  // ----- TẠO PHÂN QUYỀN ----- //
  @Post('createPq')
  createPq(@Body() body: any) {
    return this.phanquyenService.createPq(body);
  }
}
