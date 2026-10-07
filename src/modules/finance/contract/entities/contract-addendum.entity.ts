import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Contract } from "@modules/finance/entities/contract.entity";
import { ContractServices } from "@modules/project/acceptance/entities/contract-service.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { Project } from "@modules/project/project-core/entities/project.entity";

export enum AddendumStatus {
  DRAFT = "DRAFT",
  SIGNED = "SIGNED",
  CANCELLED = "CANCELLED",
  PENDING_SALE = "PENDING_SALE",
  SALE_REJECTED = "SALE_REJECTED",
  PENDING_BOD = "PENDING_BOD",
  BOD_REJECTED = "BOD_REJECTED",
  APPROVED = "APPROVED",
}

export enum AddendumType {
  MANUAL = "MANUAL",
  MONTHLY_TASKS = "MONTHLY_TASKS",
  ADD_SERVICES = "ADD_SERVICES",
}

@Entity("contract_addendums")
export class ContractAddendum extends BaseEntity {
  @Column()
  name: string;

  @ManyToOne(() => Contract, (c) => c.addendums)
  @JoinColumn({ name: "contractId" })
  contract: Contract;

  @Column({ type: "varchar", length: 26, nullable: true })
  contractId: string;

  @ManyToOne(() => Project, { nullable: true })
  @JoinColumn({ name: "projectId" })
  project: Project;

  @Column({ type: "varchar", length: 26, nullable: true })
  projectId: string;

  @Column({ type: "enum", enum: AddendumType, default: AddendumType.MANUAL })
  type: AddendumType;

  @Column({ type: "varchar", length: 7, nullable: true })
  monthKey: string;

  @Column({ type: "jsonb", nullable: true, default: () => "'[]'" })
  selectedItems: any[];

  @Column({ type: "decimal", precision: 15, scale: 3, default: 0 })
  sellingPrice: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 8 })
  vatRate: number;

  @Column({ type: "decimal", precision: 15, scale: 3, default: 0 })
  vatAmount: number;

  @Column({ type: "decimal", precision: 15, scale: 3, default: 0 })
  totalWithVat: number;

  @Column({ type: "decimal", precision: 15, scale: 3, default: 0 })
  cost: number;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ nullable: true })
  signed_contract: string;

  @Column({ type: "enum", enum: AddendumStatus, default: AddendumStatus.DRAFT })
  status: AddendumStatus;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "saleReviewedById" })
  saleReviewedBy: Users;

  @Column({ type: "timestamptz", nullable: true })
  saleReviewedAt: Date;

  @Column({ type: "text", nullable: true })
  saleReviewNote: string;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "bodReviewedById" })
  bodReviewedBy: Users;

  @Column({ type: "timestamptz", nullable: true })
  bodReviewedAt: Date;

  @Column({ type: "text", nullable: true })
  bodReviewNote: string;

  @OneToMany(() => ContractServices, (s) => s.addendum)
  services: ContractServices[];

  @OneToMany("PaymentMilestone", "addendum")
  milestones: any[];
}

export { ContractAddendum as ContractAddendums };
