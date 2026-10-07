import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { AiModel } from "./ai-model.entity";
import { AiAsset } from "./ai-asset.entity";
import { Accounts } from "@modules/identity/auth/entities/account.entity";
import { Projects } from "@modules/project/project-core/entities/project.entity";

@Entity("video_generations")
export class VideoGeneration {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id: number;

  @Column({ name: "project_id", type: "varchar", length: 26, nullable: true })
  projectId?: string | null;

  @Column({
    name: "opportunity_id",
    type: "varchar",
    length: 26,
    nullable: true,
  })
  opportunityId?: string | null;

  @Column({ name: "task_id", type: "varchar", length: 26, nullable: true })
  taskId?: string | null;

  @Column({ name: "model_id", type: "varchar", length: 26 })
  modelId: string;

  @Column({ name: "user_id", type: "varchar", length: 26 })
  userId: string;

  @Column({ name: "image_begin_asset_id", type: "bigint", nullable: true })
  imageBeginAssetId?: number | null;

  @Column({ name: "image_end_asset_id", type: "bigint", nullable: true })
  imageEndAssetId?: number | null;

  @Column({ name: "output_asset_id", type: "bigint", nullable: true })
  outputAssetId?: number | null;

  @Column({ name: "thumbnail_asset_id", type: "bigint", nullable: true })
  thumbnailAssetId?: number | null;

  @Column({ name: "motion_prompt", type: "text" })
  motionPrompt: string;

  @Column({ name: "negative_prompt", type: "text", nullable: true })
  negativePrompt?: string | null;

  @Column({ length: 50, default: "pending" })
  status: string;

  @Column({ name: "external_task_id", length: 255, nullable: true })
  externalTaskId?: string | null;

  @Column({ name: "duration_seconds", type: "int", default: 5 })
  durationSeconds: number;

  @Column({ name: "generation_mode", length: 20, default: "std" })
  generationMode: string;

  @Column({ name: "generation_ratio", length: 20, nullable: true })
  generationRatio?: string | null;

  @Column({ type: "bigint", nullable: true })
  cost?: number | null;

  @Column({ name: "started_at", type: "timestamptz", nullable: true })
  startedAt?: Date | null;

  @Column({ name: "completed_at", type: "timestamptz", nullable: true })
  completedAt?: Date | null;

  @Column({ name: "request_payload", type: "jsonb", default: "{}" })
  requestPayload: object;

  @Column({ name: "response_payload", type: "jsonb", default: "{}" })
  responsePayload: object;

  @Column({ name: "error_message", type: "text", nullable: true })
  errorMessage?: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @ManyToOne(() => AiModel, { nullable: true })
  @JoinColumn({ name: "model_id" })
  model?: AiModel;

  @ManyToOne(() => Accounts, { nullable: true })
  @JoinColumn({ name: "user_id" })
  user?: Accounts;

  @ManyToOne(() => Projects, { nullable: true })
  @JoinColumn({ name: "project_id" })
  project?: Projects;

  @ManyToOne(() => AiAsset, { nullable: true })
  @JoinColumn({ name: "output_asset_id" })
  outputAsset?: AiAsset;
}

export { VideoGeneration as VideoGenerations };
