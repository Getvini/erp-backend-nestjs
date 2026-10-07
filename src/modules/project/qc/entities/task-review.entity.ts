import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { JobCriterias } from "@modules/project/task/entities/job-criteria.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { ReviewerType } from "@modules/project/qc/enums/qc.enum";

@Entity("task_reviews")
export class TaskReviews extends BaseEntity {
  @Column({
    type: "enum",
    enum: ReviewerType,
    default: ReviewerType.ASSIGNER,
  })
  reviewerType: ReviewerType;

  @ManyToOne(() => Tasks, { onDelete: "CASCADE" })
  @JoinColumn({ name: "taskId" })
  task: Tasks;

  @Column({ type: "varchar", length: 26, nullable: true })
  taskId: string;

  @ManyToOne(() => JobCriterias, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "criteriaId" })
  criteria: JobCriterias;

  @Column({ type: "varchar", length: 26, nullable: true })
  criteriaId: string;

  @Column({ type: "varchar", length: 26, nullable: true })
  reviewerId: string;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "reviewerId" })
  reviewer: Users;

  @Column({ default: false })
  isPassed: boolean;

  @Column({ type: "text", nullable: true })
  note: string;
}
