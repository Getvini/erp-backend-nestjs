import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, EntityManager } from "typeorm";
import { ulid } from "ulid";
import { Accounts } from "../../../identity/auth/entities/account.entity";
import {
  VinicoinTransactions,
  VinicoinTransactionType,
} from "../entities/vinicoin-transaction.entity";
import {
  VinicoinQueryDto,
  ManualVinicoinAdjustmentDto,
} from "../dto/vinicoin.dto";

@Injectable()
export class VinicoinService {
  constructor(
    @InjectRepository(VinicoinTransactions)
    private readonly transactionRepo: Repository<VinicoinTransactions>,
    @InjectRepository(Accounts)
    private readonly accountRepo: Repository<Accounts>,
  ) {}

  async getBalance(accountId: string) {
    const account = await this.accountRepo.findOne({
      where: { id: accountId },
      select: [
        "id",
        "username",
        "vinicoin",
        "vinicoinTotal",
        "vinicoinWithdrawn",
      ],
    });
    if (!account) throw new NotFoundException("Tài khoản không tồn tại");

    return {
      accountId: account.id,
      username: account.username,
      balance: account.vinicoin || 0,
      totalEarned: account.vinicoinTotal || 0,
      withdrawn: account.vinicoinWithdrawn || 0,
    };
  }

  async getHistory(accountId: string, query: VinicoinQueryDto = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { accountId };
    if (query.type) {
      where.type = query.type;
    }

    const [items, total] = await this.transactionRepo.findAndCount({
      where,
      order: { createdAt: "DESC" },
      take: limit,
      skip,
    });

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async adjustVinicoin(data: ManualVinicoinAdjustmentDto) {
    const { accountId, amount, description } = data;
    if (!amount || amount === 0) {
      throw new BadRequestException("Số điểm điều chỉnh phải khác 0");
    }

    return this.accountRepo.manager.transaction(async (txManager) => {
      const account = await txManager
        .createQueryBuilder(Accounts, "account")
        .where("account.id = :accountId", { accountId })
        .setLock("pessimistic_write")
        .getOne();
      if (!account) throw new NotFoundException("Tài khoản không tồn tại");

      if (amount < 0 && (account.vinicoin || 0) + amount < 0) {
        throw new BadRequestException("Số dư Vinicoin không đủ để trừ");
      }

      const tx = txManager.create(VinicoinTransactions, {
        id: ulid(),
        amount,
        account: { id: accountId } as Accounts,
        accountId,
        type: VinicoinTransactionType.ADJUSTMENT,
        description,
      });
      await txManager.save(tx);

      await txManager.increment(
        Accounts,
        { id: accountId },
        "vinicoin",
        amount,
      );
      if (amount > 0) {
        await txManager.increment(
          Accounts,
          { id: accountId },
          "vinicoinTotal",
          amount,
        );
      }

      return {
        success: true,
        transaction: tx,
        newBalance: (account.vinicoin || 0) + amount,
      };
    });
  }

  async rewardForTask(
    accountId: string,
    amount: number,
    taskId: string,
    serviceId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const rewardAmount = Number(amount);
    if (!Number.isFinite(rewardAmount) || rewardAmount <= 0) return false;

    const applyReward = async (txManager: EntityManager) => {
      const account = await txManager
        .createQueryBuilder(Accounts, "account")
        .where("account.id = :accountId", { accountId })
        .setLock("pessimistic_write")
        .getOne();
      if (!account) return false;

      const insertResult = await txManager
        .createQueryBuilder()
        .insert()
        .into(VinicoinTransactions)
        .values({
          id: ulid(),
          amount: rewardAmount,
          account: { id: accountId } as Accounts,
          accountId,
          relatedTaskId: taskId,
          relatedServiceId: serviceId,
          type: VinicoinTransactionType.REWARD,
          idempotencyKey: `REWARD:${accountId}:${taskId}`,
          description: `Thưởng vinicoin cho task: ${taskId}`,
        })
        .orIgnore()
        .returning(["id"])
        .execute();

      if (!Array.isArray(insertResult.raw) || insertResult.raw.length === 0) {
        return false;
      }

      await txManager.increment(
        Accounts,
        { id: accountId },
        "vinicoin",
        rewardAmount,
      );
      await txManager.increment(
        Accounts,
        { id: accountId },
        "vinicoinTotal",
        rewardAmount,
      );
      return true;
    };

    return manager
      ? applyReward(manager)
      : this.transactionRepo.manager.transaction(applyReward);
  }
}
