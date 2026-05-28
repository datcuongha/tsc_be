import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PhanquyenService {
  prisma = new PrismaClient();

  // ----- LẤY THÔNG TIN PHÂN QUYỀN ----- //
  async getAllPq() {
    const content = await this.prisma.phanQuyen.findMany();
    return { message: 'Thành công', content, date: new Date() };
  }
}
