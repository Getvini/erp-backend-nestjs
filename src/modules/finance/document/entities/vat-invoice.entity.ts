import { Column, Entity, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Contract } from "@modules/finance/entities/contract.entity";
import { Users } from "@modules/identity/user/entities/user.entity";

@Entity("vat_invoices")
export class VatInvoices extends BaseEntity {
  @Column()
  name: string;

  @Column()
  fileUrl: string;

  @Column({ type: "varchar", length: 26, nullable: true })
  contractId: string;

  @ManyToOne(() => Contract, { onDelete: "CASCADE" })
  @JoinColumn({ name: "contractId" })
  contract: Contract;

  @Column({ type: "varchar", length: 26, nullable: true })
  createdById: string;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "createdById" })
  createdBy: Users;
}
