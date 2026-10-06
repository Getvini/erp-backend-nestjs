import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../../core/database/base.entity";
import { Vendors } from "./vendor.entity";
import { Jobs } from "../../service/entities/job.entity";

@Entity("vendor_jobs")
export class VendorJobs extends BaseEntity {
  @ManyToOne(() => Vendors, (v) => v.vendorJobs, { onDelete: "CASCADE" })
  @JoinColumn({ name: "vendorId" })
  vendor: Vendors;

  @Column({ type: "varchar", length: 26 })
  vendorId: string;

  @ManyToOne(() => Jobs, { onDelete: "CASCADE" })
  @JoinColumn({ name: "jobId" })
  job: Jobs;

  @Column({ type: "varchar", length: 26 })
  jobId: string;

  @Column({ type: "decimal", precision: 15, scale: 3, default: 0 })
  price: number;

  @Column({ type: "text", nullable: true })
  note?: string;
}
