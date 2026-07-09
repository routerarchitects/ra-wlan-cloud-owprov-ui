import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Center,
  Divider,
  Flex,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Popover,
  PopoverAnchor,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverFooter,
  PopoverHeader,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { Eye, PencilSimple, Trash } from '@phosphor-icons/react';
import { FieldArray, Form, Formik, useFormikContext } from 'formik';
import { useTranslation } from 'react-i18next';
import * as Yup from 'yup';
import MultiSelectField from 'components/FormFields/MultiSelectField';
import SelectField from 'components/FormFields/SelectField';
import StringField from 'components/FormFields/StringField';
import { useAuth } from 'contexts/AuthProvider';
import { useGetEntities, useGetEntity } from 'hooks/Network/Entity';
import {
  MANAGEMENT_ACCESS_PERMISSIONS,
  ManagementAccessPermission,
  ManagementPolicyApiResponse,
  ManagementResourceAccess,
  ManagementRoleTemplate,
  ManagementScope,
  ManagementRoleApiResponse,
  getTemplateAccess,
  useAssignUserAccess,
  useDeleteManagementPolicy,
  useGetManagementPolicy,
  useGetManagementPolicyForUserEntity,
  useGetManagementRolesForUser,
} from 'hooks/Network/ManagementAccess';
import { useGetSelectVenues, useGetVenues } from 'hooks/Network/Venues';

export type AssignAccessFormValues = {
  entityId: string;
  policyName: string;
  policyDescription: string;
  roleTemplate: ManagementRoleTemplate;
  scope: ManagementScope;
  userEmail: string;
  userId: string;
  venueId: string;
  resourcePermissions: ManagementResourceAccess[];
};

type Props = {
  onBack: () => void;
  onComplete: () => void;
  initialEntityId?: string;
  user: {
    email: string;
    userId: string;
  };
  context: {
    heading: string;
    description: string;
    pendingTitle: string;
    backLabel: string;
    submitLabel: string;
    retryLabel: string;
  };
};

const roleTemplateOptions: { label: string; value: ManagementRoleTemplate }[] = [
  { label: 'Admin', value: 'Admin' },
  { label: 'Installer', value: 'Installer' },
  { label: 'Support', value: 'Support' },
  { label: 'Custom', value: 'Custom' },
];

const accessPermissionOptions = MANAGEMENT_ACCESS_PERMISSIONS
  .filter((permission) => permission !== 'NOACCESS')
  .map((permission) => ({
    label: permission,
    value: permission,
  }));

const resourceOptions = [
  { label: 'Entity', value: 'entity' },
  { label: 'Venue', value: 'venue' },
  { label: 'Operator', value: 'operator' },
  { label: 'Inventory', value: 'inventory' },
  { label: 'Configuration', value: 'configuration' },
  { label: 'Management Policy', value: 'managementPolicy' },
  { label: 'Management Role', value: 'managementRole' },
];

const privilegedResourceValues = ['managementPolicy', 'managementRole'];

const canManagePrivilegedResources = (role?: string) => role === 'root' || role === 'admin';

const getManagementPolicyIdFromRole = (role?: ManagementRoleApiResponse | null) =>
  role?.managementPolicyId ?? role?.managementPolicy ?? '';

/* eslint-disable @typescript-eslint/no-unused-vars */
const getInitialAccess = (scope: ManagementScope, roleTemplate: ManagementRoleTemplate) =>
  roleTemplate === 'Custom' ? [] : getTemplateAccess(scope, roleTemplate);

const getInitialResourcePermissions = (
  scope?: ManagementScope,
  roleTemplate?: ManagementRoleTemplate,
): ManagementResourceAccess[] => [];
/* eslint-enable @typescript-eslint/no-unused-vars */

const getResourcePermissionsFromPolicy = (policy?: ManagementPolicyApiResponse): ManagementResourceAccess[] =>
  Array.from(
    (policy?.entries ?? []).reduce((resourceMap, entry) => {
      entry.resources
        .filter((resource) => resource !== '')
        .forEach((resource) => {
          const existingAccess = resourceMap.get(resource) ?? [];
          resourceMap.set(
            resource,
            Array.from(new Set([...existingAccess, ...(entry.access.length > 0 ? entry.access : ['NOACCESS'])])),
          );
        });
      return resourceMap;
    }, new Map<string, ManagementAccessPermission[]>()),
    ([resource, access]) => ({ resource, access }),
  );

