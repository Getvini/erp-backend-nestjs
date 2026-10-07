import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Jobs } from "@modules/crm/service/entities/job.entity";
import { OpportunityServices } from "./opportunity-service.entity";

@Entity("opportunity_service_jobs")
export class OpportunityServiceJobs extends BaseEntity {
  @Column({ type: "varchar", length: 26 })
  opportunityServiceId: string;

  @ManyToOne(() => OpportunityServices, (svc) => svc.jobs, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "opportunityServiceId" })
  opportunityService: OpportunityServices;

  @Column({ type: "varchar", length: 26, nullable: true })
  serviceJobId: string | null;

  @Column({ type: "varchar", length: 26 })
  jobId: string;

  @ManyToOne(() => Jobs, { onDelete: "CASCADE" })
  @JoinColumn({ name: "jobId" })
  job: Jobs;

  @Column()
  name: string;

  @Column({ type: "decimal", precision: 10, scale: 0, default: 1 })
  quantity: number;

  @Column({ type: "text", nullable: true })
  briefVideo: string | null;

  @Column({ type: "decimal", precision: 15, scale: 3, default: 0 })
  costAtSale: number;

  @Column({ default: false })
  isBriefVideo: boolean;

  @Column({ default: true })
  isQuotationItem: boolean;
}
