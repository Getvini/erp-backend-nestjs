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

@Entity("motion_generations")
export class MotionGeneration {
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

  @Column({ name: "character_image_asset_id", type: "bigint" })
  characterImageAssetId: number;

  @Column({ name: "motion_reference_asset_id", type: "bigint" })
  motionReferenceAssetId: number;

  @Column({ name: "character_orientation", length: 10, nullable: true })
  characterOrientation?: string | null;

  @Column({ name: "generation_mode", length: 20, default: "pro" })
  generationMode: string;

  @Column({ name: "motion_prompt", type: "text", nullable: true })
  motionPrompt?: string | null;

  @Column({ name: "negative_prompt", type: "text", nullable: true })
  negativePrompt?: string | null;

  @Column({ name: "duration_seconds", type: "int", nullable: true })
  durationSeconds?: number | null;

  @Column({ type: "int", nullable: true })
  fps?: number | null;

  @Column({ name: "generation_sound", type: "boolean", default: true })
  generationSound: boolean;

  @Column({ name: "output_asset_id", type: "bigint", nullable: true })
  outputAssetId?: number | null;

  @Column({ name: "thumbnail_asset_id", type: "bigint", nullable: true })
  thumbnailAssetId?: number | null;

  @Column({ length: 50, default: "pending" })
  status: string;

  @Column({ name: "external_task_id", length: 255, nullable: true })
  externalTaskId?: string | null;

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

export { MotionGeneration as MotionGenerations };
