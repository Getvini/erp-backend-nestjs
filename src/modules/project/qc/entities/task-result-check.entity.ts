import { Entity, Column, OneToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../../core/database/base.entity";
import { Tasks } from "../../task/entities/task.entity";
import { TaskResultCheckStatus } from "../enums/qc.enum";

@Entity("task_result_checks")
export class TaskResultChecks extends BaseEntity {
  @Column({ type: "varchar", length: 26 })
  taskId: string;

  @OneToOne(() => Tasks, { onDelete: "CASCADE" })
  @JoinColumn({ name: "taskId" })
  task: Tasks;

  @Column({
    type: "enum",
    enum: TaskResultCheckStatus,
    default: TaskResultCheckStatus.PENDING,
  })
  status: TaskResultCheckStatus;

  @Column({
    type: "enum",
    enum: TaskResultCheckStatus,
    default: TaskResultCheckStatus.PENDING,
  })
  spellStatus: TaskResultCheckStatus;

  @Column({
    type: "enum",
    enum: TaskResultCheckStatus,
    default: TaskResultCheckStatus.PENDING,
  })
  qcStatus: TaskResultCheckStatus;

  @Column({ type: "text", nullable: true })
  spellErrorMessage: string | null;

  @Column({ type: "text", nullable: true })
  qcErrorMessage: string | null;

  @Column({ type: "text", nullable: true })
  qcSkippedReason: string | null;

  @Column({ type: "json", nullable: true })
  sheetNames: string[];

  @Column({ type: "json", nullable: true })
  scenarioIds: string[] | null;

  @Column({ type: "json", nullable: true })
  scanRegions: any[] | null;

  @Column({ type: "varchar", nullable: true })
  filteredFileUrl: string | null;

  @Column({ type: "varchar", nullable: true })
  fileName: string | null;

  @Column({ type: "json", nullable: true })
  spellErrors: any[];

  @Column({ type: "json", nullable: true })
  qcMismatches: Record<string, any>[];

  @Column({ type: "json", nullable: true })
  scannedScenarios: any[] | null;

  @Column({ type: "json", nullable: true })
  qcModels: { verify: string } | null;

  @Column({ type: "json", nullable: true })
  qcBatches: any[] | null;

  @Column({ type: "json", nullable: true })
  reviewedSpellErrors: any[];

  @Column({ type: "json", nullable: true })
  reviewedQcMismatches: any[];

  @Column({ type: "json", nullable: true })
  reviewerWhitelist: string[] | null;

  @Column({ type: "text", nullable: true })
  errorMessage: string | null;

  @Column({ type: "timestamptz", nullable: true })
  finalizedAt: Date | null;
}
