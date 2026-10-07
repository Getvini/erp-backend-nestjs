import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Customers } from "@modules/crm/customer/entities/customer.entity";
import { ReferralPartners } from "@modules/crm/service/entities/referral-partner.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import {
  OpportunityStatus,
  CustomerType,
} from "@modules/crm/opportunity/enums/opportunity-status.enum";
import { Quotations } from "@modules/crm/quotation/entities/quotation.entity";
import { OpportunityPackages } from "./opportunity-package.entity";
import { OpportunityServices } from "./opportunity-service.entity";
import { OpportunityRejections } from "./opportunity-rejection.entity";

@Entity("opportunities")
export class Opportunities extends BaseEntity {
  @Column({ unique: true })
  opportunityCode: string;

  @Column()
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ nullable: true })
  field: string;

  @Column({ type: "decimal", precision: 15, scale: 3, default: 0 })
  expectedRevenue: number;

  @Column({ type: "decimal", precision: 15, scale: 3, default: 0 })
  budget: number;

  @Column({ type: "date", nullable: true })
  startDate: string | null;

  @Column({ type: "date", nullable: true })
  endDate: string | null;

  @Column({ nullable: true })
  priority: string;

  @Column({ type: "int", default: 0 })
  successChance: number;

  @Column({ type: "jsonb", nullable: true, default: [] })
  region: string[];

  @Column({ type: "int", default: 0 })
  durationMonths: number;

  @Index()
  @Column({
    type: "enum",
    enum: OpportunityStatus,
    default: OpportunityStatus.PENDING_OPP_APPROVAL,
  })
  status: OpportunityStatus;

  @Column({ type: "text", nullable: true })
  rejectionReason: string;

  @Column({
    type: "enum",
    enum: CustomerType,
    default: CustomerType.DIRECT,
  })
  customerType: CustomerType;

  @Column({ nullable: true })
  leadName: string;

  @Column({ nullable: true })
  leadPhone: string;

  @Column({ nullable: true })
  leadEmail: string;

  @Column({ nullable: true })
  leadAddress: string;

  @Column({ nullable: true })
  leadTaxId: string;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  partnerCommissionRate: number;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  expectedPartnerCommission: number;

  @Column({ type: "json", nullable: true })
  attachments: any[];

  @ManyToOne(() => Customers, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "customerId" })
  customer: Customers | null;

  @Column({ nullable: true })
  customerId: string;

  @ManyToOne(() => ReferralPartners, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "referralPartnerId" })
  referralPartner: ReferralPartners | null;

  @Column({ nullable: true })
  referralPartnerId: string;

  @OneToMany(() => OpportunityPackages, (pkg) => pkg.opportunity)
  packages: OpportunityPackages[];

  @OneToMany(() => OpportunityServices, (svc) => svc.opportunity)
  services: OpportunityServices[];

  @OneToMany(() => OpportunityRejections, (rej) => rej.opportunity)
  rejections: OpportunityRejections[];

  @OneToMany(() => Quotations, (q) => q.opportunity)
  quotations: Quotations[];

  @ManyToOne(() => Users, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "createdById" })
  createdBy: Users | null;

  @Column({ nullable: true })
  createdById: string;
}
