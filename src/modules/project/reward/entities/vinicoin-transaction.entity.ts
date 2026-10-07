import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Accounts } from "@modules/identity/auth/entities/account.entity";

export enum VinicoinTransactionType {
  REWARD = "REWARD",
  SPEND = "SPEND",
  ADJUSTMENT = "ADJUSTMENT",
  MONTHLY_WITHDRAWAL = "MONTHLY_WITHDRAWAL",
}

@Entity("vinicoin_transactions")
export class VinicoinTransactions extends BaseEntity {
  @Column()
  amount: number;

  @Column({
    type: "enum",
    enum: VinicoinTransactionType,
    default: VinicoinTransactionType.REWARD,
  })
  type: VinicoinTransactionType;

  @ManyToOne(() => Accounts)
  @JoinColumn({ name: "accountId" })
  account: Accounts;

  @Column({ type: "varchar", length: 26, nullable: true })
  accountId: string;

  @Column({ type: "varchar", length: 100, nullable: true, unique: true })
  idempotencyKey: string | null;

  @Column({ nullable: true })
  relatedTaskId: string;

  @Column({ nullable: true })
  relatedServiceId: string;

  @Column({ type: "text", nullable: true })
  description: string;
}
