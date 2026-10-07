import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Repository,
  ILike,
  Between,
  LessThanOrEqual,
  MoreThanOrEqual,
} from "typeorm";
import { Documents } from "../entities/document.entity";
import { DocumentVersions } from "../entities/document-version.entity";
import {
  QueryDocumentLibraryDto,
  UpdateDocumentDto,
} from "../dto/document-library.dto";

const CATEGORY_EXTENSIONS: Record<string, string[]> = {
  document: ["doc", "docx", "txt", "rtf"],
  spreadsheet: ["xlsx", "xls", "csv"],
  presentation: ["ppt", "pptx"],
  pdf: ["pdf"],
  image: ["png", "jpg", "jpeg", "gif", "webp", "svg"],
  video: ["mp4", "mov", "avi", "webm"],
  archive: ["zip", "rar", "7z"],
};

const resolveCategory = (extension?: string) => {
  const ext = (extension || "").toLowerCase();
  for (const [category, extensions] of Object.entries(CATEGORY_EXTENSIONS)) {
    if (extensions.includes(ext)) return category;
  }
  return "other";
};

const SORT_MAP: Record<string, any> = {
  newest: { createdAt: "DESC" },
  oldest: { createdAt: "ASC" },
  displayName: { displayName: "ASC" },
  mostDownloaded: { downloadCount: "DESC" },
};

@Injectable()
export class DocumentLibraryService {
  constructor(
    @InjectRepository(Documents)
    private readonly documentRepo: Repository<Documents>,
    @InjectRepository(DocumentVersions)
    private readonly versionRepo: Repository<DocumentVersions>,
  ) {}

  async findDocuments(query: QueryDocumentLibraryDto) {
    const where: any = {};
    if (query.search) where.displayName = ILike(`%${query.search}%`);
    if (query.uploadedById) where.uploadedById = query.uploadedById;

    if (query.fromDate && query.toDate) {
      where.createdAt = Between(
        new Date(query.fromDate),
        new Date(query.toDate),
      );
    } else if (query.fromDate) {
      where.createdAt = MoreThanOrEqual(new Date(query.fromDate));
    } else if (query.toDate) {
      where.createdAt = LessThanOrEqual(new Date(query.toDate));
    }

    let docs = await this.documentRepo.find({
      where,
      relations: ["uploadedBy"],
      order: SORT_MAP[query.sort || "newest"] || { createdAt: "DESC" },
    });

    if (query.category && query.category !== "all") {
      docs = docs.filter(
        (d) => resolveCategory(d.fileExtension) === query.category,
      );
    }
    if (query.tags) {
      const selected = query.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (selected.length > 0) {
        docs = docs.filter((d) => d.tags?.some((t) => selected.includes(t)));
      }
    }

    return docs.map((d) => ({
      ...d,
      category: resolveCategory(d.fileExtension),
    }));
  }

  async getAllTags() {
    const docs = await this.documentRepo.find({ select: ["tags"] });
    const tagSet = new Set<string>();
    for (const d of docs) {
      for (const t of d.tags || []) tagSet.add(t);
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }

  async getOne(id: string) {
    const doc = await this.documentRepo.findOne({
      where: { id },
      relations: ["uploadedBy"],
    });
    if (!doc) throw new NotFoundException("Không tìm thấy tài liệu");
    return doc;
  }

  async update(id: string, dto: UpdateDocumentDto) {
    const doc = await this.getOne(id);
    Object.assign(doc, dto);
    return this.documentRepo.save(doc);
  }

  async getVersions(id: string) {
    await this.getOne(id);
    return this.versionRepo.find({
      where: { documentId: id },
      relations: ["uploadedBy"],
      order: { versionNumber: "DESC" },
    });
  }

  async getDownloadUrl(id: string) {
    const doc = await this.getOne(id);
    doc.downloadCount = (doc.downloadCount || 0) + 1;
    await this.documentRepo.save(doc);
    return { downloadUrl: doc.fileUrl };
  }

  async getVersionDownloadUrl(id: string, versionId: string) {
    await this.getOne(id);
    const version = await this.versionRepo.findOne({
      where: { id: versionId, documentId: id },
    });
    if (!version) throw new NotFoundException("Không tìm thấy phiên bản");
    return { downloadUrl: version.fileUrl };
  }

  async delete(id: string) {
    const doc = await this.getOne(id);
    await this.versionRepo.delete({ documentId: id });
    await this.documentRepo.remove(doc);
    return { message: "Xóa tài liệu thành công" };
  }
}
