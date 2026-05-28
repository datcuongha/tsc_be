import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { toSlug } from 'src/units/units';

@Injectable()
export class DashboardAdminService {
  prisma = new PrismaClient();

  // ----- LẤY THÔNG TIN LINK BI ----- //
  async getAllDashboardAdmin() {
    const content = await this.prisma.powerBi.findMany();
    return { message: 'Thành công', content, date: new Date() };
  }

  // ----- TẠO LINK BI ----- //
  async createDashboardLink(body: any) {
    const checkLink = await this.prisma.powerBi.findFirst({
      where: {
        link: body.link,
      },
    });

    if (checkLink) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'Link này đã tồn tại',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const location = toSlug(body.title);
    const data = await this.prisma.powerBi.create({
      data: {
        title: body.title,
        link: body.link,
        userId: body.userId,
        status: true,
        location: location,
        createDate: new Date(),
      },
    });
    return { message: ' Thành công', data, date: new Date() };
  }

  // ----- EDIT LINK BI ----- //
  async editDashboardLink(body: any) {
    console.log(body);
    const checkEdit = await this.prisma.powerBi.findFirst({
      where: {
        id: body.id,
      },
    });

    if (!checkEdit) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'Link này không tồn tại',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const location = toSlug(body.title);
    const data = await this.prisma.powerBi.update({
      where: {
        id: checkEdit.id,
      },
      data: {
        title: body.title,
        link: body.link,
        location: location,
        status: Boolean(body.status),
        modifiedDate: new Date(),
      },
    });
    return { message: 'Thành công', data, date: new Date() };
  }

  // ----- DEL LINK BI ----- //
  async delDashboardLink(id: number) {
    const checkLink = await this.prisma.powerBi.findFirst({
      where: {
        id: Number(id),
      },
    });
    if (!checkLink) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'Link này không tồn tại',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await this.prisma.powerBi.update({
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
