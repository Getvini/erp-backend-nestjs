import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Tasks } from "./entities/task.entity";
import { TaskIterations } from "./entities/task-iteration.entity";
import { Violations } from "./entities/violation.entity";
import { JobCriterias } from "./entities/job-criteria.entity";
import { StaffRoleWorkloadNorms } from "./entities/staff-role-workload-norm.entity";
import { Project } from "@modules/project/project-core/entities/project.entity";
import { Jobs } from "@modules/crm/service/entities/job.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { Opportunities } from "@modules/crm/opportunity/entities/opportunity.entity";
import { OpportunityServiceJobs } from "@modules/crm/opportunity/entities/opportunity-service-job.entity";
import { Services } from "@modules/crm/service/entities/service.entity";
import { CommunicationModule } from "@modules/communication/communication.module";

import { TaskQueryService } from "./services/task-query.service";
import { TaskCreationService } from "./services/task-creation.service";
import { TaskInternalCreationService } from "./services/task-internal-creation.service";
import { TaskStartService } from "./services/task-start.service";
import { TaskAssignmentService } from "./services/task-assignment.service";
import { TaskResultService } from "./services/task-result.service";
import { TaskSupportService } from "./services/task-support.service";
import { TaskDelegationService } from "./services/task-delegation.service";
import { TaskDeletionService } from "./services/task-deletion.service";
import { TaskWorkloadService } from "./services/task-workload.service";
import { WorkloadNormService } from "./services/workload-norm.service";
import { JobCriteriaService } from "./services/job-criteria.service";
import { WorkloadSummaryService } from "./services/workload-summary.service";

import { TaskController } from "./controllers/task.controller";
import { TaskQueryController } from "./controllers/task-query.controller";
import { TaskSubtaskController } from "./controllers/task-subtask.controller";
import { JobCriteriaController } from "./controllers/job-criteria.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tasks,
      TaskIterations,
      Violations,
      JobCriterias,
      StaffRoleWorkloadNorms,
      Project,
      Jobs,
      Users,
      Opportunities,
      OpportunityServiceJobs,
      Services,
    ]),
    CommunicationModule,
  ],
  controllers: [
    TaskController,
    TaskQueryController,
    TaskSubtaskController,
    JobCriteriaController,
  ],
  providers: [
    TaskQueryService,
    TaskCreationService,
    TaskInternalCreationService,
    TaskStartService,
    TaskAssignmentService,
    TaskResultService,
    TaskSupportService,
    TaskDelegationService,
    TaskDeletionService,
    TaskWorkloadService,
    WorkloadNormService,
    JobCriteriaService,
    WorkloadSummaryService,
  ],
  exports: [
    TaskQueryService,
    TaskCreationService,
    TaskInternalCreationService,
    TaskStartService,
    TaskAssignmentService,
    TaskResultService,
    TaskSupportService,
    TaskDelegationService,
    TaskDeletionService,
    TaskWorkloadService,
    WorkloadNormService,
    JobCriteriaService,
    WorkloadSummaryService,
  ],
})
export class TaskModule {}
