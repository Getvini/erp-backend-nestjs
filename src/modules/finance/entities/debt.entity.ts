import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from "typeorm";
import { BaseEntity } from "../../../core/database/base.entity";
import { Contract } from "./contract.entity";
import { Users } from "../../identity/user/entities/user.entity";
import { DebtPayments } from "./debt-payment.entity";

export enum DebtStatus {
  UNPAID = "UNPAID",
  PARTIAL = "PARTIAL",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  LOCKED = "LOCKED",
}

@Entity("debts")
@Index(["status", "dueDate"])
export class Debts extends BaseEntity {
  @Index()
  @ManyToOne(() => Contract, (contract) => contract.debts)
  contract: Contract;

  @Column({ type: "decimal", precision: 15, scale: 3 })
  amount: number;

  @Column({ type: "date" })
  dueDate: Date;

  @Index()
  @Column({
    type: "enum",
    enum: DebtStatus,
    default: DebtStatus.UNPAID,
  })
  status: DebtStatus;

  @Column()
  name: string;

  @Column({ type: "timestamptz", nullable: true })
  lockedAt: Date;

  @Column({ type: "text", nullable: true })
  lockReason: string;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "lockedById" })
  lockedBy: Users;

  @Column({ type: "varchar", length: 26, nullable: true })
  lockedById: string;

  @Column({ type: "timestamptz", nullable: true })
  unlockedAt: Date;

  @Column({ type: "text", nullable: true })
  unlockReason: string;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "unlockedById" })
  unlockedBy: Users;

  @Column({ type: "varchar", length: 26, nullable: true })
  unlockedById: string;

  @OneToMany(() => DebtPayments, (payment) => payment.debt)
  payments: DebtPayments[];
}

export { Debts as Debt };
