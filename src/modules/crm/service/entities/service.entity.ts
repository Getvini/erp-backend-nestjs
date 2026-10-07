import { Entity, Column, OneToMany } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { ServiceJob } from "./service-job.entity";

@Entity("services")
export class Services extends BaseEntity {
  @Column({ nullable: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  unit: string;

  @Column({ type: "decimal", precision: 15, scale: 3, default: 0 })
  costPrice: number;

  @Column({ type: "decimal", precision: 15, scale: 3, default: 0 })
  overheadCost: number;

  @Column({ default: false })
  isAI: boolean;

  @OneToMany(() => ServiceJob, (serviceJob) => serviceJob.service, {
    cascade: true,
  })
  serviceJobs: ServiceJob[];
}
