// import axios from 'axios';
// import { PrismaClient } from '@prisma/client';
// import pLimit from 'p-limit';

// const prisma = new PrismaClient();
// const limit = pLimit(10);

// const KIOT_API_URL = 'https://public.kiotapi.com/products';
// const KIOT_RETAILER = 'benthanhtsc';

// const LAST_SYNC_KEY = 'LAST_SYNC_KIOT_PRODUCT';

// // =====================================================
// // HELPER
// // =====================================================

// const normalizeTaxArray = (tax: any): any[] => {
//   if (!tax) {
//     return [];
//   }

//   if (Array.isArray(tax)) {
//     return tax;
//   }

//   return [tax];
// };

// // =====================================================
// // GET ALL PRODUCTS FROM KIOT
// // =====================================================

// export const getAllProducts = async (accessTokenKiot: string) => {
//   const sync = await prisma.synsTimeKiot.findUnique({
//     where: {
//       keyName: LAST_SYNC_KEY,
//     },
//   });

//   const lastSyncTime = sync?.value || undefined;

//   const allProducts: any[] = [];

//   let currentItem = 0;

//   const pageSize = 100;

//   while (true) {
//     try {
//       const response = await axios.get(KIOT_API_URL, {
//         headers: {
//           Authorization: accessTokenKiot,
//           Retailer: KIOT_RETAILER,
//         },

//         params: {
//           currentItem,
//           pageSize,

//           // Lấy inventory
//           includeInventory: true,

//           // Chỉ lấy sản phẩm thay đổi
//           ...(lastSyncTime
//             ? {
//                 lastModifiedFrom: lastSyncTime,
//               }
//             : {}),
//         },
//       });

//       const products = response.data?.data || [];

//       if (!products.length) {
//         break;
//       }

//       allProducts.push(...products);

//       console.log(
//         `Đã lấy ${allProducts.length}/${response.data?.total ?? '?'}`,
//       );

//       currentItem += pageSize;

//       // Tránh trường hợp API trả ít hơn pageSize
//       if (products.length < pageSize) {
//         break;
//       }
//     } catch (error) {
//       console.error('❌ Lỗi lấy sản phẩm KiotViet:', error);

//       if (axios.isAxiosError(error)) {
//         console.error('Status:', error.response?.status);
//         console.error('Response:', error.response?.data);
//       }

//       throw error;
//     }
//   }

//   return allProducts;
// };

// // =====================================================
// // MAP PRODUCT
// // =====================================================

// const mapDmhhKiot = (product: any) => {
//   return {
//     createdDate: product.createdDate ?? null,

//     masterCode: product.masterCode ?? null,

//     masterProductId: product.masterProductId ?? null,

//     tradeMarkName: product.tradeMarkName ?? null,

//     tradeMarkId: product.tradeMarkId ?? null,

//     taxType: product.taxType ?? null,

//     taxRate:
//       product.taxRate !== undefined && product.taxRate !== null
//         ? String(product.taxRate)
//         : null,

//     taxname: product.taxname ?? null,

//     retailerId: product.retailerId ?? null,

//     code: product.code ?? null,

//     barCode: product.barCode ?? null,

//     name: product.name ?? null,

//     fullName: product.fullName ?? null,

//     categoryId: product.categoryId ?? null,

//     categoryName: product.categoryName ?? null,

//     allowsSale: product.allowsSale ?? null,

//     type: product.type ?? null,

//     hasVariants: product.hasVariants ?? null,

//     basePrice: product.basePrice ?? null,

//     weight: product.weight ?? null,

//     unit: product.unit ?? null,

//     conversionValue: product.conversionValue ?? null,

//     modifiedDate: product.modifiedDate ?? null,

//     isActive: product.isActive ?? null,

//     description: product.description ?? null,

//     isRewardPoint: product.isRewardPoint ?? null,

//     isLotSerialControl: product.isLotSerialControl ?? null,

//     isBatchExpireControl: product.isBatchExpireControl ?? null,

//     orderTemplate: product.orderTemplate ?? null,
//   };
// };

// // =====================================================
// // SAVE PRODUCTS
// // =====================================================

// export const saveProductsToDatabase = async (products: any[]) => {
//   await Promise.all(
//     products.map((product) =>
//       limit(async () => {
//         const {
//           id: kiotProductId,

//           inventories = [],

