import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
  DeleteDateColumn,
} from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Opportunities } from "@modules/crm/opportunity/entities/opportunity.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import {
  QuotationStatus,
  QuotationType,
} from "@modules/crm/quotation/enums/quotation-status.enum";
import { QuotationDetails } from "./quotation-detail.entity";

@Entity("quotations")
@Index(["status", "createdAt"])
export class Quotations extends BaseEntity {
  @Column({ type: "text", nullable: true })
  note: string;

  @Column({ type: "int", default: 1 })
  version: number;

  @Index()
  @Column({
    type: "enum",
    enum: QuotationStatus,
    default: QuotationStatus.DRAFT,
  })
  status: QuotationStatus;

  @Column({
    type: "enum",
    enum: QuotationType,
    default: QuotationType.INITIAL,
  })
  type: QuotationType;

  @Column({ type: "decimal", precision: 18, scale: 6, default: 0 })
  totalAmount: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 8 })
  vatRate: number;

  @Column({ type: "decimal", precision: 18, scale: 6, default: 0 })
  vatAmount: number;

  @Column({ type: "decimal", precision: 18, scale: 6, default: 0 })
  totalWithVat: number;

  @ManyToOne(() => Opportunities, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "opportunityId" })
  opportunity: Opportunities;

  @Column({ type: "varchar", length: 26, nullable: true })
  opportunityId: string;

  @OneToMany(() => QuotationDetails, (detail) => detail.quotation, {
    cascade: true,
  })
  details: QuotationDetails[];

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Users, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "createdById" })
  createdBy: Users | null;

  @Column({ nullable: true })
  createdById: string;

  @DeleteDateColumn()
  deletedAt: Date;
}
