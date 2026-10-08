import { Entity, Column, OneToMany, DeleteDateColumn } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { VendorType } from "@modules/crm/vendor/enums/vendor-type.enum";
import { VendorJobs } from "./vendor-job.entity";

@Entity("vendors")
export class Vendors extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  taxId?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  phone?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  address?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  email?: string;

  @Column({
    type: "enum",
    enum: VendorType,
    default: VendorType.BUSINESS,
  })
  type: VendorType;

  @Column({ type: "varchar", length: 100, nullable: true })
  bankName?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  bankAccount?: string;

  @Column({ type: "text", nullable: true })
  idCardFront?: string;

  @Column({ type: "text", nullable: true })
  idCardBack?: string;

  @OneToMany(() => VendorJobs, (vj) => vj.vendor)
  vendorJobs: VendorJobs[];

  @DeleteDateColumn()
  deletedAt: Date;
}
