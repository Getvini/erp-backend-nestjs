import { DataSource } from "typeorm";
import { FIXTURE_IDS } from "./fixture-ids";
import { ProjectStatus } from "@modules/project/project-core/enums/project-status.enum";
import { TaskStatus } from "@modules/project/task/enums/task-status.enum";
import { AcceptanceStatus } from "@modules/project/acceptance/enums/acceptance.enum";

export class ProjectFixture {
  static async seed(dataSource: DataSource): Promise<void> {
    // 1. Seed 10 Đội ngũ Dự án (Project Teams)
    for (let i = 0; i < FIXTURE_IDS.PROJECT_TEAMS.length; i++) {
      const id = FIXTURE_IDS.PROJECT_TEAMS[i];
      const name = `Đội Dự Án Sáng Tạo & Triển Khai Media #${i + 1}`;
      await dataSource.query(
        `INSERT INTO project_teams (id, name, "createdAt") VALUES ($1, $2, NOW())`,
        [id, name],
      );
    }

    // 2. Seed 20 Dự án (Projects)
    const projectStatuses = [
      ProjectStatus.PENDING_CONFIRMATION,
      ProjectStatus.CONFIRMED,
      ProjectStatus.IN_PROGRESS,
      ProjectStatus.ON_HOLD,
      ProjectStatus.COMPLETED,
      ProjectStatus.CANCELLED,
    ];

    for (let i = 0; i < FIXTURE_IDS.PROJECTS.length; i++) {
      const id = FIXTURE_IDS.PROJECTS[i];
      const contractId = FIXTURE_IDS.CONTRACTS[i % FIXTURE_IDS.CONTRACTS.length];
      const teamId = FIXTURE_IDS.PROJECT_TEAMS[i % FIXTURE_IDS.PROJECT_TEAMS.length];
      const status = projectStatuses[i % projectStatuses.length];
      const name = `Dự Án Sản Xuất Nội Dung & Viral Campaign #${i + 1}`;
      const isOnHold = status === ProjectStatus.ON_HOLD;

      await dataSource.query(
        `INSERT INTO projects (id, name, "contractId", "teamId", status, "isOnHold", "createdById", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          id,
          name,
          contractId,
          teamId,
          status,
          isOnHold,
          FIXTURE_IDS.USERS.PM_1,
        ],
      );
    }

    // 3. Seed 80 Nhiệm vụ (Tasks)
    const taskStatuses = [
      TaskStatus.PENDING,
      TaskStatus.DOING,
      TaskStatus.AWAITING_REVIEW,
      TaskStatus.COMPLETED,
      TaskStatus.CANCELLED,
    ];

    const assignees = [
      FIXTURE_IDS.USERS.CONTENT_A_1,
      FIXTURE_IDS.USERS.CONTENT_D_1,
      FIXTURE_IDS.USERS.EDITOR_A_1,
      FIXTURE_IDS.USERS.EDITOR_D_1,
      FIXTURE_IDS.USERS.DESIGNER_A_1,
      FIXTURE_IDS.USERS.DESIGNER_D_1,
      FIXTURE_IDS.USERS.PM_1,
    ];

    for (let i = 0; i < FIXTURE_IDS.TASKS.length; i++) {
      const id = FIXTURE_IDS.TASKS[i];
      const projectId = FIXTURE_IDS.PROJECTS[i % FIXTURE_IDS.PROJECTS.length];
      const status = taskStatuses[i % taskStatuses.length];
      const assigneeId = assignees[i % assignees.length];
      const name = `Task Sản Xuất Chi Tiết Hạng Mục #${i + 1}`;
      const rewardVinicoin = (i + 1) * 50;

      await dataSource.query(
        `INSERT INTO tasks (id, name, "projectId", status, "assigneeId", "supervisorId", "assignerId", "rewardVinicoin", "plannedStartDate", "plannedEndDate", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '7 days', NOW())`,
        [
          id,
          name,
          projectId,
          status,
          assigneeId,
          FIXTURE_IDS.USERS.PM_1,
          FIXTURE_IDS.USERS.PM_1,
          rewardVinicoin,
        ],
      );
    }

    // 4. Seed 20 Yêu cầu Nghiệm thu (Acceptance Requests)
    const acceptanceStatuses = [
      AcceptanceStatus.PENDING,
      AcceptanceStatus.APPROVED,
      AcceptanceStatus.REJECTED,
    ];

    for (let i = 0; i < FIXTURE_IDS.ACCEPTANCE_REQUESTS.length; i++) {
      const id = FIXTURE_IDS.ACCEPTANCE_REQUESTS[i];
      const projectId = FIXTURE_IDS.PROJECTS[i % FIXTURE_IDS.PROJECTS.length];
      const status = acceptanceStatuses[i % acceptanceStatuses.length];
      const name = `Yêu Cầu Nghiệm Thu Hợp Đồng Đợt ${(i % 3) + 1} - Dự Án #${(i % 20) + 1}`;
      const note = `Đã hoàn thành các hạng mục theo tiến độ cam kết tại Sprint #${i + 1}`;
      const feedback =
        status === AcceptanceStatus.REJECTED
          ? "Cần chỉnh sửa lại độ phân giải video và màu sắc theo Brand Guidelines"
          : status === AcceptanceStatus.APPROVED
            ? "Đạt chuẩn chất lượng, đồng ý nghiệm thu"
            : null;

      await dataSource.query(
        `INSERT INTO acceptance_requests (id, name, "projectId", "requesterId", "approverId", status, note, feedback, "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          id,
          name,
          projectId,
          FIXTURE_IDS.USERS.PM_1,
          status === AcceptanceStatus.PENDING ? null : FIXTURE_IDS.USERS.BOD_1,
          status,
          note,
          feedback,
        ],
      );

      // Gắn dịch vụ hợp đồng vào nghiệm thu
      const csId = FIXTURE_IDS.CONTRACT_SERVICES[i % FIXTURE_IDS.CONTRACT_SERVICES.length];
      if (csId) {
        await dataSource.query(
          `INSERT INTO acceptance_request_services ("acceptanceRequestId", "contractServiceId")
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [id, csId],
        );
      }
    }

    // 5. Seed 20 Đánh giá chất lượng QC (Task Reviews)
    for (let i = 0; i < FIXTURE_IDS.TASK_REVIEWS.length; i++) {
      const id = FIXTURE_IDS.TASK_REVIEWS[i];
      const taskId = FIXTURE_IDS.TASKS[i % FIXTURE_IDS.TASKS.length];
      const isPassed = i % 3 !== 0; // 1/3 không đạt chuẩn
      const note = isPassed ? "QC kiểm tra đạt chuẩn chất lượng" : "Phát hiện lỗi ngữ pháp và kích thước sai chuẩn";

      await dataSource.query(
        `INSERT INTO task_reviews (id, "taskId", "reviewerId", "isPassed", note, "createdAt")
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [id, taskId, FIXTURE_IDS.USERS.PM_1, isPassed, note],
      );
    }

    console.log(
      `-> Đã seed thành công 10 Teams, 20 Projects, 80 Tasks, 20 Acceptance Requests, 20 Task Reviews!`,
    );
  }
}
