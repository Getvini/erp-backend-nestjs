import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AiModel } from "@modules/ai-studio/entities/ai-model.entity";
import { AiProvider } from "@modules/ai-studio/entities/ai-provider.entity";
import { CreateAiModelDto, UpdateAiModelDto } from "../dto/ai-model.dto";

@Injectable()
export class AiModelService {
  constructor(
    @InjectRepository(AiModel)
    private readonly modelRepository: Repository<AiModel>,
    @InjectRepository(AiProvider)
    private readonly providerRepository: Repository<AiProvider>,
  ) {}

  async getAll(
    filters: {
      providerCode?: string;
      modelType?: string;
      isActive?: boolean;
      supportsMotionControl?: boolean;
      supportsElements?: boolean;
    } = {},
  ) {
    const qb = this.modelRepository
      .createQueryBuilder("model")
      .leftJoinAndSelect("model.provider", "provider");

    if (filters.providerCode) {
      qb.andWhere("provider.code = :providerCode", {
        providerCode: filters.providerCode,
      });
    }
    if (filters.modelType) {
      qb.andWhere("model.model_type = :modelType", {
        modelType: filters.modelType,
      });
    }
    if (filters.isActive !== undefined) {
      qb.andWhere("model.is_active = :isActive", {
        isActive: filters.isActive,
      });
    }
    if (filters.supportsMotionControl !== undefined) {
      qb.andWhere("model.supports_motion_control = :smc", {
        smc: filters.supportsMotionControl,
      });
    }
    if (filters.supportsElements !== undefined) {
      qb.andWhere("model.supports_elements = :se", {
        se: filters.supportsElements,
      });
    }

    return qb.orderBy("model.name", "ASC").getMany();
  }

  async getByProviderCode(providerCode: string) {
    return this.modelRepository
      .createQueryBuilder("model")
      .leftJoin("model.provider", "provider")
      .where("provider.code = :providerCode", { providerCode })
      .andWhere("model.is_active = :isActive", { isActive: true })
      .orderBy("model.name", "ASC")
      .getMany();
  }

  async getOne(id: string) {
    const model = await this.modelRepository.findOne({
      where: { id },
      relations: ["provider"],
    });
    if (!model) {
      throw new NotFoundException("Không tìm thấy model");
    }
    return model;
  }

  async create(data: CreateAiModelDto) {
    if (data.providerId) {
      const provider = await this.providerRepository.findOne({
        where: { id: data.providerId },
      });
      if (!provider) {
        throw new BadRequestException("Không tìm thấy provider tương ứng");
      }
    }

    const model = this.modelRepository.create(data);
    return this.modelRepository.save(model);
  }

  async update(id: string, data: UpdateAiModelDto) {
    const model = await this.getOne(id);

    if (data.providerId && data.providerId !== model.providerId) {
      const provider = await this.providerRepository.findOne({
        where: { id: data.providerId },
      });
      if (!provider) {
        throw new BadRequestException("Không tìm thấy provider tương ứng");
      }
    }

    Object.assign(model, data);
    return this.modelRepository.save(model);
  }

  async delete(id: string) {
    const model = await this.getOne(id);
    await this.modelRepository.remove(model);
    return { message: "Xóa model thành công" };
  }
}
