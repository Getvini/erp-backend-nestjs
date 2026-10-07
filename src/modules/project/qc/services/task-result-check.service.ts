import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { TaskResultChecks } from "../entities/task-result-check.entity";
import { Tasks } from "../../task/entities/task.entity";
import { TaskResultCheckStatus } from "../enums/qc.enum";
import { SpellingWhitelistService } from "./spelling-whitelist.service";
import { canDecideTaskOutcome } from "../helpers/task-outcome-auth.helper";

type Actor = { id?: string; userId?: string; role?: string };

@Injectable()
export class TaskResultCheckService {
  constructor(
    @InjectRepository(TaskResultChecks)
    private readonly checkRepo: Repository<TaskResultChecks>,
    @InjectRepository(Tasks)
    private readonly taskRepo: Repository<Tasks>,
    private readonly whitelistService: SpellingWhitelistService,
    private readonly dataSource: DataSource,
  ) {}

  private getActorUserId(actor?: Actor) {
    return actor?.userId || actor?.id;
  }

  private assertCanReview(task: Tasks, actor?: Actor) {
    const actorUserId = this.getActorUserId(actor);
    const canReview = canDecideTaskOutcome(task as any, actorUserId);
    if (!canReview) {
      throw new ConflictException(
        "Bạn không có quyền thực hiện đánh giá kiểm tra cho công việc này",
      );
    }
  }

  async getForTask(taskId: string, actor?: Actor) {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ["project", "project.team"],
    });
    if (!task) throw new NotFoundException("Không tìm thấy công việc");

    const record = await this.checkRepo.findOne({ where: { taskId } });
    if (!record) return null;

    const canReview = canDecideTaskOutcome(
      task as any,
      this.getActorUserId(actor),
    );
    if (canReview) {
      return { ...record, canReview: true };
    }

    const base = {
      id: record.id,
      taskId: record.taskId,
      status: record.status,
      spellStatus: record.spellStatus,
      qcStatus: record.qcStatus,
      finalizedAt: record.finalizedAt,
      canReview: false,
    };

    if (!record.finalizedAt) {
      return { ...base, reviewedSpellErrors: [], reviewedQcMismatches: [] };
    }

    return {
      ...base,
      qcModels: record.qcModels,
      qcBatches: record.qcBatches,
      qcSkippedReason: record.qcSkippedReason,
      sheetNames: record.sheetNames,
      scenarioIds: record.scenarioIds,
      scanRegions: record.scanRegions,
      scannedScenarios: record.scannedScenarios,
      reviewedSpellErrors: (record.reviewedSpellErrors || []).filter(
        (i) => i.confirmed,
      ),
      reviewedQcMismatches: (record.reviewedQcMismatches || []).filter(
        (i) => i.confirmed,
      ),
    };
  }

  async toggleItem(
    taskId: string,
    kind: "SPELL" | "QC",
    itemId: string,
    confirmed: boolean,
    actor?: Actor,
  ) {
    return this.toggleItems(taskId, kind, [itemId], confirmed, actor);
  }

  async toggleItems(
    taskId: string,
    kind: "SPELL" | "QC",
    itemIds: string[],
    confirmed: boolean,
    actor?: Actor,
  ) {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ["project", "project.team"],
    });
    if (!task) throw new NotFoundException("Không tìm thấy công việc");
    this.assertCanReview(task, actor);

    let restoredTokens: string[] = [];

    const saved = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(TaskResultChecks);
      const record = await repo.findOne({ where: { taskId } });
      if (!record) {
        throw new NotFoundException("Không tìm thấy kết quả kiểm tra");
      }
      if (record.finalizedAt) {
        throw new ConflictException("Đã chốt kiểm tra, không thể chỉnh sửa");
      }

      const idSet = new Set(itemIds);
      if (kind === "SPELL") {
        record.reviewedSpellErrors = (record.reviewedSpellErrors || []).map(
          (item) => (idSet.has(item.id) ? { ...item, confirmed } : item),
        );

        if (confirmed) {
          const touchedTokens = new Set(
            record.reviewedSpellErrors
              .filter((item) => idSet.has(item.id))
              .map((item) => item.token)
              .filter(Boolean),
          );
          const stillDismissed = new Set(
            record.reviewedSpellErrors
              .filter(
                (item) => !item.confirmed && touchedTokens.has(item.token),
              )
              .map((item) => item.token),
          );
          restoredTokens = Array.from(touchedTokens).filter(
            (token) => !stillDismissed.has(token),
          );
        }
      } else {
        record.reviewedQcMismatches = (record.reviewedQcMismatches || []).map(
          (item) => (idSet.has(item.id) ? { ...item, confirmed } : item),
        );
      }

      return repo.save(record);
    });

    if (kind === "SPELL" && !confirmed && task.project?.id) {
      const dismissedTokens = (saved.reviewedSpellErrors || [])
        .filter((item) => itemIds.includes(item.id))
        .map((item) => item.token)
        .filter(Boolean);
      if (dismissedTokens.length > 0) {
        await this.whitelistService.addWords(
          task.project.id,
          dismissedTokens,
          actor,
        );
      }
    }

    if (
      kind === "SPELL" &&
      confirmed &&
      restoredTokens.length > 0 &&
      task.project?.id
    ) {
      await this.whitelistService.removeWordsByText(
        task.project.id,
        restoredTokens,
        actor,
      );
    }
    return saved;
  }

  async finalize(taskId: string, actor?: Actor) {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ["project", "project.team"],
    });
    if (!task) throw new NotFoundException("Không tìm thấy công việc");
    this.assertCanReview(task, actor);

    const record = await this.checkRepo.findOne({ where: { taskId } });
    if (!record) throw new NotFoundException("Không tìm thấy kết quả kiểm tra");
    if (
      record.spellStatus !== TaskResultCheckStatus.DONE ||
      record.qcStatus !== TaskResultCheckStatus.DONE
    ) {
      throw new ConflictException(
        "Chính tả và QC phải kiểm tra xong trước khi chốt",
      );
    }

    record.finalizedAt = new Date();
    return this.checkRepo.save(record);
  }

  async rerunCheck(
    taskId: string,
    kind: "SPELL" | "QC" | "BOTH",
    whitelist: string[],
    actor?: Actor,
  ) {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ["project", "project.team"],
    });
    if (!task) throw new NotFoundException("Không tìm thấy công việc");
    this.assertCanReview(task, actor);

    const record = await this.checkRepo.findOne({ where: { taskId } });
    if (!record) throw new NotFoundException("Không tìm thấy kết quả kiểm tra");
    if (record.finalizedAt) {
      throw new ConflictException("Đã chốt kiểm tra, không thể kiểm tra lại");
    }
    if (!record.filteredFileUrl) {
      throw new BadRequestException("Không có file để kiểm tra lại");
    }

    const update: any = {};
    if (kind === "SPELL" || kind === "BOTH") {
      update.spellStatus = TaskResultCheckStatus.RUNNING;
      update.spellErrorMessage = null;
      update.reviewerWhitelist = whitelist;
    }
    if (kind === "QC" || kind === "BOTH") {
      update.qcStatus = TaskResultCheckStatus.RUNNING;
      update.qcErrorMessage = null;
    }

    await this.checkRepo.update(record.id, update);
    return this.checkRepo.findOne({ where: { id: record.id } });
  }
}
