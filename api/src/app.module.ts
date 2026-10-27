import { Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { FallbackModule } from './fallback/fallback.module';
import { GlossaryModule } from './glossary/glossary.module';
import { HealthController } from './health/health.controller';

@Module({
  controllers: [HealthController],
  // FallbackModule LAST on purpose: its wildcard must register after
  // every real route, or it would shadow them.
  imports: [AuthModule, AuditModule, GlossaryModule, FallbackModule],
})
export class AppModule {}
