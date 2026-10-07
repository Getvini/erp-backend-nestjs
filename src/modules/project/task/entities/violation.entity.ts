import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "@core/database/base.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { ViolationType } from "@modules/project/task/enums/task-status.enum";
import { Tasks } from "./task.entity";

@Entity("violations")
export class Violations extends BaseEntity {
  @ManyToOne(() => Tasks, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "taskId" })
  task: Tasks;

  @Column({ type: "varchar", length: 26 })
  taskId: string;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "userId" })
  user: Users;

  @Column({ type: "varchar", length: 26 })
  userId: string;

  @Column({
    type: "enum",
    enum: ViolationType,
  })
  type: ViolationType;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "int", nullable: true })
  iterationVersion: number;
}