const ValidationSchema = (t: (key: string) => string) =>
  Yup.object().shape({
    userId: Yup.string().required(t('form.required')),
    scope: Yup.string().oneOf(['entity', 'venue']).required(t('form.required')),
    entityId: Yup.string().required(t('form.required')),
    resourcePermissions: Yup.array()
      .of(
        Yup.object().shape({
          resource: Yup.string().required(t('form.required')),
          access: Yup.array()
            .of(Yup.string().oneOf(MANAGEMENT_ACCESS_PERMISSIONS).required(t('form.required')))
            .min(1, t('form.required'))
            .required(t('form.required')),
        }),
      )
      .required(t('form.required')),
    venueId: Yup.string().when('scope', {
      is: 'venue',
      then: (schema) => schema.required(t('form.required')),
      otherwise: (schema) => schema.notRequired(),
    }),
    roleTemplate: Yup.string().oneOf(['Admin', 'Installer', 'Support', 'Custom']).required(t('form.required')),
    policyName: Yup.string().required(t('form.required')),
  });

export const isAssignAccessDisabled = ({
  initialValues,
  currentValues,
  isValid,
  isSubmitting,
}: {
  initialValues: AssignAccessFormValues;
  currentValues: AssignAccessFormValues;
  isValid: boolean;
  isSubmitting: boolean;
}) => {
  if (isSubmitting) return true;
  if (!isValid) return true;

  const hasChanges =
    initialValues.scope !== currentValues.scope ||
    initialValues.entityId !== currentValues.entityId ||
    initialValues.venueId !== currentValues.venueId ||
    initialValues.roleTemplate !== currentValues.roleTemplate ||
    initialValues.policyName !== currentValues.policyName ||
    initialValues.policyDescription !== currentValues.policyDescription ||
    JSON.stringify(initialValues.resourcePermissions) !== JSON.stringify(currentValues.resourcePermissions);

  return !hasChanges;
};

