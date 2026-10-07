import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Project } from "./entities/project.entity";
import { ProjectTeam } from "./entities/project-team.entity";
import { TeamMember } from "./entities/team-member.entity";
import { TeamMemberRole } from "./entities/team-member-role.entity";
import { ProjectPauseRequest } from "./entities/project-pause-request.entity";
import { Contract } from "@modules/finance/entities/contract.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { ProjectController } from "./controllers/project.controller";
import { ProjectTeamController } from "./controllers/project-team.controller";
import { ProjectQueryService } from "./services/project-query.service";
import { ProjectLifecycleService } from "./services/project-lifecycle.service";
import { ProjectPauseService } from "./services/project-pause.service";
import { ProjectCloseService } from "./services/project-close.service";
import { ProjectTeamService } from "./services/project-team.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectTeam,
      TeamMember,
      TeamMemberRole,
      ProjectPauseRequest,
      Contract,
      Users,
    ]),
  ],
  controllers: [ProjectController, ProjectTeamController],
  providers: [
    ProjectQueryService,
    ProjectLifecycleService,
    ProjectPauseService,
    ProjectCloseService,
    ProjectTeamService,
  ],
  exports: [
    ProjectQueryService,
    ProjectLifecycleService,
    ProjectPauseService,
    ProjectCloseService,
    ProjectTeamService,
    TypeOrmModule,
  ],
})
export class ProjectCoreModule {}
