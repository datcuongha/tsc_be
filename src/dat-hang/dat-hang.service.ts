import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DatHangService {
  prisma = new PrismaClient();

  // ----- LẤY TÁT CẢ ĐƠN ĐẶT HÀNG ----- //
  async getAllDatHang() {
    const content = await this.prisma.phieuDatHang.findMany({
      include: {
        detailPhieuDatHang: true,
        detailPhieuDeXuat: true,
      },
      orderBy: {
        maPhieu: 'desc',
      },
    });
    return { message: 'Thành công', content, date: new Date() };
  }

  // ----- CẬP NHẬP THÔNG TIN ĐƠN ĐỀ XUẤT ----- //
  async editDonDeXuat(body: any) {
    const checkMaPhieu = await this.prisma.phieuDatHang.findFirst({
      where: {
        id: body.id,
      },
    });

    if (!checkMaPhieu) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'Mã phiếu này không tồn tại',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    await Promise.all(
      body.detailPhieuDatHang.map((item: any) =>
        this.prisma.detailPhieuDatHang.update({
          where: {
            id: Number(item.id),
          },
          data: {
            kySoLieu: item.kySoLieu,
            giamGia: Number(item.giamGia) || 0,
            ghiChuHangHoa: item.ghiChuHangHoa || '',
          },
        }),
      ),
    );

    await this.prisma.phieuDatHang.update({
      where: {
        id: body.id,
      },
      data: {
        modifiedDate: new Date(),
      },
    });

    return {
      message: 'Cập nhật thành công',
    };
  }

  // ----- CẬP NHẬT THÔNG TIN TM DUYỆT SỐ LƯỢNG ----- //
  async editDatHangTM(body: any) {
    const checkMaPhieu = await this.prisma.phieuDatHang.findFirst({
      where: {
        id: body.maPhieuId,
      },
    });

    if (!checkMaPhieu) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'Mã phiếu không tồn tại',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. update detail đề xuất
      await Promise.all(
        body.details.map((item: any) =>
          tx.detailPhieuDeXuat.update({
            where: {
              id: item.id,
            },
            data: {
              thuMuaNhap: Number(item.thuMuaNhap) || 0,
            },
          }),
        ),
      );

      // 2. group lại theo mã hàng
      const grouped = body.details.reduce((acc: any, item: any) => {
        const maHang = item.maHang;

        if (!acc[maHang]) {
          acc[maHang] = 0;
        }

        acc[maHang] += Number(item.thuMuaNhap) || 0;

        return acc;
      }, {});

      // 3. update detail đặt hàng
      await Promise.all(
        Object.entries(grouped).map(([maHang, total]) =>
          tx.detailPhieuDatHang.updateMany({
            where: {
              maPhieuId: body.maPhieuId,
              maHang,
            },
            data: {
              soLuong: Number(total),
            },
          }),
        ),
      );

      // 4. update header
      await tx.phieuDatHang.update({
        where: {
          id: body.maPhieuId,
        },
        data: {
          modifiedDate: new Date(),
        },
      });
    });

    return {
      message: 'Cập nhật thành công',
    };
  }
}
