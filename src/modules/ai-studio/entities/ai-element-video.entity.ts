import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { AiElement } from "./ai-element.entity";
import { AiAsset } from "./ai-asset.entity";

@Entity("ai_element_videos")
export class AiElementVideo {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id: number;

  @Column({ name: "element_id", type: "bigint" })
  elementId: number;

  @Column({ name: "asset_id", type: "bigint" })
  assetId: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @ManyToOne(() => AiElement, (el) => el.videos, { onDelete: "CASCADE" })
  @JoinColumn({ name: "element_id" })
  element: AiElement;

  @ManyToOne(() => AiAsset)
  @JoinColumn({ name: "asset_id" })
  asset: AiAsset;
}

export { AiElementVideo as AiElementVideos };
