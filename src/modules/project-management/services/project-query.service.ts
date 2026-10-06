import { Injectable } from "@nestjs/common";
import { QueryProjectDto } from "../dto/project.dto";

@Injectable()
export class ProjectQueryService {
  async getAllProjects(query: QueryProjectDto, _user: any) {
    return {
      items: [
        {
          id: "proj-demo-1",
          name: "Triển khai Hệ thống ERP Vini",
          code: "PRJ-2026-001",
          status: "IN_PROGRESS",
          plannedStartDate: "2026-01-01",
          plannedEndDate: "2026-12-31",
          team: {
            id: "team-1",
            name: "Core ERP Team",
          },
          createdAt: new Date(),
        },
      ],
      total: 1,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10,
    };
  }

  async getProjectById(id: string, _user: any) {
    return {
      id,
      name: "Triển khai Hệ thống ERP Vini",
      code: "PRJ-2026-001",
      status: "IN_PROGRESS",
      plannedStartDate: "2026-01-01",
      plannedEndDate: "2026-12-31",
      team: {
        id: "team-1",
        name: "Core ERP Team",
        teamLead: {
          id: "lead-1",
          name: "Nguyễn Văn Lead",
        },
        members: [],
      },
    };
  }
}
