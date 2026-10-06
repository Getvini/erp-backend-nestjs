import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../../core/database/base.entity";
import { Services } from "../../service/entities/service.entity";
import { Opportunities } from "./opportunity.entity";
import { OpportunityPackages } from "./opportunity-package.entity";
import { OpportunityServiceJobs } from "./opportunity-service-job.entity";

@Entity("opportunity_services")
export class OpportunityServices extends BaseEntity {
  @ManyToOne(() => Services, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "serviceId" })
  service: Services | null;

  @Column({ type: "varchar", length: 26, nullable: true })
  serviceId: string | null;

  @ManyToOne(() => Opportunities, (opp) => opp.services, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "opportunityId" })
  opportunity: Opportunities;

  @Column({ type: "varchar", length: 26 })
  opportunityId: string;

  @ManyToOne(() => OpportunityPackages, (pkg) => pkg.services, {
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "opportunityPackageId" })
  opportunityPackage: OpportunityPackages | null;

  @Column({ type: "varchar", length: 26, nullable: true })
  opportunityPackageId: string | null;

  @Column({ type: "decimal", precision: 15, scale: 3, default: 0 })
  sellingPrice: number;

  @Column({ type: "decimal", precision: 15, scale: 3, default: 0 })
  costAtSale: number;

  @Column({ type: "int", default: 1 })
  quantity: number;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  packageName: string;

  @Column({ default: false })
  isPackageService: boolean;

  @OneToMany(() => OpportunityServiceJobs, (job) => job.opportunityService)
  jobs: OpportunityServiceJobs[];
}
