import { Entity, Column, ManyToOne, Index, JoinColumn } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Debts } from "./debt.entity";

@Entity("debt_payments")
export class DebtPayments extends BaseEntity {
  @Index()
  @ManyToOne(() => Debts, (debt) => debt.payments)
  @JoinColumn({ name: "debtId" })
  debt: Debts;

  @Column({ type: "varchar", length: 26, nullable: true })
  debtId: string;

  @Column({ type: "decimal", precision: 15, scale: 2 })
  amount: number;

  @Column({ type: "text", nullable: true })
  note: string;

  @Column({ type: "date" })
  paymentDate: Date;

  @Column({ type: "jsonb", nullable: true })
  attachments: Array<{
    name: string;
    url: string;
    type?: string;
    size?: number;
  }>;
}

export { DebtPayments as DebtPayment };
