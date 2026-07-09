import { useToast } from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { VenueApiResponse } from 'models/Venue';
import { axiosProv } from 'utils/axiosInstances';

export type ManagementScope = 'entity' | 'venue';
export type ManagementRoleTemplate = 'Admin' | 'Installer' | 'Support' | 'Custom';
export type ManagementAccessPermission = 'NOACCESS' | 'READ' | 'MODIFY' | 'DELETE' | 'LIST' | 'CREATE' | 'FULL';
export type ManagementResourceAccess = {
  access: ManagementAccessPermission[];
  resource: string;
};

export type ManagementPolicyEntry = {
  users: string[];
  resources: string[];
  access: ManagementAccessPermission[];
  policy: string;
};

export type ManagementPolicyApiResponse = {
  access?: ManagementAccessPermission[];
  created?: number;
  description?: string;
  entries?: ManagementPolicyEntry[];
  entity?: string;
  id: string;
  modified?: number;
  name: string;
  policy?: string;
  resources?: string[];
  users?: string[];
  venue?: string;
  [key: string]: unknown;
};

export type ManagementRoleApiResponse = {
  created?: number;
  description?: string;
  entity?: string;
  id: string;
  managementPolicy?: string;
  managementPolicyId?: string;
  modified?: number;
  name: string;
  users: string[];
  venue?: string;
  [key: string]: unknown;
};

export type ManagementPolicyRequest = {
  description?: string;
  entries: ManagementPolicyEntry[];
  entity: string;
  name?: string;
  venue?: string;
};

export type ManagementRoleRequest = {
  description?: string;
  entity: string;
  managementPolicy: string;
  name: string;
  users: string[];
  venue: string;
};

export type AssignUserAccessInput = {
  access: ManagementAccessPermission[];
  entityId: string;
  resources: string[];
  roleTemplate: ManagementRoleTemplate;
  scope: ManagementScope;
  userEmail: string;
  userId: string;
  venueId?: string;
  resourcePermissions?: ManagementResourceAccess[];
  policyName?: string;
  policyDescription?: string;
  currentUserRole?: string;
  currentUserSecurityPolicy?: string;
  currentUserId?: string;
};

export type ManagementAccessResult = {
  entityId: string;
  policyId: string;
  roleId: string;
  roleUpdated: boolean;
  venueId: string;
};

type ManagementPolicyQueryResponse = {
  managementPolicies?: ManagementPolicyApiResponse[];
  policies?: ManagementPolicyApiResponse[];
  entries?: ManagementPolicyApiResponse[];
  managementPolicy?: ManagementPolicyApiResponse[];
};

type ManagementRoleQueryResponse = {
  managementRoles?: ManagementRoleApiResponse[];
  roles?: ManagementRoleApiResponse[];
  entries?: ManagementRoleApiResponse[];
  managementRole?: ManagementRoleApiResponse[];
};

export const MANAGEMENT_ACCESS_PERMISSIONS: ManagementAccessPermission[] = [
  'NOACCESS',
  'READ',
  'MODIFY',
  'DELETE',
  'LIST',
  'CREATE',
  'FULL',
];

const TEMPLATE_ACCESS: Record<
  ManagementRoleTemplate,
  Record<
    ManagementScope,
    { access: ManagementAccessPermission[]; description: string; namePrefix: string; policyScope: string }
  >
> = {
  Admin: {
    entity: {
      access: ['FULL'],
      description: 'Full entity access',
      namePrefix: 'Entity Admin',
      policyScope: 'entity-admin',
    },
    venue: {
      access: ['READ', 'MODIFY', 'LIST'],
      description: 'Venue admin access',
      namePrefix: 'Venue Admin',
      policyScope: 'venue-admin',
    },
  },
  Installer: {
    entity: {
      access: ['READ', 'LIST'],
      description: 'Read-only entity access',
      namePrefix: 'Entity Installer',
      policyScope: 'entity-installer',
    },
    venue: {
      access: ['READ', 'LIST'],
      description: 'Read-only venue access',
      namePrefix: 'Venue Installer',
      policyScope: 'venue-installer',
    },
  },
  Support: {
    entity: {
      access: ['READ', 'MODIFY', 'LIST'],
      description: 'Support entity access',
      namePrefix: 'Entity Support',
      policyScope: 'entity-support',
    },
    venue: {
      access: ['READ', 'MODIFY', 'LIST'],
      description: 'Support venue access',
      namePrefix: 'Venue Support',
      policyScope: 'venue-support',
    },
  },
  Custom: {
    entity: {
      access: [],
      description: 'Custom entity access',
      namePrefix: 'Entity Custom',
      policyScope: 'entity-custom',
    },
    venue: {
      access: [],
      description: 'Custom venue access',
      namePrefix: 'Venue Custom',
      policyScope: 'venue-custom',
    },
  },
};

const getCollection = <T>(response: unknown, keys: string[]) => {
  if (Array.isArray(response)) return response as T[];

  if (typeof response !== 'object' || response === null) return [] as T[];

  const typedResponse = response as Record<string, unknown>;

  for (const key of keys) {
    if (Array.isArray(typedResponse[key])) return typedResponse[key] as T[];
  }

  return [] as T[];
};

