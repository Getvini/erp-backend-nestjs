import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like, DataSource } from "typeorm";
import {
  Contract,
  ContractStatus,
} from "@modules/finance/entities/contract.entity";
import {
  PaymentMilestone,
  MilestoneStatus,
} from "@modules/finance/contract/entities/payment-milestone.entity";
import { Debts, DebtStatus } from "@modules/finance/entities/debt.entity";
import { CreateContractDto } from "@modules/finance/contract/dto/contract.dto";
import { Customers } from "@modules/crm/customer/entities/customer.entity";
import { Opportunities } from "@modules/crm/opportunity/entities/opportunity.entity";
import { OpportunityStatus } from "@modules/crm/opportunity/enums/opportunity-status.enum";
import { ContractServices } from "@modules/project/acceptance/entities/contract-service.entity";
import { Services } from "@modules/crm/service/entities/service.entity";
import { ContractQueryService } from "./contract-query.service";

function calcTotals(selling: number, vatRate = 8) {
  const vat = Math.round(selling * (vatRate / 100));
  return {
    sellingPrice: selling,
    vatRate,
    vatAmount: vat,
    totalWithVat: selling + vat,
  };
}

function getCollectible(contract: Contract): number {
  return Number(contract.totalWithVat || 0);
}

function roundUnit(price: number): number {
  return Math.round(price / 1000) * 1000;
}

@Injectable()
export class ContractActionService {
  constructor(
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,
    @InjectRepository(PaymentMilestone)
    private readonly milestoneRepo: Repository<PaymentMilestone>,
    @InjectRepository(Debts) private readonly debtRepo: Repository<Debts>,
    @InjectRepository(Customers)
    private readonly customerRepo: Repository<Customers>,
    @InjectRepository(Opportunities)
    private readonly oppRepo: Repository<Opportunities>,
    @InjectRepository(ContractServices)
    private readonly csRepo: Repository<ContractServices>,
    @InjectRepository(Services)
    private readonly serviceRepo: Repository<Services>,
    private readonly queryService: ContractQueryService,
    private readonly dataSource: DataSource,
  ) {}

  private async generateCode(): Promise<string> {
    const now = new Date();
    const y = now.getFullYear().toString().slice(-2);
    const m = (now.getMonth() + 1).toString().padStart(2, "0");
    const prefix = `SMGK-${y}-${m}`;
    const count = await this.contractRepo.count({
      where: { contractCode: Like(`${prefix}%`) },
    });
    return `${prefix}-${(count + 1).toString().padStart(3, "0")}`;
  }

  async create(dto: CreateContractDto, user: any) {
    const {
      opportunityId,
      quotationId: _quotationId,
      quotationDetails,
      ...data
    } = dto;
    const quotationDetailList = Array.isArray(quotationDetails)
      ? quotationDetails
      : [];

    if (!data.contractCode) {
      data["contractCode"] = await this.generateCode();
    }

    let customer: Customers | null = null;
    let opportunity: Opportunities | null = null;

    if (opportunityId) {
      opportunity = await this.oppRepo.findOne({
        where: { id: opportunityId },
        relations: ["customer", "referralPartner", "quotations", "services"],
      });
      if (!opportunity)
        throw new NotFoundException("Không tìm thấy cơ hội kinh doanh");
      if (opportunity.status !== OpportunityStatus.QUOTE_APPROVED) {
        throw new BadRequestException("Cơ hội đã được tạo hợp đồng");
      }
      customer = opportunity.customer || null;
      if (!customer)
        throw new BadRequestException("Cơ hội chưa có thông tin khách hàng");
    } else if (dto.customerId) {
      customer = await this.customerRepo.findOne({
        where: { id: dto.customerId },
      });
      if (!customer) throw new NotFoundException("Không tìm thấy khách hàng");
    } else {
      throw new BadRequestException(
        "Cần chọn Cơ hội kinh doanh hoặc Khách hàng",
      );
    }

    let finalSelling = data["sellingPrice"] || 0;
    let finalCost = data["cost"] || 0;

    if (opportunity && quotationDetailList.length > 0) {
      finalSelling =
        finalSelling ||
        quotationDetailList.reduce(
          (s, d) => s + roundUnit(d.sellingPrice || 0) * (d.quantity || 1),
          0,
        );
      finalCost =
        finalCost ||
        quotationDetailList.reduce(
          (s, d) => s + Number(d.costAtSale || 0) * (d.quantity || 1),
          0,
        );
    }

    const priceTotals = calcTotals(finalSelling);
    const contract = this.contractRepo.create({
      ...(data as any),
      ...priceTotals,
      cost: finalCost,
      customer,
      opportunity,
      createdById: user?.userId || user?.id,
    } as Partial<Contract>);

    const saved = await this.contractRepo.save(contract);

    // Create default 100% milestone + debt
    const milestoneAmount = getCollectible(saved);
    const ms = this.milestoneRepo.create({
      contract: saved,
      name: "Thanh toán đợt 1",
      percentage: 100,
      amount: milestoneAmount,
      status: MilestoneStatus.PENDING,
      dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000) as any,
    } as Partial<PaymentMilestone>);
    const savedMs = await this.milestoneRepo.save(ms);
    await this.debtRepo.save(
      this.debtRepo.create({
        contract: saved,
        milestone: savedMs,
        name: `Phải thu: ${savedMs.name}`,
        amount: savedMs.amount,
        dueDate: (savedMs.dueDate || new Date()) as any,
        status: DebtStatus.UNPAID,
      } as Partial<Debts>),
    );

