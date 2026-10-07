import { Repository, In } from "typeorm";
import { Users } from "@modules/identity/user/entities/user.entity";
import { TeamMember } from "@modules/project/project-core/entities/team-member.entity";
import { AnnouncementScopeType } from "../entities/announcement.entity";

export async function resolveAnnouncementRecipients(
  data: {
    scopeType: AnnouncementScopeType;
    targetRoles?: string[];
    targetTeamIds?: string[];
    targetUserIds?: string[];
    ccUserIds?: string[];
  },
  userRepo: Repository<Users>,
  teamMemberRepo: Repository<TeamMember>,
  excludeUserId?: string,
): Promise<Users[]> {
  let users: Users[] = [];

  if (data.scopeType === AnnouncementScopeType.ALL) {
    users = await userRepo.find({
      where: { isLocked: false },
      relations: ["accounts"],
    });
  } else if (data.scopeType === AnnouncementScopeType.ROLE) {
    if (data.targetRoles && data.targetRoles.length > 0) {
      users = await userRepo.find({
        where: {
          isLocked: false,
          accounts: { role: In(data.targetRoles) as any },
        },
        relations: ["accounts"],
      });
    }
  } else if (data.scopeType === AnnouncementScopeType.TEAM) {
    if (data.targetTeamIds && data.targetTeamIds.length > 0) {
      const members = await teamMemberRepo.find({
        where: { team: { id: In(data.targetTeamIds) } },
        relations: [
          "user",
          "user.accounts",
          "team",
          "team.teamLead",
          "team.teamLead.accounts",
        ],
      });
      const usersMap = new Map<string, Users>();
      members.forEach((m) => {
        if (m.user) usersMap.set(m.user.id, m.user);
        if (m.team?.teamLead) {
          usersMap.set(m.team.teamLead.id, m.team.teamLead);
        }
      });
      users = Array.from(usersMap.values());
    }
  } else if (data.scopeType === AnnouncementScopeType.USER) {
    if (data.targetUserIds && data.targetUserIds.length > 0) {
      users = await userRepo.find({
        where: { id: In(data.targetUserIds) },
        relations: ["accounts"],
      });
    }
  }

  if (data.ccUserIds && data.ccUserIds.length > 0) {
    const ccUsers = await userRepo.find({
      where: { id: In(data.ccUserIds) },
      relations: ["accounts"],
    });
    const merged = new Map<string, Users>();
    users.forEach((u) => merged.set(u.id, u));
    ccUsers.forEach((u) => merged.set(u.id, u));
    users = Array.from(merged.values());
  }

  return excludeUserId ? users.filter((u) => u.id !== excludeUserId) : users;
}
