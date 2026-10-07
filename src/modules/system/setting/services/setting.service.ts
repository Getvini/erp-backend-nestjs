import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SystemSettings } from "@modules/system/setting/entities/system-setting.entity";
import {
  QC_DEFAULT_CONFIG,
  QC_MODEL_OPTIONS,
  QC_PROVIDER_OPTIONS,
  QC_REASONING_OPTIONS,
  QC_SETTING_KEY,
  QcConfig,
  isValidQcConfig,
} from "@modules/system/setting/constants/qc.constant";
import { WorkloadNormService } from "@modules/project/task/services/workload-norm.service";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";

type Actor = { id?: string; userId?: string; role?: string };

@Injectable()
export class SettingService {
  constructor(
    @InjectRepository(SystemSettings)
    private readonly repository: Repository<SystemSettings>,
    private readonly workloadNormService: WorkloadNormService,
  ) {}

  getQcOptions() {
    return {
      providers: QC_PROVIDER_OPTIONS,
      models: QC_MODEL_OPTIONS,
      reasoningEfforts: QC_REASONING_OPTIONS,
      defaults: QC_DEFAULT_CONFIG,
    };
  }

  async getQcConfig(): Promise<
    QcConfig & { isCustomized: boolean; updatedAt: Date | null }
  > {
    const row = await this.repository.findOne({
      where: { key: QC_SETTING_KEY },
    });
    const stored = row?.value as Partial<QcConfig> | undefined;

    if (row && isValidQcConfig(stored)) {
      return {
        provider: stored.provider,
        verifyModel: stored.verifyModel,
        reasoningEffort:
          stored.reasoningEffort || QC_DEFAULT_CONFIG.reasoningEffort,
        maxBatch: stored.maxBatch,
        maxContext: stored.maxContext,
        isCustomized: true,
        updatedAt: row.updatedAt,
      };
    }

    return { ...QC_DEFAULT_CONFIG, isCustomized: false, updatedAt: null };
  }

  async updateQcConfig(input: Partial<QcConfig>, actor?: Actor) {
    if (!QC_PROVIDER_OPTIONS.some((p) => p.value === input?.provider)) {
      throw new BadRequestException("Nhà cung cấp QC không hợp lệ");
    }

    const normalized: Partial<QcConfig> = {
      provider: input.provider,
      verifyModel: input.verifyModel,
      reasoningEffort:
        input.reasoningEffort || QC_DEFAULT_CONFIG.reasoningEffort,
      maxBatch: Number(input.maxBatch),
      maxContext: Number(input.maxContext),
    };

    if (!isValidQcConfig(normalized)) {
      throw new BadRequestException(
        "Cấu hình QC không hợp lệ, vui lòng kiểm tra lại model và các thông số batch/context",
      );
    }

    await this.repository.save({
      key: QC_SETTING_KEY,
      value: normalized,
      updatedById: actor?.userId || actor?.id || null,
    });

    return this.getQcConfig();
  }

  getWorkloadNorms() {
    return this.workloadNormService.getNorms();
  }

  updateWorkloadNorms(
    input: { role: UserRole; monthlyNorm: number }[],
    actor?: Actor,
  ) {
    return this.workloadNormService.updateNorms(input, actor);
  }
}
