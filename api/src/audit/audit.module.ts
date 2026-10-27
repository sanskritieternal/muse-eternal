import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditController } from './audit.controller';
import { AUDIT_REPOSITORY } from './audit.repository';
import { AuditService } from './audit.service';
import { PrismaAuditRepository } from './prisma-audit.repository';

@Module({
  controllers: [AuditController],
  exports: [AuditService],
  // See AuthModule: module-level forwardRef for the guard dependency.
  imports: [forwardRef(() => AuthModule)],
  providers: [
    AuditService,
    {
      provide: AUDIT_REPOSITORY,
      useClass: PrismaAuditRepository,
    },
  ],
})
export class AuditModule {}
