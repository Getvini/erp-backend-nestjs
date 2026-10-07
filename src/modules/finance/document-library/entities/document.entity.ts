import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Accounts } from "@modules/identity/auth/entities/account.entity";
import { DocumentVersions } from "./document-version.entity";

@Entity("documents")
export class Documents extends BaseEntity {
  @Column()
  displayName: string;

  @Column({ nullable: true })
  description: string;

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

  @Column({ default: 1 })
  currentVersion: number;

  @Column("simple-array", { nullable: true })
  tags: string[];

  @Column({ default: 0 })
  downloadCount: number;

  @Column({ type: "varchar", length: 26 })
  uploadedById: string;

  @ManyToOne(() => Accounts)
  @JoinColumn({ name: "uploadedById" })
  uploadedBy: Accounts;

  @OneToMany(() => DocumentVersions, (version) => version.document)
  versions: DocumentVersions[];
}