//           attributes = [],

//           productTaxs = [],

//           purchaseTax,
//         } = product;

//         if (!kiotProductId) {
//           console.error('❌ Sản phẩm không có ID:', product.code, product.name);

//           return;
//         }

//         try {
//           await prisma.$transaction(async (tx) => {
//             // =================================================
//             // 1. PRODUCT
//             // =================================================

//             const dmhhData = mapDmhhKiot(product);

//             await tx.dmhhKiot.upsert({
//               where: {
//                 kiotProductId,
//               },

//               update: dmhhData,

//               create: {
//                 kiotProductId,
//                 ...dmhhData,
//               },
//             });

//             // =================================================
//             // 2. INVENTORY
//             // =================================================

//             for (const inv of inventories) {
//               if (!inv.branchId) {
//                 continue;
//               }

//               await tx.inventoriesKiot.upsert({
//                 where: {
//                   kiotProductId_branchId: {
//                     kiotProductId,
//                     branchId: inv.branchId,
//                   },
//                 },

//                 update: {
//                   productCode: inv.productCode ?? null,

//                   productName: inv.productName ?? null,

//                   branchName: inv.branchName ?? null,

//                   cost: inv.cost ?? 0,

//                   onHand: inv.onHand ?? 0,

//                   reserved: inv.reserved ?? 0,

//                   actualReserved: inv.actualReserved ?? 0,

//                   minQuantity: inv.minQuantity ?? 0,

//                   maxQuantity: inv.maxQuantity ?? 0,

//                   isActive: inv.isActive ?? true,

//                   onOrder: inv.onOrder ?? 0,
//                 },

//                 create: {
//                   kiotProductId,

//                   branchId: inv.branchId,

//                   productCode: inv.productCode ?? null,

//                   productName: inv.productName ?? null,

//                   branchName: inv.branchName ?? null,

//                   cost: inv.cost ?? 0,

//                   onHand: inv.onHand ?? 0,

//                   reserved: inv.reserved ?? 0,

//                   actualReserved: inv.actualReserved ?? 0,

//                   minQuantity: inv.minQuantity ?? 0,

//                   maxQuantity: inv.maxQuantity ?? 0,

//                   isActive: inv.isActive ?? true,

//                   onOrder: inv.onOrder ?? 0,
//                 },
//               });
//             }

//             // =================================================
//             // 3. ATTRIBUTES
//             // =================================================

//             for (const attr of attributes) {
//               if (!attr.attributeName) {
//                 continue;
//               }

//               await tx.attributes.upsert({
//                 where: {
//                   kiotProductId_attributeName: {
//                     kiotProductId,

//                     attributeName: attr.attributeName,
//                   },
//                 },

//                 update: {
//                   attributeValue: attr.attributeValue ?? null,
//                 },

//                 create: {
//                   kiotProductId,

//                   attributeName: attr.attributeName,

//                   attributeValue: attr.attributeValue ?? null,
//                 },
//               });
//             }

//             // =================================================
//             // 4. THUẾ BÁN RA
//             //
//             // productTaxs:
//             //
//             // [
//             //   {
//             //     taxId: 3,
//             //     value: 8,
//             //     name: "VAT 8%"
//             //   }
//             // ]
//             //
//             // Đây mới là VAT mà bạn cần cho dmhhFast.vat
//             // =================================================

//             const saleTaxes = normalizeTaxArray(productTaxs);

//             for (const tax of saleTaxes) {
//               const taxId = Number(tax.taxId);

//               if (!Number.isFinite(taxId)) {
//                 continue;
//               }

//               await tx.dmhhKiotTax.upsert({
//                 where: {
//                   kiotProductId_taxId: {
//                     kiotProductId,

//                     taxId,
//                   },
//                 },

//                 update: {
//                   name: tax.name ?? null,

//                   value:
//                     tax.value !== undefined && tax.value !== null
//                       ? Number(tax.value)
//                       : 0,
//                 },

//                 create: {
//                   kiotProductId,

//                   taxId,

//                   name: tax.name ?? null,

//                   value:
//                     tax.value !== undefined && tax.value !== null
//                       ? Number(tax.value)
//                       : 0,
//                 },
//               });
//             }

