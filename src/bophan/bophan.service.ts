import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class BophanService {
  prisma = new PrismaClient();

  // ----- LẤY THÔNG TIN BỘ PHẬN ----- //
  async getDataBp() {
    const content = await this.prisma.boPhan.findMany({
      orderBy: {
        name: 'asc',
      },
    });
    return { message: 'Thành công', content, date: new Date() };
  }

  // ----- TẠO BỘ PHẬN ----- //
  async createBp(body: any) {
    const checkBp = await this.prisma.boPhan.findFirst({
      where: {
        name: body.name,
      },
    });

    if (checkBp) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'Tên bộ phận đã tồn tại',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await this.prisma.boPhan.create({
      data: {
        name: body.name,
        status: true,
        createDate: new Date(),
      },
    });

    return { message: 'Thành công', data, date: new Date() };
  }

  // ----- SỬA THÔNG TIN BỘ PHẬN ----- //
  async editBp(body: any) {
    const checkBp = await this.prisma.boPhan.findFirst({
      where: {
        id: body.id,
      },
    });

    if (!checkBp) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'Bộ phận này không tồn tại',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await this.prisma.boPhan.update({
      where: {
        id: body.id,
      },
      data: {
        name: body.name,
        status: body.status,
        modifiedDate: new Date(),
      },
    });
    return { message: 'Thành công', data, date: new Date() };
  }

  // ----- TẠM NGƯNG THÔNG TIN BỘ PHẬN ----- //
  async delBp(id: number) {
    const checkBp = await this.prisma.boPhan.findFirst({
      where: {
        id: Number(id),
      },
    });

    if (!checkBp) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'Bộ phận này không tồn tại',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await this.prisma.boPhan.update({
      where: {
        id: Number(id),
      },
      data: {
        status: false,
        modifiedDate: new Date(),
      },
    });
    return { message: 'Thành công', data, date: new Date() };
  }
}
