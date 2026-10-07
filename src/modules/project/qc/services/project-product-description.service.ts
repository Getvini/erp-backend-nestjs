import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProjectProductDescriptionSubmissions } from "../entities/project-product-description.entity";
import { ProjectProductDescriptionItems } from "../entities/project-product-description-item.entity";
import { ProjectProductDescriptionStatus } from "../enums/qc.enum";

type Actor = { id?: string; userId?: string; role?: string };

@Injectable()
export class ProjectProductDescriptionService {
  constructor(
    @InjectRepository(ProjectProductDescriptionSubmissions)
    private readonly submissionRepo: Repository<ProjectProductDescriptionSubmissions>,
    @InjectRepository(ProjectProductDescriptionItems)
    private readonly itemRepo: Repository<ProjectProductDescriptionItems>,
  ) {}

  async getByProject(projectId: string, _actor?: Actor) {
    return this.submissionRepo.find({
      where: { projectId },
      relations: ["items", "createdBy", "reviewedBy"],
      order: { createdAt: "DESC" },
    });
  }

  async create(projectId: string, data: any, actor?: Actor) {
    const actorId = actor?.userId || actor?.id;
    const submission = this.submissionRepo.create({
      projectId,
      createdById: actorId,
      status: ProjectProductDescriptionStatus.DRAFT,
      items: (data.items || []).map((it: any) =>
        this.itemRepo.create({
          productName: it.productName,
          fileUrl: it.fileUrl,
          fileName: it.fileName,
          extractedText: it.extractedText,
          note: it.note,
          documents: it.documents || [],
        }),
      ),
    });
    return this.submissionRepo.save(submission);
  }

  async update(projectId: string, id: string, data: any, _actor?: Actor) {
    const submission = await this.submissionRepo.findOne({
      where: { id, projectId },
      relations: ["items"],
    });
    if (!submission) {
      throw new NotFoundException("Không tìm thấy bản mô tả sản phẩm");
    }

    if (data.items) {
      await this.itemRepo.delete({ submissionId: id });
      submission.items = data.items.map((it: any) =>
        this.itemRepo.create({
          submissionId: id,
          productName: it.productName,
          fileUrl: it.fileUrl,
          fileName: it.fileName,
          extractedText: it.extractedText,
          note: it.note,
          documents: it.documents || [],
        }),
      );
    }
    return this.submissionRepo.save(submission);
  }

  async submit(projectId: string, id: string, _actor?: Actor) {
    const submission = await this.submissionRepo.findOne({
      where: { id, projectId },
    });
    if (!submission) {
      throw new NotFoundException("Không tìm thấy bản mô tả sản phẩm");
    }
    submission.status = ProjectProductDescriptionStatus.PENDING_REVIEW;
    return this.submissionRepo.save(submission);
  }

  async approve(projectId: string, id: string, actor?: Actor) {
    const submission = await this.submissionRepo.findOne({
      where: { id, projectId },
    });
    if (!submission) {
      throw new NotFoundException("Không tìm thấy bản mô tả sản phẩm");
    }
    submission.status = ProjectProductDescriptionStatus.APPROVED;
    submission.reviewedById = actor?.userId || actor?.id;
    submission.reviewedAt = new Date();
    return this.submissionRepo.save(submission);
  }

  async reject(projectId: string, id: string, note: string, actor?: Actor) {
    const submission = await this.submissionRepo.findOne({
      where: { id, projectId },
    });
    if (!submission) {
      throw new NotFoundException("Không tìm thấy bản mô tả sản phẩm");
    }
    if (!note) {
      throw new BadRequestException("Vui lòng cung cấp lý do từ chối");
    }
    submission.status = ProjectProductDescriptionStatus.REJECTED;
    submission.reviewNote = note;
    submission.reviewedById = actor?.userId || actor?.id;
    submission.reviewedAt = new Date();
    return this.submissionRepo.save(submission);
  }
}
