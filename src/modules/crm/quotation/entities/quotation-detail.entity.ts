import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Quotations } from "./quotation.entity";
import { Services } from "@modules/crm/service/entities/service.entity";
import { Jobs } from "@modules/crm/service/entities/job.entity";

@Entity("quotation_details")
export class QuotationDetails extends BaseEntity {
  @ManyToOne(() => Quotations, (quotation) => quotation.details, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "quotationId" })
  quotation: Quotations;

  @Column({ type: "varchar", length: 26 })
  quotationId: string;

  @ManyToOne(() => Services, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "serviceId" })
  service: Services | null;

  @Column({ type: "varchar", length: 26, nullable: true })
  serviceId: string | null;

  @ManyToOne(() => Jobs, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "jobId" })
  job: Jobs | null;

  @Column({ type: "varchar", length: 26, nullable: true })
  jobId: string | null;

  @Column({ type: "int", default: 1 })
  quantity: number;

  @Column({ type: "decimal", precision: 18, scale: 6, default: 0 })
  sellingPrice: number;

  @Column({ type: "decimal", precision: 15, scale: 3, default: 0 })
  costAtSale: number;

  @Column({ nullable: true })
  name: string;

  @Column({ type: "int", default: 1, nullable: true })
  packageQuantity: number;

  @Column({ nullable: true })
  packageName: string;

  @Column({ nullable: true })
  servicePackageId: string;

  @Column({ default: false })
  isPackageService: boolean;
}