//             // =================================================
//             // 5. THUẾ MUA VÀO
//             //
//             // purchaseTax của Kiot:
//             //
//             // {
//             //   taxId: 1,
//             //   value: 0,
//             //   name: "VAT 0%"
//             // }
//             //
//             // Cứ lưu ĐÚNG theo Kiot.
//             // Không dùng nó làm VAT bán.
//             // =================================================

//             const purchaseTaxes = normalizeTaxArray(purchaseTax);

//             for (const tax of purchaseTaxes) {
//               const taxId = Number(tax.taxId);

//               if (!Number.isFinite(taxId)) {
//                 continue;
//               }

//               await tx.dnhhKiotPurchaseTax.upsert({
//                 where: {
//                   kiotProductId_taxId: {
//                     kiotProductId,

//                     taxId,
//                   },
//                 },

//                 update: {
//                   name: tax.name ?? null,

//                   value:
//                     tax.value !== undefined && tax.value !== null
//                       ? Number(tax.value)
//                       : 0,
//                 },

//                 create: {
//                   kiotProductId,

//                   taxId,

//                   name: tax.name ?? null,

//                   value:
//                     tax.value !== undefined && tax.value !== null
//                       ? Number(tax.value)
//                       : 0,
//                 },
//               });
//             }

//             // =================================================
//             // DEBUG
//             // =================================================

//             const saleVat = saleTaxes.find((tax) => Number(tax.taxId) === 3);

//             const purchaseVat = purchaseTaxes.find(
//               (tax) => Number(tax.taxId) === 1,
//             );

//             console.log(`📦 ${product.code}`, {
//               // VAT bán
//               saleVat: saleVat
//                 ? {
//                     taxId: saleVat.taxId,
//                     name: saleVat.name,
//                     value: saleVat.value,
//                   }
//                 : null,

//               // VAT mua
//               purchaseVat: purchaseVat
//                 ? {
//                     taxId: purchaseVat.taxId,
//                     name: purchaseVat.name,
//                     value: purchaseVat.value,
//                   }
//                 : null,

//               taxRate: product.taxRate,
//               taxname: product.taxname,
//             });
//           });

//           console.log(`✅ ${product.code} - ${product.name}`);
//         } catch (error) {
//           console.error(
//             `❌ Lỗi sản phẩm ${product.code} - ${product.name}`,
//             error,
//           );
//         }
//       }),
//     ),
//   );

//   // =====================================================
//   // UPDATE LAST SYNC
//   // =====================================================

//   const today = new Date().toISOString().split('T')[0];

//   await prisma.synsTimeKiot.upsert({
//     where: {
//       keyName: LAST_SYNC_KEY,
//     },

//     update: {
//       value: today,
//     },

//     create: {
//       keyName: LAST_SYNC_KEY,

//       value: today,
//     },
//   });

//   console.log(`✅ Đã cập nhật thời gian sync: ${today}`);
// };
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import pLimit from 'p-limit';

const prisma = new PrismaClient();
const limit = pLimit(5);

const KIOT_API_URL = 'https://public.kiotapi.com/products';
const KIOT_RETAILER = 'benthanhtsc';
const LAST_SYNC_KEY = 'LAST_SYNC_KIOT_PRODUCT';

const normalizeTaxArray = (tax: any): any[] => {
  if (!tax) {
    return [];
  }

  return Array.isArray(tax) ? tax : [tax];
};

const normalizeTaxValue = (value: unknown): number => {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
};

// =====================================================
// GET ALL PRODUCTS FROM KIOT
// =====================================================

export const getAllProducts = async (accessTokenKiot: string) => {
  const sync = await prisma.synsTimeKiot.findUnique({
    where: {
      keyName: LAST_SYNC_KEY,
    },
  });

  const lastSyncTime = sync?.value || undefined;
  const allProducts: any[] = [];

  let currentItem = 0;
  const pageSize = 100;

  while (true) {
    try {
      const response = await axios.get(KIOT_API_URL, {
        headers: {
          Authorization: accessTokenKiot,
          Retailer: KIOT_RETAILER,
        },
        params: {
          currentItem,
          pageSize,
          includeInventory: true,
          ...(lastSyncTime
            ? {
                lastModifiedFrom: lastSyncTime,
              }
            : {}),
        },
      });

      const products = response.data?.data || [];

      if (!products.length) {
        break;
      }

      allProducts.push(...products);

      console.log(
        `Đã lấy ${allProducts.length}/${response.data?.total ?? '?'}`,
      );

      currentItem += pageSize;

      if (products.length < pageSize) {
        break;
      }
    } catch (error) {
      console.error('❌ Lỗi lấy sản phẩm KiotViet:', error);

      if (axios.isAxiosError(error)) {
        console.error('Status:', error.response?.status);
        console.error('Response:', error.response?.data);
      }

      throw error;
    }
  }

  return allProducts;
};

