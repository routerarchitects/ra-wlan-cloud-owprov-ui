import { describe, it, expect, vi } from 'vitest';

vi.mock('utils/axiosInstances', () => ({
  secUrl: 'http://localhost/api/v1',
  axiosSec: {},
  axiosProv: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), defaults: { baseURL: 'http://localhost/api/v1', headers: { common: {} } } },
  axiosProvV2: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), defaults: { baseURL: 'http://localhost/api/v2', headers: { common: {} } } },
}));
import { RESOURCES as PRODUCTION_RESOURCES } from 'pages/PoliciesPage/CreatePolicyModal';

/**
 * Policy Resource Picker Alignment (Section 5.1)
 * 
 * DESCRIPTION:
 *   Validates that UI policy creation/editing modals import directly from production
 *   and include the official supported resources defined in Section 5.1.
 */
describe('Policy Resource Picker Alignment (Section 5.1)', () => {
  it('imports production RESOURCES export and includes managementRole while excluding legacy device', () => {
    expect(PRODUCTION_RESOURCES).toContain('inventory');
    expect(PRODUCTION_RESOURCES).toContain('operator');
    expect(PRODUCTION_RESOURCES).toContain('subscriber');
    expect(PRODUCTION_RESOURCES).toContain('contact');
    expect(PRODUCTION_RESOURCES).toContain('managementRole');
    expect(PRODUCTION_RESOURCES).not.toContain('device');
  });
});
