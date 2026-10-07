import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Contract,
  ContractStatus,
} from "../../../finance/entities/contract.entity";
import { Quotations } from "../../../crm/quotation/entities/quotation.entity";
import { QuotationStatus } from "../../../crm/quotation/enums/quotation-status.enum";
import { OpportunityStatus } from "../../../crm/opportunity/enums/opportunity-status.enum";
import { Debts } from "../../../finance/entities/debt.entity";

@Injectable()
export class DashboardAdminService {
  constructor(
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,
    @InjectRepository(Quotations)
    private readonly quotationRepo: Repository<Quotations>,
    @InjectRepository(Debts)
    private readonly debtRepo: Repository<Debts>,
  ) {}

  async getAdminMetrics(
    dateRange: { start: Date; end: Date } | null,
    projectId?: string,
  ) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const params: any[] = [];
    let pIdx = 1;

    let custWhere = "1=1";
    if (projectId) {
      custWhere += ` AND cust.id IN (SELECT c."customerId" FROM contracts c JOIN projects p ON p."contractId" = c.id WHERE p.id = $${pIdx++})`;
      params.push(projectId);
    }
    let custDateFilter = "";
    if (dateRange) {
      custDateFilter = ` AND cust."createdAt" BETWEEN $${pIdx++} AND $${pIdx++}`;
      params.push(dateRange.start, dateRange.end);
    }

    let newCustWhere = `cust."createdAt" >= $${pIdx++}`;
    params.push(thirtyDaysAgo);
    if (projectId) {
      newCustWhere += ` AND cust.id IN (SELECT c."customerId" FROM contracts c JOIN projects p ON p."contractId" = c.id WHERE p.id = $${pIdx++})`;
      params.push(projectId);
    }

    let revWhere = `c.status IN ('SIGNED', 'COMPLETED')`;
    if (projectId) {
      revWhere += ` AND c.id IN (SELECT p."contractId" FROM projects p WHERE p.id = $${pIdx++})`;
      params.push(projectId);
    }
    if (dateRange) {
      revWhere += ` AND c."createdAt" BETWEEN $${pIdx++} AND $${pIdx++}`;
      params.push(dateRange.start, dateRange.end);
    }

    let debtWhere = `d.status IN ('UNPAID', 'PARTIAL')`;
    if (projectId) {
      debtWhere += ` AND d."contractId" IN (SELECT p."contractId" FROM projects p WHERE p.id = $${pIdx++})`;
      params.push(projectId);
    }

    const scalarSql = `
      SELECT
        (SELECT COUNT(DISTINCT cust.id) FROM customers cust WHERE ${custWhere}${custDateFilter}) AS "totalCustomers",
        (SELECT COUNT(DISTINCT cust.id) FROM customers cust WHERE ${newCustWhere}) AS "newCustomers",
        (SELECT COALESCE(SUM(c."sellingPrice"), 0) FROM contracts c WHERE ${revWhere}) AS "totalRevenue",
        (SELECT COALESCE(SUM(GREATEST(0, d.amount - COALESCE(
          (SELECT SUM(dp.amount) FROM debt_payments dp WHERE dp."debtId" = d.id), 0
        ))), 0) FROM debts d WHERE ${debtWhere}) AS "totalDebt"
    `;

    const quotationWhere: any[] = [
      {
        status: QuotationStatus.PENDING_APPROVAL,
        ...(projectId && {
          opportunity: { contracts: { project: { id: projectId } } },
        }),
      },
      {
        status: QuotationStatus.DRAFT,
        opportunity: {
          status: OpportunityStatus.PENDING_QUOTE_APPROVAL,
          ...(projectId && { contracts: { project: { id: projectId } } }),
        },
      },
    ];
    const contractWhere: any = {
      status: ContractStatus.PROPOSAL_UPLOADED,
      ...(projectId && { project: { id: projectId } }),
    };

