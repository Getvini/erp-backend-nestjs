import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike } from "typeorm";
import { AiProvider } from "@modules/ai-studio/entities/ai-provider.entity";

@Injectable()
export class AiProviderService {
  constructor(
    @InjectRepository(AiProvider)
    private readonly providerRepository: Repository<AiProvider>,
  ) {}

  async getAll(
    filters: { code?: string; name?: string; isActive?: boolean } = {},
  ) {
    const where: any = {};
    if (filters.code) where.code = ILike(`%${filters.code}%`);
    if (filters.name) where.name = ILike(`%${filters.name}%`);
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    return this.providerRepository.find({
      where: Object.keys(where).length ? where : undefined,
      relations: ["models"],
    });
  }

  async getOne(id: string) {
    const provider = await this.providerRepository.findOne({
      where: { id },
      relations: ["models"],
    });
    if (!provider) {
      throw new NotFoundException("Không tìm thấy provider");
    }
    return provider;
  }
}
