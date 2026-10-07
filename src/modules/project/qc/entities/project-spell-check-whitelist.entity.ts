import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../../core/database/base.entity";
import { Project } from "../../project-core/entities/project.entity";
import { Users } from "../../../identity/user/entities/user.entity";

@Entity("project_spell_check_whitelists")
@Index(["projectId", "word"], { unique: true })
export class ProjectSpellCheckWhitelists extends BaseEntity {
  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "projectId" })
  project: Project;

  @Column({ type: "varchar", length: 26 })
  projectId: string;

  @Column()
  word: string;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "addedById" })
  addedBy: Users;

  @Column({ type: "varchar", length: 26, nullable: true })
  addedById: string | null;
}
