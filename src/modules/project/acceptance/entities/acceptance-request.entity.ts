import {
  Entity,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { Project } from "@modules/project/project-core/entities/project.entity";
import { ContractServices } from "./contract-service.entity";
import { AcceptanceStatus } from "@modules/project/acceptance/enums/acceptance.enum";

@Entity("acceptance_requests")
export class AcceptanceRequests extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: "varchar", length: 26 })
  projectId: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: "projectId" })
  project: Project;

  @Column({ type: "varchar", length: 26, nullable: true })
  requesterId: string;

  @ManyToOne(() => Users)
  @JoinColumn({ name: "requesterId" })
  requester: Users;

  @Column({ type: "varchar", length: 26, nullable: true })
  approverId: string | null;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "approverId" })
  approver: Users | null;

  @Column({
    type: "enum",
    enum: AcceptanceStatus,
    default: AcceptanceStatus.PENDING,
  })
  status: AcceptanceStatus;

  @Column({ type: "text", nullable: true })
  note: string | null;

  @Column({ type: "text", nullable: true })
  feedback: string | null;

  @ManyToMany(() => ContractServices, (service) => service.acceptanceRequests)
  @JoinTable({
    name: "acceptance_request_services",
    joinColumn: { name: "acceptanceRequestId", referencedColumnName: "id" },
    inverseJoinColumn: {
      name: "contractServiceId",
      referencedColumnName: "id",
    },
  })
  services: ContractServices[];
}
