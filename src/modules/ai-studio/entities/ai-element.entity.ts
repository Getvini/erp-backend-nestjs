import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { Accounts } from "@modules/identity/auth/entities/account.entity";
import { Projects } from "@modules/project/project-core/entities/project.entity";
import { AiProvider } from "./ai-provider.entity";
import { AiElementImage } from "./ai-element-image.entity";
import { AiElementVideo } from "./ai-element-video.entity";

@Entity("ai_elements")
export class AiElement {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id: number;

  @Column({ name: "user_id", type: "varchar", length: 26 })
  userId: string;

  @Column({ name: "project_id", type: "varchar", length: 26, nullable: true })
  projectId?: string | null;

  @Column({ name: "provider_id", type: "varchar", length: 26 })
  providerId: string;

  @Column({ name: "element_name", length: 20 })
  elementName: string;

  @Column({ name: "element_description", length: 100 })
  elementDescription: string;

  @Column({ name: "reference_type", length: 20 })
  referenceType: string;

  @Column({ name: "external_element_id", length: 255, nullable: true })
  externalElementId?: string | null;

  @Column({ length: 50, default: "pending" })
  status: string;

  @Column({ name: "element_voice_id", length: 255, nullable: true })
  elementVoiceId?: string | null;

  @Column({ name: "tag_list", type: "jsonb", default: "[]" })
  tagList: any[];

  @Column({ name: "request_payload", type: "jsonb", default: "{}" })
  requestPayload: object;

  @Column({ name: "response_payload", type: "jsonb", default: "{}" })
  responsePayload: object;

  @Column({ name: "error_message", type: "text", nullable: true })
  errorMessage?: string | null;

  @Column({ name: "is_favorite", type: "boolean", default: false })
  isFavorite: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @ManyToOne(() => Accounts, { nullable: true })
  @JoinColumn({ name: "user_id" })
  user?: Accounts;

  @ManyToOne(() => Projects, { nullable: true })
  @JoinColumn({ name: "project_id" })
  project?: Projects;

  @ManyToOne(() => AiProvider, { nullable: true })
  @JoinColumn({ name: "provider_id" })
  provider?: AiProvider;

  @OneToMany(() => AiElementImage, (img) => img.element)
  images: AiElementImage[];

  @OneToMany(() => AiElementVideo, (vid) => vid.element)
  videos: AiElementVideo[];
}

export { AiElement as AiElements };