    // Update opportunity status
    if (opportunity) {
      await this.oppRepo.update(opportunity.id, {
        status: OpportunityStatus.CONTRACT_CREATED,
      });
    }

    return this.queryService.getOne(saved.id);
  }

  async delete(id: string) {
    const contract = await this.queryService.getOne(id);
    await this.contractRepo.remove(contract as any);
    return { message: "Xóa hợp đồng thành công" };
  }

  async uploadProposal(
    id: string,
    proposalUrl: string,
    quotationLink?: string,
  ) {
    const contract = await this.contractRepo.findOne({ where: { id } });
    if (!contract) throw new NotFoundException("Không tìm thấy hợp đồng");
    contract.proposal_contract = proposalUrl.trim();
    contract.quotation_link = quotationLink?.trim() || null;
    contract.status = ContractStatus.PROPOSAL_UPLOADED;
    (contract as any).rejectionReason = null;
    return this.contractRepo.save(contract);
  }

  async approveProposal(id: string) {
    const contract = await this.contractRepo.findOne({
      where: { id },
      relations: ["opportunity"],
    });
    if (!contract) throw new NotFoundException("Không tìm thấy hợp đồng");
    contract.status = ContractStatus.PROPOSAL_APPROVED;
    const saved = await this.contractRepo.save(contract);
    if (contract.opportunity) {
      await this.oppRepo.update(contract.opportunity.id, {
        status: OpportunityStatus.CONTRACT_APPROVED,
      });
    }
    return saved;
  }

  async rejectProposal(id: string, reason: string) {
    const contract = await this.contractRepo.findOne({ where: { id } });
    if (!contract) throw new NotFoundException("Không tìm thấy hợp đồng");
    if (contract.status !== ContractStatus.PROPOSAL_UPLOADED) {
      throw new ConflictException(
        "Chỉ có thể từ chối hợp đồng đang ở trạng thái PROPOSAL_UPLOADED",
      );
    }
    contract.status = ContractStatus.PROPOSAL_REJECTED;
    (contract as any).rejectionReason = reason;
    return this.contractRepo.save(contract);
  }

  async uploadSigned(id: string, fileUrl: string) {
    const contract = await this.contractRepo.findOne({ where: { id } });
    if (!contract) throw new NotFoundException("Không tìm thấy hợp đồng");
    if (contract.signed_contract)
      throw new ConflictException(
        "Hợp đồng đã có bản ký, không thể upload lại",
      );
    if (contract.status !== ContractStatus.PROPOSAL_APPROVED) {
      throw new ConflictException(
        "Hợp đồng cần được duyệt trước khi upload bản ký",
      );
    }
    contract.signed_contract = fileUrl;
    contract.status = ContractStatus.SIGNED;
    return this.contractRepo.save(contract);
  }

  async updateServiceNickname(
    csId: string,
    nickname: string | null,
    _user: any,
  ) {
    const cs = await this.csRepo.findOne({
      where: { id: csId },
      relations: ["contract", "contract.project"],
    });
    if (!cs) throw new NotFoundException("Không tìm thấy hạng mục dịch vụ");
    if (nickname != null && nickname.length > 120) {
      throw new BadRequestException("Nickname không được vượt quá 120 ký tự");
    }
    cs.nickname = nickname ?? null;
    return this.csRepo.save(cs);
  }
}
