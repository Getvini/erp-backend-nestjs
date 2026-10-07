import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Accounts } from "@modules/identity/auth/entities/account.entity";
import { Documents } from "./document.entity";

@Entity("document_versions")
export class DocumentVersions extends BaseEntity {
  @Column({ type: "varchar", length: 26 })
  documentId: string;

  @ManyToOne(() => Documents, (document) => document.versions, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "documentId" })
  document: Documents;

  @Column()
  versionNumber: number;

  @Column()
  fileUrl: string;

  @Column({ nullable: true })
  publicId: string;

  @Column()
  originalFileName: string;

  @Column({ nullable: true })
  fileExtension: string;

  @Column({ nullable: true })
  mimeType: string;

  @Column({ type: "bigint", nullable: true })
  fileSizeBytes: number;

  @Column({ default: "raw" })
  resourceType: string;

  @Column({ type: "varchar", length: 26 })
  uploadedById: string;

  @ManyToOne(() => Accounts)
  @JoinColumn({ name: "uploadedById" })
  uploadedBy: Accounts;
}
