import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditService } from '../audit/audit.service';
import { ForbiddenError, UnauthorizedError } from '../common/errors';
import { AccessTokenPayload } from './auth.service';
import { Capability } from './capabilities';
import { AuthService } from './auth.service';

export const REQUIRED_CAPABILITIES_KEY = 'requiredCapabilities';
export const ANY_CAPABILITIES_KEY = 'anyCapabilities';

/** All listed capabilities required (deny by default, fail closed). */
export const RequireCapabilities = (...capabilities: Capability[]) =>
  SetMetadata(REQUIRED_CAPABILITIES_KEY, capabilities);

/** At least one listed capability required. */
export const RequireAnyCapability = (...capabilities: Capability[]) =>
  SetMetadata(ANY_CAPABILITIES_KEY, capabilities);

export interface AuthPrincipal {
  capabilities: Capability[];
  email: string;
  id: string;
  roles: string[];
}

export function getPrincipal(request: {
  user?: AuthPrincipal;
}): AuthPrincipal {
  if (!request.user) {
    throw new UnauthorizedError('Authentication required.');
  }
  return request.user;
}

/**
 * Verifies the Bearer access token and attaches the principal.
 * Capability checks live in CapabilitiesGuard; this guard only
 * authenticates. Runs before any repository access, so unauthenticated
 * staff calls fail 401 even when no database is available.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: AuthPrincipal;
    }>();
    const header = request.headers.authorization;
    const token =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice('Bearer '.length)
        : null;
    if (!token) {
      throw new UnauthorizedError('Authentication required.');
    }
    const payload: AccessTokenPayload = this.auth.verifyAccess(token);
    request.user = {
      capabilities: payload.capabilities,
      email: payload.email,
      id: payload.sub,
      roles: payload.roles,
    };
    return true;
  }
}

/**
 * Capability enforcement (deny by default; errors fail closed).
 * Denials are audited as `permission_change` with denied:true — but
 * best-effort only: a dead audit store must never change the
 * authorization outcome, so audit failures here are swallowed.
 * (Service-path denials, e.g. two-key failures, are audited strictly
 * by the workflow service, which already touches the database.)
 */
@Injectable()
export class CapabilitiesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Capability[]>(
      REQUIRED_CAPABILITIES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const anyOf = this.reflector.getAllAndOverride<Capability[]>(
      ANY_CAPABILITIES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required && !anyOf) {
      return true;
    }
    const request = context.switchToHttp().getRequest<{
      user?: AuthPrincipal;
    }>();
    const principal = getPrincipal(request);
    const held = new Set(principal.capabilities);
    const ok =
      (required === undefined ||
        required.every((cap) => held.has(cap))) &&
      (anyOf === undefined || anyOf.some((cap) => held.has(cap)));
    if (!ok) {
      try {
        await this.audit.emit({
          action: 'permission_change',
          actorId: principal.id,
          actorRoles: principal.roles,
          payload: { denied: true },
          summary: 'Capability check denied.',
          targetType: 'staff_route',
        });
      } catch {
        // Best-effort only (see header note).
      }
      throw new ForbiddenError('Forbidden.');
    }
    return true;
  }
}
