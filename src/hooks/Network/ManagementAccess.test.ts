import './setup-test';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  isAssignAccessDisabled,
  AssignAccessFormValues,
} from '../../pages/UsersPage/Table/CreateUserModal/AssignAccessForm';
import {
  assignUserAccess,
  buildManagementPolicyPayload,
  buildManagementRolePayload,
  deleteManagementPolicy,
  getExistingManagementPolicyForUser,
  getManagementRolesForUser,
  getMatchingManagementPolicy,
  getMatchingManagementRole,
  ManagementPolicyEntry,
  mergePolicyEntries,
} from './ManagementAccess';
import { axiosProv } from 'utils/axiosInstances';

type MockFn = (...args: unknown[]) => Promise<unknown> | unknown;

const originalGet = axiosProv.get;
const originalPost = axiosProv.post;
const originalPut = axiosProv.put;
const originalDelete = axiosProv.delete;

const restoreAxios = () => {
  axiosProv.get = originalGet;
  axiosProv.post = originalPost;
  axiosProv.put = originalPut;
  axiosProv.delete = originalDelete;
};

const setAxiosMocks = ({
  delete: deleteMock,
  get,
  post,
  put,
}: {
  delete?: MockFn;
  get?: MockFn;
  post?: MockFn;
  put?: MockFn;
}) => {
  axiosProv.delete = (deleteMock ?? originalDelete) as typeof axiosProv.delete;
  axiosProv.get = (get ?? originalGet) as typeof axiosProv.get;
  axiosProv.post = (post ?? originalPost) as typeof axiosProv.post;
  axiosProv.put = (put ?? originalPut) as typeof axiosProv.put;
};

afterEach(() => {
  restoreAxios();
});

