import { AuditService, GENESIS_HASH, hashEvent } from './audit.service';
import {
  AuditEventInput,
  AuditEventRow,
  AuditRepository,
} from './audit.repository';

function makeService(): {
  events: AuditEventRow[];
  service: AuditService;
} {
  const events: AuditEventRow[] = [];
  const repository: AuditRepository = {
    append: jest.fn().mockImplementation((event: AuditEventInput) => {
      const row: AuditEventRow = {
        ...event,
        createdAt: new Date(),
        id: `evt-${events.length + 1}`,
      };
      events.push(row);
      return Promise.resolve(row);
    }),
    lastHash: jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          events.length > 0 ? events[events.length - 1].hash : null,
        ),
      ),
    list: jest.fn().mockImplementation((limit: number) => {
      return Promise.resolve([...events].reverse().slice(0, limit));
    }),
  };
  return { events, service: new AuditService(repository) };
}

describe('AuditService', () => {
  it('chains hashes from GENESIS and links each event to its predecessor', async () => {
    const { events, service } = makeService();
    await service.emit({
      action: 'created',
      actorId: 'u1',
      actorRoles: ['editor'],
      summary: 'Created.',
      targetId: 'd1',
      targetType: 'glossary_term',
    });
    await service.emit({
      action: 'published',
      actorId: 'u2',
      actorRoles: ['super_admin'],
      summary: 'Published.',
      targetId: 'd1',
      targetType: 'glossary_term',
    });
    expect(events[0].prevHash).toBe(GENESIS_HASH);
    expect(events[1].prevHash).toBe(events[0].hash);
    expect(events[1].hash).toBe(
      hashEvent(events[0].hash, {
        action: 'published',
        actorId: 'u2',
        actorRoles: ['super_admin'],
        payload: null,
        summary: 'Published.',
        targetId: 'd1',
        targetType: 'glossary_term',
      }),
    );
  });

  it('rejects actions outside the closed vocabulary', async () => {
    const { service } = makeService();
    await expect(
      service.emit({
        action: 'login_failed' as never,
        summary: 'Nope.',
      }),
    ).rejects.toThrow('not in vocabulary');
  });

  it('accepts every vocabulary value', async () => {
    const { events, service } = makeService();
    const actions = [
      'created',
      'updated',
      'deleted',
      'published',
      'unpublished',
      'login',
      'logout',
      'permission_change',
      'export',
      'import',
      'settings_change',
      'view',
      'tamper_check',
      'retention_run',
      'archive',
    ] as const;
    for (const action of actions) {
      await service.emit({ action, summary: action });
    }
    expect(events).toHaveLength(15);
  });
});
