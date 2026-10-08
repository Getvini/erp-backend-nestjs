import { Entity, Column, ManyToOne, OneToMany, DeleteDateColumn } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { CustomerSource } from "@modules/crm/customer/enums/customer-source.enum";
import { ReferralPartners } from "@modules/crm/service/entities/referral-partner.entity";
import { Users } from "@modules/identity/user/entities/user.entity";

import { Opportunities } from "@modules/crm/opportunity/entities/opportunity.entity";

@Entity("customers")
export class Customers extends BaseEntity {
  @Column()
  name: string;

  @Column()
  phone: string;

  @Column()
  email: string;

  @Column()
  address: string;

  @Column({ nullable: true })
  taxId: string;

  @Column({
    type: "enum",
    enum: CustomerSource,
    default: CustomerSource.INTERNAL,
  })
  source: CustomerSource;

  @ManyToOne(
    () => ReferralPartners,
    (referralPartner) => referralPartner.customers,
    { nullable: true, onDelete: "SET NULL" },
  )
  referralPartner: ReferralPartners | null;

  @ManyToOne(() => Users, { nullable: true, onDelete: "SET NULL" })
  createdBy: Users | null;

  @OneToMany(() => Opportunities, (opp) => opp.customer)
  opportunities: Opportunities[];

  @DeleteDateColumn()
  deletedAt: Date;
}