// =====================================================
// MAP PRODUCT
// =====================================================

const mapDmhhKiot = (product: any) => {
  return {
    createdDate: product.createdDate ?? null,
    masterCode: product.masterCode ?? null,
    masterProductId: product.masterProductId ?? null,
    tradeMarkName: product.tradeMarkName ?? null,
    tradeMarkId: product.tradeMarkId ?? null,
    taxType: product.taxType ?? null,

    taxRate:
      product.taxRate !== undefined && product.taxRate !== null
        ? String(product.taxRate)
        : null,

    taxname: product.taxname ?? null,
    retailerId: product.retailerId ?? null,
    code: product.code ?? null,
    barCode: product.barCode ?? null,
    name: product.name ?? null,
    fullName: product.fullName ?? null,
    categoryId: product.categoryId ?? null,
    categoryName: product.categoryName ?? null,
    allowsSale: product.allowsSale ?? null,
    type: product.type ?? null,
    hasVariants: product.hasVariants ?? null,
    basePrice: product.basePrice ?? null,
    weight: product.weight ?? null,
    unit: product.unit ?? null,
    conversionValue: product.conversionValue ?? null,
    modifiedDate: product.modifiedDate ?? null,
    isActive: product.isActive ?? null,
    description: product.description ?? null,
    isRewardPoint: product.isRewardPoint ?? null,
    isLotSerialControl: product.isLotSerialControl ?? null,
    isBatchExpireControl: product.isBatchExpireControl ?? null,
    orderTemplate: product.orderTemplate ?? null,
  };
};

// =====================================================
// SAVE PRODUCTS
// =====================================================

