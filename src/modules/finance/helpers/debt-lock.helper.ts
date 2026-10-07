import { Debts, DebtStatus } from "@modules/finance/entities/debt.entity";
import {
  Contract,
  ContractStatus,
} from "@modules/finance/entities/contract.entity";
import { ConflictException } from "@nestjs/common";

const LOCKED_MESSAGE =
  "Công nợ đã bị khóa do dự án đã đóng. Không thể thay đổi khoản thu này.";

export const isDebtLocked = (debt?: Pick<Debts, "status"> | null): boolean =>
  debt?.status === DebtStatus.LOCKED;

export const assertDebtNotLocked = (
  debt?: Pick<Debts, "status" | "name"> | null,
): void => {
  if (isDebtLocked(debt)) {
    throw new ConflictException(
      debt?.name ? `${LOCKED_MESSAGE} (Khoản: ${debt.name})` : LOCKED_MESSAGE,
    );
  }
};

export const isContractClosed = (
  contract?: Pick<Contract, "status"> | null,
): boolean =>
  Boolean(
    contract &&
    [ContractStatus.COMPLETED, ContractStatus.CANCELLED].includes(
      contract.status,
    ),
  );

export const assertContractNotClosed = (
  contract?: Pick<Contract, "status" | "contractCode"> | null,
): void => {
  if (!isContractClosed(contract)) return;
  const label = contract?.contractCode ? ` ${contract.contractCode}` : "";
  throw new ConflictException(
    `Hợp đồng${label} đã kết thúc nên không thể kích hoạt công nợ mới.`,
  );
};

export const resolveDebtStatusAfterPayment = (
  currentStatus: DebtStatus,
  totalPaid: number,
  debtAmount: number,
): DebtStatus | null => {
  if (currentStatus === DebtStatus.LOCKED) return null;
  if (debtAmount > 0 && totalPaid >= debtAmount) return DebtStatus.PAID;
  if (totalPaid > 0) return DebtStatus.PARTIAL;
  return DebtStatus.UNPAID;
};
