import {
  Entity,
  Column,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { BaseEntity } from "../../../../core/database/base.entity";
import { Users } from "../../user/entities/user.entity";
import { UserRole } from "../../user/enums/user-role.enum";
import { RefreshSessions } from "./refresh-session.entity";

@Entity("accounts")
@Index(["username"], { unique: true })
@Index(["email"], { unique: true })
export class Accounts extends BaseEntity {
  @Column()
  username: string;

  @Column({ select: false }) // 🛡️ Bảo mật: không tự động select password trừ khi gọi rõ ràng
  password: string;

  @Column({ nullable: true })
  email: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.EDITOR_D,
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  vinicoin: number;

  @Column({ default: 0 })
  vinicoinTotal: number;

  @Column({ default: 0 })
  vinicoinWithdrawn: number;

  @ManyToOne(() => Users, (user) => user.accounts, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: Users;

  @Column({ type: "varchar", length: 26, nullable: true })
  userId: string;

  @OneToMany(() => RefreshSessions, (session) => session.account)
  refreshSessions: RefreshSessions[];
}
