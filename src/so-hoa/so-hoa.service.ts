import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class SoHoaService {
  prisma = new PrismaClient();

  // ----- LẤY DANH SÁCH SÔ HOÁ ----- //
  async getAllSoHoa() {
    const data = await this.prisma.dataSoHoa.findMany({
      include: {
        boPhan: true,
        dmLoaiVb: true,
      },
      orderBy: {
        id: 'desc',
      },
    });

    const roots = data.filter((item) => !item.parentId);

    const content = roots.map((root) => ({
      ...root,
      children: data.filter((item) => item.parentId === root.id),
    }));

    return {
      message: 'Thành công',
      content,
      date: new Date(),
    };
  }

  // ----- TẠO TÀI LIỆU SỐ HOÁ ----- //
  async createSoHoa(body: any, currentUser: string) {
    console.log(body);

    const check = await this.prisma.dataSoHoa.findFirst({
      where: {
        soVb: body.soVb,
      },
    });

    if (check) {
      throw new BadRequestException('Số văn bản này đã tồn tại');
    }

    const data = await this.prisma.dataSoHoa.create({
      data: {
        soVb: body.soVb,
        noiDung: body.noiDung,
        ngayVb: body.ngayVb ? new Date(body.ngayVb) : null,
        status: false,
        createDate: new Date(),

        dataSoHoa: body.parentId
          ? {
              connect: {
                id: Number(body.parentId),
              },
            }
          : undefined,

        users: {
          connect: {
            userId: Number(currentUser),
          },
        },

        boPhan: {
          connect: {
            id: Number(body.boPhan),
          },
        },

        dmLoaiVb: {
          connect: {
            id: Number(body.loaiVb),
          },
        },
      },
      include: {
        users: true,
        boPhan: true,
        dmLoaiVb: true,
        dataSoHoa: true,
      },
    });

    await this.prisma.history.create({
      data: {
        userEdit: data.users.fullName,
        module: 'SỐ HOÁ',
        action: 'TẠO',
        recordId: String(data.userId),
        description: `Tạo tài liệu số hoá ${data.soVb}, nội dung ${data.noiDung}`,
        newData: {
          userName: data.users.fullName,
          loaiVb: data.loaiVb,
          noiDung: data.noiDung,
          ngayVb: data.ngayVb ? new Date(body.ngayVb).toISOString() : null,
          status: false,
          boPhanId: data.boPhanId,
          boPhan: data.boPhan.name,
        },
      },
    });
  }
}
