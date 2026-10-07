import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { TeamMember } from "./team-member.entity";
import { Project } from "./project.entity";

@Entity("project_teams")
export class ProjectTeam extends BaseEntity {
  @Column()
  name: string;

  @ManyToOne(() => Users)
  @JoinColumn({ name: "teamLeadId" })
  teamLead: Users;

  @Column({ type: "varchar", length: 26, nullable: true })
  teamLeadId: string;

  @OneToMany(() => TeamMember, (teamMember) => teamMember.team)
  members: TeamMember[];

  @OneToMany(() => Project, (project) => project.team)
  projects: Project[];
}
