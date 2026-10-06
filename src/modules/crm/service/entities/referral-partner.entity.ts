import { Entity, Column, OneToMany } from "typeorm";
import { BaseEntity } from "../../../../core/database/base.entity";
import { PartnerType } from "../enums/partner-type.enum";
import { Customers } from "../../customer/entities/customer.entity";

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
}