    const [metricsRow, pendingQuotations, pendingContracts] = await Promise.all(
      [
        this.debtRepo.manager
          .query(scalarSql, params)
          .then((rows) => rows?.[0]),
        (() => {
          const qb = this.quotationRepo
            .createQueryBuilder("q")
            .leftJoin("q.opportunity", "opp")
            .leftJoin("opp.customer", "cust")
            .leftJoin("opp.createdBy", "oppCreator")
            .leftJoin("q.createdBy", "creator")
            .select([
              "q.id AS id",
              "q.version AS version",
              "q.status AS status",
              'q.totalAmount AS "totalAmount"',
              'q.createdAt AS "createdAt"',
              'opp.id AS "opportunityId"',
              'opp.opportunityCode AS "opportunityCode"',
              'opp.name AS "opportunityName"',
              'COALESCE(cust.name, opp.leadName) AS "customerName"',
              'COALESCE(creator.fullName, oppCreator.fullName) AS "createdByName"',
            ])
            .where(
              "(q.status = :pendingApproval OR (q.status = :draftStatus AND opp.status = :quoteApprovalStatus))",
              {
                pendingApproval: QuotationStatus.PENDING_APPROVAL,
                draftStatus: QuotationStatus.DRAFT,
                quoteApprovalStatus: OpportunityStatus.PENDING_QUOTE_APPROVAL,
              },
            );
          if (projectId) {
            qb.innerJoin("opp.contracts", "contract")
              .innerJoin("contract.project", "project")
              .andWhere("project.id = :projectId", { projectId });
          }
          return qb.orderBy("q.createdAt", "DESC").limit(20).getRawMany<any>();
        })(),
        (() => {
          const qb = this.contractRepo
            .createQueryBuilder("c")
            .leftJoin("c.customer", "cust")
            .leftJoin("c.opportunity", "opp")
            .leftJoin("c.createdBy", "creator")
            .select([
              "c.id AS id",
              "c.name AS title",
              "c.status AS status",
              'c.sellingPrice AS "totalAmount"',
              'c.createdAt AS "createdAt"',
              'c.contractCode AS "contractCode"',
              'c.proposal_contract AS "proposalUrl"',
              'c.quotation_link AS "quotationLink"',
              'opp.id AS "opportunityId"',
              'opp.name AS "opportunityName"',
              'cust.name AS "customerName"',
              'creator.fullName AS "createdByName"',
            ])
            .where("c.status = :contractStatus", {
              contractStatus: ContractStatus.PROPOSAL_UPLOADED,
            });
          if (projectId) {
            qb.innerJoin("c.project", "project").andWhere(
              "project.id = :projectId",
              { projectId },
            );
          }
          return qb.orderBy("c.createdAt", "DESC").limit(20).getRawMany<any>();
        })(),
      ],
    );

    const quotationApprovalCount =
      pendingQuotations.length < 20
        ? pendingQuotations.length
        : await this.quotationRepo.count({ where: quotationWhere });
    const contractApprovalCount =
      pendingContracts.length < 20
        ? pendingContracts.length
        : await this.contractRepo.count({ where: contractWhere });

    const totalCustomers = parseInt(metricsRow?.totalCustomers || "0", 10);
    const newCustomers = parseInt(metricsRow?.newCustomers || "0", 10);
    const totalRevenue = parseFloat(metricsRow?.totalRevenue || "0");
    const totalDebt = parseFloat(metricsRow?.totalDebt || "0");

    const approvalQueue = {
      quotations: pendingQuotations.map((q) => ({
        id: q.id,
        type: "QUOTATION",
        title: `Báo giá lần ${q.version}`,
        status: q.status,
        totalAmount: parseFloat(String(q.totalAmount || "0")),
        createdAt: q.createdAt,
        opportunityId: q.opportunityId,
        opportunityCode: q.opportunityCode,
        opportunityName: q.opportunityName,
        customerName: q.customerName,
        createdByName: q.createdByName,
      })),
      contracts: pendingContracts.map((c) => ({
        id: c.id,
        type: "CONTRACT",
        title: c.title,
        status: c.status,
        totalAmount: parseFloat(String(c.totalAmount || "0")),
        createdAt: c.createdAt,
        contractCode: c.contractCode,
        opportunityId: c.opportunityId,
        opportunityName: c.opportunityName,
        customerName: c.customerName,
        createdByName: c.createdByName,
        proposalUrl: c.proposalUrl,
        quotationLink: c.quotationLink,
      })),
    };

    return {
      totalCustomers,
      newCustomers,
      totalRevenue,
      totalDebt,
      approvalQueue,
      currentProjects: [] as any[],
      pendingApprovalCount: quotationApprovalCount + contractApprovalCount,
    };
  }
}
