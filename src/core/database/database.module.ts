import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { typeOrmAsyncConfig } from "./database.config";

@Module({
  imports: [TypeOrmModule.forRootAsync(typeOrmAsyncConfig)],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