const parsePolicyScope = (policy: string) => {
  try {
    const parsed = JSON.parse(policy) as {
      entityId?: string;
      includeChildEntities?: boolean;
      includeVenues?: boolean;
      scope?: string;
      template?: string;
      type?: string;
    };
    return {
      entityId: parsed.entityId ?? '',
      includeChildEntities: parsed.includeChildEntities ?? false,
      includeVenues: parsed.includeVenues ?? false,
      scope: parsed.type ?? parsed.scope ?? '',
      template: parsed.template ?? '',
    };
  } catch {
    return {
      entityId: '',
      includeChildEntities: false,
      includeVenues: false,
      scope: '',
      template: '',
    };
  }
};

const buildTemplateContext = (scope: ManagementScope, roleTemplate: ManagementRoleTemplate) =>
  TEMPLATE_ACCESS[roleTemplate][scope];

type ManagementPolicyContext = {
  entityId: string;
  includeChildEntities: boolean;
  includeVenues: boolean;
  type: ManagementScope;
};

const buildManagementPolicyContext = ({
  entityId,
  scope,
}: {
  entityId: string;
  scope: ManagementScope;
}): ManagementPolicyContext => ({
  type: scope,
  entityId,
  includeVenues: true,
  includeChildEntities: true,
});

const buildManagementPolicyEntries = ({
  access,
  entityId,
  resources,
  resourcePermissions,
  scope,
  userId,
}: {
  access: ManagementAccessPermission[];
  entityId: string;
  resources: string[];
  resourcePermissions?: ManagementResourceAccess[];
  scope: ManagementScope;
  userId: string;
}) => {
  const context = buildManagementPolicyContext({ entityId, scope });

  if (resourcePermissions !== undefined) {
    return resourcePermissions
      .filter(({ resource }) => resource !== '')
      .map(({ resource, access: resourceAccess }) => ({
        users: [userId],
        resources: [resource],
        access: resourceAccess,
        policy: JSON.stringify(context),
      })) satisfies ManagementPolicyEntry[];
  }

  return [
    {
      users: [userId],
      resources,
      access,
      policy: JSON.stringify(context),
    },
  ] satisfies ManagementPolicyEntry[];
};

export const getTemplateAccess = (scope: ManagementScope, roleTemplate: ManagementRoleTemplate) =>
  buildTemplateContext(scope, roleTemplate).access;

/* eslint-disable @typescript-eslint/no-unused-vars */
export const buildManagementPolicyPayload = ({
  access,
  entityId,
  roleTemplate,
  resources,
  resourcePermissions,
  scope,
  userId,
  venueId,
  policyName,
  policyDescription,
}: {
  access: ManagementAccessPermission[];
  entityId: string;
  resources: string[];
  resourcePermissions?: ManagementResourceAccess[];
  roleTemplate: ManagementRoleTemplate;
  scope: ManagementScope;
  userId: string;
  venueId?: string;
  policyName?: string;
  policyDescription?: string;
}): ManagementPolicyRequest => ({
  entries: buildManagementPolicyEntries({
    access,
    entityId,
    resources,
    resourcePermissions,
    scope,
    userId,
  }),
  entity: entityId,
  venue: venueId ?? '',
  ...(policyName ? { name: policyName } : {}),
  ...(policyDescription ? { description: policyDescription } : {}),
});
/* eslint-enable @typescript-eslint/no-unused-vars */

export const buildManagementRolePayload = ({
  entityId,
  roleTemplate,
  scope,
  userEmail,
  userId,
  policyId,
  venueId,
}: {
  entityId: string;
  policyId: string;
  roleTemplate: ManagementRoleTemplate;
  scope: ManagementScope;
  userEmail: string;
  userId: string;
  venueId?: string;
}): ManagementRoleRequest => {
  const template = buildTemplateContext(scope, roleTemplate);

  return {
    name: `${template.namePrefix} - ${userEmail}`,
    description: template.description,
    managementPolicy: policyId,
    users: [userId],
    entity: entityId,
    venue: scope === 'venue' ? venueId ?? '' : '',
  };
};

export const getManagementPolicies = async ({ entityId, venueId }: { entityId: string; venueId?: string }) => {
  const venueQuery = venueId !== undefined ? `&venue=${encodeURIComponent(venueId)}` : '&venue=';
  const response = await axiosProv.get(`managementPolicy?entity=${encodeURIComponent(entityId)}${venueQuery}`);

  return getCollection<ManagementPolicyApiResponse>(response.data as ManagementPolicyQueryResponse, [
    'managementPolicies',
    'policies',
    'entries',
    'managementPolicy',
  ]);
};

export const getManagementRoles = async ({ entityId, venueId }: { entityId: string; venueId?: string }) => {
  const venueQuery = venueId !== undefined ? `&venue=${encodeURIComponent(venueId)}` : '&venue=';
  const response = await axiosProv.get(`managementRole?entity=${encodeURIComponent(entityId)}${venueQuery}`);

  return getCollection<ManagementRoleApiResponse>(response.data as ManagementRoleQueryResponse, [
    'managementRoles',
    'roles',
    'entries',
    'managementRole',
  ]);
};

