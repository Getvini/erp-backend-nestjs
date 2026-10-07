import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindOperator } from "typeorm";
import { Contract } from "@modules/finance/entities/contract.entity";
import { Customers } from "@modules/crm/customer/entities/customer.entity";
import { Opportunities } from "@modules/crm/opportunity/entities/opportunity.entity";
import { DebtStatus } from "@modules/finance/entities/debt.entity";

@Injectable()
export class DashboardSaleService {
  constructor(
    @InjectRepository(Opportunities)
    private readonly opportunityRepo: Repository<Opportunities>,
    @InjectRepository(Customers)
    private readonly customerRepo: Repository<Customers>,
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,
  ) {}

  async getSaleMetrics(userId: string, dateFilter: FindOperator<any> | null) {
    const [myOpportunities, myCustomers, myContracts] = await Promise.all([
      this.opportunityRepo.find({
        where: {
          createdBy: { id: userId },
          ...(dateFilter && { createdAt: dateFilter }),
        },
      }),
      this.customerRepo.count({
        where: {
          createdBy: { id: userId },
          ...(dateFilter && { createdAt: dateFilter }),
        },
      }),
      this.contractRepo.find({
        where: [
          {
            customer: { createdBy: { id: userId } },
            ...(dateFilter && { createdAt: dateFilter }),
          },
          {
            opportunity: { createdBy: { id: userId } },
            ...(dateFilter && { createdAt: dateFilter }),
          },
        ],
        relations: ["debts", "debts.payments", "project", "customer"],
      }),
    ]);

    const statusCounts = myOpportunities.reduce((acc: any, opp) => {
      acc[opp.status] = (acc[opp.status] || 0) + 1;
      return acc;
    }, {});

    let totalDebt = 0;
    const upcomingDebts: any[] = [];
    const saleProjects: any[] = [];
    const processedProjectIds = new Set();

    myContracts.forEach((contract) => {
      contract.debts?.forEach((debt) => {
        const paidAmount =
          debt.payments?.reduce(
            (sum, p) => sum + parseFloat(p.amount as any),
            0,
          ) || 0;
        const remaining = parseFloat(debt.amount as any) - paidAmount;
        if (remaining > 0 && debt.status !== DebtStatus.PAID) {
          totalDebt += remaining;
          upcomingDebts.push({
            id: debt.id,
            name: debt.name,
            amount: debt.amount,
            remaining,
            dueDate: debt.dueDate,
            customerName: contract.customer?.name,
            contractCode: contract.contractCode,
          });
        }
      });

      if (contract.project && !processedProjectIds.has(contract.project.id)) {
        processedProjectIds.add(contract.project.id);
        saleProjects.push({
          id: contract.project.id,
          name: contract.project.name,
          status: contract.project.status,
          customerName: contract.customer?.name,
          role: "BD",
        });
      }
    });

    const sortedDebts = upcomingDebts
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      )
      .slice(0, 5);

    return {
      totalOpportunities: myOpportunities.length,
      totalExpectedRevenue: myOpportunities.reduce(
        (sum, opp) => sum + parseFloat((opp.expectedRevenue as any) || "0"),
        0,
      ),
      statusCounts,
      totalCustomers: myCustomers,
      totalDebt,
      upcomingDebts: sortedDebts,
      projects: saleProjects,
    };
  }
}
