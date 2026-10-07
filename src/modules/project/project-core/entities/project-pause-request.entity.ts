import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../../core/database/base.entity";
import { Users } from "../../../identity/user/entities/user.entity";
import {
  PauseRequestStatus,
  PauseMode,
  CloseMode,
  ClosedByType,
} from "../enums/pause-request.enum";
import { Project } from "./project.entity";

@Entity("project_pause_requests")
export class ProjectPauseRequest extends BaseEntity {
  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "projectId" })
  project: Project;

  @Column({ type: "varchar", length: 26 })
  projectId: string;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "requesterId" })
  requester: Users;

  @Column({ type: "varchar", length: 26, nullable: true })
  requesterId: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  requesterRole: string;

  @Column({ type: "enum", enum: PauseMode, default: PauseMode.REQUEST })
  pauseMode: PauseMode;

  @Column({ type: "text" })
  reason: string;

  @Column({
    type: "enum",
    enum: PauseRequestStatus,
    default: PauseRequestStatus.PENDING,
  })
  status: PauseRequestStatus;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "approverId" })
  approver: Users;

  @Column({ type: "varchar", length: 26, nullable: true })
  approverId: string;

  @Column({ type: "text", nullable: true })
  feedback: string;

  @Column({ type: "timestamptz", nullable: true })
  requestedAt: Date;

  @Column({ type: "timestamptz", nullable: true })
  approvedAt: Date;

  @Column({ type: "timestamptz", nullable: true })
  autoAcceptAt: Date;

  @Column({ type: "timestamptz", nullable: true })
  resumedAt: Date;

  @Column({ type: "text", nullable: true })
  resumeReason: string;

  @Column({ type: "enum", enum: CloseMode, nullable: true })
  closeMode: CloseMode;

  @Column({ type: "enum", enum: ClosedByType, nullable: true })
  closedByType: ClosedByType;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "closedById" })
  closedBy: Users;

  @Column({ type: "varchar", length: 26, nullable: true })
  closedById: string;

  @Column({ type: "timestamptz", nullable: true })
  closedAt: Date;

  @Column({ type: "text", nullable: true })
  closeReason: string;

  @Column({ type: "int", default: 0 })
  acceptedTaskCount: number;

  @Column({ type: "int", default: 0 })
  cancelledTaskCount: number;

  @Column({ type: "jsonb", nullable: true, default: () => "'[]'" })
  acceptedTaskIds: string[];
}
