import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import FormData = require('form-data');
import fetch from 'node-fetch';
import { API_URL } from 'src/units/units';

@Injectable()
export class PythonService {
  prisma = new PrismaClient();

  // ----- XỬ LÝ TỔNG HỢP XNT CHI TIẾT VÀ PHIẾU ĐẶT HÀNG CỦA KHO ----- //
  async process(
    // userId: string,
    file1: Express.Multer.File,
    file2: Express.Multer.File,
  ) {
    const formData = new FormData();

    formData.append('file1', file1.buffer, {
      filename: 'file1.xlsx',
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    formData.append('file2', file2.buffer, {
      filename: 'file2.xlsx',
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const res = await fetch(`${API_URL}/pivot`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    if (!res.ok) {
      throw new Error('Python service lỗi');
    }

    const data = await res.json();
    return data;
  }

  // ----- XỬ LÝ TỔNG HỢP XUẤT RA PHIÊU ĐẶT HÀNG ----- //
  async processTotal(payload: any, currentUser: string) {
    const { filteredData, pivotXnt, fromDate, toDate } = payload;

    const items = filteredData;
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Không có dữ liệu gửi lên');
    }

    const res = await fetch(`${API_URL}/pivotTotal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Python service lỗi: ${errorText}`);
    }

    const result: any = await res.json();
    const groups = result.data || {};
    const createdOrders = [];

    for (const [supplier, supplierData] of Object.entries(groups)) {
      const data = supplierData as any;

      const xntRows = pivotXnt.filter(
        (item: any) => item['Thương hiệu'] === supplier,
      );

      const productRows = data.byProduct || [];

      const branchRows = data.byBranch || [];

      if (!productRows.length) {
        continue;
      }

      const first = productRows.find(
        (row: any) => row['Công ty'] || row['Địa chỉ'] || row['Mã số thuế'],
      );

      const now = new Date();

      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yy = String(now.getFullYear()).slice(-2);

      const suffix = `/${mm}/${yy}`;
      const prefix = 'PDN';

      // Lấy tất cả phiếu cùng tháng
      const sameMonth = await this.prisma.phieuDatHangTong.findMany({
        where: {
          maPhieu: {
            endsWith: suffix,
          },
        },
        select: {
          maPhieu: true,
        },
      });

      let nextNumber = 1;

      if (sameMonth.length > 0) {
        const numbers = sameMonth
          .map((item) => {
            const match = item.maPhieu.match(/^PDN(\d+)\/\d{2}\/\d{2}$/);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter((n) => n > 0);

        if (numbers.length > 0) {
          nextNumber = Math.max(...numbers) + 1;
        }
      }

      const maPhieu = `${prefix}${String(nextNumber).padStart(3, '0')}${suffix}`;

      const phieuDatHangNhap = [
        ...new Set(
          branchRows
            .map((i: any) => String(i['Mã đặt hàng nhập']))
            .filter(Boolean),
        ),
      ] as string[];

      // Kiểm tra từng mã đặt hàng nhập đã tồn tại chưa
      const existed = await this.prisma.phieuDeXuatDetail.findFirst({
        where: {
          phieuDatHangNhap: {
            in: phieuDatHangNhap,
          },
        },
      });

      if (existed) {
        // Lấy thông tin phiếu chứa mã này
        const phieu = await this.prisma.phieuDatHangTong.findUnique({
          where: {
            id: existed.phieuId,
          },
          select: {
            id: true,
            maPhieu: true,
          },
        });

        throw new BadRequestException({
          message: `Mã đặt hàng nhập "${existed.phieuDatHangNhap}" đã tồn tại trong phiếu ${phieu?.maPhieu}`,
          code: 'ORDER_EXISTS',
        });
      }

      await this.prisma.$transaction(async (tx) => {
        const phieu = await tx.phieuDatHangTong.create({
          data: {
            maPhieu,
            tenNcc: supplier,
            congTy: first['Công ty'] || '',
            ghiChuHopDong: first['Ghi chú hợp đồng'] || '',
            diaChi: first['Địa chỉ'] || '',
            mst: first['Mã số thuế'] || '',
            createDate: new Date(),
            fromDate: fromDate ? new Date(fromDate) : null,
            toDate: toDate ? new Date(toDate) : null,
          },
        });

        // bảng tổng số lượng
        if (productRows.length) {
          await tx.phieuDatHangDetail.createMany({
            data: productRows.map((row: any) => ({
              phieuId: phieu.id,
              maHang: row['Mã hàng'],
              tenSp: row['Tên hàng'],
              dvt: row['ĐVT'],
              donGia: Number(row['Giá vốn']) || 0,
              thueSuat: String(row['Mức thuế VAT đầu vào'] ?? 0),
              giamGia: 0,
              soLuong: Number(row['Số lượng']) || 0,
              ghiChuHangHoa: row['Ghi chú'] || '',
              canhBao: row['Cảnh báo'] || '',
              slCoTheDat: String(row['SL có thể đặt hàng'] ?? ''),
              tonCuoi: Number(row['SL Tồn kho Cuối ngày gần nhất']) || 0,
              slKhoDat: Number(row['Tổng SL đặt hàng từ các Kho']) || 0,
              slTonToiUu: Number(row['SL tồn kho tối ưu']) || 0,
              slBanCuoi: Number(row['Tổng SL bán N kỳ gần nhất']) || 0,
              slNhapNccCuoi: Number(row['Tổng SL Nhập NCC N kỳ gần nhất']) || 0,
              ngayKhoDat: row['Thời gian'] ? new Date(row['Thời gian']) : null,
            })),
          });
        }

        // bảng chi tiết theo kho
        if (branchRows.length) {
          await tx.phieuDeXuatDetail.createMany({
            data: branchRows.map((row: any) => ({
              phieuId: phieu.id,
              tenNhaCungCap: row['Tên nhà cung cấp'] || supplier,
              chiNhanh: row['Chi nhánh'] || '',
              maHang: row['Mã hàng'],
              tenHang: row['Tên hàng'],
              giaVon: Number(row['Giá vốn']) || 0,
              giaBan: Number(row['Giá bán']) || 0,
              slKhoDat: Number(row['Số lượng kho đặt']) || 0,
              nhapChuyen: Number(row['Nhập chuyển']) || 0,
              nhapNcc: Number(row['Nhập NCC']) || 0,
              xuatBan: Number(row['Xuất bán']) || 0,
              tonCuoi: Number(row['Tồn cuối kì']) || 0,
              ghiChuKho: row['Ghi chú hàng hóa'] || '',
              thuMuaNhap: Number(row['thuMuaNhap']) || 0,
              chuThich: row['chuThich'] || '',
              ngayKhoDat: row['Thời gian'] ? new Date(row['Thời gian']) : null,
              phieuDatHangNhap: row['Mã đặt hàng nhập'] || null,
              canhBao: row['Cảnh báo'] || '',
            })),
          });
        }
        if (xntRows.length) {
          await tx.xntDetail.createMany({
            data: xntRows.map((row: any) => ({
              phieuId: phieu.id,
              maHang: row['Mã hàng'],
              chiNhanh: row['Chi nhánh'],
              tenNhaCungCap: row['Thương hiệu'],
              nhapChuyen: row['Nhập chuyển'],
              xuatBan: row['Xuất bán'],
              tonCuoi: row['Tồn cuối kì'],
              slTonToiUu: row['SL tồn kho tối ưu'] || 0,
            })),
          });
        }

        const details = productRows.map(
          (item: any) =>
            `${item['Mã hàng']} - ${item['Tên hàng']} | SL: ${item['Số lượng']}`,
        );

        await this.prisma.history.create({
          data: {
            userEdit: currentUser,
            module: 'DON-DAT-HANG',
            action: 'TẠO',
            recordId: String(phieu.id),
            description: `Tạo phiếu ${maPhieu}\n${details
              .map((x) => `- ${x}`)
              .join('\n')}`,
            oldData: {},
            newData: productRows,
          },
        });
      });
      createdOrders.push({
        maPhieu,
        supplier,
        totalProduct: productRows.length,
        totalBranch: branchRows.length,
      });
    }
    return {
      message: 'Lưu thành công',
      orders: createdOrders,
    };
  }
}
