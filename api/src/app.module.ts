import { Module } from '@nestjs/common';
import { FallbackModule } from './fallback/fallback.module';
import { GlossaryModule } from './glossary/glossary.module';
import { HealthController } from './health/health.controller';

@Module({
  controllers: [HealthController],
  // FallbackModule LAST on purpose: its wildcard must register after
  // every real route, or it would shadow them.
  imports: [GlossaryModule, FallbackModule],
})
export class AppModule {}
