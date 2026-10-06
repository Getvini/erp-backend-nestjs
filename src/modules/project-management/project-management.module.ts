import { Module } from "@nestjs/common";
import { ProjectController } from "./controllers/project.controller";
import { ProjectQueryService } from "./services/project-query.service";

@Module({
  controllers: [ProjectController],
  providers: [ProjectQueryService],
  exports: [ProjectQueryService],
})
export class ProjectManagementModule {}
