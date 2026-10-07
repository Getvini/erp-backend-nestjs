import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import {
  ContractAddendum,
  AddendumStatus,
} from "../entities/contract-addendum.entity";
import { Contract } from "@modules/finance/entities/contract.entity";
import { ContractServices } from "@modules/project/acceptance/entities/contract-service.entity";
import { ContractServiceStatus } from "@modules/project/acceptance/enums/acceptance.enum";
import {
  PaymentMilestone,
  MilestoneStatus,
} from "../entities/payment-milestone.entity";
import { Services } from "@modules/crm/service/entities/service.entity";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";
import { DebtService } from "@modules/finance/debt/services/debt.service";
import {
  calculatePricingTotals,
  roundUnitSellingPrice,
} from "@modules/finance/helpers/pricing-tax.helper";
import {
  CreateContractAddendumDto,
  AddAddendumItemsDto,
  ScaleDownAddendumDto,
  ResubmitAddendumDto,
} from "../dto/contract-addendum.dto";

@Injectable()
export class ContractAddendumService {
  constructor(
    @InjectRepository(ContractAddendum)
    private readonly addendumRepo: Repository<ContractAddendum>,
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,
    @InjectRepository(ContractServices)
    private readonly contractServiceRepo: Repository<ContractServices>,
    @InjectRepository(PaymentMilestone)
    private readonly milestoneRepo: Repository<PaymentMilestone>,
    @InjectRepository(Services)
    private readonly serviceRepo: Repository<Services>,
    @InjectRepository(Tasks)
    private readonly taskRepo: Repository<Tasks>,
    @InjectRepository(Users)
    private readonly userRepo: Repository<Users>,
    private readonly debtService: DebtService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateContractAddendumDto) {
    const contract = await this.contractRepo.findOne({
      where: { id: dto.contractId },
      relations: ["project"],
    });
    if (!contract) throw new NotFoundException("Không tìm thấy hợp đồng");

    const addendum = this.addendumRepo.create({
      contractId: contract.id,
      projectId: contract.project?.id,
      name: dto.name,
      description: dto.description,
      status: AddendumStatus.DRAFT,
    });
    return this.addendumRepo.save(addendum);
  }

  async addItems(id: string, dto: AddAddendumItemsDto) {
    const addendum = await this.addendumRepo.findOne({
      where: { id },
      relations: ["contract"],
    });
    if (!addendum) throw new NotFoundException("Không tìm thấy phụ lục");

    let totalSellingPrice = 0;
    const totalCost = 0;

    if (dto.services) {
      for (const s of dto.services) {
        const serviceDef = await this.serviceRepo.findOneBy({
          id: s.serviceId,
        });
        const addendumService = this.contractServiceRepo.create({
          contractId: addendum.contractId,
          addendumId: addendum.id,
          serviceId: serviceDef?.id,
          sellingPrice: roundUnitSellingPrice(s.sellingPrice),
          name: s.serviceName || serviceDef?.name,
          code: serviceDef?.code,
          status: ContractServiceStatus.ACTIVE,
        });
        await this.contractServiceRepo.save(addendumService);
        totalSellingPrice += roundUnitSellingPrice(s.sellingPrice);
      }
    }

    if (dto.milestones) {
      for (const m of dto.milestones) {
        const milestone = this.milestoneRepo.create({
          contractId: addendum.contractId,
          name: m.name,
          percentage: m.percentage,
          amount: m.amount,
          status: MilestoneStatus.PENDING,
          dueDate: m.dueDate,
        });
        await this.milestoneRepo.save(milestone);
      }
    }

    Object.assign(addendum, calculatePricingTotals(totalSellingPrice));
    addendum.cost = totalCost;
    return this.addendumRepo.save(addendum);
  }

  async uploadSigned(id: string, file: { url: string }) {
    const addendum = await this.addendumRepo.findOne({
      where: { id },
      relations: ["contract", "milestones"],
    });
    if (!addendum) throw new NotFoundException("Không tìm thấy phụ lục");

    addendum.signed_contract = file.url;
    addendum.status = AddendumStatus.SIGNED;

    if (addendum.contract) {
      const contract = addendum.contract;
      Object.assign(
        contract,
        calculatePricingTotals(
          Number(contract.sellingPrice || 0) +
            Number(addendum.sellingPrice || 0),
          contract.vatRate || 8,
        ),
      );
      contract.cost = Number(contract.cost || 0) + Number(addendum.cost || 0);
      await this.contractRepo.save(contract);
    }

    for (const ms of addendum.milestones || []) {
      await this.debtService.createFromMilestone(ms.id);
    }

    return this.addendumRepo.save(addendum);
  }

