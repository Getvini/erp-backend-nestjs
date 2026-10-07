import { Entity, ManyToOne, Column, OneToMany } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { ProjectTeam } from "./project-team.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { TeamMemberRole } from "./team-member-role.entity";
import { MemberRole } from "@modules/project/project-core/enums/member-role.enum";

@Entity("team_members")
export class TeamMember extends BaseEntity {
  @ManyToOne(() => ProjectTeam, (team) => team.members, {
    onDelete: "CASCADE",
  })
  team: ProjectTeam;

  @ManyToOne(() => Users, { onDelete: "CASCADE" })
  user: Users;

  @OneToMany(() => TeamMemberRole, (memberRole) => memberRole.member, {
    cascade: true,
    eager: true,
  })
  roles: TeamMemberRole[];

  @Column({
    name: "role",
    type: "enum",
    enum: MemberRole,
    nullable: true,
    select: false,
  })
  legacyRole?: MemberRole | null;
}

export const getMemberRoles = (
  member?: Pick<TeamMember, "roles"> | null,
): MemberRole[] =>
  (member?.roles || []).map((item) =>
    typeof item === "string" ? item : item.role,
  );

export const memberHasRole = (
  member: Pick<TeamMember, "roles"> | null | undefined,
  role: MemberRole,
) => getMemberRoles(member).includes(role);
