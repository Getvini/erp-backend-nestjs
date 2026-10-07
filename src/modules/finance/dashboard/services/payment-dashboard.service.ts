import { Injectable, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Contract,
  ContractStatus,
} from "@modules/finance/entities/contract.entity";
import {
  UserRole,
  isStaffRole,
} from "@modules/identity/user/enums/user-role.enum";
import { PaymentDashboardQueryDto } from "../dto/payment-dashboard.dto";
import {
  contractBelongsToYear,
  toPaymentDashboardRow,
} from "../helpers/payment-dashboard-row.helper";

@Injectable()
export class PaymentDashboardService {
  constructor(
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,
  ) {}

  async getDashboard(query: PaymentDashboardQueryDto, user: any) {
    const year = Number(query.year) || new Date().getFullYear();
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));

    const where: any = {};
    if (user?.role === UserRole.BD && user?.userId) {
      where.createdBy = { id: user.userId };
    } else if (
      (isStaffRole(user?.role) || user?.role === UserRole.PM) &&
      !user?.role?.includes("ADMIN")
    ) {
      throw new ForbiddenException("Không có quyền truy cập dữ liệu tài chính");
    }

    const contracts = await this.contractRepo.find({
      where,
      relations: [
        "customer",
        "opportunity",
        "opportunity.createdBy",
        "opportunity.quotations",
        "project",
        "project.team",
        "project.team.teamLead",
        "project.team.members",
        "project.team.members.user",
        "project.team.members.roles",
        "milestones",
        "milestones.debt",
        "milestones.debt.payments",
      ],
      order: { createdAt: "DESC" },
    });

    const contractsInYear = contracts.filter((c) =>
      contractBelongsToYear(c, year),
    );
    const normalized = contractsInYear.map((c) =>
      toPaymentDashboardRow(c, year),
    );
    const search = (query.search || "").trim().toLocaleLowerCase("vi");

    const baseFiltered = normalized.filter((row) => {
      if (
        search &&
        ![
          row.contractCode,
          row.contractName,
          row.customerName,
          row.projectName,
        ].some((val) =>
          String(val || "")
            .toLocaleLowerCase("vi")
            .includes(search),
        )
      ) {
        return false;
      }
      if (query.contractStatus && row.contractStatus !== query.contractStatus)
        return false;
      if (
        query.quotationStatus &&
        row.quotationStatus !== query.quotationStatus
      )
        return false;
      if (query.projectStatus && row.projectStatus !== query.projectStatus)
        return false;
      if (query.salesOwnerId && row.salesOwner?.id !== query.salesOwnerId)
        return false;
      if (query.customerId && row.customerId !== query.customerId) return false;
      if (
        query.projectManagerId &&
        row.projectManagerId !== query.projectManagerId
      )
        return false;
      if (query.paymentMonth) {
        const target = Number(query.paymentMonth);
        const has = row.milestones.some((m: any) => {
          if (!m.dueDate) return false;
          const d = new Date(m.dueDate);
          return d.getMonth() + 1 === target && d.getFullYear() === year;
        });
        if (!has) return false;
      }
      return true;
    });

    const tabCounts = {
      all: baseFiltered.length,
      waiting: baseFiltered.filter(
        (r) =>
          r.paymentStatus !== "PAID" &&
          r.contractStatus !== ContractStatus.CANCELLED,
      ).length,
      paid: baseFiltered.filter((r) => r.paymentStatus === "PAID").length,
      unconfirmed: baseFiltered.filter((r) => !r.isConfirmed).length,
    };

    const filtered = baseFiltered.filter((row) => {
      if (query.paymentStatus === "WAITING" && row.paymentStatus === "PAID")
        return false;
      if (
        query.paymentStatus &&
        query.paymentStatus !== "WAITING" &&
        row.paymentStatus !== query.paymentStatus
      )
        return false;
      if (query.confirmationStatus === "UNCONFIRMED" && row.isConfirmed)
        return false;
      return true;
    });

    const active = filtered.filter(
      (r) => r.contractStatus !== ContractStatus.CANCELLED,
    );
    const totalContractValue = active.reduce((s, r) => s + r.totalWithVat, 0);
    const totalPaid = active.reduce((s, r) => s + r.paidAmount, 0);
    const totalUnpaid = active.reduce((s, r) => s + r.unpaidAmount, 0);

    const monthly = Array.from({ length: 12 }, (_, index) => {
      const ms = active
        .flatMap((r) => r.milestones)
        .filter(
          (m: any) => m.dueDate && new Date(m.dueDate).getMonth() === index,
        );
      const planned = ms.reduce((s: number, m: any) => s + m.amount, 0);
      const unpaid = ms.reduce((s: number, m: any) => s + m.unpaidAmount, 0);
      const milestonePaid = ms.reduce(
        (s: number, m: any) => s + m.paidAmount,
        0,
      );

      const payments = active
        .flatMap((r) => r.milestones.flatMap((m: any) => m.payments || []))
        .filter(
          (p: any) =>
            p.paymentDate && new Date(p.paymentDate).getMonth() === index,
        );
      const cashPaid = payments.reduce((s: number, p: any) => s + p.amount, 0);
      return {
        month: index + 1,
        planned,
        paid: milestonePaid > 0 ? milestonePaid : cashPaid,
        unpaid,
        cashPaid,
        milestonePaid,
      };
    });

    const start = (page - 1) * limit;
    return {
      year,
      summary: {
        totalContractValue,
        totalPaid,
        totalUnpaid,
        collectionRate:
          totalContractValue > 0 ? (totalPaid / totalContractValue) * 100 : 0,
        trackingContracts: active.length,
        totalContracts: filtered.length,
        cancelledContracts: filtered.length - active.length,
      },
      monthly,
      tabCounts,
      rows: filtered.slice(start, start + limit),
      meta: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
      filterOptions: {
        salesOwners: Array.from(
          new Map(
            normalized
              .filter((row) => row.salesOwner)
              .map((row) => [row.salesOwner!.id, row.salesOwner]),
          ).values(),
        ),
        customers: Array.from(
          new Map(
            normalized
              .filter((row) => row.customerId)
              .map((row) => [
                row.customerId,
                { id: row.customerId, name: row.customerName },
              ]),
          ).values(),
        ),
        projectManagers: Array.from(
          new Map(
            normalized
              .filter((row) => row.projectManagerId)
              .map((row) => [
                row.projectManagerId,
                { id: row.projectManagerId, name: row.projectManager },
              ]),
          ).values(),
        ),
      },
    };
  }
}
