import {
  Contract,
  ContractStatus,
} from "@modules/finance/entities/contract.entity";
import { QuotationStatus } from "@modules/crm/quotation/enums/quotation-status.enum";

const money = (value: unknown) => Number(value || 0);
const dateYear = (value?: Date | string | null) =>
  value ? new Date(value).getFullYear() : null;

export const contractBelongsToYear = (
  contract: Contract,
  year: number,
): boolean => {
  const milestones = contract.milestones || [];
  const hasDueMilestone = milestones.some(
    (m) => m.dueDate && dateYear(m.dueDate) === year,
  );
  if (hasDueMilestone) return true;

  const hasPaymentInYear = milestones.some((m) =>
    (m.debt?.payments || []).some(
      (p) => p.paymentDate && dateYear(p.paymentDate) === year,
    ),
  );
  if (hasPaymentInYear) return true;

  const hasMilestonesWithDueDate = milestones.some((m) => Boolean(m.dueDate));
  if (!hasMilestonesWithDueDate) {
    if (dateYear(contract.createdAt) === year) return true;
    if (
      contract.project?.plannedStartDate &&
      dateYear(contract.project.plannedStartDate) === year
    )
      return true;
    if (
      contract.project?.actualStartDate &&
      dateYear(contract.project.actualStartDate) === year
    )
      return true;
  }

  return false;
};

export const toPaymentDashboardRow = (contract: Contract, year: number) => {
  const quotations = [...(contract.opportunity?.quotations || [])].sort(
    (a, b) => Number(b.version || 0) - Number(a.version || 0),
  );
  const quotation =
    quotations.find((item) => item.status === QuotationStatus.APPROVED) ||
    quotations[0];
  const milestones = (contract.milestones || [])
    .filter((item) =>
      item.dueDate
        ? dateYear(item.dueDate) === year
        : dateYear(contract.createdAt) === year,
    )
    .map((item) => {
      const payments = (item.debt?.payments || [])
        .filter((payment) => dateYear(payment.paymentDate) === year)
        .map((payment) => ({
          id: payment.id,
          amount: money(payment.amount),
          paymentDate: payment.paymentDate,
          note: payment.note || null,
          attachments: payment.attachments || [],
          milestoneName: item.name,
          dueDate: item.dueDate,
          projectName:
            contract.project?.name ||
            contract.opportunity?.name ||
            contract.name,
          customerName: contract.customer?.name || "",
          contractCode: contract.contractCode,
        }));
      const paidAmount = payments.reduce(
        (sum, payment) => sum + payment.amount,
        0,
      );
      return {
        id: item.id,
        name: item.name,
        percentage: money(item.percentage),
        amount: money(item.amount),
        dueDate: item.dueDate,
        status: item.status,
        debtStatus: item.debt?.status || null,
        debtId: item.debt?.id || null,
        paidAmount,
        unpaidAmount: Math.max(0, money(item.amount) - paidAmount),
        payments,
      };
    });
  const paidAmount = milestones.reduce((sum, item) => sum + item.paidAmount, 0);
  const scheduledAmount = milestones.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const totalWithVat =
    money(contract.totalWithVat) ||
    money(contract.sellingPrice) * (1 + money(contract.vatRate || 8) / 100);
  const unpaidAmount = Math.max(0, scheduledAmount - paidAmount);
  const paymentStatus =
    scheduledAmount > 0 && unpaidAmount === 0
      ? "PAID"
      : paidAmount > 0
        ? "PARTIAL"
        : "UNPAID";
  const isConfirmed =
    quotation?.status === QuotationStatus.APPROVED &&
    [
      ContractStatus.PROPOSAL_APPROVED,
      ContractStatus.SIGNED,
      ContractStatus.COMPLETED,
    ].includes(contract.status);
  const teamMembers = contract.project?.team?.members || [];
  const memberByRole = (role: string) =>
    teamMembers.find((member) =>
      member.roles?.some((item) => item.role === role),
    )?.user;
  const paymentDates = milestones
    .flatMap((item) => item.payments.map((payment) => payment.paymentDate))
    .filter(Boolean);
  const latestPaymentDate = paymentDates.length
    ? paymentDates.sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime(),
      )[0]
    : null;

  return {
    id: contract.id,
    contractCode: contract.contractCode,
    contractName: contract.name,
    contractStatus: contract.status,
    customerName: contract.customer?.name || "",
    customerId: contract.customer?.id || null,
    projectName: contract.project?.name || contract.opportunity?.name || "",
    quotationStatus: quotation?.status || null,
    quotationVersion: quotation?.version || null,
    projectStatus: contract.project?.status || null,
    salesOwner: contract.opportunity?.createdBy
      ? {
          id: contract.opportunity.createdBy.id,
          name: contract.opportunity.createdBy.fullName,
        }
      : null,
    projectManager:
      memberByRole("PROJECT_MANAGER")?.fullName ||
      contract.project?.team?.teamLead?.fullName ||
      null,
    projectManagerId:
      memberByRole("PROJECT_MANAGER")?.id ||
      contract.project?.team?.teamLead?.id ||
      null,
    account: memberByRole("ACCOUNT")?.fullName || null,
    sellingPrice: money(contract.sellingPrice),
    vatRate: money(contract.vatRate || 8),
    vatAmount:
      money(contract.vatAmount) ||
      (money(contract.sellingPrice) * money(contract.vatRate || 8)) / 100,
    totalWithVat,
    paidAmount,
    unpaidAmount,
    paymentStatus,
    isConfirmed,
    collectionMonth:
      milestones.find((item) => item.unpaidAmount > 0)?.dueDate ||
      milestones[milestones.length - 1]?.dueDate ||
      null,
    latestPaymentDate,
    contractFileUrl:
      contract.signed_contract || contract.proposal_contract || null,
    note: contract.description || "",
    milestones,
    acceptanceMinutes: (contract as any).acceptanceMinutes || [],
    vatInvoices: (contract as any).vatInvoices || [],
  };
};
