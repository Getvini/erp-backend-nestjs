import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { Tasks } from "./task.entity";

@Entity("task_iterations")
export class TaskIterations extends BaseEntity {
  @ManyToOne(() => Tasks, (task) => task.iterations, {
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "taskId" })
  task: Tasks;

  @Column({ type: "varchar", length: 26 })
  taskId: string;

  @Column({ type: "int" })
  version: number;

  @Column({ type: "json", nullable: true })
  submittedResult: any;

  @Column({ type: "text", nullable: true })
  leadFeedback: string;

  @Column({ type: "json", nullable: true })
  feedbackAttachments: Array<{
    type: string;
    name: string;
    url: string;
    size?: number;
    publicId?: string;
  }>;

  @Column({ type: "timestamptz", nullable: true })
  deadlineAt: Date;

  @Column({ type: "varchar", length: 26, nullable: true })
  submittedById: string;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "submittedById" })
  submittedBy: Users;

  @Column({ type: "json", nullable: true })
  confirmedSpellErrors: Array<{
    id: string;
    location: string;
    token: string;
    sheetName?: string | null;
    scenarioLabel?: string | null;
  }>;

  @Column({ type: "json", nullable: true })
  confirmedQcMismatches: Record<string, any>[];
}
