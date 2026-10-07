import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { ProjectSpellCheckWhitelists } from "../entities/project-spell-check-whitelist.entity";
import { Project } from "../../project-core/entities/project.entity";

type Actor = { id?: string; userId?: string; role?: string };

@Injectable()
export class SpellingWhitelistService {
  constructor(
    @InjectRepository(ProjectSpellCheckWhitelists)
    private readonly whitelistRepository: Repository<ProjectSpellCheckWhitelists>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  private async assertProjectAccess(projectId: string, _actor?: Actor) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException("Không tìm thấy dự án");
    }
    return project;
  }

  async getWords(projectId: string, actor?: Actor) {
    await this.assertProjectAccess(projectId, actor);
    return this.whitelistRepository.find({
      where: { projectId },
      relations: ["addedBy"],
      order: { createdAt: "DESC" },
    });
  }

  async addWord(projectId: string, word: string, actor?: Actor) {
    await this.assertProjectAccess(projectId, actor);
    const trimmed = word.trim();
    if (!trimmed) {
      throw new BadRequestException("Từ whitelist không được để trống");
    }

    const existing = await this.whitelistRepository.findOne({
      where: { projectId, word: trimmed },
    });
    if (existing) return existing;

    const entry = this.whitelistRepository.create({
      projectId,
      word: trimmed,
      addedById: actor?.userId || actor?.id || null,
    });
    return this.whitelistRepository.save(entry);
  }

  async addWords(projectId: string, words: string[], actor?: Actor) {
    const results = [];
    for (const word of words) {
      results.push(await this.addWord(projectId, word, actor));
    }
    return results;
  }

  async removeWordsByText(projectId: string, words: string[], actor?: Actor) {
    await this.assertProjectAccess(projectId, actor);
    const unique = Array.from(
      new Set(words.map((w) => w.trim()).filter(Boolean)),
    );
    if (unique.length === 0) return { deleted: 0 };
    const result = await this.whitelistRepository.delete({
      projectId,
      word: In(unique),
    });
    return { deleted: result.affected ?? 0 };
  }

  async removeWord(projectId: string, whitelistId: string, actor?: Actor) {
    await this.assertProjectAccess(projectId, actor);
    const entry = await this.whitelistRepository.findOne({
      where: { id: whitelistId, projectId },
    });
    if (!entry) {
      throw new NotFoundException("Không tìm thấy từ trong whitelist");
    }
    await this.whitelistRepository.remove(entry);
    return { deleted: whitelistId };
  }
}
