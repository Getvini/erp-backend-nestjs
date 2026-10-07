import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Documents } from "./entities/document.entity";
import { DocumentVersions } from "./entities/document-version.entity";
import { Accounts } from "@modules/identity/auth/entities/account.entity";
import { DocumentLibraryService } from "./services/document-library.service";
import { DocumentLibraryController } from "./controllers/document-library.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Documents, DocumentVersions, Accounts])],
  controllers: [DocumentLibraryController],
  providers: [DocumentLibraryService],
  exports: [DocumentLibraryService],
})
export class DocumentLibrarySubModule {}
