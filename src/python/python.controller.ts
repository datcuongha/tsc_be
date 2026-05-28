import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { PythonService } from './python.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@Controller('api/python')
export class PythonController {
  constructor(private readonly pythonService: PythonService) {}

  // ----- XỬ LÝ TỔNG HỢP XNT CHI TIẾT VÀ PHIẾU ĐẶT HÀNG ----- //  @Post('process')
  @Post('process')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file1', maxCount: 1 },
      { name: 'file2', maxCount: 1 },
    ]),
  )
  async process(@UploadedFiles() files) {
    const file1 = files.file1?.[0];
    const file2 = files.file2?.[0];
    if (!file1 || !file2) {
      throw new Error('Thiếu file');
    }

    return this.pythonService.callPython(file1, file2);
  }

  // ----- XỬ LÝ TỔNG HỢP XUẤT RA PHIÊU ĐẶT HÀNG ----- //
  @Post('processTotal')
  processTotal(@Body() item: any) {
    return this.pythonService.processTotal(item);
  }
}
