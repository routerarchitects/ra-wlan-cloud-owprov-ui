import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { axiosProv } from 'utils/axiosInstances';
import {
  assignUserAccess,
  buildManagementPolicyPayload,
  buildManagementRolePayload,
  getExistingManagementPolicyForUser,
  getMatchingManagementPolicy,
  getMatchingManagementRole,
} from './ManagementAccess';

type MockFn = (...args: unknown[]) => Promise<unknown> | unknown;

const originalGet = axiosProv.get;
const originalPost = axiosProv.post;
const originalPut = axiosProv.put;

const restoreAxios = () => {
  axiosProv.get = originalGet;
  axiosProv.post = originalPost;
  axiosProv.put = originalPut;
};

const setAxiosMocks = ({ get, post, put }: { get?: MockFn; post?: MockFn; put?: MockFn }) => {
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
      name: 'Operator Admin Full Access Policy',
      description: 'Full access policy for Operator admin inside operator entity scope',
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
    assert.deepEqual(getCalls, ['managementRole?userId=user-1&entityId=entity-1', 'managementPolicy/policy-1']);
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
    assert.deepEqual(postCalls.map(([url]) => url), ['managementPolicy/create', 'managementRole/create']);
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
          name: 'Entity Viewer Full Access Policy',
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
});
