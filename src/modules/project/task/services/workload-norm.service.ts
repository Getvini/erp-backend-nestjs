import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { StaffRoleWorkloadNorms } from "@modules/project/task/entities/staff-role-workload-norm.entity";
import {
  UserRole,
  STAFF_ROLES,
} from "@modules/identity/user/enums/user-role.enum";
import { TaskStatus } from "@modules/project/task/enums/task-status.enum";

export { STAFF_ROLES };

export type WorkloadNormItem = {
  role: UserRole;
  monthlyNorm: number;
  dailyNorm: number;
  isCustomized: boolean;
  updatedAt: Date | null;
};

@Injectable()
export class WorkloadNormService {
  static readonly DEFAULT_MONTHLY_NORM = 2500;
  static readonly DAYS_PER_MONTH = 30;
  static readonly ACTIVE_WORKLOAD_STATUSES = [
    TaskStatus.PENDING,
    TaskStatus.NOT_STARTED,
    TaskStatus.DOING,
    TaskStatus.OVERDUE,
    TaskStatus.REWORKING,
    TaskStatus.REJECTED,
    TaskStatus.REJECTED_SUPPORT,
    TaskStatus.SUPPORT_PENDING,
    TaskStatus.SUPPORT_AWAITING_RETURN,
    TaskStatus.AWAITING_SUPPORT,
  ];

  constructor(
    @InjectRepository(StaffRoleWorkloadNorms)
    private readonly repository: Repository<StaffRoleWorkloadNorms>,
  ) {}

  static getDailyNorm(monthlyNorm: number) {
    return monthlyNorm / WorkloadNormService.DAYS_PER_MONTH;
  }

  private buildItem(
    role: UserRole,
    row?: StaffRoleWorkloadNorms | null,
  ): WorkloadNormItem {
    const monthlyNorm = Number(
      row?.monthlyNorm || WorkloadNormService.DEFAULT_MONTHLY_NORM,
    );
    return {
      role,
      monthlyNorm,
      dailyNorm: WorkloadNormService.getDailyNorm(monthlyNorm),
      isCustomized: Boolean(row),
      updatedAt: row?.updatedAt || null,
    };
  }

  async getNorms(): Promise<WorkloadNormItem[]> {
    const rows = await this.repository.find({
      where: { role: In(STAFF_ROLES) },
    });
    const byRole = new Map(rows.map((row) => [row.role, row]));
    return STAFF_ROLES.map((role) => this.buildItem(role, byRole.get(role)));
  }

  async getNormMap(roles: UserRole[]) {
    const uniqueRoles = Array.from(
      new Set(roles.filter((role) => STAFF_ROLES.includes(role))),
    );
    const rows =
      uniqueRoles.length > 0
        ? await this.repository.find({ where: { role: In(uniqueRoles) } })
        : [];
    const byRole = new Map(rows.map((row) => [row.role, row]));
    return new Map(
      uniqueRoles.map((role) => [role, this.buildItem(role, byRole.get(role))]),
    );
  }

  async getNormForRole(role?: UserRole | null) {
    if (!role || !STAFF_ROLES.includes(role)) return null;
    const row = await this.repository.findOne({ where: { role } });
    return this.buildItem(role, row);
  }

  async updateNorms(
    input: { role: UserRole; monthlyNorm: number }[],
    actor?: { id?: string; userId?: string; role?: string },
  ) {
    if (!Array.isArray(input) || input.length === 0) {
      throw new Error("Vui lòng cung cấp danh sách định mức workload");
    }

    const normalized = input.map((item) => {
      if (!STAFF_ROLES.includes(item.role)) {
        throw new Error("Role định mức workload không hợp lệ");
      }
      const monthlyNorm = Number(item.monthlyNorm);
      if (!Number.isFinite(monthlyNorm) || monthlyNorm <= 0) {
        throw new Error("Định mức tháng phải là số dương");
      }
      return {
        role: item.role,
        monthlyNorm,
        updatedById: actor?.userId || actor?.id || null,
      };
    });

    await this.repository.save(normalized);
    return this.getNorms();
  }
}