const AccessPolicyFields = ({
  onPolicyLoaded,
  isEditMode,
  selectedPolicyId,
}: {
  onPolicyLoaded: (
    permissions: ManagementResourceAccess[],
    policyMeta: { name: string; description: string },
    context: { entityId: string; venueId: string; scope: ManagementScope }
  ) => void;
  isEditMode: boolean;
  selectedPolicyId?: string;
}) => {
  const { values, setFieldValue } = useFormikContext<AssignAccessFormValues>();
  const { user: authUser } = useAuth();
  const { data: entities } = useGetEntities();
  const selectedEntity = useGetEntity({
    id: values.entityId,
  });
  const selectedEntityVenues = useMemo(() => selectedEntity.data?.venues ?? [], [selectedEntity.data?.venues]);
  const selectedVenues = useGetSelectVenues({
    select: selectedEntityVenues,
  });

  const filteredResourceOptions = useMemo(() => {
    if (canManagePrivilegedResources(authUser?.userRole)) return resourceOptions;
    return resourceOptions.filter((opt) => !privilegedResourceValues.includes(opt.value));
  }, [authUser?.userRole]);

  const entityOptions = useMemo(() => {
    const options = [{ label: 'Select entity', value: '' }, ...(entities ?? []).map((entity) => ({
      label: entity.name,
      value: entity.id,
    }))];

    if (values.entityId && !options.some((option) => option.value === values.entityId)) {
      options.push({
        label: values.entityId,
        value: values.entityId,
      });
    }

    return options;
  }, [entities, values.entityId]);

  const venueOptions = useMemo(() => {
    const options = [{ label: 'Select venue', value: '' }, ...(selectedVenues.data ?? []).map((venue) => ({
      label: venue.name,
      value: venue.id,
    }))];

    if (values.venueId && !options.some((option) => option.value === values.venueId)) {
      options.push({
        label: values.venueId,
        value: values.venueId,
      });
    }

    return options;
  }, [selectedVenues.data, values.venueId]);

  const getResourceOptions = (currentIndex: number) => {
    const usedResources = new Set(
      values.resourcePermissions
        .map((rp, i) => (i !== currentIndex ? rp.resource : ''))
        .filter(Boolean),
    );
    const available = filteredResourceOptions.filter(
      (opt) => !usedResources.has(opt.value),
    );

    // Keep the current row's selected resource even if it's privileged and
    // would otherwise be filtered out by filteredResourceOptions.
    const currentResource = values.resourcePermissions[currentIndex]?.resource ?? '';
    if (currentResource && !available.some((opt) => opt.value === currentResource)) {
      const selectedResourceOption = resourceOptions.find((opt) => opt.value === currentResource);
      if (selectedResourceOption) {
        return [{ label: 'Select Resource', value: '' }, ...available, selectedResourceOption];
      }
    }

    return [{ label: 'Select Resource', value: '' }, ...available];
  };

  const allResourcesUsed = values.resourcePermissions.length >= filteredResourceOptions.length;

  const policyQuery = useGetManagementPolicyForUserEntity({
    enabled:
      !selectedPolicyId &&
      Boolean(values.entityId) &&
      !values.entityId.startsWith('operator:') &&
      Boolean(values.userId) &&
      (values.scope === 'entity' || Boolean(values.venueId)),
    entityId: values.entityId,
    userId: values.userId,
    venueId: values.scope === 'venue' ? values.venueId : undefined,
  });
  const selectedPolicyQuery = useGetManagementPolicy({
    enabled: Boolean(selectedPolicyId),
    policyId: selectedPolicyId ?? '',
  });
  const existingPolicy = selectedPolicyId ? selectedPolicyQuery.data : policyQuery.data?.policy;
  const isPolicyLookupSuccess = selectedPolicyId ? selectedPolicyQuery.isSuccess : policyQuery.isSuccess;
  const isPolicyLookupFetching = selectedPolicyId ? selectedPolicyQuery.isFetching : policyQuery.isFetching;

  useEffect(() => {
    if (!values.entityId) {
      onPolicyLoaded([], { name: '', description: '' }, { entityId: '', venueId: '', scope: values.scope });
      return;
    }

    if (isPolicyLookupSuccess && !isPolicyLookupFetching) {
      const loadedPermissions = existingPolicy ? getResourcePermissionsFromPolicy(existingPolicy) : [];
      onPolicyLoaded(
        loadedPermissions,
        {
          name: existingPolicy?.name ?? '',
          description: existingPolicy?.description ?? '',
        },
        {
          entityId: values.entityId,
          venueId: values.venueId,
          scope: values.scope,
        }
      );
    }
  }, [
    existingPolicy?.id,
    isPolicyLookupSuccess,
    isPolicyLookupFetching,
    values.entityId,
    values.venueId,
    values.scope,
    onPolicyLoaded,
  ]);

  useEffect(() => {
    if (values.scope === 'entity' && values.venueId) {
      setFieldValue('venueId', '', false);
    }
  }, [setFieldValue, values.scope, values.venueId]);

  return (
    <Stack spacing={4}>
      <SimpleGrid minChildWidth="280px" spacing="20px">
        <SelectField
          name="scope"
          label="Scope"
          options={[
            { label: 'Entity', value: 'entity' },
            { label: 'Venue', value: 'venue' },
          ]}
          isRequired
          isDisabled={isEditMode}
          onChangeEffect={(event) => {
            if (event.target.value === 'entity' && values.venueId) {
              setFieldValue('venueId', '', false);
            }
          }}
        />
        <SelectField
          name="entityId"
          label="Entity"
          options={entityOptions}
          isRequired
          isDisabled={isEditMode}
          onChangeEffect={() => {
            if (values.venueId) {
              setFieldValue('venueId', '', false);
            }
          }}
        />
      </SimpleGrid>

      {values.scope === 'venue' ? (
        <SimpleGrid minChildWidth="280px" spacing="20px">
          <SelectField
            name="venueId"
            label="Venue"
            options={venueOptions}
            isRequired
            isDisabled={isEditMode || !values.entityId}
          />
        </SimpleGrid>
      ) : null}

      {values.scope === 'venue' && values.entityId && (selectedVenues.data ?? []).length === 0 ? (
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>No Venues Found</AlertTitle>
            <AlertDescription>The selected entity has no accessible venues.</AlertDescription>
          </Box>
        </Alert>
      ) : null}

      <SimpleGrid minChildWidth="280px" spacing="20px">
        <SelectField name="roleTemplate" label="Role Template" options={roleTemplateOptions} isRequired />
      </SimpleGrid>

      <SimpleGrid minChildWidth="280px" spacing="20px">
        <StringField name="policyName" label="Policy Name" placeholder="Enter Policy Name" isRequired />
        <StringField name="policyDescription" label="Policy Description" placeholder="Optional description" />
      </SimpleGrid>

      <Box borderWidth="1px" borderRadius="md" p={4}>
        <Stack spacing={3}>
          <Text fontWeight="semibold">Resource Permissions</Text>
          <Text fontSize="sm" color="gray.500">
            Configure access per resource. Existing policies are loaded automatically.
          </Text>
          <FieldArray name="resourcePermissions">
            {({ push, remove }) => (
              <Stack spacing={3}>
                {values.resourcePermissions.map((_, index) => (
                  <SimpleGrid
                    /* eslint-disable-next-line react/no-array-index-key */
                    key={`${values.entityId}-${index}`}
                    minChildWidth="220px"
                    spacing="12px"
                    alignItems="end"
                  >
                    <SelectField
                      name={`resourcePermissions.${index}.resource`}
                      label={index === 0 ? 'Resource' : ''}
                      options={getResourceOptions(index)}
                      isRequired
                      isDisabled={
                        !canManagePrivilegedResources(authUser?.userRole) &&
                        privilegedResourceValues.includes(values.resourcePermissions[index]?.resource ?? '')
                      }
                    />
                    <MultiSelectField
                      name={`resourcePermissions.${index}.access`}
                      label={index === 0 ? 'Policy' : ''}
                      options={accessPermissionOptions}
                      isRequired
                      placeholder="Select Policy"
                      exclusiveValues={['FULL']}
                    />
                    <Button
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => remove(index)}
                    >
                      Remove
                    </Button>
                  </SimpleGrid>
                ))}
                <Button
                  variant="outline"
                  isDisabled={allResourcesUsed}
                  onClick={() =>
                    push({
                      resource: '',
                      access: [],
                    })
                  }
                >
                  Add Resource
                </Button>
              </Stack>
            )}
          </FieldArray>
        </Stack>
      </Box>

      <Box>
        <Text fontSize="sm" color="gray.500">
          User: {values.userEmail}
        </Text>
        <Text fontSize="sm" color="gray.500">
          Access is loaded automatically for the selected entity and venue.
        </Text>
        {existingPolicy && (
          <Text fontSize="sm" color="green.500" mt={1}>
            Existing policy found. Submit will update {existingPolicy.name}.
          </Text>
        )}
        {!existingPolicy && values.entityId && (
          <Text fontSize="sm" color="orange.500" mt={1}>
            No policy found for this user. Submit will create one.
          </Text>
        )}
      </Box>
    </Stack>
  );
};

