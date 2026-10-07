import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Debts, DebtStatus } from "@modules/finance/entities/debt.entity";
import { PaymentMilestone } from "@modules/finance/contract/entities/payment-milestone.entity";
import {
  UserRole,
  isStaffRole,
} from "@modules/identity/user/enums/user-role.enum";
import {
  isContractClosed,
  assertDebtNotLocked,
  assertContractNotClosed,
} from "@modules/finance/helpers/debt-lock.helper";

@Injectable()
export class DebtService {
  constructor(
    @InjectRepository(Debts)
    private readonly debtRepo: Repository<Debts>,
    @InjectRepository(PaymentMilestone)
    private readonly milestoneRepo: Repository<PaymentMilestone>,
  ) {}

  private getRbacFilter(user?: any): any {
    if (!user) return {};
    const { role, userId } = user;
    if ([UserRole.BOD, UserRole.ADMIN, UserRole.ADMIN_SALE].includes(role)) {
      return {};
    }
    if (role === UserRole.BD && userId) {
      return { contract: { createdBy: { id: userId } } };
    }
    if (isStaffRole(role) || role === UserRole.PM) {
      throw new ForbiddenException("Không có quyền truy cập dữ liệu công nợ");
    }
    return userId ? { contract: { createdBy: { id: userId } } } : {};
  }

  async getAll(user?: any) {
    try {
      const where = this.getRbacFilter(user);
      return await this.debtRepo.find({
        where,
        relations: ["contract", "milestone", "payments"],
        order: { id: "ASC" },
      });
    } catch (e) {
      if (e instanceof ForbiddenException) return [];
      throw e;
    }
  }

  async getOne(id: string, user?: any) {
    const where: any = { id, ...this.getRbacFilter(user) };
    const debt = await this.debtRepo.findOne({
      where,
      relations: ["contract", "milestone", "payments"],
    });
    if (!debt) {
      throw new NotFoundException(
        "Không tìm thấy khoản nợ hoặc không có quyền truy cập",
      );
    }
    return debt;
  }

  async getByContract(contractId: string, user?: any) {
    try {
      const milestones = await this.milestoneRepo.find({
        where: { contractId },
        relations: ["contract", "debt"],
      });
      const contract = milestones[0]?.contract;
      if (!isContractClosed(contract)) {
        for (const m of milestones) {
          if (!m.debt) {
            await this.createFromMilestone(m.id);
          }
        }
      }
    } catch (err) {
      // Auto-sync failure does not block reading
    }

    const where: any = { contractId, ...this.getRbacFilter(user) };
    return this.debtRepo.find({
      where,
      relations: ["milestone", "payments"],
      order: { id: "ASC" },
    });
  }

  async createFromMilestone(milestoneId: string) {
    const milestone = await this.milestoneRepo.findOne({
      where: { id: milestoneId },
      relations: ["contract", "debt"],
    });
    if (!milestone)
      throw new NotFoundException("Không tìm thấy giai đoạn thanh toán");
    if (milestone.debt)
      throw new BadRequestException("Giai đoạn này đã được kích hoạt công nợ");

    assertContractNotClosed(milestone.contract);

    const debt = this.debtRepo.create({
      name: `Phải thu: ${milestone.name}`,
      contractId: milestone.contract?.id,
      milestoneId: milestone.id,
      amount: milestone.amount,
      dueDate: milestone.dueDate || (new Date() as any),
      status: DebtStatus.UNPAID,
    });
    return this.debtRepo.save(debt);
  }

  async delete(id: string) {
    const debt = await this.getOne(id);
    assertDebtNotLocked(debt);
    if (debt.payments && debt.payments.length > 0) {
      throw new BadRequestException(
        "Không thể xóa khoản nợ đã có lượt thanh toán",
      );
    }
    return this.debtRepo.remove(debt);
  }

  async unlockDebt(id: string, reason: string, _user?: any) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException("Vui lòng nhập lý do mở khóa công nợ");
    }
    const debt = await this.debtRepo.findOne({
      where: { id },
      relations: ["payments", "milestone"],
    });
    if (!debt) throw new NotFoundException("Không tìm thấy khoản nợ");

    const totalPaid = (debt.payments || []).reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const debtAmount = Number(debt.amount);

    if (debtAmount > 0 && totalPaid >= debtAmount) {
      debt.status = DebtStatus.PAID;
    } else if (totalPaid > 0) {
      debt.status = DebtStatus.PARTIAL;
    } else {
      debt.status = DebtStatus.UNPAID;
    }

    return this.debtRepo.save(debt);
  }
}
