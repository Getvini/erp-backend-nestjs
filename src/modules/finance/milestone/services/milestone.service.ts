import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import {
  PaymentMilestone,
  MilestoneStatus,
} from "@modules/finance/contract/entities/payment-milestone.entity";
import { Debts, DebtStatus } from "@modules/finance/entities/debt.entity";
import {
  Contract,
  ContractStatus,
} from "@modules/finance/entities/contract.entity";
import { getContractCollectibleTotal } from "@modules/finance/helpers/pricing-tax.helper";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";

@Injectable()
export class PaymentMilestoneService {
  constructor(
    @InjectRepository(PaymentMilestone)
    private readonly milestoneRepo: Repository<PaymentMilestone>,
    @InjectRepository(Debts)
    private readonly debtRepo: Repository<Debts>,
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,
    private readonly dataSource: DataSource,
  ) {}

  private isDebtUnmodifiable(debt?: any): boolean {
    if (!debt) return false;
    if (debt.status === DebtStatus.LOCKED) return true;
    if (debt.payments?.length > 0) return true;
    return (
      debt.status === DebtStatus.PAID || debt.status === DebtStatus.PARTIAL
    );
  }

  private assertContractNotClosed(contract?: Contract | null): void {
    if (!contract) return;
    if (
      [ContractStatus.COMPLETED, ContractStatus.CANCELLED].includes(
        contract.status,
      )
    ) {
      throw new BadRequestException(
        "Hợp đồng đã hoàn tất hoặc đã hủy, không thể chỉnh sửa kế hoạch thanh toán.",
      );
    }
  }

  async getAll(user?: any) {
    const where: any = {};
    if (user?.role === UserRole.BD && user?.userId) {
      where.contract = { createdBy: { id: user.userId } };
    }
    return this.milestoneRepo.find({
      where,
      relations: ["contract", "contract.customer", "contract.createdBy"],
      order: { id: "ASC" },
    });
  }

  async getByContract(contractId: string, user?: any) {
    const where: any = { contractId };
    if (user?.role === UserRole.BD && user?.userId) {
      where.contract = { createdBy: { id: user.userId } };
    }
    return this.milestoneRepo.find({
      where,
      relations: ["debt", "debt.payments"],
      order: { id: "ASC" },
    });
  }

  async create(contractId: string, milestones: any[]) {
    const contract = await this.contractRepo.findOne({
      where: { id: contractId },
      relations: ["milestones", "project"],
    });
    if (!contract) throw new NotFoundException("Không tìm thấy hợp đồng");
    this.assertContractNotClosed(contract);

    const currentTotal = (contract.milestones || []).reduce(
      (s, m) => s + Number(m.percentage),
      0,
    );
    const newTotal = (milestones || []).reduce(
      (s, m) => s + Number(m.percentage),
      0,
    );
    if (currentTotal + newTotal > 100) {
      throw new BadRequestException(
        `Tổng phần trăm thanh toán vượt quá 100% (Hiện tại: ${currentTotal}%, Thêm mới: ${newTotal}%)`,
      );
    }

    const collectible = getContractCollectibleTotal(contract);
    const savedList: PaymentMilestone[] = [];

    for (const item of milestones) {
      const amount = (collectible * Number(item.percentage)) / 100;
      const ms = this.milestoneRepo.create({
        contractId,
        name: item.name,
        percentage: item.percentage,
        amount,
        description: item.description,
        dueDate: item.dueDate || null,
        status: MilestoneStatus.PENDING,
      });
      const saved = await this.milestoneRepo.save(ms);
      savedList.push(saved);

      await this.debtRepo.save(
        this.debtRepo.create({
          name: `Phải thu: ${saved.name}`,
          contractId,
          milestoneId: saved.id,
          amount: saved.amount,
          dueDate: saved.dueDate || (new Date() as any),
          status: DebtStatus.UNPAID,
        }),
      );
    }

    return savedList;
  }

  async update(id: string, data: any) {
    const ms = await this.milestoneRepo.findOne({
      where: { id },
      relations: ["contract", "contract.milestones", "debt", "debt.payments"],
    });
    if (!ms) throw new NotFoundException("Không tìm thấy giai đoạn thanh toán");
    this.assertContractNotClosed(ms.contract);
    if (this.isDebtUnmodifiable(ms.debt)) {
      throw new BadRequestException(
        `Đợt thanh toán "${ms.name}" đã bị khóa hoặc đã phát sinh thanh toán, không thể chỉnh sửa.`,
      );
    }

    if (
      data.percentage !== undefined &&
      Number(data.percentage) !== Number(ms.percentage)
    ) {
      const otherTotal = (ms.contract?.milestones || [])
        .filter((m) => m.id !== id)
        .reduce((sum, m) => sum + Number(m.percentage), 0);
      if (otherTotal + Number(data.percentage) > 100) {
        throw new BadRequestException(
          "Tổng phần trăm thanh toán vượt quá 100%",
        );
      }
      ms.percentage = data.percentage;
      ms.amount =
        (getContractCollectibleTotal(ms.contract) * Number(data.percentage)) /
        100;
    }

    if (data.name) ms.name = data.name;
    if (data.description !== undefined) ms.description = data.description;
    if (data.dueDate !== undefined) ms.dueDate = data.dueDate || null;

    const saved = await this.milestoneRepo.save(ms);

    if (ms.debt && !this.isDebtUnmodifiable(ms.debt)) {
      if (data.name) ms.debt.name = `Phải thu: ${ms.name}`;
      if (ms.amount !== undefined) ms.debt.amount = ms.amount;
      if (data.dueDate !== undefined)
        ms.debt.dueDate = data.dueDate || new Date();
      await this.debtRepo.save(ms.debt);
    }

    return saved;
  }

