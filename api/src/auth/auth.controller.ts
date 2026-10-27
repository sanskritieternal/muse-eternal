import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { singleEnvelope } from '../common/envelope';
import { AuthService } from './auth.service';
import {
  AuthPrincipal,
  CapabilitiesGuard,
  JwtAuthGuard,
  getPrincipal,
} from './auth.guard';

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

interface RefreshBody {
  refreshToken?: unknown;
}

/**
 * Staff auth endpoints. Login failures are always the same generic
 * 401 (never reveal existence or lockout state). No staff route other
 * than login/refresh is unauthenticated.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginBody, @Req() req: { ip?: string; headers: Record<string, unknown> }) {
    const email = typeof body.email === 'string' ? body.email : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const result = await this.auth.login(email, password, {
      ip: req.ip,
      userAgent:
        typeof req.headers['user-agent'] === 'string'
          ? req.headers['user-agent']
          : undefined,
    });
    return singleEnvelope(result);
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshBody) {
    const raw = typeof body.refreshToken === 'string' ? body.refreshToken : '';
    const result = await this.auth.refresh(raw);
    return singleEnvelope(result);
  }

  @Post('logout')
  async logout(@Body() body: RefreshBody) {
    const raw = typeof body.refreshToken === 'string' ? body.refreshToken : '';
    await this.auth.logout(raw);
    return singleEnvelope({ revoked: true });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, CapabilitiesGuard)
  async me(@Req() req: { user?: AuthPrincipal }) {
    const principal = getPrincipal(req);
    return singleEnvelope({
      capabilities: principal.capabilities,
      email: principal.email,
      id: principal.id,
      roles: principal.roles,
    });
  }
}
