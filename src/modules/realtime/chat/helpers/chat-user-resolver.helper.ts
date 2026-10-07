import { Repository } from "typeorm";
import { Users } from "@modules/identity/user/entities/user.entity";
import { Accounts } from "@modules/identity/auth/entities/account.entity";
import { NotFoundException } from "@nestjs/common";

export async function resolveChatUserId(
  id: string,
  userRepo: Repository<Users>,
  accountRepo: Repository<Accounts>,
): Promise<string> {
  const user = await userRepo.findOne({
    where: { id },
    select: ["id"],
  });
  if (user) return user.id;

  const account = await accountRepo.findOne({
    where: { id },
    select: ["id", "userId"],
  });
  if (account?.userId) return account.userId;
  throw new NotFoundException("Không tìm thấy người dùng để chat");
}

export async function resolveChatUserIds(
  ids: string[],
  userRepo: Repository<Users>,
  accountRepo: Repository<Accounts>,
): Promise<string[]> {
  const resolved = await Promise.all(
    ids.map((id) => resolveChatUserId(id, userRepo, accountRepo)),
  );
  return Array.from(new Set(resolved));
}
