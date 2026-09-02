import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PhanquyenService {
  prisma = new PrismaClient();

  // ----- LẤY THÔNG TIN PHÂN QUYỀN ----- //
  async getAllPq() {
    const content = await this.prisma.phanQuyen.findMany({
      where: {
        status: true,
      },
      orderBy: [
        {
          module: 'asc',
        },
        {
          name: 'asc',
        },
      ],
    });

    return {
      message: 'Thành công',
      content,
      date: new Date(),
    };
  }

  // ----- TẠO PHÂN QUYỀN ----- //
  async createPq(body: any) {
    const check = await this.prisma.phanQuyen.findFirst({
      where: {
        code: body.code,
      },
    });

    if (check) {
      throw new BadRequestException('Phân quyền này đã tồn tại');
    }

    const data = await this.prisma.phanQuyen.create({
      data: {
        code: body.code,
        name: body.name,
        module: body.module,
        status: Boolean(true),
        createDate: new Date(),
      },
    });

    return { message: 'Thành công', data, date: new Date() };
  }
}
