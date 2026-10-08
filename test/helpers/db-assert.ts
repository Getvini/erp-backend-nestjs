import { DataSource } from 'typeorm';

export class DbAssert {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Kiểm tra bản ghi tồn tại theo bảng và điều kiện
   */
  async assertExists(tableName: string, whereClause: Record<string, any>): Promise<any> {
    const queryBuilder = this.dataSource.createQueryBuilder().from(tableName, 't');
    for (const [key, val] of Object.entries(whereClause)) {
      queryBuilder.andWhere(`t.${key} = :${key}`, { [key]: val });
    }
    const record = await queryBuilder.getRawOne();
    if (!record) {
      throw new Error(`Expected record in table "${tableName}" with condition ${JSON.stringify(whereClause)} to exist, but none found.`);
    }
    return record;
  }

  /**
   * Kiểm tra bản ghi KHÔNG tồn tại hoặc đã bị soft delete
   */
  async assertNotExists(tableName: string, whereClause: Record<string, any>): Promise<void> {
    const queryBuilder = this.dataSource.createQueryBuilder().from(tableName, 't');
    for (const [key, val] of Object.entries(whereClause)) {
      queryBuilder.andWhere(`t.${key} = :${key}`, { [key]: val });
    }
    const record = await queryBuilder.getRawOne();
    if (record) {
      throw new Error(`Expected record in table "${tableName}" with condition ${JSON.stringify(whereClause)} NOT to exist, but found: ${JSON.stringify(record)}`);
    }
  }

  /**
   * Đếm số bản ghi trong bảng
   */
  async count(tableName: string, whereClause?: Record<string, any>): Promise<number> {
    const queryBuilder = this.dataSource.createQueryBuilder().from(tableName, 't');
    if (whereClause) {
      for (const [key, val] of Object.entries(whereClause)) {
        queryBuilder.andWhere(`t.${key} = :${key}`, { [key]: val });
      }
    }
    return await queryBuilder.getCount();
  }
}
