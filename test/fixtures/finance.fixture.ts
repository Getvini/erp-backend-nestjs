import { DataSource } from "typeorm";
import { FIXTURE_IDS } from "./fixture-ids";
import { ContractStatus } from "@modules/finance/entities/contract.entity";
import { MilestoneStatus } from "@modules/finance/contract/entities/payment-milestone.entity";
import { DebtStatus } from "@modules/finance/entities/debt.entity";

export class FinanceFixture {
  static async seed(dataSource: DataSource): Promise<void> {
    const contractStatuses = [
      ContractStatus.DRAFT,
      ContractStatus.PROPOSAL_UPLOADED,
      ContractStatus.PROPOSAL_APPROVED,
      ContractStatus.PROPOSAL_REJECTED,
      ContractStatus.SIGNED,
      ContractStatus.COMPLETED,
      ContractStatus.CANCELLED,
    ];

    // 1. Seed 30 Hợp đồng
    for (let i = 0; i < FIXTURE_IDS.CONTRACTS.length; i++) {
      const id = FIXTURE_IDS.CONTRACTS[i];
      const customerId = FIXTURE_IDS.CUSTOMERS[i % FIXTURE_IDS.CUSTOMERS.length];
      const status = contractStatuses[i % contractStatuses.length];
      const code = `HD-2026-${(1000 + i).toString()}`;
      const name = `Hợp Đồng Dịch Vụ ERP Gói Chuyên Nghiệp #${i + 1}`;
      const cost = (i + 1) * 10000000;
      const sellingPrice = (i + 1) * 25000000.555; // Số lẻ kiểm tra làm tròn
      const vatRate = i % 2 === 0 ? 8 : 10;
      const vatAmount = (sellingPrice * vatRate) / 100;
      const totalWithVat = sellingPrice + vatAmount;

      await dataSource.query(
        `INSERT INTO contracts (id, "contractCode", name, status, "customerId", "createdById", cost, "sellingPrice", "vatRate", "vatAmount", "totalWithVat", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [
          id,
          code,
          name,
          status,
          customerId,
          FIXTURE_IDS.USERS.ADMIN_SALE_1,
          cost,
          sellingPrice,
          vatRate,
          vatAmount,
          totalWithVat,
        ],
      );

      // Gắn 2 contract_services cho mỗi hợp đồng
      const csId1 = FIXTURE_IDS.CONTRACT_SERVICES[i * 2];
      const csId2 = FIXTURE_IDS.CONTRACT_SERVICES[i * 2 + 1];
      const servId1 = FIXTURE_IDS.SERVICES[i % FIXTURE_IDS.SERVICES.length];
      const servId2 = FIXTURE_IDS.SERVICES[(i + 1) % FIXTURE_IDS.SERVICES.length];

      if (csId1 && servId1) {
        const dummyResult = JSON.stringify([
          {
            taskId: FIXTURE_IDS.TASKS[0],
            type: "LINK",
            name: "Video TikTok hoàn chỉnh",
            status: "PENDING",
            url: "https://drive.google.com/sample",
          },
        ]);
        await dataSource.query(
          `INSERT INTO contract_services (id, "contractId", "serviceId", "sellingPrice", status, results)
           VALUES ($1, $2, $3, $4, 'ACTIVE', $5)`,
          [csId1, id, servId1, sellingPrice / 2, dummyResult],
        );
      }
      if (csId2 && servId2) {
        await dataSource.query(
          `INSERT INTO contract_services (id, "contractId", "serviceId", "sellingPrice", status)
           VALUES ($1, $2, $3, $4, 'ACTIVE')`,
          [csId2, id, servId2, sellingPrice / 2],
        );
      }
    }

    // 2. Seed 40 Đợt Thanh Toán (Payment Milestones)
    for (let i = 0; i < FIXTURE_IDS.MILESTONES.length; i++) {
      const id = FIXTURE_IDS.MILESTONES[i];
      const contractId = FIXTURE_IDS.CONTRACTS[i % FIXTURE_IDS.CONTRACTS.length];
      const isPaid = i % 2 === 0;
      const percentage = isPaid ? 50 : 50;
      const amount = 12500000;
      const status = isPaid ? MilestoneStatus.COMPLETED : MilestoneStatus.PENDING;
      const name = isPaid ? `Đợt 1: Tạm ứng 50%` : `Đợt 2: Tất toán 50%`;

      await dataSource.query(
        `INSERT INTO payment_milestones (id, name, "contractId", percentage, amount, status, "dueDate")
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE + INTERVAL '15 days')`,
        [id, name, contractId, percentage, amount, status],
      );
    }

    // 3. Seed 20 Công Nợ (Debts)
    const debtStatuses = [
      DebtStatus.UNPAID,
      DebtStatus.PARTIAL,
      DebtStatus.PAID,
      DebtStatus.OVERDUE,
    ];
    for (let i = 0; i < FIXTURE_IDS.DEBTS.length; i++) {
      const id = FIXTURE_IDS.DEBTS[i];
      const contractId = FIXTURE_IDS.CONTRACTS[i % FIXTURE_IDS.CONTRACTS.length];
      const status = debtStatuses[i % debtStatuses.length];
      const name = `Khoản Nợ Phải Thu Đợt #${i + 1}`;
      const amount = (i + 1) * 8000000;

      await dataSource.query(
        `INSERT INTO debts (id, name, "contractId", amount, status, "dueDate")
         VALUES ($1, $2, $3, $4, $5, CURRENT_DATE - INTERVAL '5 days')`,
        [id, name, contractId, amount, status],
      );
    }

    console.log(`-> Đã seed thành công 30 Contracts, 60 Contract Services, 40 Milestones, 20 Debts!`);
  }
}