export const getManagementRoleForUserEntity = async ({
  entityId,
  userId,
  venueId,
}: {
  entityId: string;
  userId: string;
  venueId?: string;
}) => {
  const venueQuery = venueId !== undefined ? `&venue=${encodeURIComponent(venueId)}` : '';
  const response = await axiosProv.get(
    `managementRole?userId=${encodeURIComponent(userId)}&entityId=${encodeURIComponent(entityId)}${venueQuery}`,
  );

  return getCollection<ManagementRoleApiResponse>(response.data as ManagementRoleQueryResponse, [
    'managementRoles',
    'roles',
    'entries',
    'managementRole',
  ]);
};

export const getManagementPolicyById = async ({ policyId }: { policyId: string }) => {
  try {
    const response = await axiosProv.get(`managementPolicy/${encodeURIComponent(policyId)}`);
    const policy = response.data as ManagementPolicyApiResponse | { managementPolicy?: ManagementPolicyApiResponse };

    if (typeof policy === 'object' && policy !== null && 'managementPolicy' in policy && policy.managementPolicy) {
      return policy.managementPolicy;
    }

    return policy as ManagementPolicyApiResponse;
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response?.status === 404) return undefined;
    throw error;
  }
};

export const deleteManagementPolicy = async ({ policyId }: { policyId: string }) =>
  axiosProv.delete(`managementPolicy/${encodeURIComponent(policyId)}`);

export const useGetManagementPolicy = ({ enabled, policyId }: { enabled: boolean; policyId: string }) => {
  const { t } = useTranslation();
  const toast = useToast();

  return useQuery(['get-management-policy', policyId], () => getManagementPolicyById({ policyId }), {
    enabled,
    onError: (e: AxiosError) => {
      if (!toast.isActive('management-policy-fetching-error'))
        toast({
          id: 'management-policy-fetching-error',
          title: t('common.error'),
          description: t('crud.error_fetching_obj', {
            obj: t('common.permissions'),
            e: e?.response?.data?.ErrorDescription,
          }),
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top-right',
        });
    },
  });
};

export const useDeleteManagementPolicy = () => {
  const queryClient = useQueryClient();

  return useMutation(deleteManagementPolicy, {
    onSuccess: () => {
      queryClient.invalidateQueries(['get-management-policy']);
      queryClient.invalidateQueries(['get-management-policies']);
      queryClient.invalidateQueries(['get-management-policy-for-user-entity']);
      queryClient.invalidateQueries(['get-management-roles']);
      queryClient.invalidateQueries(['get-management-roles-for-user']);
    },
  });
};

export const useGetManagementPolicies = ({
  enabled,
  entityId,
  venueId,
}: {
  enabled: boolean;
  entityId: string;
  venueId?: string;
}) => {
  const { t } = useTranslation();
  const toast = useToast();

  return useQuery(['get-management-policies', entityId, venueId], () => getManagementPolicies({ entityId, venueId }), {
    enabled,
    onError: (e: AxiosError) => {
      if (!toast.isActive('management-policy-fetching-error'))
        toast({
          id: 'management-policy-fetching-error',
          title: t('common.error'),
          description: t('crud.error_fetching_obj', {
            obj: t('common.permissions'),
            e: e?.response?.data?.ErrorDescription,
          }),
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top-right',
        });
    },
  });
};

export const useGetManagementRoles = ({
  enabled,
  entityId,
  venueId,
}: {
  enabled: boolean;
  entityId: string;
  venueId?: string;
}) => {
  const { t } = useTranslation();
  const toast = useToast();

  return useQuery(['get-management-roles', entityId, venueId], () => getManagementRoles({ entityId, venueId }), {
    enabled,
    onError: (e: AxiosError) => {
      if (!toast.isActive('management-role-fetching-error'))
        toast({
          id: 'management-role-fetching-error',
          title: t('common.error'),
          description: t('crud.error_fetching_obj', {
            obj: t('common.permissions'),
            e: e?.response?.data?.ErrorDescription,
          }),
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top-right',
        });
    },
  });
};

