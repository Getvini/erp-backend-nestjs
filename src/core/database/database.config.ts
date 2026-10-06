import { TypeOrmModuleAsyncOptions } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";

export const typeOrmAsyncConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const isProd = configService.get<string>("app.nodeEnv") === "production";
    const dbUrl = configService.get<string>("app.database.url");
    const ssl = configService.get<boolean>("app.database.ssl");
    const rejectUnauthorized = configService.get<boolean>(
      "app.database.rejectUnauthorized",
    );

    return {
      type: "postgres",
      url: dbUrl,
      ssl: ssl ? { rejectUnauthorized } : false,
      autoLoadEntities: true,
      synchronize: false, // ⚠️ CẤM synchronize trên production, dùng migrations!
      extra: {
        max: 25,
        min: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        statement_timeout: 15000,
        query_timeout: 15000,
      },
      logging: isProd ? false : ["warn", "error"],
    };
  },
};
