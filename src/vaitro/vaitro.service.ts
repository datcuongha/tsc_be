import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class VaitroService {
  prisma = new PrismaClient();

  // ----- LẤY THÔNG TIN VAI TRÒ ----- //
  async getAllRole() {
    const content = await this.prisma.vaiTro.findMany();
    return { message: 'Thành công', content, date: new Date() };
  }

  // ----- TẠO VAI TRÒ ----- //
  async createRole(body: any) {
    const checkRole = await this.prisma.vaiTro.findFirst({
      where: {
        name: body.name,
      },
    });

    if (checkRole) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'Vai trò này đã tồn tại',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await this.prisma.vaiTro.create({
      data: {
        name: body.name,
        dienGiai: body.dienGiai,
        status: true,
        createDate: new Date(),
      },
    });

    return { message: 'Thành công', data, date: new Date() };
  }

  // ----- SỬA THÔNG TIN VAI TRÒ ----- //
  async editRole(body: any) {
    const checkRole = await this.prisma.vaiTro.findFirst({
      where: {
        id: body.id,
      },
    });

    if (!checkRole) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'Vai trò này đã tồn tại',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await this.prisma.vaiTro.update({
      where: {
        id: body.id,
      },
      data: {
        name: body.name,
        dienGiai: body.dienGiai,
        modifiedDate: new Date(),
        status: body.status,
      },
    });

    return { message: 'Thành công', data, date: new Date() };
  }

  // ----- VAI TRÒ PHÂN QUYỀN ----- //
  async vaiTroPhanQuyen(body: { vaiTroId: number; phanQuyen: string[] }) {
    // xoá phân quyền cũ
    await this.prisma.vaiTro_phanQuyen.deleteMany({
      where: {
        vaiTroId: body.vaiTroId,
      },
    });

    // lấy phân quyền từ code
    const dsPhanQuyen = await this.prisma.phanQuyen.findMany({
      where: {
        code: {
          in: body.phanQuyen,
        },
      },
    });

    // map data
    const data = dsPhanQuyen.map((i) => ({
      vaiTroId: body.vaiTroId,
      phanQuyenId: i.id,
    }));

    // thêm vào bảng vaiTro_phanQuyen
    await this.prisma.vaiTro_phanQuyen.createMany({
      data,
    });
    return { message: 'Thành công', data, date: new Date() };
  }

  async getVaiTroPhanQuyen(vaiTroId: number) {
    const data = await this.prisma.vaiTro_phanQuyen.findMany({
      where: { vaiTroId: vaiTroId },
      include: {
        phanQuyen: true,
      },
    });

    return data.map((item) => item.phanQuyen.code);
  }
}
