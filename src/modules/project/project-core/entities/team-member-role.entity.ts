import { Column, Entity, ManyToOne, Unique } from "typeorm";
import { BaseEntity } from "../../../../core/database/base.entity";
import { MemberRole } from "../enums/member-role.enum";
import { TeamMember } from "./team-member.entity";

@Entity("team_member_roles")
@Unique(["member", "role"])
export class TeamMemberRole extends BaseEntity {
  @ManyToOne(() => TeamMember, (member) => member.roles, {
    onDelete: "CASCADE",
  })
  member: TeamMember;

  @Column({ type: "enum", enum: MemberRole })
  role: MemberRole;

  toJSON() {
    return this.role;
  }
}
