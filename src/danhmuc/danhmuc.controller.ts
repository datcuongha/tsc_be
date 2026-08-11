import {
  BadRequestException,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { DanhmucService } from './danhmuc.service';
import { FileInterceptor } from '@nestjs/platform-express';
import * as XLSX from 'xlsx';

@Controller('api/danhmuc')
export class DanhmucController {
  constructor(private readonly danhmucService: DanhmucService) {}

  // ----- LẤY DANH MỤC HÀNG HOÁ ----- //
  @Get('getAllDmhh')
  getAllDmhh() {
    return this.danhmucService.getAllDmhh();
  }

  // ----- LẤY DANH MỤC KHO ----- //
  @Get('getAllKho')
  getAllKho() {
    return this.danhmucService.getAllKho();
  }

  // ----- LÁY DANH MỤC LOẠI VĂN BẢN ----- //
  @Get('getAllDmLoaiVb')
  getAllDmLoaiVb() {
    return this.danhmucService.getAllDmLoaiVb();
  }

  // ----- LẤY DANH MỤC NCC ----- //
  @Get('getAllDmncc')
  getAllDmncc() {
    return this.danhmucService.getAllDmncc();
  }

  // ----- LẤY API DANH MỤC HÀNG HOÁ KIOT ----- //
  @Get('syncDmhhKiot')
  syncDmhhKiot() {
    return this.danhmucService.syncDmhhKiot();
  }

  // ----- LẤY TOKEN KIOT ----- //
  @Get('token')
  getAccessTokenKiot() {
    return this.danhmucService.getAccessTokenKiot();
  }

  // ----- IMPORT DANH MỤC HÀNG HOÁ FAST ----- //
  @Post('importDmhh')
  @UseInterceptors(FileInterceptor('file'))
  async importDmhh(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Không nhận được file');
    }
    const workbook = XLSX.read(file.buffer, {
      type: 'buffer',
    });

    const sheetName = workbook.SheetNames[0];

    const worksheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(worksheet);

    return this.danhmucService.importDmhh(data);
  }

  // ----- IMPORT DANH MỤC NCC ----- //
  @Post('importDmncc')
  @UseInterceptors(FileInterceptor('file'))
  async importDmncc(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Không nhận được file');
    }
    const workbook = XLSX.read(file.buffer, {
      type: 'buffer',
    });

    const sheetName = workbook.SheetNames[0];

    const worksheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(worksheet);

    return this.danhmucService.importDmncc(data);
  }
}