  async scaleDown(id: string, dto: ScaleDownAddendumDto) {
    const addendum = await this.addendumRepo.findOne({ where: { id } });
    if (!addendum) throw new NotFoundException("Không tìm thấy phụ lục");

    for (const sId of dto.cancelServiceIds || []) {
      const cs = await this.contractServiceRepo.findOneBy({ id: sId });
      if (cs) {
        cs.status = ContractServiceStatus.CANCELLED;
        await this.contractServiceRepo.save(cs);
      }
    }

    Object.assign(
      addendum,
      calculatePricingTotals(-Math.abs(dto.refundAmount)),
    );
    addendum.name += " (Cắt giảm hạng mục)";
    return this.addendumRepo.save(addendum);
  }

  async saleApprove(
    id: string,
    user: any,
    note?: string,
    _selectedItems?: any[],
  ) {
    const addendum = await this.addendumRepo.findOne({ where: { id } });
    if (!addendum) throw new NotFoundException("Không tìm thấy phụ lục");
    if (addendum.status !== AddendumStatus.PENDING_SALE) {
      throw new BadRequestException(
        "Phụ lục không ở trạng thái chờ Sale duyệt",
      );
    }

    addendum.status = AddendumStatus.PENDING_BOD;
    addendum.saleReviewedBy = user?.userId
      ? ({ id: user.userId } as any)
      : undefined;
    addendum.saleReviewedAt = new Date();
    addendum.saleReviewNote = note || null;
    return this.addendumRepo.save(addendum);
  }

  async saleReject(id: string, user: any, note?: string) {
    const addendum = await this.addendumRepo.findOne({ where: { id } });
    if (!addendum) throw new NotFoundException("Không tìm thấy phụ lục");
    if (addendum.status !== AddendumStatus.PENDING_SALE) {
      throw new BadRequestException(
        "Phụ lục không ở trạng thái chờ Sale duyệt",
      );
    }

    addendum.status = AddendumStatus.SALE_REJECTED;
    addendum.saleReviewedBy = user?.userId
      ? ({ id: user.userId } as any)
      : undefined;
    addendum.saleReviewedAt = new Date();
    addendum.saleReviewNote = note || null;
    return this.addendumRepo.save(addendum);
  }

  async resubmit(id: string, user: any, dto: ResubmitAddendumDto) {
    if (![UserRole.PM, UserRole.ADMIN].includes(user?.role)) {
      throw new ForbiddenException("Bạn không có quyền gửi lại phụ lục");
    }
    const addendum = await this.addendumRepo.findOne({ where: { id } });
    if (!addendum) throw new NotFoundException("Không tìm thấy phụ lục");
    if (
      ![AddendumStatus.SALE_REJECTED, AddendumStatus.BOD_REJECTED].includes(
        addendum.status,
      )
    ) {
      throw new BadRequestException("Chỉ có thể gửi lại phụ lục đã bị từ chối");
    }

    if (dto.name?.trim()) addendum.name = dto.name.trim();
    if (dto.description) addendum.description = dto.description;
    addendum.status = AddendumStatus.PENDING_SALE;
    addendum.saleReviewedBy = null;
    addendum.saleReviewedAt = null;
    addendum.saleReviewNote = null;
    addendum.bodReviewedBy = null;
    addendum.bodReviewedAt = null;
    addendum.bodReviewNote = null;
    return this.addendumRepo.save(addendum);
  }

  async bodApprove(id: string, user: any, note?: string) {
    const addendum = await this.addendumRepo.findOne({
      where: { id },
      relations: ["contract", "project"],
    });
    if (!addendum) throw new NotFoundException("Không tìm thấy phụ lục");
    if (addendum.status !== AddendumStatus.PENDING_BOD) {
      throw new BadRequestException("Phụ lục không ở trạng thái chờ BOD duyệt");
    }

    addendum.status = AddendumStatus.APPROVED;
    addendum.bodReviewedBy = user?.userId
      ? ({ id: user.userId } as any)
      : undefined;
    addendum.bodReviewedAt = new Date();
    addendum.bodReviewNote = note || null;
    const saved = await this.addendumRepo.save(addendum);

    return {
      message: "Đã duyệt phụ lục thành công",
      addendum: saved,
    };
  }

  async bodReject(id: string, user: any, note?: string) {
    const addendum = await this.addendumRepo.findOne({ where: { id } });
    if (!addendum) throw new NotFoundException("Không tìm thấy phụ lục");
    if (addendum.status !== AddendumStatus.PENDING_BOD) {
      throw new BadRequestException("Phụ lục không ở trạng thái chờ BOD duyệt");
    }

    addendum.status = AddendumStatus.BOD_REJECTED;
    addendum.bodReviewedBy = user?.userId
      ? ({ id: user.userId } as any)
      : undefined;
    addendum.bodReviewedAt = new Date();
    addendum.bodReviewNote = note || null;
    return this.addendumRepo.save(addendum);
  }
}
