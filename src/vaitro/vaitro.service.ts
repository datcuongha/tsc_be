import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  // ----- GÁN DANH SÁCH QUYỀN CHO VAI TRÒ----- //
  async vaiTroPhanQuyen(body: { vaiTroId: number; phanQuyen: string[] }) {
    const vaiTroId = Number(body.vaiTroId);

    if (!vaiTroId) {
      throw new BadRequestException('Vai trò không hợp lệ');
    }

    const role = await this.prisma.vaiTro.findUnique({
      where: {
        id: vaiTroId,
      },
    });

    if (!role) {
      throw new NotFoundException('Vai trò không tồn tại');
    }

    // Chuẩn hóa và loại bỏ code trùng
    const permissionCodes = [
      ...new Set(
        (body.phanQuyen ?? [])
          .map((code) => String(code).trim().toUpperCase())
          .filter(Boolean),
      ),
    ];

    const permissions =
      permissionCodes.length > 0
        ? await this.prisma.phanQuyen.findMany({
            where: {
              code: {
                in: permissionCodes,
              },
              status: true,
            },
            select: {
              id: true,
              code: true,
            },
          })
        : [];

    // Kiểm tra các code không tồn tại
    const foundCodes = new Set(
      permissions.map((permission) => permission.code).filter(Boolean),
    );

    const invalidCodes = permissionCodes.filter(
      (code) => !foundCodes.has(code),
    );

    if (invalidCodes.length > 0) {
      throw new BadRequestException(
        `Quyền không tồn tại hoặc đã ngừng sử dụng: ${invalidCodes.join(', ')}`,
      );
    }

    const data = permissions.map((permission) => ({
      vaiTroId,
      phanQuyenId: permission.id,
    }));

    // Xóa cũ và thêm mới trong cùng transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.vaiTro_phanQuyen.deleteMany({
        where: {
          vaiTroId,
        },
      });

      if (data.length > 0) {
        await tx.vaiTro_phanQuyen.createMany({
          data,
          skipDuplicates: true,
        });
      }
    });

    return {
      message: 'Cập nhật phân quyền thành công',
      data: {
        vaiTroId,
        phanQuyen: permissionCodes,
      },
      date: new Date(),
    };
  }

  // ----- LẤY QUYỀN CỦA MỘT VAI TRÒ ----- //
  async getVaiTroPhanQuyen(vaiTroId: number) {
    const role = await this.prisma.vaiTro.findUnique({
      where: {
        id: Number(vaiTroId),
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!role) {
      throw new NotFoundException('Vai trò không tồn tại');
    }

    const rolePermissions = await this.prisma.vaiTro_phanQuyen.findMany({
      where: {
        vaiTroId: Number(vaiTroId),
        phanQuyen: {
          status: true,
        },
      },
      select: {
        phanQuyen: {
          select: {
            id: true,
            code: true,
            name: true,
            module: true,
          },
        },
      },
      orderBy: {
        phanQuyen: {
          module: 'asc',
        },
      },
    });

    return {
      message: 'Thành công',
      content: {
        vaiTro: role,
        phanQuyen: rolePermissions.map((item) => item.phanQuyen),
      },
      date: new Date(),
    };
  }
}