const getInitialValues = ({
  initialEntityId,
  user,
}: {
  initialEntityId?: string;
  user: {
    email: string;
    userId: string;
  };
}): AssignAccessFormValues => ({
  entityId: initialEntityId ?? '',
  policyName: '',
  policyDescription: '',
  roleTemplate: 'Admin',
  scope: 'entity',
  userEmail: user.email,
  userId: user.userId,
  venueId: '',
  resourcePermissions: getInitialResourcePermissions('entity', 'Admin'),
});

const AccessPolicyViewModal = ({
  isLoading,
  isOpen,
  onClose,
  policy,
}: {
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  policy?: ManagementPolicyApiResponse;
}) => (
  <Modal isOpen={isOpen} onClose={onClose} size="xl">
    <ModalOverlay />
    <ModalContent>
      <ModalHeader>View Access Policy</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        {isLoading ? (
          <Center py={8}>
            <Spinner />
          </Center>
        ) : (
          <Stack spacing={4}>
            <Box>
              <Text fontWeight="semibold">{policy?.name ?? 'Policy not found'}</Text>
              {policy?.description ? (
                <Text fontSize="sm" color="gray.500">
                  {policy.description}
                </Text>
              ) : null}
            </Box>
            <SimpleGrid minChildWidth="220px" spacing="12px">
              <Box>
                <Text fontSize="xs" color="gray.500">
                  Policy ID
                </Text>
                <Text fontSize="sm">{policy?.id ?? '-'}</Text>
              </Box>
              <Box>
                <Text fontSize="xs" color="gray.500">
                  Entity
                </Text>
                <Text fontSize="sm">{policy?.entity ?? '-'}</Text>
              </Box>
              <Box>
                <Text fontSize="xs" color="gray.500">
                  Venue
                </Text>
                <Text fontSize="sm">{policy?.venue || 'Entity scope'}</Text>
              </Box>
            </SimpleGrid>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text fontWeight="semibold" mb={3}>
                Resource Permissions
              </Text>
              <Stack spacing={3}>
                {(policy?.entries ?? []).length > 0 ? (
                  policy?.entries?.map((entry, index) => (
                    <Box
                      /* eslint-disable-next-line react/no-array-index-key */
                      key={`${entry.resources.join(',')}-${index}`}
                      borderWidth="1px"
                      borderRadius="md"
                      p={3}
                    >
                      <Text fontSize="sm" fontWeight="semibold">
                        {entry.resources.join(', ') || '-'}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        {entry.access.join(', ') || 'NOACCESS'}
                      </Text>
                    </Box>
                  ))
                ) : (
                  <Text fontSize="sm" color="gray.500">
                    No resource permissions found.
                  </Text>
                )}
              </Stack>
            </Box>
          </Stack>
        )}
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Close</Button>
      </ModalFooter>
    </ModalContent>
  </Modal>
);

