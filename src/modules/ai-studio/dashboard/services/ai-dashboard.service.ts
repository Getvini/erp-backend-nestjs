import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Accounts } from "@modules/identity/auth/entities/account.entity";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";
import { Projects } from "@modules/project/project-core/entities/project.entity";
import { Opportunities } from "@modules/crm/opportunity/entities/opportunity.entity";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { VideoGeneration } from "@modules/ai-studio/entities/video-generation.entity";
import { MotionGeneration } from "@modules/ai-studio/entities/motion-generation.entity";
import {
  getAiAggregate,
  getAiDaily,
} from "../helpers/ai-dashboard-query.helper";
import {
  DashboardActor,
  resolveAccountIds,
  getAvailableMembers,
  getAvailableProjects,
  getAvailableOpportunities,
  getAvailableTasks,
} from "../helpers/ai-dashboard-filter.helper";

const MEMBER_VIEW_ROLES = new Set<string>([
  UserRole.BOD,
  UserRole.ADMIN,
  UserRole.PM,
  UserRole.ADMIN_SALE,
]);

@Injectable()
export class AiDashboardService {
  constructor(
    @InjectRepository(Accounts)
    private readonly accountRepo: Repository<Accounts>,
    @InjectRepository(Projects)
    private readonly projectRepo: Repository<Projects>,
    @InjectRepository(Opportunities)
    private readonly oppRepo: Repository<Opportunities>,
    @InjectRepository(Tasks)
    private readonly taskRepo: Repository<Tasks>,
    @InjectRepository(VideoGeneration)
    private readonly videoRepo: Repository<VideoGeneration>,
    @InjectRepository(MotionGeneration)
    private readonly motionRepo: Repository<MotionGeneration>,
  ) {}

  async getDashboard(
    actor: DashboardActor,
    requestedUserId?: string,
    projectId?: string,
    opportunityId?: string,
    taskId?: string,
    month = new Date().getMonth() + 1,
    year = new Date().getFullYear(),
  ) {
    this.validatePeriod(month, year);
    if (projectId && opportunityId) {
      throw new BadRequestException(
        "Chỉ được chọn dự án hoặc cơ hội tại một thời điểm",
      );
    }

    const canViewMembers = MEMBER_VIEW_ROLES.has(actor.role);
    const targetUserId = canViewMembers ? requestedUserId : actor.userId;

    if (
      !canViewMembers &&
      requestedUserId &&
      requestedUserId !== actor.userId
    ) {
      throw new ForbiddenException(
        "Bạn không có quyền xem thống kê AI của thành viên khác",
      );
    }

    const targetAccountIds = await resolveAccountIds(
      this.accountRepo,
      targetUserId,
      actor,
    );
    const availableMembers = canViewMembers
      ? await getAvailableMembers(this.accountRepo)
      : [];
    const availableProjects = await getAvailableProjects(
      this.projectRepo,
      targetUserId,
    );
    const availableOpportunities = await getAvailableOpportunities(
      this.oppRepo,
      targetUserId,
    );

    if (
      projectId &&
      !availableProjects.some((project) => project.id === projectId)
    ) {
      throw new ForbiddenException(
        "Dự án không thuộc phạm vi thống kê AI được phép xem",
      );
    }

    if (
      opportunityId &&
      !availableOpportunities.some((opp) => opp.id === opportunityId)
    ) {
      throw new ForbiddenException(
        "Cơ hội không thuộc phạm vi thống kê AI được phép xem",
      );
    }

    const availableTasks =
      projectId || opportunityId
        ? await getAvailableTasks(this.taskRepo, projectId, opportunityId)
        : [];

    if (
      taskId &&
      (!(projectId || opportunityId) ||
        !availableTasks.some((task) => task.id === taskId))
    ) {
      throw new ForbiddenException(
        "Công việc không thuộc dự án hoặc cơ hội đã chọn",
      );
    }

    const [videoStats, motionStats, videoDaily, motionDaily] =
      await Promise.all([
        getAiAggregate(
          this.videoRepo,
          targetAccountIds,
          projectId,
          opportunityId,
          taskId,
        ),
        getAiAggregate(
          this.motionRepo,
          targetAccountIds,
          projectId,
          opportunityId,
          taskId,
        ),
        getAiDaily(
          this.videoRepo,
          targetAccountIds,
          projectId,
          opportunityId,
          taskId,
          month,
          year,
        ),
        getAiDaily(
          this.motionRepo,
          targetAccountIds,
          projectId,
          opportunityId,
          taskId,
          month,
          year,
        ),
      ]);

    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyMap = new Map<
      number,
      { prompt: number; videos: number; total: number }
    >();

    for (const row of [...videoDaily, ...motionDaily]) {
      const day = Number(row.day);
      const current = dailyMap.get(day) || { prompt: 0, videos: 0, total: 0 };
      current.prompt += Number(row.prompts || 0);
      current.videos += Number(row.videos || 0);
      current.total += Number(row.cost || 0);
      dailyMap.set(day, current);
    }

    const generations = Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const item = dailyMap.get(day);
      return {
        day,
        prompt: item?.prompt || 0,
        images: 0,
        videos: item?.videos || 0,
      };
    });

    const spending = generations.map(({ day }) => ({
      day,
      total: dailyMap.get(day)?.total || 0,
    }));

    return {
      stats: {
        totalPrompts:
          Number(videoStats.totalPrompts || 0) +
          Number(motionStats.totalPrompts || 0),
        totalImages: 0,
        totalVideos:
          Number(videoStats.totalVideos || 0) +
          Number(motionStats.totalVideos || 0),
        totalCost:
          Number(videoStats.totalCost || 0) +
          Number(motionStats.totalCost || 0),
      },
      generations,
      spending,
      filters: {
        canViewMembers,
        availableMembers,
        availableProjects,
        availableOpportunities,
        availableTasks,
        selectedUserId: targetUserId || null,
        selectedProjectId: projectId || null,
        selectedOpportunityId: opportunityId || null,
        selectedTaskId: taskId || null,
        month,
        year,
      },
    };
  }

  private validatePeriod(month: number, year: number) {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException("Tháng thống kê không hợp lệ");
    }
    if (!Number.isInteger(year) || year < 2020 || year > 2100) {
      throw new BadRequestException("Năm thống kê không hợp lệ");
    }
  }
}
