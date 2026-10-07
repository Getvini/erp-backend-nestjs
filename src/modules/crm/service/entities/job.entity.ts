import { Entity, Column, OneToMany } from "typeorm";
import { BaseEntity } from "../../../../core/database/base.entity";
import { JobCategory, PerformerType } from "../enums/job-category.enum";
import { ServiceJob } from "./service-job.entity";
import { VendorJobs } from "../../vendor/entities/vendor-job.entity";
import { JobCriterias } from "../../../project/task/entities/job-criteria.entity";

@Entity("jobs")
export class Jobs extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  nickname: string | null;

  @Column({ type: "decimal", precision: 15, scale: 3, default: 0 })
  costPrice: number;

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
}
