import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  ManyToOne,
  Index,
} from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Contract } from "@modules/finance/entities/contract.entity";
import { ProjectTeam } from "./project-team.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import {
  ProjectStatus,
  GoogleSheetStatus,
} from "@modules/project/project-core/enums/project-status.enum";

@Entity("projects")
export class Project extends BaseEntity {
  @Column()
  name: string;

  @OneToOne(() => Contract, (contract) => contract.project)
  @JoinColumn({ name: "contractId" })
  contract: Contract;

  @Column({ type: "varchar", length: 26, nullable: true })
  contractId: string;

  @ManyToOne(() => ProjectTeam, (team) => team.projects)
  @JoinColumn({ name: "teamId" })
  team: ProjectTeam;

  @Column({ type: "varchar", length: 26, nullable: true })
  teamId: string;

  @Index()
  @Column({
    type: "enum",
    enum: ProjectStatus,
    default: ProjectStatus.PENDING_CONFIRMATION,
  })
  status: ProjectStatus;

  @Column({ type: "date", nullable: true })
  plannedStartDate: Date;

  @Column({ type: "date", nullable: true })
  plannedEndDate: Date;

  @Column({ type: "date", nullable: true })
  actualStartDate: Date;

  @Column({ type: "date", nullable: true })
  actualEndDate: Date;

  @ManyToOne(() => Users)
  @JoinColumn({ name: "createdById" })
  createdBy: Users;

  @Column({ type: "varchar", length: 26, nullable: true })
  createdById: string;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "confirmedById" })
  confirmedBy: Users;

  @Column({ type: "varchar", length: 26, nullable: true })
  confirmedById: string;

  @Column({ type: "timestamptz", nullable: true })
  confirmedAt: Date;

  @Column({ nullable: true })
  googleSheetId: string;

  @Column({ nullable: true })
  googleSheetUrl: string;

  @Column({
    type: "enum",
    enum: GoogleSheetStatus,
    default: GoogleSheetStatus.NOT_CREATED,
  })
  googleSheetStatus: GoogleSheetStatus;

  @Column({ type: "text", nullable: true })
  googleSheetError: string;

  @Column({ type: "timestamp", nullable: true })
  googleSheetCreatedAt: Date;

  @Column({ type: "timestamptz", nullable: true })
  pausedAt: Date;

  @Column({ type: "timestamptz", nullable: true })
  autoAcceptAt: Date;

  @Column({ type: "date", nullable: true })
  lastReminderDate: Date;

  @Column({ type: "varchar", length: 26, nullable: true })
  currentPauseRequestId: string;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "pausedById" })
  pausedBy: Users;

  @Column({ type: "varchar", length: 26, nullable: true })
  pausedById: string;

  @Index()
  @Column({ default: false })
  isOnHold: boolean;

  @Column({ type: "jsonb", nullable: true, default: () => "'[]'" })
  workingFiles: Array<{
    id: string;
    name: string;
    url: string;
    type: "LINK" | "FILE";
    size?: number;
    createdAt: string;
    createdById?: string;
    createdByName?: string;
  }>;
}
