import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../../core/database/base.entity";
import { ProjectProductDescriptionSubmissions } from "./project-product-description.entity";

@Entity("project_product_description_items")
export class ProjectProductDescriptionItems extends BaseEntity {
  @ManyToOne(
    () => ProjectProductDescriptionSubmissions,
    (submission) => submission.items,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "submissionId" })
  submission: ProjectProductDescriptionSubmissions;

  @Column({ type: "varchar", length: 26 })
  submissionId: string;

  @Column()
  productName: string;

  @Column({ type: "varchar", nullable: true })
  fileUrl: string;

  @Column({ type: "varchar", nullable: true })
  fileName: string | null;

  @Column({ type: "text", nullable: true })
  extractedText: string | null;

  @Column({ type: "text", nullable: true })
  note: string;

  @Column({ type: "jsonb", nullable: true })
  documents: { url: string; name: string | null }[];
}
