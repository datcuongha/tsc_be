import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { InvoiceItService } from './invoice-it.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';


@Controller('api/invoice-it')
export class InvoiceItController {
  constructor(private readonly invoiceItService: InvoiceItService) {}

  // ----- LẤY THÔNG TIN HÓA ĐƠN ----- //
  @Get('getDataXml')
  getDataXml() {
    return this.invoiceItService.getDataXml();
  }

  // ----- IMPORT XML ----- //
  @Post('importXml')
  importXml(@Body() body: any) {
    return this.invoiceItService.importXml(body);
  }

  // ----- CREATE INV ----- //
  @Post('createInv')
  createInv(@Body() body: any) {
    return this.invoiceItService.createInv(body);
  }

  // ----- REMOVE INV ----- //
  @Delete('removeInv')
  removeInv(@Query('id') id: number) {
    return this.invoiceItService.removeInv(id);
  }

  // ----- EDIT INV ----- //
  @Post('editInv')
  editInv(@Body() body: any) {
    return this.invoiceItService.editInv(body);
  }

  // ----- UPLOAD FILE SCAN ----- //
  @Post('uploadScan')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        // destination: '/usr/share/be/uploads/invoice-scan',
        // destination: '/Volumes/FILESCAN/invoice-scan',
        filename: (req, file, cb) => {
          // const now = new Date();
          // const dd = String(now.getDate()).padStart(2, '0');
          // const mm = String(now.getMonth() + 1).padStart(2, '0');
          // const yyyy = now.getFullYear();

          // const onlyDate = `${dd}-${mm}-${yyyy}`; // 03-12-2025

          const originalname = file.originalname
            .replace(/\s+/g, '_') // space → _
            .replace(/[^\w.-]/g, ''); // xoá ký tự đặc biệt

          // const originalName = file.originalname.replace(/\s+/g, '_'); // bỏ khoảng trắng
          cb(null, originalname);
        },
      }),
    }),
  )
  async uploadScan(
    @Query('id') id: number, // ?id=123
    @UploadedFile() file: Express.Multer.File, // file gửi từ FE
  ) {
    if (!file) {
      // tuỳ bạn xử lý error riêng
      throw new Error('Không có file upload');
    }

    return this.invoiceItService.uploadScan(Number(id), file.filename);
  }
}