const AccessPolicyDeletePopover = ({
  onDeleted,
  role,
}: {
  onDeleted: () => Promise<unknown>;
  role: ManagementRoleApiResponse;
}) => {
  const toast = useToast();
  const deletePolicyMutation = useDeleteManagementPolicy();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const policyId = getManagementPolicyIdFromRole(role);

  const handleDelete = () =>
    deletePolicyMutation.mutate(
      { policyId },
      {
        onSuccess: async () => {
          await onDeleted();
          onClose();
          toast({
            id: `management-policy-delete-${policyId}`,
            title: 'Policy deleted',
            description: `${role.name} was deleted.`,
            status: 'success',
            duration: 5000,
            isClosable: true,
            position: 'top-right',
          });
        },
        onError: (error) => {
          toast({
            id: `management-policy-delete-error-${policyId}`,
            title: 'Unable to delete policy',
            description: error instanceof Error ? error.message : 'Delete request failed.',
            status: 'error',
            duration: 5000,
            isClosable: true,
            position: 'top-right',
          });
        },
      },
    );

  return (
    <Popover isOpen={isOpen} onOpen={onOpen} onClose={onClose}>
      <PopoverAnchor>
        <span>
          <Button
            size="sm"
            colorScheme="red"
            variant="outline"
            leftIcon={<Trash size={16} />}
            onClick={onOpen}
            isDisabled={!policyId}
          >
            Delete
          </Button>
        </span>
      </PopoverAnchor>
      <PopoverContent>
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverHeader>Delete access policy</PopoverHeader>
        <PopoverBody>Are you sure you want to delete {role.name}?</PopoverBody>
        <PopoverFooter>
          <Center>
            <Button colorScheme="gray" mr="1" onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" ml="1" onClick={handleDelete} isLoading={deletePolicyMutation.isLoading}>
              Delete
            </Button>
          </Center>
        </PopoverFooter>
      </PopoverContent>
    </Popover>
  );
};

