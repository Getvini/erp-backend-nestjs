import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { Services } from "@modules/crm/service/entities/service.entity";
import { TaskStatus, PricingStatus } from "@modules/project/task/enums/task-status.enum";
import { assertTaskProjectNotOnHold } from "@modules/project/task/helpers/task-security.helper";

@Injectable()
export class TaskDeletionService {
  constructor(
    @InjectRepository(Tasks)
    private readonly taskRepository: Repository<Tasks>,
    @InjectRepository(Services)
    private readonly serviceRepository: Repository<Services>,
    private readonly dataSource: DataSource,
  ) {}

  async assessExtraTask(
    id: string,
    data: {
      isBillable: boolean;
      isRejected?: boolean;
      sellingPrice?: number;
      serviceId?: string;
    },
  ) {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ["project", "job"],
    });
    if (!task) throw new NotFoundException("Không tìm thấy công việc");
    assertTaskProjectNotOnHold(task);

    if (data.isRejected) {
      task.status = data.isBillable
        ? TaskStatus.REJECTED_BILLABLE
        : TaskStatus.REJECTED_SUPPORT;
      return this.taskRepository.save(task);
    }

    task.pricingStatus = data.isBillable
      ? PricingStatus.BILLABLE
      : PricingStatus.NON_BILLABLE;
    task.cost = Number(task.job?.costPrice || 0);

    if (data.isBillable) {
      task.sellingPrice = Number(data.sellingPrice || 0);
      if (data.serviceId) {
        const service = await this.serviceRepository.findOneBy({
          id: data.serviceId,
        });
        if (service) task.mappedService = service;
      }
    } else {
      task.sellingPrice = 0;
    }

    task.status = task.assigneeId ? TaskStatus.NOT_STARTED : TaskStatus.PENDING;
    return this.taskRepository.save(task);
  }

  async delete(id: string) {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ["subtasks", "project"],
    });
    if (!task) throw new NotFoundException("Không tìm thấy công việc");
    assertTaskProjectNotOnHold(task);
    if (task.subtasks?.length) {
      throw new ConflictException("Không thể xóa task gốc khi vẫn còn subtask");
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Tasks).remove(task);
      if (task.parentTaskId) {
        const remaining = await manager
          .getRepository(Tasks)
          .count({ where: { parentTaskId: task.parentTaskId } });
        if (remaining === 0) {
          await manager
            .getRepository(Tasks)
            .update({ id: task.parentTaskId }, { subtaskPlanStatus: null });
        }
      }
      return { message: "Xóa công việc thành công" };
    });
  }
}
