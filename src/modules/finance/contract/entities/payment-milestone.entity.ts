import { Entity, Column, ManyToOne, OneToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Contract } from "@modules/finance/entities/contract.entity";
import { ContractAddendum } from "./contract-addendum.entity";
import { Debts } from "@modules/finance/entities/debt.entity";

export enum MilestoneStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
}

@Entity("payment_milestones")
export class PaymentMilestone extends BaseEntity {
  @Column()
  name: string;

  @ManyToOne(() => Contract, (c) => c.milestones)
  @JoinColumn({ name: "contractId" })
  contract: Contract;

  @Column({ type: "varchar", length: 26, nullable: true })
  contractId: string;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  percentage: number;

  @Column({ type: "decimal", precision: 15, scale: 3 })
  amount: number;

  @Column({
    type: "enum",
    enum: MilestoneStatus,
    default: MilestoneStatus.PENDING,
  })
  status: MilestoneStatus;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "date", nullable: true })
  dueDate: Date;

  @ManyToOne(() => ContractAddendum, (a) => a.milestones, { nullable: true })
  @JoinColumn({ name: "addendumId" })
  addendum: ContractAddendum;

  @Column({ type: "varchar", length: 26, nullable: true })
  addendumId: string;

  @OneToOne(() => Debts, (d) => d.milestone)
  debt: Debts;
}

export { PaymentMilestone as PaymentMilestones };
