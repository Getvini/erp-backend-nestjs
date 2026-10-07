import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Opportunities } from "./opportunity.entity";
import { ServicePackages } from "@modules/crm/service/entities/service-package.entity";
import { OpportunityServices } from "./opportunity-service.entity";

@Entity("opportunity_packages")
export class OpportunityPackages extends BaseEntity {
  @ManyToOne(() => Opportunities, (opp) => opp.packages, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "opportunityId" })
  opportunity: Opportunities;

  @Column({ type: "varchar", length: 26 })
  opportunityId: string;

  @ManyToOne(() => ServicePackages, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "servicePackageId" })
  servicePackage: ServicePackages | null;

  @Column({ type: "varchar", length: 26, nullable: true })
  servicePackageId: string;

  @Column()
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "int", default: 1 })
  quantity: number;

  @OneToMany(() => OpportunityServices, (svc) => svc.opportunityPackage)
  services: OpportunityServices[];
}
