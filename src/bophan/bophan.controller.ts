import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Query,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { BophanService } from './bophan.service';
import { FileInterceptor } from '@nestjs/platform-express';
import * as XLSX from 'xlsx';

@Controller('api/bophan')
export class BophanController {
  constructor(private readonly bophanService: BophanService) {}

  // ----- LẤY THÔNG TIN BỘ PHẬN ----- //
  @Get('getDataBp')
  getDataBp() {
    return this.bophanService.getDataBp();
  }

  // ----- TẠO BỘ PHẬN ----- //
  @Post('createBp')
  createBp(@Body() body: any, @Req() req: any) {
    const currentUser = req.user.data.fullName;
    return this.bophanService.createBp(body, currentUser);
  }

  // ----- SỬA THÔNG TIN BỘ PHẬN ----- //
  @Post('editBp')
  editBp(@Body() body: any, @Req() req: any) {
    const currentUser = req.user.data.fullName;
    return this.bophanService.editBp(body, currentUser);
  }

  // ----- TẠM NGƯNG BỘ PHẬN ----- //
  @Delete('delBp')
  delBp(@Query('id') id: number) {
    return this.bophanService.delBp(id);
  }

  // ----- IMPORT ----- //
  @Post('importBp')
  @UseInterceptors(FileInterceptor('file'))
  async importBp(@UploadedFile() file: Express.Multer.File) {
    console.log(file);
    if (!file) {
      throw new BadRequestException('Không nhận được file');
    }

    const workbook = XLSX.read(file.buffer, {
      type: 'buffer',
    });

    const sheetName = workbook.SheetNames[0];

    const worksheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(worksheet);

    return this.bophanService.importBp(data);
  }
}
