import { Entity, Column, OneToMany, DeleteDateColumn } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import {
  JobCategory,
  PerformerType,
  JobLevel,
  JobResponsibleRole,
} from "@modules/crm/service/enums/job-category.enum";
import { ServiceJob } from "./service-job.entity";
import { VendorJobs } from "@modules/crm/vendor/entities/vendor-job.entity";
import { JobCriterias } from "@modules/project/task/entities/job-criteria.entity";

@Entity("jobs")
export class Jobs extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  nickname: string | null;

  @Column({ type: "decimal", precision: 15, scale: 3, default: 0 })
  costPrice: number;

  @Column({ type: "decimal", precision: 15, scale: 3, default: 0 })
  unitPrice: number;

  @Column({ default: false })
  isBriefVideo: boolean;

  @Column({ default: true })
  isQuotationItem: boolean;

  @Column({ nullable: true })
  unit: string;

  @Column({
    type: "enum",
    enum: PerformerType,
    default: PerformerType.INTERNAL,
  })
  defaultPerformerType: PerformerType;

  @Column({ nullable: true })
  code: string;

  @Column({
    type: "enum",
    enum: JobCategory,
    array: true,
    default: "{}",
  })
  categories: JobCategory[];

  @Column({
    type: "enum",
    enum: JobLevel,
    default: JobLevel.A,
  })
  level: JobLevel;

  @Column({
    type: "enum",
    enum: JobResponsibleRole,
    nullable: true,
  })
  responsibleRole: JobResponsibleRole | null;

  @Column({ nullable: true })
  vinicoin: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  timeToComplete: number;

  @OneToMany(() => ServiceJob, (serviceJob) => serviceJob.job)
  serviceJobs: ServiceJob[];

  @OneToMany(() => VendorJobs, (vj) => vj.job)
  vendorJobs: VendorJobs[];

  @OneToMany(() => JobCriterias, (criteria) => criteria.job, { cascade: true })
  criteria: JobCriterias[];

  @DeleteDateColumn()
  deletedAt: Date;
}
