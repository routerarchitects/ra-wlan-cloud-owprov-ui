import { useToast } from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { axiosProv } from 'utils/axiosInstances';

export type ManagementScope = 'entity' | 'venue';
export type ManagementRoleTemplate = 'Admin' | 'Viewer' | 'Support' | 'Custom';
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
  name: string;
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
  Record<ManagementScope, { access: ManagementAccessPermission[]; description: string; namePrefix: string; policyScope: string }>
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
  Viewer: {
    entity: {
      access: ['READ', 'LIST'],
      description: 'Read-only entity access',
      namePrefix: 'Entity Viewer',
      policyScope: 'entity-viewer',
    },
    venue: {
      access: ['READ', 'LIST'],
      description: 'Read-only venue access',
      namePrefix: 'Venue Viewer',
      policyScope: 'venue-viewer',
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

const buildTemplateContext = (scope: ManagementScope, roleTemplate: ManagementRoleTemplate) => TEMPLATE_ACCESS[roleTemplate][scope];

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

  if (resourcePermissions !== undefined && resourcePermissions.length > 0) {
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

export const buildManagementPolicyPayload = ({
  access,
  entityId,
  roleTemplate,
  resources,
  resourcePermissions,
  scope,
  userId,
  venueId,
}: {
  access: ManagementAccessPermission[];
  entityId: string;
  resources: string[];
  resourcePermissions?: ManagementResourceAccess[];
  roleTemplate: ManagementRoleTemplate;
  scope: ManagementScope;
  userId: string;
  venueId?: string;
}): ManagementPolicyRequest => {
  const template = buildTemplateContext(scope, roleTemplate);
  const policyName =
    scope === 'entity' && roleTemplate === 'Admin'
      ? 'Operator Admin Full Access Policy'
      : `${template.namePrefix} Full Access Policy`;
  const policyDescription =
    scope === 'entity' && roleTemplate === 'Admin'
      ? 'Full access policy for Operator admin inside operator entity scope'
      : `Full access policy for ${roleTemplate.toLowerCase()} inside ${scope} scope`;

  return {
    name: policyName,
    description: policyDescription,
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
  };
};

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
    venue: scope === 'venue' ? (venueId ?? '') : '',
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
}: {
  entityId: string;
  userId: string;
}) => {
  const response = await axiosProv.get(`managementRole?userId=${encodeURIComponent(userId)}&entityId=${encodeURIComponent(entityId)}`);

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

export const useGetManagementPolicies = ({ enabled, entityId, venueId }: { enabled: boolean; entityId: string; venueId?: string }) => {
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

export const useGetManagementRoles = ({ enabled, entityId, venueId }: { enabled: boolean; entityId: string; venueId?: string }) => {
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
}: {
  enabled: boolean;
  entityId: string;
  userId: string;
}) => {
  const { t } = useTranslation();
  const toast = useToast();

  return useQuery(
    ['get-management-policy-for-user-entity', entityId, userId],
    async () => {
      const roles = await getManagementRoleForUserEntity({ entityId, userId });
      const role = roles[0];
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
  const desiredVenue = scope === 'venue' ? (venueId ?? '') : '';

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
    const desiredVenue = scope === 'venue' ? (venueId ?? '') : '';
    return role.entity === entityId && (role.venue ?? '') === desiredVenue && (role.managementPolicyId ?? role.managementPolicy) === policyId;
  });

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
}: AssignUserAccessInput): Promise<ManagementAccessResult> => {
  if (!entityId) {
    throw new Error('Entity could not be determined');
  }

  const resolvedVenueId = scope === 'venue' ? venueId ?? '' : '';
  const rolesForUser = await getManagementRoleForUserEntity({ entityId, userId });
  const existingRole = rolesForUser[0];
  const existingPolicyId = existingRole?.managementPolicyId ?? existingRole?.managementPolicy ?? '';
  const existingPolicy = existingPolicyId ? await getManagementPolicyById({ policyId: existingPolicyId }) : undefined;
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
  });

  let policyId = existingPolicy?.id ?? existingPolicyId ?? '';
  if (existingPolicy && policyId) {
    await axiosProv.put(`managementPolicy/${encodeURIComponent(policyId)}`, policyPayload);
  } else {
    const createdPolicy = await axiosProv.post('managementPolicy/create', policyPayload);
    const createdPolicyData = createdPolicy.data as { id?: string; managementPolicy?: string; managementPolicyId?: string };
    policyId = createdPolicyData.id ?? createdPolicyData.managementPolicy ?? createdPolicyData.managementPolicyId ?? '';
  }

  if (!policyId) {
    throw new Error('Management policy could not be created');
  }

  if (existingRole) {
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
    }

    return {
      entityId,
      policyId,
      roleId: existingRole.id,
      roleUpdated,
      venueId: resolvedVenueId,
    };
  }

  const roles = await getManagementRoles({ entityId, venueId: resolvedVenueId || undefined });
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
      await axiosProv.put(
        `managementRole/${encodeURIComponent(matchingRole.id)}`,
        {
          name: matchingRole.name,
          description: matchingRole.description,
          managementPolicy: policyId,
          users: nextUsers,
          venue: resolvedVenueId || '',
          entity: entityId,
        } as ManagementRoleRequest,
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

  const createdRole = await axiosProv.post('managementRole/create', buildManagementRolePayload({
    entityId,
    policyId,
    roleTemplate,
    scope,
    userEmail,
    userId,
    venueId: resolvedVenueId || undefined,
  }));
  const createdRoleData = createdRole.data as { id?: string; managementRole?: string; managementRoleId?: string };
  const roleId = createdRoleData.id ?? createdRoleData.managementRole ?? createdRoleData.managementRoleId ?? '';

  if (!roleId) {
    throw new Error('Management role could not be created');
  }

  return {
    entityId,
    policyId,
    roleId,
    roleUpdated: false,
    venueId: resolvedVenueId,
  };
};

export const useAssignUserAccess = () => {
  return useMutation(assignUserAccess);
};
