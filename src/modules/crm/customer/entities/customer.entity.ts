import { Entity, Column, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../../core/database/base.entity";
import { CustomerSource } from "../enums/customer-source.enum";
import { ReferralPartners } from "../../service/entities/referral-partner.entity";
import { Users } from "../../../identity/user/entities/user.entity";

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
}
