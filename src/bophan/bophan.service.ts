import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class BophanService {
  prisma = new PrismaClient();

  // ----- LẤY THÔNG TIN BỘ PHẬN ----- //
  async getDataBp() {
    const content = await this.prisma.boPhan.findMany({});
    return { message: 'Thành công', content, date: new Date() };
  }

  // ----- TẠO BỘ PHẬN ----- //
  async createBp(body: any, currentUser: string) {
    const checkBp = await this.prisma.boPhan.findFirst({
      where: {
        maBp: body.maBp,
      },
    });

    if (checkBp) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'Mã bộ phận đã tồn tại',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await this.prisma.boPhan.create({
      data: {
        maBp: body.maBp,
        name: body.name,
        status: true,
        createDate: new Date(),
      },
    });

    await this.prisma.history.create({
      data: {
        userEdit: currentUser,
        module: 'BỘ PHẬN',
        action: 'TẠO',
        recordId: String(data.id),
        description: `Tạo mã bộ phận ${data.maBp} - ${data.name}`,
        newData: {
          maBp: data.maBp,
          name: data.name,
          status: data.status,
        },
      },
    });

    return { message: 'Thành công', data, date: new Date() };
  }

  // ----- SỬA THÔNG TIN BỘ PHẬN ----- //
  async editBp(body: any, currentUser: string) {
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
        maBp: body.maBp,
        name: body.name,
        status: body.status,
        modifiedDate: new Date(),
      },
    });

    const changes: string[] = [];

    if (checkBp.maBp !== data.maBp) {
      changes.push(`Mã bộ phận: "${checkBp.maBp}" → "${data.maBp}" `);
    }

    if (checkBp.name !== data.name) {
      changes.push(`Tên bộ phận: "${checkBp.name}" → "${data.name}"`);
    }

    if (checkBp.status !== data.status) {
      changes.push(`Trạng thái: "${checkBp.status}" → "${data.status}"`);
    }

    await this.prisma.history.create({
      data: {
        userEdit: currentUser,
        module: 'BỘ PHẬN',
        action: 'CẬP NHẬT',
        recordId: String(data.id),
        description:
          changes.length > 0
            ? `Cập nhật bộ phận ${data.name}: ${changes.join(', ')}`
            : `Cập nhật bộ phận ${data.name}`,
        oldData: {
          maBp: checkBp.maBp,
          name: checkBp.name,
          status: checkBp.status,
        },
        newData: {
          maBp: data.maBp,
          name: data.name,
          status: data.status,
        },
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

  // ----- IMPORT ----- //
  async importBp(body: any[]) {
    const chunkSize = 10;

    for (let i = 0; i < body.length; i += chunkSize) {
      const chunk = body.slice(i, i + chunkSize);

      await Promise.all(
        chunk.map(async (item, index) => {
          try {
            const maBp = item['Mã bộ phận']?.toString().trim();

            if (!maBp) {
              console.log(`Dòng ${i + index + 2}: Thiếu mã bộ phận`);
              return;
            }

            const status =
              item['Trạng thái'] === '1' ||
              item['Trạng thái'] === 1 ||
              item['Trạng thái'] === true;

            await this.prisma.boPhan.upsert({
              where: {
                maBp,
              },
              update: {
                name: item['Tên bộ phận'],
                status,
                modifiedDate: new Date(),
              },
              create: {
                maBp,
                name: item['Tên bộ phận'],
                status,
                createDate: new Date(),
              },
            });
          } catch (error: any) {
            console.error(
              `Lỗi mã bộ phận ${item['Mã bộ phận']}`,
              error?.message || error,
            );
          }
        }),
      );

      console.log(
        `Đã xử lý ${Math.min(i + chunkSize, body.length)}/${body.length}`,
      );
    }
    return {
      success: true,
      total: body.length,
      message: 'Import thành công',
    };
  }
}
