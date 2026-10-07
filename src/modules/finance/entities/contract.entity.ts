import {
  Entity,
  Column,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Customers } from "@modules/crm/customer/entities/customer.entity";
import { Opportunities } from "@modules/crm/opportunity/entities/opportunity.entity";
import { ReferralPartners } from "@modules/crm/service/entities/referral-partner.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { Project } from "@modules/project/project-core/entities/project.entity";
import { Debts } from "./debt.entity";
import { ContractServices } from "@modules/project/acceptance/entities/contract-service.entity";
import { PaymentMilestone } from "@modules/finance/contract/entities/payment-milestone.entity";
import { ContractAddendum } from "@modules/finance/contract/entities/contract-addendum.entity";

export enum ContractStatus {
  DRAFT = "DRAFT",
  PROPOSAL_UPLOADED = "PROPOSAL_UPLOADED",
  PROPOSAL_APPROVED = "PROPOSAL_APPROVED",
  PROPOSAL_REJECTED = "PROPOSAL_REJECTED",
  SIGNED = "SIGNED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum PartnerCommissionStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  CANCELLED = "CANCELLED",
}

@Entity("contracts")
@Index(["status", "createdAt"])
export class Contract extends BaseEntity {
  @Index()
  @Column({
    type: "enum",
    enum: ContractStatus,
    default: ContractStatus.DRAFT,
  })
  status: ContractStatus;

  @Column({ unique: true })
  contractCode: string;

  @Column()
  name: string;

  @ManyToOne(() => Customers)
  @JoinColumn({ name: "customerId" })
  customer: Customers;

  @Column({ type: "varchar", length: 26, nullable: true })
  customerId: string;

  @ManyToOne(() => Opportunities)
  @JoinColumn({ name: "opportunityId" })
  opportunity: Opportunities;

  @Column({ type: "varchar", length: 26, nullable: true })
  opportunityId: string;

  @ManyToOne(() => ReferralPartners, { nullable: true })
  @JoinColumn({ name: "referralPartnerId" })
  referralPartner: ReferralPartners;

  @Column({ type: "varchar", length: 26, nullable: true })
  referralPartnerId: string;

  @Column({ type: "decimal", precision: 15, scale: 3, default: 0 })
  cost: number;

  @Column({ type: "decimal", precision: 15, scale: 3, default: 0 })
  sellingPrice: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 8 })
  vatRate: number;

  @Column({ type: "decimal", precision: 15, scale: 3, default: 0 })
  vatAmount: number;

  @Column({ type: "decimal", precision: 15, scale: 3, default: 0 })
  totalWithVat: number;

  @Column({
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 0,
    nullable: true,
  })
  partnerCommissionRate: number;

  @Column({
    type: "decimal",
    precision: 15,
    scale: 2,
    default: 0,
    nullable: true,
  })
  partnerCommission: number;

  @Column({
    type: "enum",
    enum: PartnerCommissionStatus,
    default: PartnerCommissionStatus.PENDING,
  })
  partnerCommissionStatus: PartnerCommissionStatus;

  @Column({ type: "timestamptz", nullable: true })
  partnerCommissionPaidAt: Date;

  @Column({ type: "text", nullable: true })
  proposal_contract: string;

  @Column({ type: "text", nullable: true })
  quotation_link: string;

  @Column({ type: "text", nullable: true })
  signed_contract: string;

  @Column({ type: "text", nullable: true })
  rejectionReason: string;

  @Column({ type: "jsonb", nullable: true, default: () => "'[]'" })
  attachments: any[];

  @Column({ type: "text", nullable: true })
  description: string;

  @ManyToOne(() => Users)
  @JoinColumn({ name: "createdById" })
  createdBy: Users;

  @Column({ type: "varchar", length: 26, nullable: true })
  createdById: string;

  @OneToOne(() => Project, (project) => project.contract)
  project: Project;

  @OneToMany(() => ContractServices, (service) => service.contract)
  services: ContractServices[];

  @OneToMany(() => Debts, (debt) => debt.contract)
  debts: Debts[];

  @OneToMany(() => PaymentMilestone, (m) => m.contract)
  milestones: PaymentMilestone[];

  @OneToMany(() => ContractAddendum, (a) => a.contract)
  addendums: ContractAddendum[];
}

export { Contract as Contracts };
