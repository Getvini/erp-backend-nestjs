import { DataSource } from "typeorm";
import { FIXTURE_IDS } from "./fixture-ids";
import { CustomerSource } from "@modules/crm/customer/enums/customer-source.enum";
import { OpportunityStatus } from "@modules/crm/opportunity/enums/opportunity-status.enum";
import { QuotationStatus, QuotationType } from "@modules/crm/quotation/enums/quotation-status.enum";

export class CrmFixture {
  static async seed(dataSource: DataSource): Promise<void> {
    // 1. Seed 20 Khách Hàng
    for (let i = 0; i < FIXTURE_IDS.CUSTOMERS.length; i++) {
      const id = FIXTURE_IDS.CUSTOMERS[i];
      const isCompany = i % 2 === 0;
      const name = isCompany
        ? `Công Ty Cổ Phần Công Nghệ & Truyền Thông ${i + 1}`
        : `Khách Hàng Cá Nhân Nguyễn Văn ${String.fromCharCode(65 + i)}`;
      const taxId = isCompany ? `010${(1000000 + i).toString()}` : null;
      const phone = `090${(1100000 + i).toString()}`;
      const email = `customer_${i + 1}@doanhnghiep.vn`;
      const source = i % 3 === 0 ? CustomerSource.INTERNAL : CustomerSource.REFERRAL_PARTNER;

      await dataSource.query(
        `INSERT INTO customers (id, name, phone, email, address, "taxId", source, "createdById")
         VALUES ($1, $2, $3, $4, 'Hà Nội, Việt Nam', $5, $6, $7)`,
        [id, name, phone, email, taxId, source, FIXTURE_IDS.USERS.ADMIN_SALE_1],
      );
    }

    // 2. Seed 10 Nhà Cung Cấp (Vendors)
    for (let i = 0; i < FIXTURE_IDS.VENDORS.length; i++) {
      const id = FIXTURE_IDS.VENDORS[i];
      const name = `Nhà Cung Cấp Ekip Studio & Media Pro ${i + 1}`;
      const phone = `098${(2200000 + i).toString()}`;
      const email = `vendor_${i + 1}@studio.vn`;

      await dataSource.query(
        `INSERT INTO vendors (id, name, phone, email, address, "createdAt")
         VALUES ($1, $2, $3, $4, 'TP. Hồ Chí Minh', NOW())`,
        [id, name, phone, email],
      );
    }

    // 3. Seed 15 Dịch Vụ (Services)
    const serviceNames = [
      "Sản xuất Video Viral TikTok Ngắn",
      "Sản xuất TVC Giới thiệu Doanh nghiệp",
      "Thiết kế Bộ nhận diện thương hiệu Brand VIP",
      "Chụp ảnh Profile Ban Giám Đốc",
      "Quản trị Fanpage & Sáng tạo Content 30 ngày",
      "Sản xuất Video Review Sản phẩm 3D",
      "Thiết kế Landing Page Bán hàng Chuyển đổi",
      "Dịch vụ Booking KOLs & KOCs ngành F&B",
      "Tối ưu hóa SEO Website tổng thể",
      "Thiết kế Bao bì & Nhãn mác Sản phẩm",
      "Quay phóng sự sự kiện doanh nghiệp kỷ niệm",
      "Thu âm lồng tiếng Voice Talent chuyên nghiệp",
      "Chụp ảnh Sản phẩm Studio nền trắng",
      "Sản xuất Chuỗi Podcast Doanh nhân",
      "Tư vấn Chiến lược Marketing Số toàn diện",
    ];

    for (let i = 0; i < FIXTURE_IDS.SERVICES.length; i++) {
      const id = FIXTURE_IDS.SERVICES[i];
      const name = serviceNames[i] || `Dịch Vụ Sáng Tạo Số ${i + 1}`;
      await dataSource.query(
        `INSERT INTO services (id, name, description, "createdAt")
         VALUES ($1, $2, 'Mô tả chi tiết tiêu chuẩn dịch vụ ERP', NOW())`,
        [id, name],
      );
    }

    // 4. Seed 5 Gói Dịch Vụ (Service Packages)
    for (let i = 0; i < FIXTURE_IDS.SERVICE_PACKAGES.length; i++) {
      const id = FIXTURE_IDS.SERVICE_PACKAGES[i];
      const name = `Gói Combo Marketing Doanh Nghiệp Cấp ${i + 1}`;
      await dataSource.query(
        `INSERT INTO service_packages (id, name, description, "createdAt")
         VALUES ($1, $2, 'Gói combo tổng hợp nhiều dịch vụ chuyên biệt', NOW())`,
        [id, name],
      );
    }

    // 4.1 Seed 10 Hạng Mục Công Việc Chuẩn (Jobs)
    for (let i = 0; i < FIXTURE_IDS.JOBS.length; i++) {
      const id = FIXTURE_IDS.JOBS[i];
      const name = `Hạng mục công việc chuẩn #${i + 1}`;
      await dataSource.query(
        `INSERT INTO jobs (id, name, "costPrice", "unitPrice", "isBriefVideo", "isQuotationItem", "createdAt")
         VALUES ($1, $2, 500000, 1000000, false, true, NOW())`,
        [id, name],
      );
    }

    // 5. Seed 24 Cơ Hội Bán Hàng (Opportunities)
    const oppStatuses = [
      OpportunityStatus.OPEN,
      OpportunityStatus.PENDING_OPP_APPROVAL,
      OpportunityStatus.OPP_APPROVED,
      OpportunityStatus.QUOTATION_DRAFTING,
      OpportunityStatus.CONTRACT_CREATED,
      OpportunityStatus.COMPLETED,
    ];

    for (let i = 0; i < FIXTURE_IDS.OPPORTUNITIES.length; i++) {
      const id = FIXTURE_IDS.OPPORTUNITIES[i];
      const customerId = FIXTURE_IDS.CUSTOMERS[i % FIXTURE_IDS.CUSTOMERS.length];
      const status = oppStatuses[i % oppStatuses.length];
      const name = `Cơ hội Tiếp cận Dự án Truyền thông Q${(i % 4) + 1} - Khách #${i + 1}`;
      const code = `CH-2026-${(1000 + i).toString()}`;
      const expectedRevenue = (i + 1) * 15000000;

      await dataSource.query(
        `INSERT INTO opportunities (id, "opportunityCode", name, "customerId", status, "expectedRevenue", "createdById", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [id, code, name, customerId, status, expectedRevenue, FIXTURE_IDS.USERS.BD_1],
      );
    }

    // 6. Seed 24 Báo Giá (Quotations)
    const quoteStatuses = [
      QuotationStatus.DRAFT,
      QuotationStatus.PENDING_APPROVAL,
      QuotationStatus.APPROVED,
      QuotationStatus.REJECTED,
    ];

    for (let i = 0; i < FIXTURE_IDS.QUOTATIONS.length; i++) {
      const id = FIXTURE_IDS.QUOTATIONS[i];
      const oppId = FIXTURE_IDS.OPPORTUNITIES[i];
      const status = quoteStatuses[i % quoteStatuses.length];
      const totalAmount = (i + 1) * 20000000;
      const vatRate = 8;
      const vatAmount = (totalAmount * vatRate) / 100;
      const totalWithVat = totalAmount + vatAmount;

      await dataSource.query(
        `INSERT INTO quotations (id, "opportunityId", status, type, "totalAmount", "vatRate", "vatAmount", "totalWithVat", "createdById", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          id,
          oppId,
          status,
          QuotationType.INITIAL,
          totalAmount,
          vatRate,
          vatAmount,
          totalWithVat,
          FIXTURE_IDS.USERS.ADMIN_SALE_1,
        ],
      );
    }

    console.log(
      `-> Đã seed thành công 20 Customers, 10 Vendors, 20 Services/Packages, 24 Opportunities, 24 Quotations!`,
    );
  }
}
