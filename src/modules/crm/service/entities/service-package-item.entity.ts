import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../../core/database/base.entity";
import { ServicePackages } from "./service-package.entity";
import { Services } from "./service.entity";

@Entity("service_package_items")
export class ServicePackageItems extends BaseEntity {
  @ManyToOne(() => ServicePackages, (pkg) => pkg.items)
  @JoinColumn({ name: "packageId" })
  package: ServicePackages;

  @Column({ type: "varchar", length: 26 })
  packageId: string;

  @ManyToOne(() => Services)
  @JoinColumn({ name: "serviceId" })
  service: Services;

  @Column({ type: "varchar", length: 26 })
  serviceId: string;

  @Column({ type: "int", default: 1 })
  defaultQuantity: number;
}