  async delete(id: string) {
    const ms = await this.milestoneRepo.findOne({
      where: { id },
      relations: ["contract", "debt", "debt.payments"],
    });
    if (!ms) throw new NotFoundException("Không tìm thấy giai đoạn thanh toán");
    this.assertContractNotClosed(ms.contract);
    if (this.isDebtUnmodifiable(ms.debt)) {
      throw new BadRequestException(
        `Đợt thanh toán "${ms.name}" đã bị khóa hoặc đã phát sinh thanh toán, không thể xóa.`,
      );
    }
    if (ms.debt) await this.debtRepo.remove(ms.debt);
    await this.milestoneRepo.remove(ms);
    return { message: "Xóa giai đoạn thanh toán thành công" };
  }

  async bulkSave(contractId: string, milestones: any[]) {
    const contract = await this.contractRepo.findOne({
      where: { id: contractId },
      relations: ["project"],
    });
    if (!contract) throw new NotFoundException("Không tìm thấy hợp đồng");
    this.assertContractNotClosed(contract);

    const total = (milestones || []).reduce(
      (s, m) => s + Number(m.percentage || 0),
      0,
    );
    if (Math.abs(total - 100) > 0.05) {
      throw new BadRequestException(
        `Tổng phần trăm thanh toán phải bằng 100% (Hiện tại: ${total}%)`,
      );
    }

    const existingList = await this.milestoneRepo.find({
      where: { contractId },
      relations: ["debt", "debt.payments"],
    });

    for (const ex of existingList) {
      if (this.isDebtUnmodifiable(ex.debt)) {
        const inc = milestones.find(
          (m) => m.id && String(m.id) === String(ex.id),
        );
        if (!inc) {
          throw new BadRequestException(
            `Đợt thanh toán "${ex.name}" đã khóa/thanh toán, không thể xóa.`,
          );
        }
        if (Number(inc.percentage) !== Number(ex.percentage)) {
          throw new BadRequestException(
            `Đợt thanh toán "${ex.name}" đã khóa/thanh toán, không thể đổi tỷ lệ.`,
          );
        }
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const msRepo = manager.getRepository(PaymentMilestone);
      const debtRepo = manager.getRepository(Debts);
      const incomingIds = new Set(
        milestones.filter((m) => m.id).map((m) => String(m.id)),
      );

      for (const ex of existingList) {
        if (!incomingIds.has(String(ex.id))) {
          if (ex.debt) await debtRepo.remove(ex.debt);
          await msRepo.remove(ex);
        }
      }

      const collectible = getContractCollectibleTotal(contract);
      const results: PaymentMilestone[] = [];

      for (const item of milestones) {
        const amount = (collectible * Number(item.percentage)) / 100;
        if (item.id) {
          const ex = existingList.find((m) => String(m.id) === String(item.id));
          if (ex) {
            ex.name = item.name;
            ex.percentage = item.percentage;
            ex.amount = amount;
            ex.description = item.description;
            ex.dueDate = item.dueDate || null;
            const saved = await msRepo.save(ex);
            results.push(saved);

            if (ex.debt && !this.isDebtUnmodifiable(ex.debt)) {
              ex.debt.name = `Phải thu: ${ex.name}`;
              ex.debt.amount = amount;
              if (ex.dueDate) ex.debt.dueDate = ex.dueDate;
              await debtRepo.save(ex.debt);
            }
            continue;
          }
        }

        const newMs = msRepo.create({
          contractId,
          name: item.name,
          percentage: item.percentage,
          amount,
          description: item.description,
          dueDate: item.dueDate || null,
          status: MilestoneStatus.PENDING,
        });
        const saved = await msRepo.save(newMs);
        results.push(saved);

        await debtRepo.save(
          debtRepo.create({
            name: `Phải thu: ${saved.name}`,
            contractId,
            milestoneId: saved.id,
            amount: saved.amount,
            dueDate: saved.dueDate || (new Date() as any),
            status: DebtStatus.UNPAID,
          }),
        );
      }
      return results;
    });
  }
}
