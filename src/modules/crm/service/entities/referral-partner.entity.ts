import { Entity, Column, OneToMany, DeleteDateColumn } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { PartnerType } from "@modules/crm/service/enums/partner-type.enum";
import { Customers } from "@modules/crm/customer/entities/customer.entity";

import { Opportunities } from "@modules/crm/opportunity/entities/opportunity.entity";

@Entity("referral_partners")
export class ReferralPartners extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  taxId: string;

  @Column()
  phone: string;

  @Column()
  address: string;

  @Column()
  email: string;

  @Column({
    type: "enum",
    enum: PartnerType,
    default: PartnerType.BUSINESS,
  })
  type: PartnerType;

  @OneToMany(() => Customers, (customer) => customer.referralPartner)
  customers: Customers[];

  @OneToMany(() => Opportunities, (opp) => opp.referralPartner)
  opportunities: Opportunities[];

  @DeleteDateColumn()
  deletedAt: Date;
}
