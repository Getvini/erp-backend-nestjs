import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Project } from "@modules/project/project-core/entities/project.entity";
import { Jobs } from "@modules/crm/service/entities/job.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { Vendors } from "@modules/crm/vendor/entities/vendor.entity";
import { Opportunities } from "@modules/crm/opportunity/entities/opportunity.entity";
import { OpportunityServiceJobs } from "@modules/crm/opportunity/entities/opportunity-service-job.entity";
import { Services } from "@modules/crm/service/entities/service.entity";
import { Quotations } from "@modules/crm/quotation/entities/quotation.entity";
import {
  TaskStatus,
  PerformerType,
  PricingStatus,
  SubtaskPlanStatus,
} from "@modules/project/task/enums/task-status.enum";
import { TaskIterations } from "./task-iteration.entity";
import { Violations } from "./violation.entity";

@Entity("tasks")
@Index(["assigneeId", "status", "plannedEndDate"])
@Index(["project", "status"])
export class Tasks extends BaseEntity {
  @Column({ nullable: true })
  code: string;

  @Column()
  name: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  nickname: string | null;

  @Index()
  @ManyToOne(() => Project, { nullable: true })
  @JoinColumn({ name: "projectId" })
  project: Project;
  @Column({ type: "varchar", length: 26, nullable: true })
  projectId: string;

  @Index()
  @Column({ type: "varchar", length: 26, nullable: true })
  parentTaskId: string | null;

  @ManyToOne(() => Tasks, (task) => task.subtasks, {
    nullable: true,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "parentTaskId" })
  parentTask: Tasks | null;

  @OneToMany(() => Tasks, (task) => task.parentTask)
  subtasks: Tasks[];

  @Column({ type: "varchar", length: 26, nullable: true })
  opportunityId: string | null;
  @ManyToOne(() => Opportunities, { nullable: true })
  @JoinColumn({ name: "opportunityId" })
  opportunity: Opportunities | null;

  @Column({ type: "varchar", length: 26, nullable: true })
  opportunityServiceJobId: string | null;
  @ManyToOne(() => OpportunityServiceJobs, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "opportunityServiceJobId" })
  opportunityServiceJob: OpportunityServiceJobs | null;

  @Column({ type: "varchar", length: 26, nullable: true })
  jobId: string;
  @ManyToOne(() => Jobs, { nullable: true })
  @JoinColumn({ name: "jobId" })
  job: Jobs;

  @Column({ type: "varchar", length: 26, nullable: true })
  contractServiceId: string;

  @Index()
  @Column({ type: "varchar", length: 26, nullable: true })
  assigneeId: string;
  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "assigneeId" })
  assignee: Users;

  @Column({ type: "varchar", length: 26, nullable: true })
  supervisorId: string;
  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "supervisorId" })
  supervisor: Users;

  @Column({ type: "varchar", length: 26, nullable: true })
  assignerId: string;
  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "assignerId" })
  assigner: Users;

  @Column({
    type: "enum",
    enum: PerformerType,
    default: PerformerType.INTERNAL,
  })
  performerType: PerformerType;

  @Column({ type: "varchar", length: 26, nullable: true })
  vendorId: string;
  @ManyToOne(() => Vendors, { nullable: true })
  @JoinColumn({ name: "vendorId" })
  vendor: Vendors;

  @Index()
  @Column({ type: "enum", enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  @Column({ type: "varchar", length: 30, nullable: true })
  statusBeforeHold: TaskStatus | null;

  @Column({ type: "json", nullable: true })
  result: any;

  @Column({ type: "timestamptz", nullable: true })
  plannedStartDate: Date;

  @Index()
  @Column({ type: "timestamptz", nullable: true })
  plannedEndDate: Date;

  @Column({ type: "timestamptz", nullable: true })
  actualStartDate: Date;

  @Index()
  @Column({ type: "timestamptz", nullable: true })
  actualEndDate: Date;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "json", nullable: true })
  attachments: Array<{
    type: string;
    name: string;
    url: string;
    size?: number;
    publicId?: string;
  }>;

  @OneToMany(() => TaskIterations, (iteration) => iteration.task)
  iterations: TaskIterations[];

  @OneToMany(() => Violations, (violation) => violation.task)
  violations: Violations[];

  @Column({ default: false })
  isExtra: boolean;

  @Column({ default: false })
  isOutput: boolean;

  @Column({ type: "enum", enum: PricingStatus, nullable: true })
  pricingStatus: PricingStatus;

  @Column({ type: "decimal", precision: 15, scale: 3, default: 0 })
  sellingPrice: number;
  @Column({ type: "decimal", precision: 15, scale: 3, default: 0 })
  cost: number;
  @Column({ type: "decimal", precision: 15, scale: 3, default: 0 })
  spentAmount: number;
  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  allocationPercent: number;
  @Column({ type: "decimal", precision: 15, scale: 3, nullable: true })
  rewardVinicoin: number | null;

  @Column({ type: "varchar", length: 30, nullable: true })
  customerDecision: "APPROVED" | "NOT_PURCHASED" | null;

  @Column({ type: "varchar", length: 30, nullable: true })
  subtaskPlanStatus: SubtaskPlanStatus | null;
  @Column({ type: "varchar", length: 26, nullable: true })
  subtaskPlanReviewerId: string | null;
  @Column({ type: "varchar", length: 26, nullable: true })
  subtaskPlanRequesterId: string | null;
  @Column({ type: "text", nullable: true })
  subtaskPlanReviewNote: string | null;

  @Column({ default: true })
  isRewardable: boolean;

  @Column({ type: "json", nullable: true })
  deadlineChangeHistory: {
      oldDeadline: Date | string | null,
      newDeadline: Date | string,
      reason: string,
      changedAt: Date | string,
      changedById?: string | null,
      changedByName?: string | null
  }[] | null;

  @Column({ type: "varchar", length: 26, nullable: true })
  mappedServiceId: string;
  @ManyToOne(() => Services, { nullable: true })
  @JoinColumn({ name: "mappedServiceId" })
  mappedService: Services;

  @Column({ type: "varchar", length: 26, nullable: true })
  quotationId: string;
  @ManyToOne(() => Quotations, { nullable: true })
  @JoinColumn({ name: "quotationId" })
  quotation: Quotations;

  @Column({ type: "text", nullable: true })
  reviewNote: string;
  @Column({ type: "text", nullable: true })
  reassignNote: string;

  @Column({ default: false })
  isSupportRequested: boolean;
  @Column({ default: false })
  isSupportAccepted: boolean;
  @Column({ type: "varchar", length: 26, nullable: true })
  supportTeamId: string;
  @Column({ type: "varchar", length: 26, nullable: true })
  supportLeadId: string;

  @Index()
  @Column({ type: "varchar", length: 26, nullable: true })
  helperId: string;
  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "helperId" })
  helper: Users;

  @Column({ default: false })
  isSupportReturnRequested: boolean;

  @Column({ type: "text", nullable: true })
  supportRequestNote: string;

  @Column({ type: "varchar", length: 30, nullable: true })
  supportRequestType: "EXECUTION" | "STAFFING" | null;

  @Column({ type: "text", nullable: true })
  supportReturnNote: string;

  @Column({ type: "varchar", length: 26, nullable: true })
  lastSubmittedById: string;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "lastSubmittedById" })
  lastSubmittedBy: Users;
}
