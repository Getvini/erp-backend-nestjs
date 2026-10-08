import { Entity, Column, OneToMany, DeleteDateColumn } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { ServicePackageItems } from "./service-package-item.entity";

@Entity("service_packages")
export class ServicePackages extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @OneToMany(() => ServicePackageItems, (item) => item.package, {
    cascade: true,
  })
  items: ServicePackageItems[];

  @Column({ type: "decimal", precision: 15, scale: 3, default: 0 })
  price: number;

  @DeleteDateColumn()
  deletedAt: Date;
}
