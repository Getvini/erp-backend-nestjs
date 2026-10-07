import { Entity, Column, ManyToOne, ManyToMany, JoinColumn } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Services } from "@modules/crm/service/entities/service.entity";
import { Jobs } from "@modules/crm/service/entities/job.entity";
import { Contract } from "@modules/finance/entities/contract.entity";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { AcceptanceRequests } from "./acceptance-request.entity";
import { ContractServiceStatus } from "@modules/project/acceptance/enums/acceptance.enum";

export type ServiceResult = {
  taskId: string;
  type: string;
  name: string;
  url?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  feedback?: string;
  note?: string;
  checklist?: {
    criteriaId?: string;
    label: string;
    description?: string;
    checked: boolean;
  }[];
  version?: number;
  acceptanceRequestId?: string;
  submittedAt?: string;
};

@Entity("contract_services")
export class ContractServices extends BaseEntity {
  @Column({ type: "varchar", length: 26, nullable: true })
  serviceId: string;

  @ManyToOne(() => Services, { nullable: true })
  @JoinColumn({ name: "serviceId" })
  service: Services;

  @Column({ type: "varchar", length: 26, nullable: true })
  jobId: string;

  @ManyToOne(() => Jobs, { nullable: true })
  @JoinColumn({ name: "jobId" })
  job: Jobs;

  @Column({ type: "varchar", length: 26, nullable: true })
  contractId: string;

  @ManyToOne(() => Contract, { nullable: true })
  @JoinColumn({ name: "contractId" })
  contract: Contract;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  sellingPrice: number;

  @Column({ type: "varchar", length: 26, nullable: true })
  opportunityServiceId: string;

  @Column({ type: "varchar", length: 26, nullable: true })
  outputTaskId: string;

  @Column({ type: "varchar", length: 26, nullable: true })
  addendumId: string;

  @ManyToOne("ContractAddendum", "services", { nullable: true })
  @JoinColumn({ name: "addendumId" })
  addendum: any;

  @Column({
    type: "enum",
    enum: ContractServiceStatus,
    default: ContractServiceStatus.ACTIVE,
  })
  status: ContractServiceStatus;

  @ManyToMany(() => AcceptanceRequests, (acceptance) => acceptance.services)
  acceptanceRequests: AcceptanceRequests[];

  @Column({ type: "jsonb", nullable: true, default: [] })
  results: ServiceResult[];

  @Column({ nullable: true })
  name: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  nickname: string | null;

  @Column({ nullable: true })
  code: string;

  @Column({ nullable: true })
  packageName: string;

  @Column({ default: false })
  isPackageService: boolean;

  @Column({ type: "text", nullable: true })
  feedback: string;

  tasks?: Tasks[];
}
