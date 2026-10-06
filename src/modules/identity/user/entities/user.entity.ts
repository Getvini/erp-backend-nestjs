import { Entity, Column, OneToMany } from "typeorm";
import { BaseEntity } from "../../../../core/database/base.entity";
import { Accounts } from "../../auth/entities/account.entity";

@Entity("users")
export class Users extends BaseEntity {
  @Column()
  fullName: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ type: "date", nullable: true })
  birthday: string | null;

  @Column({ default: false })
  isLocked: boolean;

  @OneToMany(() => Accounts, (account) => account.user)
  accounts: Accounts[];

  @Column({ type: "simple-json", nullable: true })
  laborContract: any[];
}
