import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import pLimit from 'p-limit';

const prisma = new PrismaClient();
const limit = pLimit(10);

export const getAllProducts = async (accessTokenKiot: string) => {
  const sync = await prisma.synsTimeKiot.findUnique({
    where: {
      keyName: 'LAST_SYNC_KIOT_PRODUCT',
    },
  });

  const lastSyncTime = sync?.value;
  const allProducts: any[] = [];
  let currentItem = 0;
  const pageSize = 100;

  while (true) {
    const response = await axios.get('https://public.kiotapi.com/products', {
      headers: {
        Authorization: accessTokenKiot,
        Retailer: 'benthanhtsc',
      },
      params: {
        currentItem,
        pageSize,
        includeInventory: true,

        // chỉ lấy sản phẩm sửa sau thời điểm này
        lastModifiedFrom: lastSyncTime,
      },
    });

    const products = response.data.data || [];

    if (!products.length) {
      break;
    }

    allProducts.push(...products);
    console.log(`Đã lấy ${allProducts.length}/${response.data.total}`);

    currentItem += pageSize;
  }

  return allProducts;
};

const mapDmhhKiot = (product: any) => ({
  createdDate: product.createdDate ?? null,
  masterCode: product.masterCode ?? null,
  masterProductId: product.masterProductId ?? null,
  tradeMarkName: product.tradeMarkName ?? null,
  tradeMarkId: product.tradeMarkId ?? null,
  taxType: product.taxType ?? null,
  taxRate: product.taxRate?.toString() ?? null,
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
});

export const saveProductsToDatabase = async (products: any[]) => {
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

        try {
          await prisma.$transaction(async (tx) => {
            const dmhhData = mapDmhhKiot(product);

            await tx.dmhhKiot.upsert({
              where: { kiotProductId },
              update: dmhhData,
              create: {
                kiotProductId,
                ...dmhhData,
              },
            });

            for (const inv of inventories) {
              await tx.inventoriesKiot.upsert({
                where: {
                  kiotProductId_branchId: {
                    kiotProductId,
                    branchId: inv.branchId,
                  },
                },
                update: {
                  productCode: inv.productCode,
                  productName: inv.productName,
                  branchName: inv.branchName,
                  cost: inv.cost,
                  onHand: inv.onHand,
                  reserved: inv.reserved,
                  actualReserved: inv.actualReserved,
                  minQuantity: inv.minQuantity,
                  maxQuantity: inv.maxQuantity,
                  isActive: inv.isActive,
                  onOrder: inv.onOrder,
                },
                create: {
                  kiotProductId,
                  branchId: inv.branchId,
                  productCode: inv.productCode,
                  productName: inv.productName,
                  branchName: inv.branchName,
                  cost: inv.cost,
                  onHand: inv.onHand,
                  reserved: inv.reserved,
                  actualReserved: inv.actualReserved,
                  minQuantity: inv.minQuantity,
                  maxQuantity: inv.maxQuantity,
                  isActive: inv.isActive,
                  onOrder: inv.onOrder,
                },
              });
            }

            for (const attr of attributes) {
              await tx.attributes.upsert({
                where: {
                  kiotProductId_attributeName: {
                    kiotProductId,
                    attributeName: attr.attributeName,
                  },
                },
                update: {
                  attributeValue: attr.attributeValue,
                },
                create: {
                  kiotProductId,
                  attributeName: attr.attributeName,
                  attributeValue: attr.attributeValue,
                },
              });
            }

            for (const tax of productTaxs) {
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

            const purchaseTaxes = Array.isArray(purchaseTax)
              ? purchaseTax
              : purchaseTax
                ? [purchaseTax]
                : [];

            for (const tax of purchaseTaxes) {
              await tx.dnhhKiotPurchaseTax.upsert({
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
          });

          console.log(`✅ ${product.code} - ${product.name}`);
        } catch (error) {
          console.error(
            `❌ Lỗi sản phẩm ${product.code} - ${product.name}`,
            error,
          );
        }
      }),
    ),
  );

  const today = new Date().toISOString().split('T')[0];
  await prisma.synsTimeKiot.upsert({
    where: {
      keyName: 'LAST_SYNC_KIOT_PRODUCT',
    },
    update: {
      value: today,
    },
    create: {
      keyName: 'LAST_SYNC_KIOT_PRODUCT',
      value: today,
    },
  });
};
