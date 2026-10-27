import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { USER_REPOSITORY } from '../auth/auth.repository';
import { PrismaUserRepository } from '../auth/prisma-auth.repository';
import { GlossaryController } from './glossary.controller';
import { GLOSSARY_REPOSITORY } from './glossary.repository';
import { GlossaryService } from './glossary.service';
import { PrismaGlossaryRepository } from './prisma-glossary.repository';
import { PrismaStaffGlossaryRepository } from './prisma-staff.repository';
import { STAFF_GLOSSARY_REPOSITORY } from './staff.repository';
import { StaffGlossaryController } from './staff.controller';
import {
  WORKFLOW_CONFIG,
  WorkflowService,
  loadWorkflowConfig,
} from './workflow.service';

@Module({
  controllers: [GlossaryController, StaffGlossaryController],
  imports: [AuthModule, AuditModule],
  providers: [
    GlossaryService,
    WorkflowService,
    {
      provide: WORKFLOW_CONFIG,
      useFactory: loadWorkflowConfig,
    },
    {
      provide: GLOSSARY_REPOSITORY,
      useClass: PrismaGlossaryRepository,
    },
    {
      provide: STAFF_GLOSSARY_REPOSITORY,
      useClass: PrismaStaffGlossaryRepository,
    },
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
  ],
})
export class GlossaryModule {}
