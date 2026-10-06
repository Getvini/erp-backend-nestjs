import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Vendors } from "../entities/vendor.entity";
import { VendorJobs } from "../entities/vendor-job.entity";
import { CreateVendorDto, UpdateVendorDto } from "../dto/vendor.dto";

@Injectable()
export class VendorService {
  constructor(
    @InjectRepository(Vendors)
    private readonly vendorRepository: Repository<Vendors>,
    @InjectRepository(VendorJobs)
    private readonly vendorJobRepository: Repository<VendorJobs>,
  ) {}

  async getAll(): Promise<Vendors[]> {
    return await this.vendorRepository.find({
      relations: ["vendorJobs", "vendorJobs.job"],
      order: { createdAt: "DESC" },
    });
  }

  async getOne(id: string): Promise<Vendors> {
    const vendor = await this.vendorRepository.findOne({
      where: { id },
      relations: ["vendorJobs", "vendorJobs.job"],
    });
    if (!vendor) throw new NotFoundException("Không tìm thấy nhà cung cấp");
    return vendor;
  }

  async getByJob(jobId: string): Promise<Vendors[]> {
    const vendorJobs = await this.vendorJobRepository.find({
      where: { jobId },
      relations: ["vendor"],
    });
    return vendorJobs.map((vj) => vj.vendor).filter(Boolean);
  }

  async create(dto: CreateVendorDto): Promise<Vendors> {
    const vendor = this.vendorRepository.create(dto);
    return await this.vendorRepository.save(vendor);
  }

  async update(id: string, dto: UpdateVendorDto): Promise<Vendors> {
    const vendor = await this.getOne(id);
    Object.assign(vendor, dto);
    return await this.vendorRepository.save(vendor);
  }

  async delete(id: string): Promise<{ message: string }> {
    const vendor = await this.getOne(id);
    await this.vendorRepository.softRemove(vendor);
    return { message: "Xóa nhà cung cấp thành công" };
  }

  async addJob(
    vendorId: string,
    jobId: string,
    costPrice = 0,
  ): Promise<VendorJobs> {
    let vj = await this.vendorJobRepository.findOne({
      where: { vendorId, jobId },
    });
    if (vj) {
      vj.costPrice = costPrice;
    } else {
      vj = this.vendorJobRepository.create({ vendorId, jobId, costPrice });
    }
    return await this.vendorJobRepository.save(vj);
  }

  async removeJob(
    vendorId: string,
    jobId: string,
  ): Promise<{ message: string }> {
    await this.vendorJobRepository.delete({ vendorId, jobId });
    return { message: "Xóa công việc của nhà cung cấp thành công" };
  }
}
