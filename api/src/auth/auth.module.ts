import { forwardRef, Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthController } from './auth.controller';
import { CapabilitiesGuard, JwtAuthGuard } from './auth.guard';
import { AUTH_CONFIG, loadAuthConfig } from './auth.config';
import { AuthService } from './auth.service';
import {
  PrismaRefreshTokenRepository,
  PrismaUserRepository,
} from './prisma-auth.repository';
import {
  REFRESH_TOKEN_REPOSITORY,
  USER_REPOSITORY,
} from './auth.repository';

@Module({
  controllers: [AuthController],
  exports: [AuthService, CapabilitiesGuard, JwtAuthGuard],
  // Circular at module level only (AuditController needs the guards;
  // AuthService needs AuditService). No provider cycle exists:
  // AuthService → AuditService is one-directional.
  imports: [forwardRef(() => AuditModule)],
  providers: [
    AuthService,
    CapabilitiesGuard,
    JwtAuthGuard,
    {
      provide: AUTH_CONFIG,
      useFactory: loadAuthConfig,
    },
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: PrismaRefreshTokenRepository,
    },
  ],
})
export class AuthModule {}
