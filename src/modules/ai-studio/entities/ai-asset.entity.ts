import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Accounts } from "@modules/identity/auth/entities/account.entity";
import { Projects } from "@modules/project/project-core/entities/project.entity";

@Entity("assets")
export class AiAsset {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id: number;

  @Column({ name: "user_id", type: "varchar", length: 26 })
  userId: string;

  @Column({ name: "project_id", type: "varchar", length: 26, nullable: true })
  projectId?: string | null;

  @Column({ name: "asset_type", length: 50 })
  assetType: string;

  @Column({ name: "asset_role", length: 50, nullable: true })
  assetRole?: string;

  @Column({ name: "source_type", length: 50, default: "generated" })
  sourceType: string;

  @Column({ name: "original_url", type: "text", nullable: true })
  originalUrl?: string;

  @Column({ name: "stored_url", type: "text" })
  storedUrl: string;

  @Column({ name: "thumbnail_url", type: "text", nullable: true })
  thumbnailUrl?: string;

  @Column({ name: "storage_provider", length: 50, nullable: true })
  storageProvider?: string;

  @Column({ name: "mime_type", length: 100, nullable: true })
  mimeType?: string;

  @Column({ name: "file_size_bytes", type: "bigint", nullable: true })
  fileSizeBytes?: number;

  @Column({ type: "int", nullable: true })
  width?: number;

  @Column({ type: "int", nullable: true })
  height?: number;

  @Column({ name: "duration_seconds", type: "int", nullable: true })
  durationSeconds?: number | null;

  @Column({ type: "int", nullable: true })
  fps?: number | null;

  @Column({ type: "jsonb", default: "{}" })
  metadata?: object;

  @Column({ name: "is_favorite", type: "boolean", default: false })
  isFavorite: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @ManyToOne(() => Accounts, { nullable: true })
  @JoinColumn({ name: "user_id" })
  user?: Accounts;

  @ManyToOne(() => Projects, { nullable: true })
  @JoinColumn({ name: "project_id" })
  project?: Projects;
}

export { AiAsset as Assets };
