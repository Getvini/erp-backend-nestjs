import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { PerformerType } from "@modules/project/task/enums/task-status.enum";
import { WorkloadNormService, STAFF_ROLES } from "./workload-norm.service";

@Injectable()
export class TaskWorkloadService {
  constructor(
    @InjectRepository(Tasks)
    private readonly taskRepository: Repository<Tasks>,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    private readonly workloadNormService: WorkloadNormService,
  ) {}

  private formatDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private startOfDay(date: Date) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
  }

  private endOfDay(date: Date) {
    const value = new Date(date);
    value.setHours(23, 59, 59, 999);
    return value;
  }

  private parseDateOnly(value: string | undefined, fieldName: string) {
    if (!value) throw new BadRequestException(`Vui lòng cung cấp ${fieldName}`);
    const parsed = new Date(`${value}T00:00:00.000`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${fieldName} không hợp lệ`);
    }
    return parsed;
  }

  async getDailyWorkloadByAssignee(
    userId: string,
    startDate: string | undefined,
    endDate: string | undefined,
  ) {
    if (!userId)
      throw new BadRequestException("Vui lòng cung cấp người thực hiện");

    const start = this.startOfDay(
      this.parseDateOnly(startDate, "ngày bắt đầu"),
    );
    const end = this.endOfDay(this.parseDateOnly(endDate, "ngày kết thúc"));
    if (start > end) {
      throw new BadRequestException(
        "Ngày bắt đầu không được lớn hơn ngày kết thúc",
      );
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["accounts"],
    });
    const staffRole = user?.accounts?.find((account) =>
      STAFF_ROLES.includes(account.role as any),
    )?.role;
    const norm = await this.workloadNormService.getNormForRole(
      staffRole as any,
    );
    const monthlyNorm =
      norm?.monthlyNorm || WorkloadNormService.DEFAULT_MONTHLY_NORM;
    const dailyNorm = WorkloadNormService.getDailyNorm(monthlyNorm);

    const tasks = await this.taskRepository
      .createQueryBuilder("task")
      .leftJoinAndSelect("task.job", "job")
      .select([
        "task.id",
        "task.code",
        "task.name",
        "task.nickname",
        "task.status",
        "task.plannedStartDate",
        "task.plannedEndDate",
        "job.id",
        "job.vinicoin",
      ])
      .where("task.assigneeId = :userId", { userId })
      .andWhere("task.performerType = :performerType", {
        performerType: PerformerType.INTERNAL,
      })
      .andWhere("task.plannedStartDate IS NOT NULL")
      .andWhere("task.plannedEndDate IS NOT NULL")
      .andWhere("task.plannedStartDate <= :end", { end })
      .andWhere("task.plannedEndDate >= :start", { start })
      .andWhere("task.status IN (:...activeStatuses)", {
        activeStatuses: WorkloadNormService.ACTIVE_WORKLOAD_STATUSES,
      })
      .orderBy("task.plannedEndDate", "ASC")
      .getMany();

    const days: any[] = [];

    for (
      const cursor = this.startOfDay(start);
      cursor <= end;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      const dayStart = this.startOfDay(cursor);
      const dayEnd = this.endOfDay(cursor);
      const overlappingTasks = tasks.filter(
        (task) =>
          task.plannedStartDate <= dayEnd && task.plannedEndDate >= dayStart,
      );
      const taskItems = overlappingTasks.map((task) => {
        const vinicoin = Number(task.job?.vinicoin || 0);
        return {
          id: task.id,
          code: task.code,
          name: task.name,
          nickname: task.nickname,
          status: task.status,
          plannedStartDate: task.plannedStartDate,
          plannedEndDate: task.plannedEndDate,
          vinicoin,
          workloadRatio: dailyNorm > 0 ? vinicoin / dailyNorm : 0,
        };
      });
      const workloadValue = taskItems.reduce(
        (sum, task) => sum + task.vinicoin,
        0,
      );
      const workloadRatio = dailyNorm > 0 ? workloadValue / dailyNorm : 0;

      days.push({
        date: this.formatDateKey(dayStart),
        taskCount: overlappingTasks.length,
        workloadValue,
        dailyNorm,
        workloadRatio,
        workloadPercent: Math.round(workloadRatio * 100),
        tasks: taskItems,
      });
    }

    return {
      userId,
      startDate: this.formatDateKey(start),
      endDate: this.formatDateKey(end),
      role: staffRole || null,
      monthlyNorm,
      dailyNorm,
      days,
    };
  }
}
