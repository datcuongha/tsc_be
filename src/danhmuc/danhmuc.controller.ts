import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { DanhmucService } from './danhmuc.service';
import { FileInterceptor } from '@nestjs/platform-express';
import * as XLSX from 'xlsx';
import type { Response as ExpressResponse } from 'express';
import { Readable } from 'stream';

@Controller('api/danhMuc')
export class DanhmucController {
  constructor(private readonly danhmucService: DanhmucService) {}

  // ----- LẤY DANH MỤC HÀNG HOÁ ----- //
  @Get('getAllDmhh')
  getAllDmhh(
    @Query('page') page = '1',
    @Query('limit') limit = '100',
    @Query('search') search = '',
  ) {
    return this.danhmucService.getAllDmhh(
      Number(page),
      Number(limit),
      search.trim(),
    );
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

  // ----- IMPORT ĐỊNH MỨC ----- //
  @Post('importDinhMuc')
  @UseInterceptors(FileInterceptor('file'))
  async importDinhMuc(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const fullName = req.user.fullName;
    if (!file) {
      throw new BadRequestException('Không nhận được file');
    }

    return this.danhmucService.importDinhMuc(file, fullName);
  }

  @Get('downloadDinhMuc')
  async downloadDinhMuc(
    @Res({ passthrough: true })
    response: ExpressResponse,
  ): Promise<StreamableFile> {
    const { fileName, fileBuffer } =
      await this.danhmucService.downloadDinhMuc();

    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    response.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    );

    response.setHeader('Content-Length', String(fileBuffer.length));

    const fileStream = Readable.from([fileBuffer]);

    return new StreamableFile(fileStream);
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

  // ----- TÌM MÃ HÀNG ----- //
  @Get('getDmhhByMaHang')
  async getDmhhByMaHang(@Query('maHang') maHang: string) {
    return this.danhmucService.getDmhhByMaHang(maHang);
  }
}