export const useGetManagementPolicyForUserEntity = ({
  enabled,
  entityId,
  userId,
  venueId,
}: {
  enabled: boolean;
  entityId: string;
  userId: string;
  venueId?: string;
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const desiredVenue = venueId ?? '';

  return useQuery(
    ['get-management-policy-for-user-entity', entityId, desiredVenue, userId],
    async () => {
      const roles = await getManagementRoleForUserEntity({ entityId, userId, venueId: desiredVenue || undefined });
      const role =
        roles.find((candidate) => (candidate.venue ?? '') === desiredVenue) ??
        roles.find((candidate) => (candidate.venue ?? '') === '');
      const policyId = role?.managementPolicyId ?? role?.managementPolicy ?? '';

      if (!policyId) return { policy: undefined, role: role ?? undefined };

      const policy = await getManagementPolicyById({ policyId });

      return { policy, role: role ?? undefined };
    },
    {
      enabled,
      onError: (e: AxiosError) => {
        if (!toast.isActive('management-policy-for-user-entity-fetching-error'))
          toast({
            id: 'management-policy-for-user-entity-fetching-error',
            title: t('common.error'),
            description: t('crud.error_fetching_obj', {
              obj: t('common.permissions'),
              e: e?.response?.data?.ErrorDescription,
            }),
            status: 'error',
            duration: 5000,
            isClosable: true,
            position: 'top-right',
          });
      },
    },
  );
};

export const getManagementRolesForUser = async ({ userId }: { userId: string }) => {
  const response = await axiosProv.get(`managementRole?userId=${encodeURIComponent(userId)}`);

  return getCollection<ManagementRoleApiResponse>(response.data as ManagementRoleQueryResponse, [
    'managementRoles',
    'roles',
    'entries',
    'managementRole',
  ]);
};

export const useGetManagementRolesForUser = ({ enabled, userId }: { enabled: boolean; userId: string }) => {
  const { t } = useTranslation();
  const toast = useToast();

  return useQuery(['get-management-roles-for-user', userId], () => getManagementRolesForUser({ userId }), {
    enabled,
    onError: (e: AxiosError) => {
      if (!toast.isActive('management-roles-for-user-fetching-error'))
        toast({
          id: 'management-roles-for-user-fetching-error',
          title: t('common.error'),
          description: t('crud.error_fetching_obj', {
            obj: t('common.roles'),
            e: e?.response?.data?.ErrorDescription,
          }),
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top-right',
        });
    },
  });
};

export const useCreateManagementPolicy = () => {
  const queryClient = useQueryClient();

  return useMutation((newPolicy: ManagementPolicyRequest) => axiosProv.post('managementPolicy/create', newPolicy), {
    onSuccess: () => {
      queryClient.invalidateQueries(['get-management-policies']);
    },
  });
};

export const useCreateManagementRole = () => {
  const queryClient = useQueryClient();

  return useMutation((newRole: ManagementRoleRequest) => axiosProv.post('managementRole/create', newRole), {
    onSuccess: () => {
      queryClient.invalidateQueries(['get-management-roles']);
    },
  });
};

export const useUpdateManagementRole = ({ id }: { id: string }) => {
  const queryClient = useQueryClient();

  return useMutation((newRole: ManagementRoleRequest) => axiosProv.put(`managementRole/${id}`, newRole), {
    onSuccess: () => {
      queryClient.invalidateQueries(['get-management-roles']);
    },
  });
};

export const getMatchingManagementPolicy = (
  policies: ManagementPolicyApiResponse[],
  {
    access,
    entityId,
    roleTemplate,
    resources,
    scope,
    venueId,
  }: {
    access: ManagementAccessPermission[];
    entityId: string;
    resources: string[];
    roleTemplate: ManagementRoleTemplate;
    scope: ManagementScope;
    venueId?: string;
  },
) => {
  const desiredPolicy = buildManagementPolicyPayload({
    access,
    entityId,
    resources,
    roleTemplate,
    scope,
    userId: '',
    venueId,
  });

  return policies.find((policy) => {
    const policyEntries = policy.entries ?? [];
    if (policy.entity !== desiredPolicy.entity) return false;
    if ((policy.venue ?? '') !== (desiredPolicy.venue ?? '')) return false;
    if (policyEntries.length < desiredPolicy.entries.length) return false;

    return desiredPolicy.entries.every((desiredEntry) =>
      policyEntries.some((entry) => {
        const parsedPolicy = parsePolicyScope(entry.policy);
        return (
          parsedPolicy.scope === scope &&
          parsedPolicy.entityId === entityId &&
          parsedPolicy.includeVenues === true &&
          parsedPolicy.includeChildEntities === true &&
          desiredEntry.access.every((perm) => entry.access.includes(perm)) &&
          desiredEntry.resources.every((resource) => entry.resources.includes(resource))
        );
      }),
    );
  });
};

export const getExistingManagementPolicyForUser = (
  policies: ManagementPolicyApiResponse[],
  {
    entityId,
    scope,
    userId,
    venueId,
  }: {
    entityId: string;
    scope: ManagementScope;
    userId: string;
    venueId?: string;
  },
) => {
  const desiredVenue = scope === 'venue' ? venueId ?? '' : '';

  return policies.find((policy) => {
    if (policy.entity !== entityId) return false;
    if ((policy.venue ?? '') !== desiredVenue) return false;

    return (policy.entries ?? []).some((entry) => {
      const parsedPolicy = parsePolicyScope(entry.policy);
      return parsedPolicy.scope === scope && parsedPolicy.entityId === entityId && entry.users.includes(userId);
    });
  });
};

export const getMatchingManagementRole = (
  roles: ManagementRoleApiResponse[],
  {
    entityId,
    policyId,
    scope,
    venueId,
  }: {
    entityId: string;
    policyId: string;
    scope: ManagementScope;
    venueId?: string;
  },
) =>
  roles.find((role) => {
    const desiredVenue = scope === 'venue' ? venueId ?? '' : '';
    return (
      role.entity === entityId &&
      (role.venue ?? '') === desiredVenue &&
      (role.managementPolicyId ?? role.managementPolicy) === policyId
    );
  });

type NormalizedPermission = {
  user: string;
  scope: string;
  entityId: string;
  resource: string;
  access: ManagementAccessPermission[];
  policyContext: string;
};

const normalizeEntries = (entries: ManagementPolicyEntry[]): NormalizedPermission[] => {
  const result: NormalizedPermission[] = [];
  for (const entry of entries) {
    const parsed = parsePolicyScope(entry.policy);
    for (const user of entry.users ?? []) {
      for (const resource of entry.resources ?? []) {
        result.push({
          user,
          scope: parsed.scope,
          entityId: parsed.entityId,
          resource,
          access: entry.access ?? [],
          policyContext: entry.policy,
        });
      }
    }
  }
  return result;
};

export const mergePolicyEntries = (
  existingEntries: ManagementPolicyEntry[],
  targetEntries: ManagementPolicyEntry[],
  userId: string,
  replacementPolicyContext?: string,
): ManagementPolicyEntry[] => {
  const existingRules = normalizeEntries(existingEntries);
  const targetRules = normalizeEntries(targetEntries);

  const targetPolicyContexts = new Set(targetRules.map((r) => r.policyContext));
  const targetScopes = new Set(targetRules.map((r) => r.scope));
  const targetEntityIds = new Set(targetRules.map((r) => r.entityId));

  const preservedRules = existingRules.filter((rule) => {
    if (rule.user !== userId) return true;

    if (targetPolicyContexts.size > 0 || replacementPolicyContext) {
      return !targetPolicyContexts.has(rule.policyContext) && rule.policyContext !== replacementPolicyContext;
    }

    if (targetScopes.size > 0 || targetEntityIds.size > 0) {
      return !targetScopes.has(rule.scope) || !targetEntityIds.has(rule.entityId);
    }

    return true;
  });

  const mergedRules = [...preservedRules, ...targetRules];

  const userGroups = new Map<
    string,
    { user: string; policyContext: string; access: ManagementAccessPermission[]; resources: Set<string> }
  >();
  for (const rule of mergedRules) {
    const accessKey = [...rule.access].sort().join(',');
    const key = `${rule.user}|||${rule.policyContext}|||${accessKey}`;
    const existing = userGroups.get(key);
    if (existing) {
      existing.resources.add(rule.resource);
    } else {
      userGroups.set(key, {
        user: rule.user,
        policyContext: rule.policyContext,
        access: rule.access,
        resources: new Set([rule.resource]),
      });
    }
  }

  const entryGroups = new Map<
    string,
    { users: Set<string>; resources: string[]; access: ManagementAccessPermission[]; policy: string }
  >();
  for (const group of userGroups.values()) {
    const sortedResources = [...group.resources].sort();
    const resourcesKey = sortedResources.join(',');
    const accessKey = [...group.access].sort().join(',');
    const key = `${resourcesKey}|||${group.policyContext}|||${accessKey}`;
    const existing = entryGroups.get(key);
    if (existing) {
      existing.users.add(group.user);
    } else {
      entryGroups.set(key, {
        users: new Set([group.user]),
        resources: sortedResources,
        access: group.access,
        policy: group.policyContext,
      });
    }
  }

  return [...entryGroups.values()].map((g) => ({
    users: [...g.users],
    resources: g.resources,
    access: g.access,
    policy: g.policy,
  }));
};

export const isPolicyShared = (
  policy: ManagementPolicyApiResponse,
  userId: string,
  currentRoleId?: string,
  allEntityRoles?: ManagementRoleApiResponse[],
): boolean => {
  const hasOtherUsers = (policy.entries ?? []).some((entry) => (entry.users ?? []).some((u) => u !== userId));
  if (hasOtherUsers) return true;

  if (allEntityRoles && currentRoleId) {
    const policyId = policy.id;
    const referencingRoles = allEntityRoles.filter((r) => (r.managementPolicyId ?? r.managementPolicy) === policyId);
    if (referencingRoles.some((r) => r.id !== currentRoleId)) {
      return true;
    }
  }

  return false;
};

const auditLog = (message: string) => {
  // eslint-disable-next-line no-console
  console.info(message);
};

const getReplacementPolicyContext = ({
  existingPolicy,
  fallbackEntityId,
  policyPayload,
  scope,
  userId,
}: {
  existingPolicy?: ManagementPolicyApiResponse;
  fallbackEntityId: string;
  policyPayload: ManagementPolicyRequest;
  scope: ManagementScope;
  userId: string;
}) => {
  const existingEntry = (existingPolicy?.entries ?? []).find((entry) => {
    const parsed = parsePolicyScope(entry.policy);
    return entry.users.includes(userId) && parsed.scope === scope;
  });

  return (
    existingEntry?.policy ??
    policyPayload.entries[0]?.policy ??
    JSON.stringify(buildManagementPolicyContext({ entityId: fallbackEntityId, scope }))
  );
};

export const assignUserAccess = async ({
  access,
  entityId,
  resources,
  roleTemplate,
  scope,
  resourcePermissions,
  userEmail,
  userId,
  venueId,
  policyName,
  policyDescription,
  currentUserRole,
  currentUserId,
}: AssignUserAccessInput): Promise<ManagementAccessResult> => {
  if (!entityId) {
    throw new Error('Entity could not be determined');
  }

  // Privilege Escalation Prevention & Authorization checks
  const actingRole = currentUserRole ?? 'root';
  if (actingRole !== 'root' && actingRole !== 'admin') {
    if (!currentUserId) {
      throw new Error('Caller authentication context missing: cannot verify permissions');
    }
    const callerRoles = await getManagementRoleForUserEntity({
      entityId,
      userId: currentUserId,
    });
    if (callerRoles.length === 0) {
      throw new Error('You are not authorized to manage this entity');
    }

    if (scope === 'venue') {
      if (!venueId || !venueId.trim()) {
        throw new Error('Venue ID is required for venue scope');
      }
      let venueData: VenueApiResponse;
      try {
        const venueRes = await axiosProv.get(`venue/${encodeURIComponent(venueId)}`);
        venueData = venueRes.data as VenueApiResponse;
      } catch {
        throw new Error('Venue does not exist');
      }

      if (venueData.entity !== entityId) {
        throw new Error('Cross-entity venue assignment is rejected');
      }

      const hasAccess = callerRoles.some((role) => !role.venue || role.venue === venueId);
      if (!hasAccess) {
        throw new Error('You are not authorized to manage this venue');
      }
    }

    const hasPrivilegedResource =
      (resourcePermissions ?? []).some((r) => r.resource === 'managementPolicy' || r.resource === 'managementRole') ||
      resources.some((r) => r === 'managementPolicy' || r === 'managementRole');

    if (hasPrivilegedResource) {
      throw new Error('Only root or admin users can assign access to managementPolicy or managementRole');
    }

    const callerPolicies = await Promise.all(
      callerRoles.map(async (role) => {
        const policyId = role.managementPolicyId ?? role.managementPolicy ?? '';
        if (!policyId) return undefined;
        return getManagementPolicyById({ policyId });
      }),
    );
    const validCallerPolicies = callerPolicies.filter((p): p is ManagementPolicyApiResponse => p !== undefined);
    const callerRules = normalizeEntries(validCallerPolicies.flatMap((p) => p.entries ?? []));

    const targets =
      resourcePermissions !== undefined && resourcePermissions.length > 0
        ? resourcePermissions
        : resources.map((resource) => ({ resource, access }));

    for (const targetRule of targets) {
      const callerRuleForResource = callerRules.find((cr) => cr.resource === targetRule.resource);

      if (!callerRuleForResource) {
        throw new Error(`Privilege escalation: You do not have permissions for resource ${targetRule.resource}`);
      }

      const callerAccess = callerRuleForResource.access;
      const hasFull = callerAccess.includes('FULL');
      if (!hasFull) {
        for (const perm of targetRule.access) {
          if (!callerAccess.includes(perm)) {
            throw new Error(
              `Privilege escalation: You cannot grant permission ${perm} ` +
                `on ${targetRule.resource} as it exceeds your own permissions`,
            );
          }
        }
      }
    }
  } else if (scope === 'venue') {
    // If the caller is root, we still validate entity-venue constraints
    if (!venueId || !venueId.trim()) {
      throw new Error('Venue ID is required for venue scope');
    }
    let venueData: VenueApiResponse;
    try {
      const venueRes = await axiosProv.get(`venue/${encodeURIComponent(venueId)}`);
      venueData = venueRes.data as VenueApiResponse;
    } catch {
      throw new Error('Venue does not exist');
    }

    if (venueData.entity !== entityId) {
      throw new Error('Cross-entity venue assignment is rejected');
    }
  }

  const resolvedVenueId = scope === 'venue' ? venueId ?? '' : '';
  const rolesForUser = await getManagementRoleForUserEntity({ entityId, userId });

  let existingRole: ManagementRoleApiResponse | undefined;
  let existingPolicy: ManagementPolicyApiResponse | undefined;

  const template = buildTemplateContext(scope, roleTemplate);

  const candidates = rolesForUser.filter((role) => role.entity === entityId && (role.venue ?? '') === resolvedVenueId);

  if (candidates.length > 0) {
    const policiesWithRoles = await Promise.all(
      candidates.map(async (role) => {
        const policyId = role.managementPolicyId ?? role.managementPolicy ?? '';
        if (!policyId) return { role, policy: undefined };
        const policy = await getManagementPolicyById({ policyId });
        return { role, policy };
      }),
    );

    const matchingCandidate = policiesWithRoles.find(({ role, policy }) => {
      if (!policy) return false;

      if (scope === 'venue' && (policy.venue ?? '') !== resolvedVenueId) {
        return false;
      }

      const hasMatchingScope = (policy.entries ?? []).some((entry) => {
        const parsed = parsePolicyScope(entry.policy);
        return parsed.scope === scope;
      });
      if (!hasMatchingScope) return false;

      const nameMatches =
        role.name.includes(template.namePrefix) ||
        policy.name.includes(template.namePrefix) ||
        (scope === 'entity' && roleTemplate === 'Admin' && policy.name === 'Operator Admin Full Access Policy');
      if (!nameMatches) return false;

      return true;
    });

    if (matchingCandidate) {
      existingRole = matchingCandidate.role;
      existingPolicy = matchingCandidate.policy;
    }
  }

  let isSafeToUpdate = false;
  let isRoleShared = false;
  if (existingRole && existingPolicy) {
    const allEntityRoles = await getManagementRoles({
      entityId,
      venueId: resolvedVenueId || undefined,
    });
    const isShared = isPolicyShared(existingPolicy, userId, existingRole.id, allEntityRoles);
    isRoleShared = (existingRole.users ?? []).some((u) => u !== userId);
    isSafeToUpdate = !isShared;
  }

  const existingPolicyId = existingRole?.managementPolicyId ?? existingRole?.managementPolicy ?? '';
  const policyEntityId = existingPolicy?.entity ?? entityId;
  const policyVenueId = existingPolicy?.venue ?? resolvedVenueId;

  const policyPayload = buildManagementPolicyPayload({
    access,
    entityId: policyEntityId,
    resources,
    resourcePermissions,
    roleTemplate,
    scope,
    userId,
    venueId: policyVenueId || undefined,
    policyName,
    policyDescription,
  });

  let policyId = existingPolicy?.id ?? existingPolicyId ?? '';
  if (existingPolicy && policyId && isSafeToUpdate) {
    const mergedEntries = mergePolicyEntries(
      existingPolicy.entries ?? [],
      policyPayload.entries,
      userId,
      getReplacementPolicyContext({
        existingPolicy,
        fallbackEntityId: policyEntityId,
        policyPayload,
        scope,
        userId,
      }),
    );
    const updatedPolicyPayload = {
      ...policyPayload,
      entries: mergedEntries,
    };
    await axiosProv.put(`managementPolicy/${encodeURIComponent(policyId)}`, updatedPolicyPayload);
    auditLog(
      `[AUDIT] Policy Updated - Actor: ${currentUserId || 'unknown'} ` +
        `(Role: ${actingRole}), Target User: ${userId}, Entity: ${entityId}, ` +
        `Scope: ${scope}, Policy ID: ${policyId}, ` +
        `Timestamp: ${new Date().toISOString()}`,
    );
  } else {
    const createdPolicy = await axiosProv.post('managementPolicy/create', policyPayload);
    const createdPolicyData = createdPolicy.data as {
      id?: string;
      managementPolicy?: string;
      managementPolicyId?: string;
    };
    policyId = createdPolicyData.id ?? createdPolicyData.managementPolicy ?? createdPolicyData.managementPolicyId ?? '';
    auditLog(
      `[AUDIT] Policy Created - Actor: ${currentUserId || 'unknown'} ` +
        `(Role: ${actingRole}), Target User: ${userId}, Entity: ${entityId}, ` +
        `Scope: ${scope}, Policy ID: ${policyId}, ` +
        `Timestamp: ${new Date().toISOString()}`,
    );
  }

  if (!policyId) {
    throw new Error('Management policy could not be created');
  }

  if (existingRole) {
    if (isSafeToUpdate) {
      const nextUsers = Array.from(new Set([...(existingRole.users ?? []), userId]));
      const rolePolicyId = existingRole.managementPolicyId ?? existingRole.managementPolicy ?? '';
      const roleUpdated = nextUsers.length !== (existingRole.users ?? []).length || rolePolicyId !== policyId;

      if (roleUpdated) {
        await axiosProv.put(`managementRole/${encodeURIComponent(existingRole.id)}`, {
          name: existingRole.name,
          description: existingRole.description,
          managementPolicy: policyId,
          users: nextUsers,
          venue: resolvedVenueId || '',
          entity: entityId,
        } as ManagementRoleRequest);
        auditLog(
          `[AUDIT] Role Updated - Actor: ${currentUserId || 'unknown'} ` +
            `(Role: ${actingRole}), Target User: ${userId}, Entity: ${entityId}, ` +
            `Scope: ${scope}, Role ID: ${existingRole.id}, ` +
            `Next Users: ${JSON.stringify(nextUsers)}, ` +
            `Timestamp: ${new Date().toISOString()}`,
        );
      }

      return {
        entityId,
        policyId,
        roleId: existingRole.id,
        roleUpdated,
        venueId: resolvedVenueId,
      };
    }

    if (!isRoleShared) {
      await axiosProv.put(`managementRole/${encodeURIComponent(existingRole.id)}`, {
        name: existingRole.name,
        description: existingRole.description,
        managementPolicy: policyId,
        users: [userId],
        venue: resolvedVenueId || '',
        entity: entityId,
      } as ManagementRoleRequest);
      auditLog(
        `[AUDIT] Role Updated (Policy Split) - Actor: ` +
          `${currentUserId || 'unknown'} (Role: ${actingRole}), ` +
          `Target User: ${userId}, Entity: ${entityId}, Scope: ${scope}, ` +
          `Role ID: ${existingRole.id}, Timestamp: ${new Date().toISOString()}`,
      );

      return {
        entityId,
        policyId,
        roleId: existingRole.id,
        roleUpdated: true,
        venueId: resolvedVenueId,
      };
    }

    const nextUsers = (existingRole.users ?? []).filter((u) => u !== userId);
    await axiosProv.put(`managementRole/${encodeURIComponent(existingRole.id)}`, {
      name: existingRole.name,
      description: existingRole.description,
      managementPolicy: existingRole.managementPolicyId ?? existingRole.managementPolicy ?? '',
      users: nextUsers,
      venue: resolvedVenueId || '',
      entity: entityId,
    } as ManagementRoleRequest);
    auditLog(
      `[AUDIT] Shared Role Updated (User Removed) - Actor: ` +
        `${currentUserId || 'unknown'} (Role: ${actingRole}), ` +
        `Target User: ${userId}, Entity: ${entityId}, Scope: ${scope}, ` +
        `Role ID: ${existingRole.id}, Next Users: ${JSON.stringify(nextUsers)}, ` +
        `Timestamp: ${new Date().toISOString()}`,
    );

    const createdRole = await axiosProv.post(
      'managementRole/create',
      buildManagementRolePayload({
        entityId,
        policyId,
        roleTemplate,
        scope,
        userEmail,
        userId,
        venueId: resolvedVenueId || undefined,
      }),
    );
    const createdRoleData = createdRole.data as {
      id?: string;
      managementRole?: string;
      managementRoleId?: string;
    };
    const newRoleId = createdRoleData.id ?? createdRoleData.managementRole ?? createdRoleData.managementRoleId ?? '';

    if (!newRoleId) {
      throw new Error('Management role could not be created');
    }
    auditLog(
      `[AUDIT] New Role Created (Split) - Actor: ` +
        `${currentUserId || 'unknown'} (Role: ${actingRole}), ` +
        `Target User: ${userId}, Entity: ${entityId}, Scope: ${scope}, ` +
        `Role ID: ${newRoleId}, Timestamp: ${new Date().toISOString()}`,
    );

    return {
      entityId,
      policyId,
      roleId: newRoleId,
      roleUpdated: true,
      venueId: resolvedVenueId,
    };
  }

  const roles = await getManagementRoles({
    entityId,
    venueId: resolvedVenueId || undefined,
  });
  const matchingRole = getMatchingManagementRole(roles, {
    entityId,
    policyId,
    scope,
    venueId: resolvedVenueId || undefined,
  });

  if (matchingRole) {
    const nextUsers = Array.from(new Set([...(matchingRole.users ?? []), userId]));
    const didUpdate = nextUsers.length !== (matchingRole.users ?? []).length;
    if (nextUsers.length !== (matchingRole.users ?? []).length) {
      await axiosProv.put(`managementRole/${encodeURIComponent(matchingRole.id)}`, {
        name: matchingRole.name,
        description: matchingRole.description,
        managementPolicy: policyId,
        users: nextUsers,
        venue: resolvedVenueId || '',
        entity: entityId,
      } as ManagementRoleRequest);
      auditLog(
        `[AUDIT] Role Updated - Actor: ${currentUserId || 'unknown'} ` +
          `(Role: ${actingRole}), Target User: ${userId}, Entity: ${entityId}, ` +
          `Scope: ${scope}, Role ID: ${matchingRole.id}, ` +
          `Next Users: ${JSON.stringify(nextUsers)}, ` +
          `Timestamp: ${new Date().toISOString()}`,
      );
    }

    return {
      entityId,
      policyId,
      roleId: matchingRole.id,
      roleUpdated: didUpdate,
      venueId: resolvedVenueId,
    };
  }

  const createdRole = await axiosProv.post(
    'managementRole/create',
    buildManagementRolePayload({
      entityId,
      policyId,
      roleTemplate,
      scope,
      userEmail,
      userId,
      venueId: resolvedVenueId || undefined,
    }),
  );
  const createdRoleData = createdRole.data as {
    id?: string;
    managementRole?: string;
    managementRoleId?: string;
  };
  const roleId = createdRoleData.id ?? createdRoleData.managementRole ?? createdRoleData.managementRoleId ?? '';

  if (!roleId) {
    throw new Error('Management role could not be created');
  }
  auditLog(
    `[AUDIT] Role Created - Actor: ${currentUserId || 'unknown'} ` +
      `(Role: ${actingRole}), Target User: ${userId}, Entity: ${entityId}, ` +
      `Scope: ${scope}, Role ID: ${roleId}, Policy ID: ${policyId}, ` +
      `Timestamp: ${new Date().toISOString()}`,
  );

  return {
    entityId,
    policyId,
    roleId,
    roleUpdated: false,
    venueId: resolvedVenueId,
  };
};

export const useAssignUserAccess = () => useMutation(assignUserAccess);