export const saveProductsToDatabase = async (products: any[]) => {
  const failedProducts: string[] = [];

  await Promise.all(
    products.map((product) =>
      limit(async () => {
        const {
          id: kiotProductId,
          inventories = [],
          attributes = [],
          productTaxs = [],
          purchaseTax,
        } = product;

        if (!kiotProductId) {
          const productCode = product.code || product.name || 'Không xác định';

          failedProducts.push(productCode);

          console.error('❌ Sản phẩm không có ID:', product.code, product.name);

          return;
        }

        try {
          await prisma.$transaction(
            async (tx) => {
              // =================================================
              // 1. PRODUCT
              // =================================================

              const dmhhData = mapDmhhKiot(product);

              await tx.dmhhKiot.upsert({
                where: {
                  kiotProductId,
                },
                update: dmhhData,
                create: {
                  kiotProductId,
                  ...dmhhData,
                },
              });

              // =================================================
              // 2. INVENTORY
              // =================================================

              for (const inv of inventories) {
                const branchId = Number(inv.branchId);

                if (!Number.isFinite(branchId)) {
                  continue;
                }

                await tx.inventoriesKiot.upsert({
                  where: {
                    kiotProductId_branchId: {
                      kiotProductId,
                      branchId,
                    },
                  },
                  update: {
                    productCode: inv.productCode ?? null,
                    productName: inv.productName ?? null,
                    branchName: inv.branchName ?? null,
                    cost: inv.cost ?? 0,
                    onHand: inv.onHand ?? 0,
                    reserved: inv.reserved ?? 0,
                    actualReserved: inv.actualReserved ?? 0,
                    minQuantity: inv.minQuantity ?? 0,
                    maxQuantity: inv.maxQuantity ?? 0,
                    isActive: inv.isActive ?? true,
                    onOrder: inv.onOrder ?? 0,
                  },
                  create: {
                    kiotProductId,
                    branchId,
                    productCode: inv.productCode ?? null,
                    productName: inv.productName ?? null,
                    branchName: inv.branchName ?? null,
                    cost: inv.cost ?? 0,
                    onHand: inv.onHand ?? 0,
                    reserved: inv.reserved ?? 0,
                    actualReserved: inv.actualReserved ?? 0,
                    minQuantity: inv.minQuantity ?? 0,
                    maxQuantity: inv.maxQuantity ?? 0,
                    isActive: inv.isActive ?? true,
                    onOrder: inv.onOrder ?? 0,
                  },
                });
              }

              // =================================================
              // 3. ATTRIBUTES
              // =================================================

              for (const attr of attributes) {
                const attributeName = attr.attributeName?.toString().trim();

                if (!attributeName) {
                  continue;
                }

                await tx.attributes.upsert({
                  where: {
                    kiotProductId_attributeName: {
                      kiotProductId,
                      attributeName,
                    },
                  },
                  update: {
                    attributeValue: attr.attributeValue ?? null,
                  },
                  create: {
                    kiotProductId,
                    attributeName,
                    attributeValue: attr.attributeValue ?? null,
                  },
                });
              }

              // =================================================
              // 4. THUẾ BÁN RA
              // =================================================

              const saleTaxes = normalizeTaxArray(productTaxs)
                .map((tax) => ({
                  taxId: Number(tax.taxId),
                  name: tax.name ?? null,
                  value: normalizeTaxValue(tax.value),
                }))
                .filter((tax) => Number.isFinite(tax.taxId));

              for (const tax of saleTaxes) {
                await tx.dmhhKiotTax.upsert({
                  where: {
                    kiotProductId_taxId: {
                      kiotProductId,
                      taxId: tax.taxId,
                    },
                  },
                  update: {
                    name: tax.name,
                    value: tax.value,
                  },
                  create: {
                    kiotProductId,
                    taxId: tax.taxId,
                    name: tax.name,
                    value: tax.value,
                  },
                });
              }

              // =================================================
              // 5. THUẾ MUA VÀO
              //
              // Mỗi sản phẩm chỉ giữ đúng một dòng thuế mua.
              // Khi đổi 0% thành 8%, dòng 0% sẽ bị xóa và
              // được thay bằng dòng 8%.
              // =================================================

              const purchaseTaxes = normalizeTaxArray(purchaseTax)
                .map((tax) => ({
                  taxId: Number(tax.taxId),
                  name: tax.name ?? null,
                  value: normalizeTaxValue(tax.value),
                }))
                .filter((tax) => Number.isFinite(tax.taxId));

              const currentPurchaseTax = purchaseTaxes[0] ?? null;

              // Xóa toàn bộ thuế mua cũ của sản phẩm
              await tx.dnhhKiotPurchaseTax.deleteMany({
                where: {
                  kiotProductId,
                },
              });

              // Tạo lại thuế mua hiện tại
              if (currentPurchaseTax) {
                await tx.dnhhKiotPurchaseTax.create({
                  data: {
                    kiotProductId,
                    taxId: currentPurchaseTax.taxId,
                    name: currentPurchaseTax.name,
                    value: currentPurchaseTax.value,
                  },
                });
              }

              // =================================================
              // DEBUG
              // =================================================

              console.log(`📦 ${product.code}`, {
                saleTaxes,
                purchaseTax: currentPurchaseTax,
                taxRate: product.taxRate,
                taxname: product.taxname,
              });
            },
            { maxWait: 10_000, timeout: 60_000 },
          );

          console.log(`✅ ${product.code} - ${product.name}`);
        } catch (error) {
          failedProducts.push(
            product.code || product.name || String(kiotProductId),
          );

          console.error(
            `❌ Lỗi sản phẩm ${product.code} - ${product.name}`,
            error,
          );
        }
      }),
    ),
  );

  // Không cập nhật LAST_SYNC nếu có sản phẩm bị lỗi.
  // Như vậy lần chạy sau sản phẩm lỗi vẫn có thể được đồng bộ lại.
  if (failedProducts.length > 0) {
    throw new Error(
      `Đồng bộ thất bại ${failedProducts.length} sản phẩm: ` +
        failedProducts.join(', '),
    );
  }

  // =====================================================
  // UPDATE LAST SYNC
  // =====================================================

  const today = new Date().toISOString().split('T')[0];

  await prisma.synsTimeKiot.upsert({
    where: {
      keyName: LAST_SYNC_KEY,
    },
    update: {
      value: today,
    },
    create: {
      keyName: LAST_SYNC_KEY,
      value: today,
    },
  });

  console.log(`✅ Đã cập nhật thời gian sync: ${today}`);
};
