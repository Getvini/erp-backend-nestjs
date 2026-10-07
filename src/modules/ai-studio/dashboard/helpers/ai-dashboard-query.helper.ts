import { Repository } from "typeorm";

export async function getAiAggregate(
  repo: Repository<any>,
  accountIds?: string[],
  projectId?: string,
  opportunityId?: string,
  taskId?: string,
) {
  const qb = repo
    .createQueryBuilder("generation")
    .select(
      "SUM(CASE WHEN NULLIF(BTRIM(generation.motionPrompt), '') IS NOT NULL THEN 1 ELSE 0 END)",
      "totalPrompts",
    )
    .addSelect("COUNT(generation.id)", "totalVideos")
    .addSelect("COALESCE(SUM(generation.cost), 0)", "totalCost")
    .where("generation.status = :status", { status: "succeeded" });

  if (accountIds?.length) {
    qb.andWhere("generation.userId IN (:...accountIds)", { accountIds });
  }
  if (projectId) {
    qb.andWhere("generation.projectId = :projectId", { projectId });
  }
  if (opportunityId) {
    qb.andWhere("generation.opportunityId = :opportunityId", { opportunityId });
  }
  if (taskId) {
    qb.andWhere("generation.taskId = :taskId", { taskId });
  }

  const res = await qb.getRawOne();
  return {
    totalPrompts: res?.totalPrompts || "0",
    totalVideos: res?.totalVideos || "0",
    totalCost: res?.totalCost || "0",
  };
}

export async function getAiDaily(
  repo: Repository<any>,
  accountIds?: string[],
  projectId?: string,
  opportunityId?: string,
  taskId?: string,
  month = new Date().getMonth() + 1,
  year = new Date().getFullYear(),
) {
  const qb = repo
    .createQueryBuilder("generation")
    .select(
      "EXTRACT(DAY FROM generation.createdAt AT TIME ZONE 'Asia/Ho_Chi_Minh')",
      "day",
    )
    .addSelect(
      "SUM(CASE WHEN NULLIF(BTRIM(generation.motionPrompt), '') IS NOT NULL THEN 1 ELSE 0 END)",
      "prompts",
    )
    .addSelect("COUNT(generation.id)", "videos")
    .addSelect("COALESCE(SUM(generation.cost), 0)", "cost")
    .where("generation.status = :status", { status: "succeeded" })
    .andWhere(
      "EXTRACT(MONTH FROM generation.createdAt AT TIME ZONE 'Asia/Ho_Chi_Minh') = :month",
      { month },
    )
    .andWhere(
      "EXTRACT(YEAR FROM generation.createdAt AT TIME ZONE 'Asia/Ho_Chi_Minh') = :year",
      { year },
    )
    .groupBy(
      "EXTRACT(DAY FROM generation.createdAt AT TIME ZONE 'Asia/Ho_Chi_Minh')",
    )
    .orderBy(
      "EXTRACT(DAY FROM generation.createdAt AT TIME ZONE 'Asia/Ho_Chi_Minh')",
      "ASC",
    );

  if (accountIds?.length) {
    qb.andWhere("generation.userId IN (:...accountIds)", { accountIds });
  }
  if (projectId) {
    qb.andWhere("generation.projectId = :projectId", { projectId });
  }
  if (opportunityId) {
    qb.andWhere("generation.opportunityId = :opportunityId", { opportunityId });
  }
  if (taskId) {
    qb.andWhere("generation.taskId = :taskId", { taskId });
  }

  return qb.getRawMany();
}