describe('ManagementAccess helpers', () => {
  it('builds entity-scoped policy and role payloads', () => {
    const policy = buildManagementPolicyPayload({
      access: ['FULL'],
      entityId: 'entity-1',
      resources: ['entity', 'venue'],
      roleTemplate: 'Admin',
      scope: 'entity',
      userId: 'user-1',
    });
    const role = buildManagementRolePayload({
      entityId: 'entity-1',
      policyId: 'policy-1',
      roleTemplate: 'Admin',
      scope: 'entity',
      userEmail: 'user@example.com',
      userId: 'user-1',
    });

    assert.deepEqual(policy, {
      entries: [
        {
          users: ['user-1'],
          resources: ['entity', 'venue'],
          access: ['FULL'],
          policy: JSON.stringify({
            type: 'entity',
            entityId: 'entity-1',
            includeVenues: true,
            includeChildEntities: true,
          }),
        },
      ],
      entity: 'entity-1',
      venue: '',
    });
    assert.equal(policy.name, undefined);
    assert.equal(policy.description, undefined);
    assert.deepEqual(role, {
      name: 'Entity Admin - user@example.com',
      description: 'Full entity access',
      managementPolicy: 'policy-1',
      users: ['user-1'],
      entity: 'entity-1',
      venue: '',
    });
  });

  it('builds venue-scoped policy and role payloads', () => {
    const policy = buildManagementPolicyPayload({
      access: ['READ', 'MODIFY', 'LIST'],
      entityId: 'entity-1',
      resources: ['venue'],
      roleTemplate: 'Admin',
      scope: 'venue',
      userId: 'user-1',
      venueId: 'venue-1',
    });
    const role = buildManagementRolePayload({
      entityId: 'entity-1',
      policyId: 'policy-1',
      roleTemplate: 'Admin',
      scope: 'venue',
      userEmail: 'user@example.com',
      userId: 'user-1',
      venueId: 'venue-1',
    });

    assert.deepEqual(policy.entries[0]?.resources, ['venue']);
    assert.deepEqual(policy.entries[0]?.access, ['READ', 'MODIFY', 'LIST']);
    assert.equal(policy.venue, 'venue-1');
    assert.equal(role.venue, 'venue-1');
  });

  it('builds a policy entry per resource when resource permissions are provided', () => {
    const policy = buildManagementPolicyPayload({
      access: ['FULL'],
      entityId: 'entity-1',
      resources: ['entity', 'venue'],
      resourcePermissions: [
        { resource: 'entity', access: ['READ', 'LIST'] },
        { resource: 'venue', access: ['CREATE'] },
      ],
      roleTemplate: 'Admin',
      scope: 'entity',
      userId: 'user-1',
    });

    assert.equal(policy.entries.length, 2);
    assert.deepEqual(policy.entries[0], {
      users: ['user-1'],
      resources: ['entity'],
      access: ['READ', 'LIST'],
      policy: JSON.stringify({
        type: 'entity',
        entityId: 'entity-1',
        includeVenues: true,
        includeChildEntities: true,
      }),
    });
    assert.deepEqual(policy.entries[1], {
      users: ['user-1'],
      resources: ['venue'],
      access: ['CREATE'],
      policy: JSON.stringify({
        type: 'entity',
        entityId: 'entity-1',
        includeVenues: true,
        includeChildEntities: true,
      }),
    });
  });

  it('updates an existing user policy and reuses the role', async () => {
    const getCalls: string[] = [];
    const putCalls: Array<[string, unknown]> = [];

    setAxiosMocks({
      get: async (url: string) => {
        getCalls.push(url);
        if (url === 'managementRole?userId=user-1&entityId=entity-1') {
          return {
            data: {
              managementRoles: [
                {
                  id: 'role-1',
                  entity: 'entity-1',
                  venue: '',
                  managementPolicy: 'policy-1',
                  users: ['user-1'],
                  name: 'Entity Admin - user@example.com',
                },
              ],
            },
          };
        }
        if (url === 'managementRole?entity=entity-1&venue=') {
          return { data: { managementRoles: [] } };
        }
        if (url === 'managementPolicy/policy-1') {
          return {
            data: {
              id: 'policy-1',
              entity: 'child-entity-1',
              venue: 'venue-1',
              name: 'Operator Admin Full Access Policy',
              entries: [
                {
                  users: ['user-1'],
                  resources: ['entity', 'venue'],
                  access: ['FULL'],
                  policy: JSON.stringify({
                    type: 'entity',
                    entityId: 'entity-1',
                    includeVenues: true,
                    includeChildEntities: true,
                  }),
                },
              ],
            },
          };
        }
        throw new Error(`Unexpected GET ${url}`);
      },
      post: async () => {
        throw new Error('POST should not be called for matching role reuse');
      },
      put: async (url: string, payload: unknown) => {
        putCalls.push([url, payload]);
        return { data: {} };
      },
    });

    const result = await assignUserAccess({
      access: ['FULL'],
      resources: ['entity', 'venue'],
      entityId: 'entity-1',
      roleTemplate: 'Admin',
      scope: 'entity',
      userEmail: 'user@example.com',
      userId: 'user-1',
    });

    assert.equal(result.policyId, 'policy-1');
    assert.equal(result.roleId, 'role-1');
    assert.equal(result.roleUpdated, false);
    assert.deepEqual(getCalls, [
      'managementRole?userId=user-1&entityId=entity-1',
      'managementPolicy/policy-1',
      'managementRole?entity=entity-1&venue=',
    ]);
    assert.equal(putCalls.length, 1);
    assert.equal(putCalls[0]?.[0], 'managementPolicy/policy-1');
    assert.equal((putCalls[0]?.[1] as { entity?: string }).entity, 'child-entity-1');
    assert.equal((putCalls[0]?.[1] as { venue?: string }).venue, 'venue-1');
  });

  it('creates a venue-scoped role when no match exists', async () => {
    const postCalls: Array<[string, unknown]> = [];

    setAxiosMocks({
      get: async (url: string) => {
        if (url === 'managementRole?userId=user-1&entityId=entity-1') {
          return { data: { managementRoles: [] } };
        }
        if (url === 'managementRole?entity=entity-1&venue=venue-1') {
          return { data: { managementRoles: [] } };
        }
        if (url === 'venue/venue-1') {
          return { data: { id: 'venue-1', entity: 'entity-1' } };
        }
        throw new Error(`Unexpected GET ${url}`);
      },
      post: async (url: string, payload: unknown) => {
        postCalls.push([url, payload]);
        if (url === 'managementPolicy/create') return { data: { id: 'policy-1' } };
        if (url === 'managementRole/create') return { data: { id: 'role-1' } };
        throw new Error(`Unexpected POST ${url}`);
      },
    });

    const result = await assignUserAccess({
      access: ['READ', 'MODIFY', 'LIST'],
      resources: ['venue', 'inventory', 'configuration'],
      entityId: 'entity-1',
      roleTemplate: 'Admin',
      scope: 'venue',
      userEmail: 'user@example.com',
      userId: 'user-1',
      venueId: 'venue-1',
    });

    assert.equal(result.policyId, 'policy-1');
    assert.equal(result.roleId, 'role-1');
    assert.deepEqual(
      postCalls.map(([url]) => url),
      ['managementPolicy/create', 'managementRole/create'],
    );
    assert.deepEqual((postCalls[0]?.[1] as { venue?: string }).venue, 'venue-1');
  });

  it('surfaces a policy creation failure after user creation', async () => {
    setAxiosMocks({
      get: async (url: string) => {
        if (url === 'managementRole?userId=user-1&entityId=entity-1') {
          return { data: { managementRoles: [] } };
        }
        throw new Error(`Unexpected GET ${url}`);
      },
      post: async (url: string) => {
        if (url === 'managementPolicy/create') throw new Error('policy failed');
        throw new Error(`Unexpected POST ${url}`);
      },
    });

    await assert.rejects(
      assignUserAccess({
        access: ['FULL'],
        resources: ['entity', 'venue'],
        entityId: 'entity-1',
        roleTemplate: 'Admin',
        scope: 'entity',
        userEmail: 'user@example.com',
        userId: 'user-1',
      }),
      /policy failed/,
    );
  });

  it('surfaces a role creation failure after policy creation', async () => {
    setAxiosMocks({
      get: async (url: string) => {
        if (url === 'managementRole?userId=user-1&entityId=entity-1') {
          return { data: { managementRoles: [] } };
        }
        if (url === 'managementRole?entity=entity-1&venue=') {
          return { data: { managementRoles: [] } };
        }
        throw new Error(`Unexpected GET ${url}`);
      },
      post: async (url: string) => {
        if (url === 'managementPolicy/create') return { data: { id: 'policy-1' } };
        if (url === 'managementRole/create') throw new Error('role failed');
        throw new Error(`Unexpected POST ${url}`);
      },
    });

    await assert.rejects(
      assignUserAccess({
        access: ['FULL'],
        resources: ['entity', 'venue'],
        entityId: 'entity-1',
        roleTemplate: 'Admin',
        scope: 'entity',
        userEmail: 'user@example.com',
        userId: 'user-1',
      }),
      /role failed/,
    );
  });

  it('appends the user to an existing role', async () => {
    const putCalls: Array<[string, unknown]> = [];

    setAxiosMocks({
      get: async (url: string) => {
        if (url === 'managementRole?userId=user-2&entityId=entity-1') {
          return {
            data: {
              managementRoles: [
                {
                  id: 'role-1',
                  entity: 'entity-1',
                  venue: '',
                  managementPolicy: 'policy-1',
                  users: ['user-1'],
                  name: 'Entity Admin - user@example.com',
                },
              ],
            },
          };
        }
        if (url === 'managementRole?entity=entity-1&venue=') {
          return { data: { managementRoles: [] } };
        }
        if (url === 'managementPolicy/policy-1') {
          return {
            data: {
              id: 'policy-1',
              entity: 'entity-1',
              entries: [
                {
                  users: ['user-2'],
                  resources: ['entity', 'venue'],
                  access: ['FULL'],
                  policy: JSON.stringify({
                    type: 'entity',
                    entityId: 'entity-1',
                    includeVenues: true,
                    includeChildEntities: true,
                  }),
                },
              ],
            },
          };
        }
        throw new Error(`Unexpected GET ${url}`);
      },
      post: async () => {
        throw new Error('POST should not be called when a role already exists');
      },
      put: async (url: string, payload: unknown) => {
        putCalls.push([url, payload]);
        return { data: {} };
      },
    });

    const result = await assignUserAccess({
      access: ['FULL'],
      resources: ['entity', 'venue'],
      entityId: 'entity-1',
      roleTemplate: 'Admin',
      scope: 'entity',
      userEmail: 'user-2@example.com',
      userId: 'user-2',
    });

    assert.equal(result.roleUpdated, true);
    assert.equal(putCalls.length, 2);
    assert.equal(putCalls[0]?.[0], 'managementPolicy/policy-1');
    assert.equal(putCalls[1]?.[0], 'managementRole/role-1');
    assert.deepEqual((putCalls[1]?.[1] as { users?: string[] }).users, ['user-1', 'user-2']);
  });
  it('finds matching policy and role entries', () => {
    const matchingPolicy = getMatchingManagementPolicy(
      [
        {
          id: 'policy-1',
          entity: 'entity-1',
          venue: '',
          entries: [
            {
              users: ['user-1'],
              resources: ['entity', 'venue'],
              access: ['FULL'],
              policy: JSON.stringify({
                type: 'entity',
                entityId: 'entity-1',
                includeVenues: true,
                includeChildEntities: true,
              }),
            },
          ],
          name: 'Operator Admin Full Access Policy',
        },
      ],
      {
        access: ['FULL'],
        entityId: 'entity-1',
        resources: ['entity', 'venue'],
        roleTemplate: 'Admin',
        scope: 'entity',
      },
    );

    const matchingRole = getMatchingManagementRole(
      [
        {
          id: 'role-1',
          entity: 'entity-1',
          venue: '',
          managementPolicy: 'policy-1',
          name: 'Entity Admin - user@example.com',
          users: ['user-1'],
        },
      ],
      {
        entityId: 'entity-1',
        policyId: 'policy-1',
        resources: ['entity', 'venue'],
        scope: 'entity',
      },
    );

    assert.equal(matchingPolicy?.id, 'policy-1');
    assert.equal(matchingRole?.id, 'role-1');
  });

  it('finds an existing management policy for a user', () => {
    const policy = getExistingManagementPolicyForUser(
      [
        {
          id: 'policy-1',
          entity: 'entity-1',
          venue: '',
          entries: [
            {
              users: ['user-1'],
              resources: ['entity'],
              access: ['READ'],
              policy: JSON.stringify({
                type: 'entity',
                entityId: 'entity-1',
                includeVenues: true,
                includeChildEntities: true,
              }),
            },
          ],
          name: 'Entity Installer Full Access Policy',
        },
      ],
      {
        entityId: 'entity-1',
        scope: 'entity',
        userId: 'user-1',
      },
    );

    assert.equal(policy?.id, 'policy-1');
  });

  it('regression: user has existing entity role, assigning venue role must not mutate entity policy', async () => {
    const postCalls: Array<[string, unknown]> = [];
    const putCalls: Array<[string, unknown]> = [];

    setAxiosMocks({
      get: async (url: string) => {
        if (url === 'managementRole?userId=user-1&entityId=entity-1') {
          return {
            data: {
              managementRoles: [
                {
                  id: 'role-entity-viewer',
                  entity: 'entity-1',
                  venue: '',
                  managementPolicy: 'policy-entity-viewer',
                  users: ['user-1'],
                  name: 'Entity Installer - user@example.com',
                },
              ],
            },
          };
        }
        if (url === 'managementPolicy/policy-entity-viewer') {
          return {
            data: {
              id: 'policy-entity-viewer',
              entity: 'entity-1',
              venue: '',
              name: 'Entity Installer Full Access Policy',
              entries: [
                {
                  users: ['user-1'],
                  resources: ['entity'],
                  access: ['READ', 'LIST'],
                  policy: JSON.stringify({
                    type: 'entity',
                    entityId: 'entity-1',
                    includeVenues: true,
                    includeChildEntities: true,
                  }),
                },
              ],
            },
          };
        }
        if (url === 'managementRole?entity=entity-1&venue=venue-1') {
          return { data: { managementRoles: [] } };
        }
        if (url === 'venue/venue-1') {
          return { data: { id: 'venue-1', entity: 'entity-1' } };
        }
        throw new Error(`Unexpected GET ${url}`);
      },
      post: async (url: string, payload: unknown) => {
        postCalls.push([url, payload]);
        if (url === 'managementPolicy/create') return { data: { id: 'policy-venue-admin' } };
        if (url === 'managementRole/create') return { data: { id: 'role-venue-admin' } };
        throw new Error(`Unexpected POST ${url}`);
      },
      put: async (url: string, payload: unknown) => {
        putCalls.push([url, payload]);
        return { data: {} };
      },
    });

    const result = await assignUserAccess({
      access: ['READ', 'MODIFY', 'LIST'],
      resources: ['venue'],
      entityId: 'entity-1',
      roleTemplate: 'Admin',
      scope: 'venue',
      userEmail: 'user@example.com',
      userId: 'user-1',
      venueId: 'venue-1',
    });

    assert.equal(result.policyId, 'policy-venue-admin');
    assert.equal(result.roleId, 'role-venue-admin');
    // Ensure the entity viewer policy/role was NOT mutated
    const mutatedPolicies = putCalls.filter(([url]) => url.includes('policy-entity-viewer'));
    assert.equal(mutatedPolicies.length, 0);
  });

  it('regression: user has existing venue role for venue A, assigning venue B must create/update only venue B', async () => {
    const postCalls: Array<[string, unknown]> = [];
    const putCalls: Array<[string, unknown]> = [];

    setAxiosMocks({
      get: async (url: string) => {
        if (url === 'managementRole?userId=user-1&entityId=entity-1') {
          return {
            data: {
              managementRoles: [
                {
                  id: 'role-venue-a',
                  entity: 'entity-1',
                  venue: 'venue-a',
                  managementPolicy: 'policy-venue-a',
                  users: ['user-1'],
                  name: 'Venue Admin - user@example.com',
                },
              ],
            },
          };
        }
        if (url === 'managementPolicy/policy-venue-a') {
          return {
            data: {
              id: 'policy-venue-a',
              entity: 'entity-1',
              venue: 'venue-a',
              name: 'Venue Admin Full Access Policy',
              entries: [
                {
                  users: ['user-1'],
                  resources: ['venue'],
                  access: ['READ', 'MODIFY', 'LIST'],
                  policy: JSON.stringify({
                    type: 'venue',
                    entityId: 'entity-1',
                    includeVenues: true,
                    includeChildEntities: true,
                  }),
                },
              ],
            },
          };
        }
        if (url === 'managementRole?entity=entity-1&venue=venue-b') {
          return { data: { managementRoles: [] } };
        }
        if (url === 'venue/venue-b') {
          return { data: { id: 'venue-b', entity: 'entity-1' } };
        }
        throw new Error(`Unexpected GET ${url}`);
      },
      post: async (url: string, payload: unknown) => {
        postCalls.push([url, payload]);
        if (url === 'managementPolicy/create') return { data: { id: 'policy-venue-b' } };
        if (url === 'managementRole/create') return { data: { id: 'role-venue-b' } };
        throw new Error(`Unexpected POST ${url}`);
      },
      put: async (url: string, payload: unknown) => {
        putCalls.push([url, payload]);
        return { data: {} };
      },
    });

    const result = await assignUserAccess({
      access: ['READ', 'MODIFY', 'LIST'],
      resources: ['venue'],
      entityId: 'entity-1',
      roleTemplate: 'Admin',
      scope: 'venue',
      userEmail: 'user@example.com',
      userId: 'user-1',
      venueId: 'venue-b',
    });

    assert.equal(result.policyId, 'policy-venue-b');
    assert.equal(result.roleId, 'role-venue-b');
    // Ensure the venue A policy/role was NOT mutated
    const mutatedPolicies = putCalls.filter(([url]) => url.includes('policy-venue-a'));
    assert.equal(mutatedPolicies.length, 0);
  });

  it('regression: user has multiple roles returned in different order, assignment still picks the correct one', async () => {
    const runTestWithOrder = async (rolesOrder: 'installer-first' | 'admin-first') => {
      const putCalls: Array<[string, unknown]> = [];

      const roleInstaller = {
        id: 'role-installer',
        entity: 'entity-1',
        venue: '',
        managementPolicy: 'policy-installer',
        users: ['user-1'],
        name: 'Entity Installer - user@example.com',
      };
      const roleAdmin = {
        id: 'role-admin',
        entity: 'entity-1',
        venue: '',
        managementPolicy: 'policy-admin',
        users: ['user-1'],
        name: 'Entity Admin - user@example.com',
      };

      const roles = rolesOrder === 'installer-first' ? [roleInstaller, roleAdmin] : [roleAdmin, roleInstaller];

      setAxiosMocks({
        get: async (url: string) => {
          if (url === 'managementRole?userId=user-1&entityId=entity-1') {
            return {
              data: {
                managementRoles: roles,
              },
            };
          }
          if (url === 'managementRole?entity=entity-1&venue=') {
            return { data: { managementRoles: [] } };
          }
          if (url === 'managementPolicy/policy-installer') {
            return {
              data: {
                id: 'policy-installer',
                entity: 'entity-1',
                venue: '',
                name: 'Entity Installer Full Access Policy',
                entries: [
                  {
                    users: ['user-1'],
                    resources: ['entity'],
                    access: ['READ', 'LIST'],
                    policy: JSON.stringify({
                      type: 'entity',
                      entityId: 'entity-1',
                      includeVenues: true,
                      includeChildEntities: true,
                    }),
                  },
                ],
              },
            };
          }
          if (url === 'managementPolicy/policy-admin') {
            return {
              data: {
                id: 'policy-admin',
                entity: 'entity-1',
                venue: '',
                name: 'Operator Admin Full Access Policy',
                entries: [
                  {
                    users: ['user-1'],
                    resources: ['entity', 'venue'],
                    access: ['FULL'],
                    policy: JSON.stringify({
                      type: 'entity',
                      entityId: 'entity-1',
                      includeVenues: true,
                      includeChildEntities: true,
                    }),
                  },
                ],
              },
            };
          }
          throw new Error(`Unexpected GET ${url}`);
        },
        post: async () => {
          throw new Error('POST should not be called');
        },
        put: async (url: string, payload: unknown) => {
          putCalls.push([url, payload]);
          return { data: {} };
        },
      });

      const result = await assignUserAccess({
        access: ['FULL'],
        resources: ['entity', 'venue'],
        entityId: 'entity-1',
        roleTemplate: 'Admin',
        scope: 'entity',
        userEmail: 'user@example.com',
        userId: 'user-1',
      });

      assert.equal(result.policyId, 'policy-admin');
      assert.equal(result.roleId, 'role-admin');
      // Ensure only policy-admin was updated via PUT, not policy-installer
      const mutatedInstaller = putCalls.some(([url]) => url.includes('policy-installer'));
      const mutatedAdmin = putCalls.some(([url]) => url.includes('policy-admin'));
      assert.equal(mutatedInstaller, false);
      assert.equal(mutatedAdmin, true);
    };

    await runTestWithOrder('installer-first');
    await runTestWithOrder('admin-first');
  });

  it('builds venue-scoped installer payloads with read/list access only', () => {
    const policy = buildManagementPolicyPayload({
      access: ['READ', 'LIST'],
      entityId: 'entity-1',
      resources: ['venue'],
      roleTemplate: 'Installer',
      scope: 'venue',
      userId: 'user-1',
      venueId: 'venue-1',
    });
    const role = buildManagementRolePayload({
      entityId: 'entity-1',
      policyId: 'policy-1',
      roleTemplate: 'Installer',
      scope: 'venue',
      userEmail: 'user@example.com',
      userId: 'user-1',
      venueId: 'venue-1',
    });

    assert.deepEqual(policy.entries[0]?.resources, ['venue']);
    assert.deepEqual(policy.entries[0]?.access, ['READ', 'LIST']);
    assert.equal(policy.venue, 'venue-1');
    assert.equal(role.venue, 'venue-1');
    assert.equal(role.name, 'Venue Installer - user@example.com');
    assert.equal(role.description, 'Read-only venue access');
  });

  it('regression: existing unrelated policy (shared policy) is not overwritten', async () => {
    const postCalls: Array<[string, unknown]> = [];
    const putCalls: Array<[string, unknown]> = [];

    setAxiosMocks({
      get: async (url: string) => {
        if (url === 'managementRole?userId=user-1&entityId=entity-1') {
          return {
            data: {
              managementRoles: [
                {
                  id: 'role-shared-admin',
                  entity: 'entity-1',
                  venue: '',
                  managementPolicy: 'policy-shared-admin',
                  users: ['user-1', 'user-other'],
                  name: 'Entity Admin - user@example.com',
                },
              ],
            },
          };
        }
        if (url === 'managementPolicy/policy-shared-admin') {
          return {
            data: {
              id: 'policy-shared-admin',
              entity: 'entity-1',
              venue: '',
              name: 'Operator Admin Full Access Policy',
              entries: [
                {
                  users: ['user-other'], // Entries exist for another user!
                  resources: ['entity', 'venue'],
                  access: ['FULL'],
                  policy: JSON.stringify({
                    type: 'entity',
                    entityId: 'entity-1',
                    includeVenues: true,
                    includeChildEntities: true,
                  }),
                },
              ],
            },
          };
        }
        if (url === 'managementRole?entity=entity-1&venue=') {
          return {
            data: {
              managementRoles: [
                {
                  id: 'role-shared-admin',
                  entity: 'entity-1',
                  venue: '',
                  managementPolicy: 'policy-shared-admin',
                  users: ['user-1', 'user-other'],
                  name: 'Entity Admin - user@example.com',
                },
              ],
            },
          };
        }
        throw new Error(`Unexpected GET ${url}`);
      },
      post: async (url: string, payload: unknown) => {
        postCalls.push([url, payload]);
        if (url === 'managementPolicy/create') return { data: { id: 'policy-new-user1' } };
        if (url === 'managementRole/create') return { data: { id: 'role-new-user1' } };
        throw new Error(`Unexpected POST ${url}`);
      },
      put: async (url: string, payload: unknown) => {
        putCalls.push([url, payload]);
        return { data: {} };
      },
    });

    const result = await assignUserAccess({
      access: ['FULL'],
      resources: ['entity', 'venue'],
      entityId: 'entity-1',
      roleTemplate: 'Admin',
      scope: 'entity',
      userEmail: 'user-1@example.com',
      userId: 'user-1',
    });

    assert.equal(result.policyId, 'policy-new-user1');
    // Verify it created a new policy instead of mutating the shared one
    const mutatedShared = putCalls.some(([url]) => url.includes('policy-shared-admin'));
    assert.equal(mutatedShared, false);
  });

  it('regression: shared policy with other users is not overwritten, new policy/role created', async () => {
    const postCalls: Array<[string, unknown]> = [];
    const putCalls: Array<[string, unknown]> = [];

    setAxiosMocks({
      get: async (url: string) => {
        if (url === 'managementRole?userId=user-3&entityId=entity-1') {
          return {
            data: {
              managementRoles: [
                {
                  id: 'role-shared',
                  entity: 'entity-1',
                  venue: '',
                  managementPolicy: 'policy-shared',
                  users: ['user-1', 'user-2'],
                  name: 'Entity Admin - user@example.com',
                },
              ],
            },
          };
        }
        if (url === 'managementPolicy/policy-shared') {
          return {
            data: {
              id: 'policy-shared',
              entity: 'entity-1',
              venue: '',
              name: 'Operator Admin Full Access Policy',
              entries: [
                {
                  users: ['user-1', 'user-2'],
                  resources: ['entity'],
                  access: ['READ'],
                  policy: JSON.stringify({
                    type: 'entity',
                    entityId: 'entity-1',
                    includeVenues: true,
                    includeChildEntities: true,
                  }),
                },
              ],
            },
          };
        }
        if (url === 'managementRole?entity=entity-1&venue=') {
          return {
            data: {
              managementRoles: [
                {
                  id: 'role-shared',
                  entity: 'entity-1',
                  venue: '',
                  managementPolicy: 'policy-shared',
                  users: ['user-1', 'user-2'],
                  name: 'Entity Admin - user@example.com',
                },
              ],
            },
          };
        }
        throw new Error(`Unexpected GET ${url}`);
      },
      post: async (url: string, payload: unknown) => {
        postCalls.push([url, payload]);
        if (url === 'managementPolicy/create') return { data: { id: 'policy-new' } };
        if (url === 'managementRole/create') return { data: { id: 'role-new' } };
        throw new Error(`Unexpected POST ${url}`);
      },
      put: async (url: string, payload: unknown) => {
        putCalls.push([url, payload]);
        return { data: {} };
      },
    });

    const result = await assignUserAccess({
      access: ['FULL'],
      resources: ['entity', 'venue'],
      entityId: 'entity-1',
      roleTemplate: 'Admin',
      scope: 'entity',
      userEmail: 'user-3@example.com',
      userId: 'user-3',
    });

    assert.equal(result.policyId, 'policy-new');
    assert.equal(result.roleId, 'role-new');
    // Verify that the old policy-shared was NOT updated via PUT
    const mutatedShared = putCalls.some(([url]) => url.includes('policy-shared'));
    assert.equal(mutatedShared, false);
  });

  it('regression: isolated policy for current user is successfully merged and updated in place', async () => {
    const putCalls: Array<[string, unknown]> = [];

    setAxiosMocks({
      get: async (url: string) => {
        if (url === 'managementRole?userId=user-1&entityId=entity-1') {
          return {
            data: {
              managementRoles: [
                {
                  id: 'role-1',
                  entity: 'entity-1',
                  venue: '',
                  managementPolicy: 'policy-1',
                  users: ['user-1'],
                  name: 'Entity Admin - user@example.com',
                },
              ],
            },
          };
        }
        if (url === 'managementPolicy/policy-1') {
          return {
            data: {
              id: 'policy-1',
              entity: 'entity-1',
              venue: '',
              name: 'Operator Admin Full Access Policy',
              entries: [
                {
                  users: ['user-1'],
                  resources: ['entity'],
                  access: ['READ'],
                  policy: JSON.stringify({
                    type: 'entity',
                    entityId: 'entity-1',
                    includeVenues: true,
                    includeChildEntities: true,
                  }),
                },
              ],
            },
          };
        }
        if (url === 'managementRole?entity=entity-1&venue=') {
          return { data: { managementRoles: [] } };
        }
        throw new Error(`Unexpected GET ${url}`);
      },
      post: async () => {
        throw new Error('POST should not be called');
      },
      put: async (url: string, payload: unknown) => {
        putCalls.push([url, payload]);
        return { data: {} };
      },
    });

    const result = await assignUserAccess({
      access: ['FULL'],
      resources: ['entity', 'venue'],
      entityId: 'entity-1',
      roleTemplate: 'Admin',
      scope: 'entity',
      userEmail: 'user@example.com',
      userId: 'user-1',
    });

    assert.equal(result.policyId, 'policy-1');
    assert.equal(result.roleId, 'role-1');
    assert.equal(putCalls.length, 1);
    assert.equal(putCalls[0]?.[0], 'managementPolicy/policy-1');

    // Verify that the entry for entity was updated to FULL and venue was added
    const updatedPayload = putCalls[0]?.[1] as { entries: ManagementPolicyEntry[] };
    assert.equal(updatedPayload.entries.length, 1);
    assert.deepEqual(updatedPayload.entries[0]?.users, ['user-1']);
    assert.deepEqual(updatedPayload.entries[0].resources.sort(), ['entity', 'venue'].sort());
    assert.deepEqual(updatedPayload.entries[0].access, ['FULL']);
  });

  it('regression: assignUserAccess PUT payload drops removed resources from existing policy', async () => {
    const putCalls: Array<[string, unknown]> = [];

    setAxiosMocks({
      get: async (url: string) => {
        if (url === 'managementRole?userId=user-1&entityId=entity-1') {
          return {
            data: {
              managementRoles: [
                {
                  id: 'role-1',
                  entity: 'entity-1',
                  venue: '',
                  managementPolicy: 'policy-1',
                  users: ['user-1'],
                  name: 'Entity Admin - user@example.com',
                },
              ],
            },
          };
        }
        if (url === 'managementPolicy/policy-1') {
          return {
            data: {
              id: 'policy-1',
              entity: 'policy-owner-entity',
              venue: '',
              name: 'admin policy',
              entries: [
                {
                  users: ['user-1'],
                  resources: ['entity', 'venue'],
                  access: ['READ'],
                  policy: JSON.stringify({
                    type: 'entity',
                    entityId: 'entity-1',
                    includeVenues: true,
                    includeChildEntities: true,
                  }),
                },
              ],
            },
          };
        }
        if (url === 'managementRole?entity=entity-1&venue=') {
          return { data: { managementRoles: [] } };
        }
        throw new Error(`Unexpected GET ${url}`);
      },
      post: async () => {
        throw new Error('POST should not be called');
      },
      put: async (url: string, payload: unknown) => {
        putCalls.push([url, payload]);
        return { data: {} };
      },
    });

    const result = await assignUserAccess({
      access: [],
      resources: ['operator', 'inventory'],
      resourcePermissions: [
        { resource: 'operator', access: ['READ'] },
        { resource: 'inventory', access: ['READ'] },
      ],
      entityId: 'entity-1',
      roleTemplate: 'Admin',
      scope: 'entity',
      userEmail: 'user@example.com',
      userId: 'user-1',
      policyName: 'admin policy',
    });

    assert.equal(result.policyId, 'policy-1');
    assert.equal(result.roleId, 'role-1');
    assert.equal(putCalls.length, 1);
    assert.equal(putCalls[0]?.[0], 'managementPolicy/policy-1');

    const updatedPayload = putCalls[0]?.[1] as { entries: ManagementPolicyEntry[] };
    const resources = updatedPayload.entries
      .filter((entry) => entry.users.includes('user-1'))
      .flatMap((entry) => entry.resources)
      .sort();

    assert.deepEqual(resources, ['inventory', 'operator']);
  });

  it('regression: policy shared by multiple roles is not overwritten', async () => {
    const postCalls: Array<[string, unknown]> = [];
    const putCalls: Array<[string, unknown]> = [];

    setAxiosMocks({
      get: async (url: string) => {
        if (url === 'managementRole?userId=user-1&entityId=entity-1') {
          return {
            data: {
              managementRoles: [
                {
                  id: 'role-user-1',
                  entity: 'entity-1',
                  venue: '',
                  managementPolicy: 'policy-shared',
                  users: ['user-1'],
                  name: 'Entity Admin - user-1@example.com',
                },
              ],
            },
          };
        }
        if (url === 'managementPolicy/policy-shared') {
          return {
            data: {
              id: 'policy-shared',
              entity: 'entity-1',
              venue: '',
              name: 'Operator Admin Full Access Policy',
              entries: [
                {
                  users: ['user-1'],
                  resources: ['entity'],
                  access: ['READ'],
                  policy: JSON.stringify({
                    type: 'entity',
                    entityId: 'entity-1',
                    includeVenues: true,
                    includeChildEntities: true,
                  }),
                },
              ],
            },
          };
        }
        if (url === 'managementRole?entity=entity-1&venue=') {
          return {
            data: {
              managementRoles: [
                {
                  id: 'role-user-1',
                  entity: 'entity-1',
                  venue: '',
                  managementPolicy: 'policy-shared',
                  users: ['user-1'],
                  name: 'Entity Admin - user-1@example.com',
                },
                {
                  id: 'role-user-2',
                  entity: 'entity-1',
                  venue: '',
                  managementPolicy: 'policy-shared',
                  users: ['user-2'],
                  name: 'Entity Admin - user-2@example.com',
                },
              ],
            },
          };
        }
        throw new Error(`Unexpected GET ${url}`);
      },
      post: async (url: string, payload: unknown) => {
        postCalls.push([url, payload]);
        if (url === 'managementPolicy/create') return { data: { id: 'policy-new' } };
        if (url === 'managementRole/create') return { data: { id: 'role-new' } };
        throw new Error(`Unexpected POST ${url}`);
      },
      put: async (url: string, payload: unknown) => {
        putCalls.push([url, payload]);
        return { data: {} };
      },
    });

    const result = await assignUserAccess({
      access: ['FULL'],
      resources: ['entity', 'venue'],
      entityId: 'entity-1',
      roleTemplate: 'Admin',
      scope: 'entity',
      userEmail: 'user-1@example.com',
      userId: 'user-1',
    });

    assert.equal(result.policyId, 'policy-new');
    assert.equal(result.roleId, 'role-user-1');
    const mutatedPolicy = putCalls.some(([url]) => url.includes('policy-shared'));
    assert.equal(mutatedPolicy, false);
  });

  it('regression: updating one resource permission preserves unrelated resources from the same policy', async () => {
    const putCalls: Array<[string, unknown]> = [];

    setAxiosMocks({
      get: async (url: string) => {
        if (url === 'managementRole?userId=user-1&entityId=entity-1') {
          return {
            data: {
              managementRoles: [
                {
                  id: 'role-1',
                  entity: 'entity-1',
                  venue: '',
                  managementPolicy: 'policy-1',
                  users: ['user-1'],
                  name: 'Entity Admin - user@example.com',
                },
              ],
            },
          };
        }
        if (url === 'managementPolicy/policy-1') {
          return {
            data: {
              id: 'policy-1',
              entity: 'entity-1',
              venue: '',
              name: 'Operator Admin Full Access Policy',
              entries: [
                {
                  users: ['user-1'],
                  resources: ['entity'],
                  access: ['READ'],
                  policy: JSON.stringify({
                    type: 'entity',
                    entityId: 'entity-1',
                    includeVenues: true,
                    includeChildEntities: true,
                  }),
                },
                {
                  users: ['user-1'],
                  resources: ['unrelated-resource'],
                  access: ['MODIFY'],
                  policy: JSON.stringify({
                    type: 'entity',
                    entityId: 'entity-1',
                    includeVenues: true,
                    includeChildEntities: true,
                  }),
                },
              ],
            },
          };
        }
        if (url === 'managementRole?entity=entity-1&venue=') {
          return { data: { managementRoles: [] } };
        }
        throw new Error(`Unexpected GET ${url}`);
      },
      post: async () => {
        throw new Error('POST should not be called');
      },
      put: async (url: string, payload: unknown) => {
        putCalls.push([url, payload]);
        return { data: {} };
      },
    });

    const result = await assignUserAccess({
      access: ['FULL'],
      resources: ['entity'],
      entityId: 'entity-1',
      roleTemplate: 'Admin',
      scope: 'entity',
      userEmail: 'user@example.com',
      userId: 'user-1',
    });

    assert.equal(result.policyId, 'policy-1');
    const updatedPayload = putCalls[0]?.[1] as { entries: ManagementPolicyEntry[] };

    assert.equal(updatedPayload.entries.length, 2);
    const entityEntry = updatedPayload.entries.find((e) => e.resources.includes('entity'));
    const unrelatedEntry = updatedPayload.entries.find((e) => e.resources.includes('unrelated-resource'));

    assert.ok(entityEntry);
    assert.deepEqual(entityEntry.access, ['FULL']);
    assert.ok(unrelatedEntry);
    assert.deepEqual(unrelatedEntry.access, ['MODIFY']);
  });

  it('regression: duplicate permissions/users are merged correctly and not duplicated', () => {
    const existing: ManagementPolicyEntry[] = [
      {
        users: ['user-1', 'user-1'],
        resources: ['entity', 'entity'],
        access: ['READ', 'READ'],
        policy: JSON.stringify({
          type: 'entity',
          entityId: 'entity-1',
          includeVenues: true,
          includeChildEntities: true,
        }),
      },
    ];

    const target: ManagementPolicyEntry[] = [
      {
        users: ['user-1'],
        resources: ['entity'],
        access: ['READ'],
        policy: JSON.stringify({
          type: 'entity',
          entityId: 'entity-1',
          includeVenues: true,
          includeChildEntities: true,
        }),
      },
    ];

    const merged = mergePolicyEntries(existing, target, 'user-1');
    assert.equal(merged.length, 1);
    assert.deepEqual(merged[0]?.users, ['user-1']);
    assert.deepEqual(merged[0]?.resources, ['entity']);
    assert.deepEqual(merged[0]?.access, ['READ']);
  });

  it('regression: updating a user policy removes resources no longer selected', () => {
    const policyContext = JSON.stringify({
      type: 'entity',
      entityId: 'entity-1',
      includeVenues: true,
      includeChildEntities: true,
    });
    const existing: ManagementPolicyEntry[] = [
      {
        users: ['user-1'],
        resources: ['entity', 'venue'],
        access: ['READ'],
        policy: policyContext,
      },
      {
        users: ['user-2'],
        resources: ['venue'],
        access: ['READ'],
        policy: policyContext,
      },
    ];
    const target: ManagementPolicyEntry[] = [
      {
        users: ['user-1'],
        resources: ['operator'],
        access: ['READ'],
        policy: policyContext,
      },
      {
        users: ['user-1'],
        resources: ['inventory'],
        access: ['READ'],
        policy: policyContext,
      },
    ];

    const merged = mergePolicyEntries(existing, target, 'user-1');
    const userOneResources = merged
      .filter((entry) => entry.users.includes('user-1'))
      .flatMap((entry) => entry.resources)
      .sort();
    const userTwoResources = merged
      .filter((entry) => entry.users.includes('user-2'))
      .flatMap((entry) => entry.resources)
      .sort();

    assert.deepEqual(userOneResources, ['inventory', 'operator']);
    assert.deepEqual(userTwoResources, ['venue']);
  });

  it('security: Admin attempts to grant managementPolicy + FULL -> allowed', async () => {
    const postCalls: unknown[][] = [];
    const putCalls: unknown[][] = [];
    setAxiosMocks({
      get: async (url: string) => {
        if (url === 'managementRole?userId=admin-1&entityId=entity-1') {
          return {
            data: {
              managementRoles: [
                {
                  id: 'role-admin-1',
                  name: 'Admin Role',
                  entity: 'entity-1',
                  managementPolicyId: 'policy-admin-1',
                  users: ['admin-1'],
                },
              ],
            },
          };
        }
        throw new Error(`Unexpected GET ${url}`);
      },
      post: async (url: string, payload: unknown) => {
        postCalls.push([url, payload]);
        if (url === 'managementPolicy/create') return { data: { id: 'policy-admin-1' } };
        if (url === 'managementRole/create') return { data: { id: 'role-admin-1' } };
        throw new Error(`Unexpected POST ${url}`);
      },
      put: async (url: string, payload: unknown) => {
        putCalls.push([url, payload]);
        return { data: {} };
      },
    });

    const result = await assignUserAccess({
      access: ['FULL'],
      resources: ['managementPolicy'],
      entityId: 'entity-1',
      roleTemplate: 'Custom',
      scope: 'entity',
      userEmail: 'target@example.com',
      userId: 'user-2',
      currentUserRole: 'admin',
      currentUserId: 'admin-1',
    });

    assert.equal(result.policyId, 'policy-admin-1');
    assert.equal(result.roleId, 'role-admin-1');
    assert.equal(postCalls.map(([url]) => url).includes('managementPolicy/create'), true);
    assert.equal(postCalls.map(([url]) => url).includes('managementRole/create'), true);
  });

  it('security: Admin attempts to grant managementRole + CREATE -> allowed', async () => {
    const postCalls: unknown[][] = [];
    const putCalls: unknown[][] = [];
    setAxiosMocks({
      get: async (url: string) => {
        if (url === 'managementRole?userId=admin-1&entityId=entity-1') {
          return {
            data: {
              managementRoles: [
                {
                  id: 'role-admin-1',
                  name: 'Admin Role',
                  entity: 'entity-1',
                  managementPolicyId: 'policy-admin-1',
                  users: ['admin-1'],
                },
              ],
            },
          };
        }
        throw new Error(`Unexpected GET ${url}`);
      },
      post: async (url: string, payload: unknown) => {
        postCalls.push([url, payload]);
        if (url === 'managementPolicy/create') return { data: { id: 'policy-admin-1' } };
        if (url === 'managementRole/create') return { data: { id: 'role-admin-1' } };
        throw new Error(`Unexpected POST ${url}`);
      },
      put: async (url: string, payload: unknown) => {
        putCalls.push([url, payload]);
        return { data: {} };
      },
    });

    const result = await assignUserAccess({
      access: ['CREATE'],
      resources: ['managementRole'],
      entityId: 'entity-1',
      roleTemplate: 'Custom',
      scope: 'entity',
      userEmail: 'target@example.com',
      userId: 'user-2',
      currentUserRole: 'admin',
      currentUserId: 'admin-1',
    });

    assert.equal(result.policyId, 'policy-admin-1');
    assert.equal(result.roleId, 'role-admin-1');
    assert.equal(postCalls.map(([url]) => url).includes('managementPolicy/create'), true);
    assert.equal(postCalls.map(([url]) => url).includes('managementRole/create'), true);
  });

  it('security: Root grants privileged permissions -> allowed', async () => {
    const putCalls: unknown[][] = [];
    const postCalls: unknown[][] = [];
    setAxiosMocks({
      get: async (url: string) => {
        if (url.startsWith('managementRole?userId=')) {
          return { data: { managementRoles: [] } };
        }
        if (url.startsWith('managementRole?entity=')) {
          return { data: { managementRoles: [] } };
        }
        throw new Error(`Unexpected GET ${url}`);
      },
      post: async (url: string, payload: unknown) => {
        postCalls.push([url, payload]);
        if (url === 'managementPolicy/create') {
          return { data: { id: 'new-policy-1' } };
        }
        if (url === 'managementRole/create') {
          return { data: { id: 'new-role-1' } };
        }
        throw new Error(`Unexpected POST ${url}`);
      },
      put: async (url: string, payload: unknown) => {
        putCalls.push([url, payload]);
        return { data: {} };
      },
    });

    const result = await assignUserAccess({
      access: ['FULL'],
      resources: ['managementPolicy'],
      entityId: 'entity-1',
      roleTemplate: 'Custom',
      scope: 'entity',
      userEmail: 'target@example.com',
      userId: 'user-2',
      currentUserRole: 'root',
      currentUserId: 'root-1',
    });

    assert.equal(result.policyId, 'new-policy-1');
    assert.equal(result.roleId, 'new-role-1');
    assert.equal(postCalls.length, 2);
  });

  it('security: Admin attempts to assign permissions beyond their own -> rejected', async () => {
    setAxiosMocks({
      get: async (url: string) => {
        if (url === 'managementRole?userId=admin-1&entityId=entity-1') {
          return {
            data: {
              managementRoles: [
                {
                  id: 'role-admin-1',
                  name: 'Admin Role',
                  entity: 'entity-1',
                  managementPolicyId: 'policy-admin-1',
                  users: ['admin-1'],
                },
              ],
            },
          };
        }
        if (url === 'managementPolicy/policy-admin-1') {
          return {
            data: {
              id: 'policy-admin-1',
              name: 'Admin Policy',
              entity: 'entity-1',
              entries: [
                {
                  users: ['admin-1'],
                  resources: ['venue'],
                  access: ['READ'],
                  policy: JSON.stringify({
                    type: 'entity',
                    entityId: 'entity-1',
                    includeVenues: true,
                    includeChildEntities: true,
                  }),
                },
              ],
            },
          };
        }
        throw new Error(`Unexpected GET ${url}`);
      },
    });

    await assert.rejects(
      assignUserAccess({
        access: ['FULL'],
        resources: ['venue'],
        entityId: 'entity-1',
        roleTemplate: 'Custom',
        scope: 'entity',
        userEmail: 'target@example.com',
        userId: 'user-2',
        currentUserRole: 'admin',
        currentUserId: 'admin-1',
      }),
      (err: Error) =>
        err.message.includes(
          'Privilege escalation: You cannot grant permission FULL on venue as it exceeds your own permissions',
        ),
    );
  });

  it('security: Direct API request bypassing UI (missing context) -> rejected', async () => {
    await assert.rejects(
      assignUserAccess({
        access: ['READ'],
        resources: ['venue'],
        entityId: 'entity-1',
        roleTemplate: 'Custom',
        scope: 'entity',
        userEmail: 'target@example.com',
        userId: 'user-2',
        currentUserRole: 'admin',
      }),
      (err: Error) => err.message.includes('Caller authentication context missing: cannot verify permissions'),
    );
  });

  it('security: Admin cannot manage an unauthorized entity -> rejected', async () => {
    setAxiosMocks({
      get: async (url: string) => {
        if (url === 'managementRole?userId=admin-1&entityId=entity-2') {
          return { data: { managementRoles: [] } };
        }
        throw new Error(`Unexpected GET ${url}`);
      },
    });

    await assert.rejects(
      assignUserAccess({
        access: ['READ'],
        resources: ['venue'],
        entityId: 'entity-2',
        roleTemplate: 'Custom',
        scope: 'entity',
        userEmail: 'target@example.com',
        userId: 'user-2',
        currentUserRole: 'admin',
        currentUserId: 'admin-1',
      }),
      (err: Error) => err.message.includes('You are not authorized to manage this entity'),
    );
  });

  it('security: Admin cannot manage an unauthorized venue -> rejected', async () => {
    setAxiosMocks({
      get: async (url: string) => {
        if (url === 'managementRole?userId=admin-1&entityId=entity-1') {
          return {
            data: {
              managementRoles: [
                {
                  id: 'role-admin-1',
                  name: 'Admin Role',
                  entity: 'entity-1',
                  venue: 'venue-1',
                  managementPolicyId: 'policy-admin-1',
                  users: ['admin-1'],
                },
              ],
            },
          };
        }
        if (url === 'venue/venue-2') {
          return {
            data: {
              id: 'venue-2',
              name: 'Venue 2',
              entity: 'entity-1',
            },
          };
        }
        throw new Error(`Unexpected GET ${url}`);
      },
    });

    await assert.rejects(
      assignUserAccess({
        access: ['READ'],
        resources: ['venue'],
        entityId: 'entity-1',
        roleTemplate: 'Custom',
        scope: 'venue',
        venueId: 'venue-2',
        userEmail: 'target@example.com',
        userId: 'user-2',
        currentUserRole: 'admin',
        currentUserId: 'admin-1',
      }),
      (err: Error) => err.message.includes('You are not authorized to manage this venue'),
    );
  });

  it('security: Venue ID is required for venue scope -> rejected', async () => {
    setAxiosMocks({
      get: async (url: string) => {
        if (url === 'managementRole?userId=admin-1&entityId=entity-1') {
          return {
            data: {
              managementRoles: [
                {
                  id: 'role-admin-1',
                  name: 'Admin Role',
                  entity: 'entity-1',
                  managementPolicyId: 'policy-admin-1',
                  users: ['admin-1'],
                },
              ],
            },
          };
        }
        throw new Error(`Unexpected GET ${url}`);
      },
    });

    await assert.rejects(
      assignUserAccess({
        access: ['READ'],
        resources: ['venue'],
        entityId: 'entity-1',
        roleTemplate: 'Custom',
        scope: 'venue',
        venueId: '',
        userEmail: 'target@example.com',
        userId: 'user-2',
        currentUserRole: 'admin',
        currentUserId: 'admin-1',
      }),
      (err: Error) => err.message.includes('Venue ID is required for venue scope'),
    );
  });

  it('security: Nonexistent venue ID -> rejected', async () => {
    setAxiosMocks({
      get: async (url: string) => {
        if (url === 'managementRole?userId=admin-1&entityId=entity-1') {
          return {
            data: {
              managementRoles: [
                {
                  id: 'role-admin-1',
                  name: 'Admin Role',
                  entity: 'entity-1',
                  managementPolicyId: 'policy-admin-1',
                  users: ['admin-1'],
                },
              ],
            },
          };
        }
        if (url === 'venue/venue-nonexistent') {
          const err = new Error('Not Found');
          (err as { response?: { status: number } }).response = { status: 404 };
          throw err;
        }
        throw new Error(`Unexpected GET ${url}`);
      },
    });

    await assert.rejects(
      assignUserAccess({
        access: ['READ'],
        resources: ['venue'],
        entityId: 'entity-1',
        roleTemplate: 'Custom',
        scope: 'venue',
        venueId: 'venue-nonexistent',
        userEmail: 'target@example.com',
        userId: 'user-2',
        currentUserRole: 'admin',
        currentUserId: 'admin-1',
      }),
      (err: Error) => err.message.includes('Venue does not exist'),
    );
  });

  it('security: Mismatched entity and venue -> rejected', async () => {
    setAxiosMocks({
      get: async (url: string) => {
        if (url === 'managementRole?userId=admin-1&entityId=entity-1') {
          return {
            data: {
              managementRoles: [
                {
                  id: 'role-admin-1',
                  name: 'Admin Role',
                  entity: 'entity-1',
                  managementPolicyId: 'policy-admin-1',
                  users: ['admin-1'],
                },
              ],
            },
          };
        }
        if (url === 'venue/venue-xyz') {
          return {
            data: {
              id: 'venue-xyz',
              name: 'Venue XYZ',
              entity: 'entity-2',
            },
          };
        }
        throw new Error(`Unexpected GET ${url}`);
      },
    });

    await assert.rejects(
      assignUserAccess({
        access: ['READ'],
        resources: ['venue'],
        entityId: 'entity-1',
        roleTemplate: 'Custom',
        scope: 'venue',
        venueId: 'venue-xyz',
        userEmail: 'target@example.com',
        userId: 'user-2',
        currentUserRole: 'admin',
        currentUserId: 'admin-1',
      }),
      (err: Error) => err.message.includes('Cross-entity venue assignment is rejected'),
    );
  });

  it('security: Root user submit mismatched entity and venue -> rejected', async () => {
    setAxiosMocks({
      get: async (url: string) => {
        if (url === 'venue/venue-xyz') {
          return {
            data: {
              id: 'venue-xyz',
              name: 'Venue XYZ',
              entity: 'entity-2',
            },
          };
        }
        throw new Error(`Unexpected GET ${url}`);
      },
    });

    await assert.rejects(
      assignUserAccess({
        access: ['READ'],
        resources: ['venue'],
        entityId: 'entity-1',
        roleTemplate: 'Custom',
        scope: 'venue',
        venueId: 'venue-xyz',
        userEmail: 'target@example.com',
        userId: 'user-2',
        currentUserRole: 'root',
        currentUserId: 'root-1',
      }),
      (err: Error) => err.message.includes('Cross-entity venue assignment is rejected'),
    );
  });

  describe('isAssignAccessDisabled helper', () => {
    const initialValues: AssignAccessFormValues = {
      scope: 'entity',
      entityId: 'entity-1',
      venueId: '',
      roleTemplate: 'Admin',
      policyName: '',
      policyDescription: '',
      userEmail: 'user@example.com',
      userId: 'user-1',
      resourcePermissions: [],
    };

    it('is disabled by default when no changes are made', () => {
      const disabled = isAssignAccessDisabled({
        initialValues,
        currentValues: initialValues,
        isValid: true,
        isSubmitting: false,
      });
      assert.equal(disabled, true);
    });

    it('is enabled when a resource is changed', () => {
      const currentValues: AssignAccessFormValues = {
        ...initialValues,
        resourcePermissions: [{ resource: 'entity', access: ['FULL'] }],
      };
      const disabled = isAssignAccessDisabled({
        initialValues,
        currentValues,
        isValid: true,
        isSubmitting: false,
      });
      assert.equal(disabled, false);
    });

    it('is disabled again after changes are reverted', () => {
      const currentValues: AssignAccessFormValues = {
        ...initialValues,
        resourcePermissions: [],
      };
      const disabled = isAssignAccessDisabled({
        initialValues,
        currentValues,
        isValid: true,
        isSubmitting: false,
      });
      assert.equal(disabled, true);
    });

    it('is disabled when isSubmitting is true or isValid is false', () => {
      const currentValues: AssignAccessFormValues = {
        ...initialValues,
        resourcePermissions: [{ resource: 'entity', access: ['FULL'] }],
      };
      const disabledSubmitting = isAssignAccessDisabled({
        initialValues,
        currentValues,
        isValid: true,
        isSubmitting: true,
      });
      const disabledInvalid = isAssignAccessDisabled({
        initialValues,
        currentValues,
        isValid: false,
        isSubmitting: false,
      });
      assert.equal(disabledSubmitting, true);
      assert.equal(disabledInvalid, true);
    });
  });

  it('submits successfully with zero resources (empty resourcePermissions)', async () => {
    const postCalls: Array<[string, unknown]> = [];

    setAxiosMocks({
      get: async (url: string) => {
        if (url === 'managementRole?userId=user-1&entityId=entity-1') {
          return { data: { managementRoles: [] } };
        }
        if (url === 'managementRole?entity=entity-1&venue=') {
          return { data: { managementRoles: [] } };
        }
        throw new Error(`Unexpected GET ${url}`);
      },
      post: async (url: string, payload: unknown) => {
        postCalls.push([url, payload]);
        if (url === 'managementPolicy/create') return { data: { id: 'policy-empty' } };
        if (url === 'managementRole/create') return { data: { id: 'role-empty' } };
        throw new Error(`Unexpected POST ${url}`);
      },
    });

    const result = await assignUserAccess({
      access: [],
      resources: [],
      resourcePermissions: [],
      entityId: 'entity-1',
      roleTemplate: 'Admin',
      scope: 'entity',
      userEmail: 'user@example.com',
      userId: 'user-1',
    });

    assert.equal(result.policyId, 'policy-empty');
    assert.equal(result.roleId, 'role-empty');
    assert.equal(postCalls.length, 2);
    assert.equal(postCalls[0]?.[0], 'managementPolicy/create');

    const policyPayload = postCalls[0]?.[1] as { entries: Array<{ resources: string[]; access: string[] }> };
    assert.deepEqual(policyPayload.entries, []);
  });

  describe('Access Policy Discoverability flow', () => {
    it('fetches all management roles for a user', async () => {
      const getCalls: string[] = [];

      setAxiosMocks({
        get: async (url: string) => {
          getCalls.push(url);
          if (url === 'managementRole?userId=user-1') {
            return {
              data: {
                managementRoles: [
                  {
                    id: 'role-1',
                    entity: 'entity-1',
                    venue: '',
                    managementPolicy: 'policy-1',
                    users: ['user-1'],
                    name: 'Entity Admin',
                  },
                ],
              },
            };
          }
          throw new Error(`Unexpected GET ${url}`);
        },
      });

      const roles = await getManagementRolesForUser({ userId: 'user-1' });

      assert.equal(getCalls.length, 1);
      assert.equal(getCalls[0], 'managementRole?userId=user-1');
      assert.equal(roles.length, 1);
      assert.equal(roles[0]?.id, 'role-1');
    });

    it('deletes a management policy by id', async () => {
      const deleteCalls: string[] = [];

      setAxiosMocks({
        delete: async (url: string) => {
          deleteCalls.push(url);
          return { data: {} };
        },
      });

      await deleteManagementPolicy({ policyId: 'policy-1' });

      assert.deepEqual(deleteCalls, ['managementPolicy/policy-1']);
    });

    it('determines if the assign access button should be disabled under various scenarios', () => {
      const initialValues: AssignAccessFormValues = {
        scope: 'entity',
        entityId: 'entity-1',
        venueId: '',
        roleTemplate: 'Admin',
        policyName: '',
        policyDescription: '',
        userEmail: 'user@example.com',
        userId: 'user-1',
        resourcePermissions: [],
      };

      // Scenario: initial button disabled state (no policy / no changes)
      let disabled = isAssignAccessDisabled({
        initialValues,
        currentValues: initialValues,
        isValid: true,
        isSubmitting: false,
      });
      assert.equal(disabled, true);

      // Scenario: button enabled after resource change
      const changedValues: AssignAccessFormValues = {
        ...initialValues,
        resourcePermissions: [{ resource: 'entity', access: ['FULL'] }],
      };
      disabled = isAssignAccessDisabled({
        initialValues,
        currentValues: changedValues,
        isValid: true,
        isSubmitting: false,
      });
      assert.equal(disabled, false);

      // Scenario: button disabled again after reverting changes
      const revertedValues: AssignAccessFormValues = {
        ...initialValues,
        resourcePermissions: [],
      };
      disabled = isAssignAccessDisabled({
        initialValues,
        currentValues: revertedValues,
        isValid: true,
        isSubmitting: false,
      });
      assert.equal(disabled, true);
    });
  });
});
