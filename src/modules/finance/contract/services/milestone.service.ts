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
import { Contract } from "@modules/finance/entities/contract.entity";
import {
  AddMilestoneDto,
  UpdateMilestoneDto,
} from "@modules/finance/contract/dto/contract.dto";

function getCollectible(contract: Contract): number {
  return Number(contract.totalWithVat || 0);
}

@Injectable()
export class MilestoneService {
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
    if (debt.status === DebtStatus.PAID || debt.status === DebtStatus.PARTIAL)
      return true;
    return false;
  }

  async getByContract(contractId: string) {
    return this.milestoneRepo.find({
      where: { contractId },
      relations: ["debt", "debt.payments"],
      order: { id: "ASC" },
    });
  }

  async create(contractId: string, dto: AddMilestoneDto) {
    const contract = await this.contractRepo.findOne({
      where: { id: contractId },
      relations: ["milestones"],
    });
    if (!contract) throw new NotFoundException("Không tìm thấy hợp đồng");

    const currentTotal = (contract.milestones || []).reduce(
      (s, m) => s + Number(m.percentage),
      0,
    );
    if (currentTotal + Number(dto.percentage) > 100) {
      throw new BadRequestException(
        `Tổng phần trăm vượt quá 100% (Hiện tại: ${currentTotal}%, Thêm: ${dto.percentage}%)`,
      );
    }

    const amount =
      dto.amount ?? (getCollectible(contract) * Number(dto.percentage)) / 100;
    const ms = this.milestoneRepo.create({
      contractId,
      name: dto.name,
      percentage: dto.percentage,
      amount,
      description: dto.description,
      dueDate: dto.dueDate ? (dto.dueDate as any) : null,
      status: MilestoneStatus.PENDING,
    });
    const saved = await this.milestoneRepo.save(ms);

    await this.debtRepo.save(
      this.debtRepo.create({
        contractId,
        milestoneId: saved.id,
        name: `Phải thu: ${saved.name}`,
        amount: saved.amount,
        dueDate: saved.dueDate || (new Date() as any),
        status: DebtStatus.UNPAID,
      }),
    );

    return saved;
  }

  async update(id: string, dto: UpdateMilestoneDto) {
    const ms = await this.milestoneRepo.findOne({
      where: { id },
      relations: ["contract", "contract.milestones", "debt", "debt.payments"],
    });
    if (!ms) throw new NotFoundException("Không tìm thấy giai đoạn thanh toán");
    if (this.isDebtUnmodifiable(ms.debt)) {
      throw new BadRequestException(
        `Đợt thanh toán "${ms.name}" đã bị khóa hoặc đã phát sinh thanh toán, không thể chỉnh sửa.`,
      );
    }

    if (
      dto.percentage !== undefined &&
      Number(dto.percentage) !== Number(ms.percentage)
    ) {
      const otherTotal = (ms.contract?.milestones || [])
        .filter((m) => m.id !== id)
        .reduce((s, m) => s + Number(m.percentage), 0);
      if (otherTotal + Number(dto.percentage) > 100) {
        throw new BadRequestException(
          "Tổng phần trăm thanh toán vượt quá 100%",
        );
      }
      ms.percentage = dto.percentage;
      ms.amount = (getCollectible(ms.contract) * Number(dto.percentage)) / 100;
    }

    if (dto.name) ms.name = dto.name;
    if (dto.description !== undefined) ms.description = dto.description;
    if (dto.dueDate !== undefined)
      ms.dueDate = dto.dueDate ? (dto.dueDate as any) : null;

    const savedMs = await this.milestoneRepo.save(ms);

    if (ms.debt && !this.isDebtUnmodifiable(ms.debt)) {
      if (dto.name) ms.debt.name = `Phải thu: ${ms.name}`;
      if (ms.amount !== undefined) ms.debt.amount = ms.amount;
      if (dto.dueDate !== undefined)
        ms.debt.dueDate = dto.dueDate ? (dto.dueDate as any) : new Date();
      await this.debtRepo.save(ms.debt);
    }

    return savedMs;
  }

  async delete(id: string) {
    const ms = await this.milestoneRepo.findOne({
      where: { id },
      relations: ["debt", "debt.payments"],
    });
    if (!ms) throw new NotFoundException("Không tìm thấy giai đoạn thanh toán");
    if (this.isDebtUnmodifiable(ms.debt)) {
      throw new BadRequestException(
        `Đợt thanh toán "${ms.name}" đã bị khóa hoặc đã phát sinh thanh toán, không thể xóa.`,
      );
    }
    if (ms.debt) await this.debtRepo.remove(ms.debt as any);
    await this.milestoneRepo.remove(ms as any);
    return { message: "Xóa giai đoạn thanh toán thành công" };
  }
}
