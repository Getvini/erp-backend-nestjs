import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Project } from "@modules/project/project-core/entities/project.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { ProjectProductDescriptionItems } from "./project-product-description-item.entity";
import { ProjectProductDescriptionStatus } from "@modules/project/qc/enums/qc.enum";

@Entity("project_product_description_submissions")
export class ProjectProductDescriptionSubmissions extends BaseEntity {
  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "projectId" })
  project: Project;

  @Column({ type: "varchar", length: 26 })
  projectId: string;

  @Column({
    type: "enum",
    enum: ProjectProductDescriptionStatus,
    default: ProjectProductDescriptionStatus.DRAFT,
  })
  status: ProjectProductDescriptionStatus;

  @Column({ type: "int", nullable: true })
  versionNumber: number;

  @ManyToOne(() => Users)
  @JoinColumn({ name: "createdById" })
  createdBy: Users;

  @Column({ type: "varchar", length: 26 })
  createdById: string;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "reviewedById" })
  reviewedBy: Users;

  @Column({ type: "varchar", length: 26, nullable: true })
  reviewedById: string;

  @Column({ type: "timestamp", nullable: true })
  reviewedAt: Date;

  @Column({ type: "text", nullable: true })
  reviewNote: string;

  @OneToMany(() => ProjectProductDescriptionItems, (item) => item.submission, {
    cascade: true,
  })
  items: ProjectProductDescriptionItems[];
}
