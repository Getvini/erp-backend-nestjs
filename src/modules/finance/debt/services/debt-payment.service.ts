import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DebtPayments } from "@modules/finance/entities/debt-payment.entity";
import { Debts, DebtStatus } from "@modules/finance/entities/debt.entity";
import {
  PaymentMilestone,
  MilestoneStatus,
} from "@modules/finance/contract/entities/payment-milestone.entity";
import {
  assertDebtNotLocked,
  resolveDebtStatusAfterPayment,
} from "@modules/finance/helpers/debt-lock.helper";
import { CreateDebtPaymentDto } from "../dto/debt.dto";

@Injectable()
export class DebtPaymentService {
  constructor(
    @InjectRepository(DebtPayments)
    private readonly paymentRepo: Repository<DebtPayments>,
    @InjectRepository(Debts)
    private readonly debtRepo: Repository<Debts>,
    @InjectRepository(PaymentMilestone)
    private readonly milestoneRepo: Repository<PaymentMilestone>,
  ) {}

  async create(dto: CreateDebtPaymentDto) {
    const debt = await this.debtRepo.findOne({
      where: { id: dto.debtId },
      relations: ["milestone", "payments"],
    });
    if (!debt) throw new NotFoundException("Không tìm thấy khoản nợ");

    assertDebtNotLocked(debt);

    const payment = this.paymentRepo.create({
      debtId: debt.id,
      amount: dto.amount,
      paymentDate: dto.paymentDate,
      note: dto.note,
      attachments: dto.attachments || null,
    });
    const saved = await this.paymentRepo.save(payment);

    await this.updateDebtStatus(debt.id);
    return saved;
  }

  async updateDebtStatus(debtId: string) {
    const debt = await this.debtRepo.findOne({
      where: { id: debtId },
      relations: ["payments", "milestone"],
    });
    if (!debt) return;

    const totalPaid = (debt.payments || []).reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const debtAmount = Number(debt.amount);
    const newStatus = resolveDebtStatusAfterPayment(
      debt.status,
      totalPaid,
      debtAmount,
    );
    if (newStatus === null) return;

    debt.status = newStatus;
    await this.debtRepo.save(debt);

    if (debt.milestone) {
      if (newStatus === DebtStatus.PAID) {
        debt.milestone.status = MilestoneStatus.COMPLETED;
      } else {
        debt.milestone.status = MilestoneStatus.PENDING;
      }
      await this.milestoneRepo.save(debt.milestone);
    }
  }

  async delete(id: string) {
    const payment = await this.paymentRepo.findOne({
      where: { id },
      relations: ["debt"],
    });
    if (!payment) throw new NotFoundException("Không tìm thấy lượt thanh toán");

    assertDebtNotLocked(payment.debt);
    const debtId = payment.debtId;
    await this.paymentRepo.remove(payment);

    await this.updateDebtStatus(debtId);
    return { message: "Xóa lượt thanh toán thành công" };
  }
}
