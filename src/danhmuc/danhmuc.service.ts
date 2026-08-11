import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { getAllProducts, saveProductsToDatabase } from 'src/kiotViet/product';

@Injectable()
export class DanhmucService {
  prisma = new PrismaClient();

  // ----- LẤY DANH MỤC HÀNG HOÁ ----- //
  async getAllDmhh() {
    const content = await this.prisma.dmhhFast.findMany({
      include: {
        dmncc: true,
      },
    });
    return { message: 'Thành công', content, date: new Date() };
  }

  // ----- LÁY DANH MỤC LOẠI VĂN BẢN ----- //
  async getAllDmLoaiVb() {
    const content = await this.prisma.dmLoaiVb.findMany({});
    return { message: 'Thành công', content, date: new Date() };
  }

  // ----- LẤY DANH MỤC KHO ----- //
  async getAllKho() {
    const content = await this.prisma.dmChiNhanh.findMany({
      where: {
        status: true,
      },
    });
    return { message: 'Thành cônng', content, date: new Date() };
  }

  // ----- LẤY TOKEN KIOT ----- //
  async getAccessTokenKiot() {
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', '33bce6de-32c6-47ad-b734-9e0573b3f474');
      params.append(
        'client_secret',
        '4DB765D5BA7D02639828C3A7294900099B097CDE',
      );
      // params.append("Retailer","benthanhtsc")

      const response = await axios.post(
        'https://id.kiotviet.vn/connect/token',
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      return `Bearer ${response.data.access_token}`;
    } catch (error) {
      console.error(
        'Error getting access token:',
        error.response?.data || error.message,
      );
      return null;
    }
  }

  // ----- LẤY DANH MỤC NCC -----//
  async getAllDmncc() {
    const content = await this.prisma.dmncc.findMany();
    return { message: 'Thành công', content, date: new Date() };
  }

  // ----- LẤY API DANH MỤC HÀNG HOÁ KIOT ----- //
  async syncDmhhKiot() {
    const accessTokenKiot = await this.getAccessTokenKiot();

    const products = await getAllProducts(accessTokenKiot);

    if (!products.length) {
      return {
        message: 'Không có dữ liệu mới',
      };
    }

    await saveProductsToDatabase(products);

    await this.prisma.synsTimeKiot.upsert({
      where: {
        keyName: 'LAST_SYNC_KIOT_PRODUCT',
      },
      update: {
        value: new Date().toISOString(),
      },
      create: {
        keyName: 'LAST_SYNC_KIOT_PRODUCT',
        value: new Date().toISOString(),
      },
    });

    return {
      message: 'Đồng bộ thành công',
      total: products.length,
    };
  }

  // ----- IMPORT DANH MỤC HÀNG HOÁ FAST ----- //
  async importDmhh(body: any[]) {
    const chunkSize = 100;

    // Load VAT Kiot 1 lần
    const kiotProducts = await this.prisma.dmhhKiot.findMany({
      select: {
        code: true,
        dnhhKiotPurchaseTax: {
          select: {
            value: true,
          },
        },
      },
    });

    const vatMap = new Map<string, string>();

    kiotProducts.forEach((item) => {
      vatMap.set(
        item.code || '',
        item.dnhhKiotPurchaseTax?.[0]?.value?.toString() || '0',
      );
    });

    for (let i = 0; i < body.length; i += chunkSize) {
      const chunk = body.slice(i, i + chunkSize);

      await Promise.all(
        chunk.map(async (item) => {
          try {
            const maHang = item.SKU?.toString().trim();

            if (!maHang) return;

            const maNcc = item['Mã NCC']?.toString().trim() || null;

            const vat = vatMap.get(maHang) || '0';

            // tạo NCC nếu chưa có
            if (maNcc) {
              await this.prisma.dmncc.upsert({
                where: {
                  maNcc,
                },
                update: {
                  modifiedDate: new Date(),
                },
                create: {
                  maNcc,
                  tenNcc: item['Thương hiệu'] || '',
                  status: false,
                  createDate: new Date(),
                },
              });
            }

            await this.prisma.dmhhFast.upsert({
              where: {
                maHang,
              },
              update: {
                maNcc,
                barcode: item.Barcode?.toString() || null,
                tenHang: item['Tên sản phẩm + thuộc tính'] || '',
                giaMua: Number(item['Giá mua từ NCC'] || 0),
                giaBan: Number(item['Giá bán sau thuế'] || 0),
                vat,
                dvt: item['Đvt'] || null,
                status: Boolean(item.status),
                modifiedDate: new Date(),
              },
              create: {
                maHang,
                maNcc,
                barcode: item.Barcode?.toString() || null,
                tenHang: item['Tên sản phẩm + thuộc tính'] || '',
                giaMua: Number(item['Giá mua từ NCC'] || 0),
                giaBan: Number(item['Giá bán sau thuế'] || 0),
                vat,
                dvt: item['Đvt'] || null,
                status: Boolean(item.status),
                createDate: new Date(),
              },
            });
          } catch (error) {
            console.error(
              `Lỗi import SKU: ${item?.SKU}`,
              error instanceof Error ? error.message : error,
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
      message: 'Import danh mục hàng hóa thành công',
    };
  }

  // ----- IMPORT NCC ----- //
  async importDmncc(body: any[]) {
    // Lọc bỏ dòng trống
    const data = body.filter(
      (item) =>
        item['Mã nhà cung cấp'] &&
        item['Mã nhà cung cấp'].toString().trim() !== '',
    );

    const chunkSize = 100;

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);

      await Promise.all(
        chunk.map(async (item, index) => {
          try {
            const maNcc = item['Mã nhà cung cấp']?.toString().trim();

            if (!maNcc) {
              console.log(`Bỏ qua dòng ${i + index + 2}: thiếu mã NCC`);
              return;
            }

            await this.prisma.dmncc.upsert({
              where: {
                maNcc,
              },
              update: {
                tenNcc: item['Tên nhà cung cấp'] || null,
                email: item['Email'] || null,
                phone: item['Điện thoại'] || null,
                diaChi: item['Địa chỉ'] || null,
                mst: item['Mã số thuế'] || null,
                congTy: item['Công ty'] || null,
                noteHd: item['Ghi chú hợp đồng'] || null,
                status: true,
                modifiedDate: new Date(),
              },
              create: {
                maNcc,
                tenNcc: item['Tên nhà cung cấp'] || null,
                email: item['Email'] || null,
                phone: item['Điện thoại'] || null,
                diaChi: item['Địa chỉ'] || null,
                mst: item['Mã số thuế'] || null,
                congTy: item['Công ty'] || null,
                noteHd: item['Ghi chú hợp đồng'] || null,
                status: true,
                createDate: new Date(),
              },
            });
          } catch (error: any) {
            console.error(
              `Lỗi NCC ${item['Mã nhà cung cấp']}`,
              error?.message || error,
            );
          }
        }),
      );

      console.log(
        `Đã xử lý ${Math.min(i + chunkSize, data.length)}/${data.length}`,
      );
    }

    return {
      success: true,
      total: data.length,
      message: 'Import nhà cung cấp thành công',
    };
  }
}
