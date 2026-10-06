import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ServicePackages } from "../entities/service-package.entity";
import { ServicePackageItems } from "../entities/service-package-item.entity";
import {
  CreateServicePackageDto,
  UpdateServicePackageDto,
} from "../dto/service-package.dto";

@Injectable()
export class ServicePackageService {
  constructor(
    @InjectRepository(ServicePackages)
    private readonly packageRepository: Repository<ServicePackages>,
    @InjectRepository(ServicePackageItems)
    private readonly itemRepository: Repository<ServicePackageItems>,
  ) {}

  async getAll(): Promise<ServicePackages[]> {
    return await this.packageRepository.find({
      where: { isActive: true },
      relations: ["items", "items.service"],
      order: { createdAt: "DESC" },
    });
  }

  async getOne(id: string): Promise<ServicePackages> {
    const pkg = await this.packageRepository.findOne({
      where: { id },
      relations: ["items", "items.service"],
    });
    if (!pkg) throw new NotFoundException("Không tìm thấy gói dịch vụ");
    return pkg;
  }

  async create(dto: CreateServicePackageDto): Promise<ServicePackages> {
    const pkg = this.packageRepository.create({
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      price: dto.price || 0,
    });
    const saved = await this.packageRepository.save(pkg);

    if (dto.items && Array.isArray(dto.items)) {
      for (const it of dto.items) {
        const item = this.itemRepository.create({
          packageId: saved.id,
          serviceId: it.serviceId,
          defaultQuantity: it.defaultQuantity || 1,
        });
        await this.itemRepository.save(item);
      }
    }

    return await this.getOne(saved.id);
  }

  async update(
    id: string,
    dto: UpdateServicePackageDto,
  ): Promise<ServicePackages> {
    const pkg = await this.getOne(id);
    Object.assign(pkg, {
      name: dto.name ?? pkg.name,
      description: dto.description ?? pkg.description,
      isActive: dto.isActive ?? pkg.isActive,
      price: dto.price ?? pkg.price,
    });
    await this.packageRepository.save(pkg);

    if (dto.items && Array.isArray(dto.items)) {
      await this.itemRepository.delete({ packageId: id });
      for (const it of dto.items) {
        const item = this.itemRepository.create({
          packageId: id,
          serviceId: it.serviceId,
          defaultQuantity: it.defaultQuantity || 1,
        });
        await this.itemRepository.save(item);
      }
    }

    return await this.getOne(id);
  }

  async delete(id: string): Promise<{ message: string }> {
    const pkg = await this.getOne(id);
    await this.packageRepository.softRemove(pkg);
    return { message: "Xóa gói dịch vụ thành công" };
  }
}