const AssignAccessForm = ({ onBack, onComplete, initialEntityId, user, context }: Props) => {
  const { t } = useTranslation();
  const assignAccessMutation = useAssignUserAccess();
  const { user: authUser } = useAuth();

  const rolesQuery = useGetManagementRolesForUser({ enabled: Boolean(user.userId), userId: user.userId });
  const { data: entities } = useGetEntities();
  const { data: venues } = useGetVenues();

  const [activeAssignmentMode, setActiveAssignmentMode] = useState<'view' | 'edit' | 'create'>('view');
  const [selectedExistingRole, setSelectedExistingRole] = useState<ManagementRoleApiResponse | null>(null);
  const [selectedViewRole, setSelectedViewRole] = useState<ManagementRoleApiResponse | null>(null);
  const { isOpen: isPolicyViewOpen, onOpen: openPolicyView, onClose: closePolicyView } = useDisclosure();
  const selectedViewPolicyId = getManagementPolicyIdFromRole(selectedViewRole);
  const selectedViewPolicyQuery = useGetManagementPolicy({
    enabled: isPolicyViewOpen && Boolean(selectedViewPolicyId),
    policyId: selectedViewPolicyId,
  });

  const [formInitialValues, setFormInitialValues] = useState<AssignAccessFormValues>(() =>
    getInitialValues({ initialEntityId, user }),
  );

  useEffect(() => {
    if (rolesQuery.isSuccess) {
      if (rolesQuery.data && rolesQuery.data.length > 0) {
        setActiveAssignmentMode('view');
      } else {
        setActiveAssignmentMode('create');
      }
    }
  }, [rolesQuery.isSuccess, rolesQuery.data]);

  const handlePolicyLoaded = useCallback(
    (
      loadedPermissions: ManagementResourceAccess[],
      policyMeta: { name: string; description: string },
      context: { entityId: string; venueId: string; scope: ManagementScope }
    ) => {
      setFormInitialValues((prev) => ({
        ...prev,
        resourcePermissions: loadedPermissions,
        policyName: policyMeta.name,
        policyDescription: policyMeta.description,
        entityId: context.entityId,
        venueId: context.venueId,
        scope: context.scope,
      }));
    },
    [],
  );

  const handleEditRole = useCallback((role: ManagementRoleApiResponse) => {
    setSelectedExistingRole(role);
    const newInitialValues: AssignAccessFormValues = {
      entityId: role.entity,
      policyName: '',
      policyDescription: '',
      roleTemplate: (role.roleTemplate ?? 'Admin') as ManagementRoleTemplate,
      scope: role.venue ? 'venue' : 'entity',
      userEmail: user.email,
      userId: user.userId,
      venueId: role.venue ?? '',
      resourcePermissions: [],
    };
    setFormInitialValues(newInitialValues);
    setActiveAssignmentMode('edit');
  }, [user]);

  const handleViewRole = useCallback(
    (role: ManagementRoleApiResponse) => {
      setSelectedViewRole(role);
      openPolicyView();
    },
    [openPolicyView],
  );

  const handleClosePolicyView = useCallback(() => {
    closePolicyView();
    setSelectedViewRole(null);
  }, [closePolicyView]);

  const handleCreateNew = useCallback(() => {
    setSelectedExistingRole(null);
    const newInitialValues = getInitialValues({ initialEntityId, user });
    setFormInitialValues(newInitialValues);
    setActiveAssignmentMode('create');
  }, [initialEntityId, user]);

  const handleCancelEditOrCreate = useCallback(() => {
    if (rolesQuery.data && rolesQuery.data.length > 0) {
      setActiveAssignmentMode('view');
    } else {
      onBack();
    }
  }, [rolesQuery.data, onBack]);

  if (rolesQuery.isLoading) {
    return (
      <Center py={8}>
        <Spinner size="xl" />
      </Center>
    );
  }

  if (activeAssignmentMode === 'view') {
    return (
      <>
        <Stack spacing={4}>
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle>{context.heading}</AlertTitle>
              <AlertDescription>{context.description.replace('{{email}}', user.email)}</AlertDescription>
            </Box>
          </Alert>

          <Box borderWidth="1px" borderRadius="md" p={4}>
            <Heading size="md" mb={4}>
              Existing Access Policies
            </Heading>
            <Stack spacing={3}>
              {rolesQuery.data?.map((role) => {
                const entityName = entities?.find((e) => e.id === role.entity)?.name ?? role.entity;
                const venueName = role.venue ? (venues?.find((v) => v.id === role.venue)?.name ?? role.venue) : '';
                const policyId = getManagementPolicyIdFromRole(role);
                return (
                  <Flex
                    key={role.id}
                    justifyContent="space-between"
                    alignItems={{ base: 'stretch', md: 'center' }}
                    gap={3}
                    p={3}
                    borderWidth="1px"
                    borderRadius="md"
                    bg="gray.50"
                    direction={{ base: 'column', md: 'row' }}
                    _dark={{ bg: 'gray.700' }}
                  >
                    <Box>
                      <Text fontWeight="semibold">
                        {role.venue ? `Venue: ${venueName}` : `Entity: ${entityName}`}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {role.venue ? `Entity: ${entityName}` : 'Entity Scope'} | Policy: {role.name}
                      </Text>
                    </Box>
                    <HStack spacing={2} justifyContent={{ base: 'flex-start', md: 'flex-end' }} flexWrap="wrap">
                      <Button
                        size="sm"
                        colorScheme="blue"
                        variant="outline"
                        leftIcon={<Eye size={16} />}
                        onClick={() => handleViewRole(role)}
                        isDisabled={!policyId}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        colorScheme="blue"
                        leftIcon={<PencilSimple size={16} />}
                        onClick={() => handleEditRole(role)}
                        isDisabled={!policyId}
                      >
                        Edit
                      </Button>
                      <AccessPolicyDeletePopover role={role} onDeleted={rolesQuery.refetch} />
                    </HStack>
                  </Flex>
                );
              })}
            </Stack>
          </Box>

          <Flex justifyContent="space-between" mt={4}>
            <Button variant="outline" onClick={onBack}>
              {context.backLabel}
            </Button>
            <Button colorScheme="blue" onClick={handleCreateNew}>
              Add Policy Assignment
            </Button>
          </Flex>
        </Stack>
        <AccessPolicyViewModal
          isOpen={isPolicyViewOpen}
          onClose={handleClosePolicyView}
          policy={selectedViewPolicyQuery.data}
          isLoading={selectedViewPolicyQuery.isLoading || selectedViewPolicyQuery.isFetching}
        />
      </>
    );
  }

  return (
    <Formik
      enableReinitialize
      initialValues={formInitialValues}
      validationSchema={ValidationSchema(t)}
      onSubmit={async (values, { setSubmitting, setStatus }) => {
        setStatus(undefined);
        try {
          await assignAccessMutation.mutateAsync({
            access: [],
            entityId: values.entityId,
            resources: values.resourcePermissions.map(({ resource }) => resource),
            roleTemplate: values.roleTemplate,
            scope: values.scope,
            userEmail: values.userEmail,
            userId: values.userId,
            resourcePermissions: values.resourcePermissions,
            venueId: values.scope === 'venue' ? values.venueId : undefined,
            policyName: values.policyName || undefined,
            policyDescription: values.policyDescription || undefined,
            currentUserRole: authUser?.userRole,
            currentUserSecurityPolicy: authUser?.securityPolicy,
            currentUserId: authUser?.userId,
          });
          await rolesQuery.refetch();
          onComplete();
        } catch (error) {
          setStatus(error);
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting, isValid, status, values }) => (
        <Form>
          <Stack spacing={4}>
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <Box>
                <AlertTitle>{context.heading}</AlertTitle>
                <AlertDescription>{context.description.replace('{{email}}', user.email)}</AlertDescription>
              </Box>
            </Alert>

            {status ? (
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>{context.pendingTitle}</AlertTitle>
                  <AlertDescription>{status instanceof Error ? status.message : t('common.error')}</AlertDescription>
                </Box>
              </Alert>
            ) : null}

            <Heading size="sm">
              {activeAssignmentMode === 'edit'
                ? `Editing Access Policy for ${selectedExistingRole?.venue ? 'Venue' : 'Entity'}`
                : 'Create New Access Policy'}
            </Heading>

            <AccessPolicyFields
              onPolicyLoaded={handlePolicyLoaded}
              isEditMode={activeAssignmentMode === 'edit'}
              selectedPolicyId={getManagementPolicyIdFromRole(selectedExistingRole)}
            />

            <Divider />

            <Flex justifyContent="space-between" gap={3} flexWrap="wrap">
              <Button variant="outline" onClick={handleCancelEditOrCreate} isDisabled={isSubmitting}>
                Back to List
              </Button>
              <Button
                colorScheme="blue"
                type="submit"
                isLoading={isSubmitting}
                isDisabled={isAssignAccessDisabled({
                  initialValues: formInitialValues,
                  currentValues: values,
                  isValid,
                  isSubmitting,
                })}
              >
                {status ? context.retryLabel : context.submitLabel}
              </Button>
            </Flex>
          </Stack>
        </Form>
      )}
    </Formik>
  );
};

export default AssignAccessForm;
