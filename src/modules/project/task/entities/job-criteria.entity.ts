import {
  Entity,
  Column,
  ManyToOne,
  DeleteDateColumn,
  JoinColumn,
} from "typeorm";
import { BaseEntity } from "../../../../core/database/base.entity";
import { Jobs } from "../../../crm/service/entities/job.entity";

@Entity("job_criterias")
export class JobCriterias extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: "varchar", length: 26, nullable: true })
  jobId: string;

  @ManyToOne(() => Jobs, { nullable: true })
  @JoinColumn({ name: "jobId" })
  job: Jobs;

  @Column({ nullable: true })
  description: string;

  @DeleteDateColumn()
  deletedAt: Date;
}
