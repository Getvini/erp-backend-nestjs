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

@Entity("ai_element_images")
export class AiElementImage {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id: number;

  @Column({ name: "element_id", type: "bigint" })
  elementId: number;

  @Column({ name: "asset_id", type: "bigint" })
  assetId: number;

  @Column({ name: "image_role", length: 20 })
  imageRole: string;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @ManyToOne(() => AiElement, (el) => el.images, { onDelete: "CASCADE" })
  @JoinColumn({ name: "element_id" })
  element: AiElement;

  @ManyToOne(() => AiAsset)
  @JoinColumn({ name: "asset_id" })
  asset: AiAsset;
}

export { AiElementImage as AiElementImages };
