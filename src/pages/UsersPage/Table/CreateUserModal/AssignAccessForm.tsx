import React, { useEffect, useMemo } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Divider,
  Flex,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react';
import { FieldArray, Form, Formik, useFormikContext } from 'formik';
import { useTranslation } from 'react-i18next';
import * as Yup from 'yup';
import MultiSelectField from 'components/FormFields/MultiSelectField';
import SelectField from 'components/FormFields/SelectField';
import { useAuth } from 'contexts/AuthProvider';
import { useGetEntities, useGetEntity } from 'hooks/Network/Entity';
import {
  getTemplateAccess,
  MANAGEMENT_ACCESS_PERMISSIONS,
  ManagementPolicyApiResponse,
  ManagementRoleTemplate,
  ManagementScope,
  ManagementResourceAccess,
  useGetManagementPolicyForUserEntity,
  useAssignUserAccess,
} from 'hooks/Network/ManagementAccess';
import { useGetSelectVenues } from 'hooks/Network/Venues';

type AssignAccessFormValues = {
  entityId: string;
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
  { label: 'Viewer', value: 'Viewer' },
  { label: 'Support', value: 'Support' },
  { label: 'Custom', value: 'Custom' },
];

const accessPermissionOptions = MANAGEMENT_ACCESS_PERMISSIONS.map((permission) => ({
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

const getInitialAccess = (scope: ManagementScope, roleTemplate: ManagementRoleTemplate) =>
  roleTemplate === 'Custom' ? [] : getTemplateAccess(scope, roleTemplate);

const getInitialResources = (scope: ManagementScope) => (scope === 'entity' ? ['entity', 'venue'] : ['venue']);

const getInitialResourcePermissions = (scope: ManagementScope, roleTemplate: ManagementRoleTemplate) => {
  const defaultAccess = getInitialAccess(scope, roleTemplate)[0] ?? 'NOACCESS';

  return getInitialResources(scope).map((resource) => ({
    resource,
    access: [defaultAccess],
  }));
};

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
      .min(1, t('form.required'))
      .required(t('form.required')),
    venueId: Yup.string().when('scope', {
      is: 'venue',
      then: (schema) => schema.required(t('form.required')),
      otherwise: (schema) => schema.notRequired(),
    }),
    roleTemplate: Yup.string().oneOf(['Admin', 'Viewer', 'Support', 'Custom']).required(t('form.required')),
  });

const AccessPolicyFields = () => {
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

  const getResourceOptions = (resource: string) => {
    if (filteredResourceOptions.some((option) => option.value === resource)) return filteredResourceOptions;

    const selectedResourceOption = resourceOptions.find((option) => option.value === resource);
    if (!selectedResourceOption) return filteredResourceOptions;

    return [...filteredResourceOptions, selectedResourceOption];
  };

  const policyQuery = useGetManagementPolicyForUserEntity({
    enabled:
      Boolean(values.entityId) &&
      !values.entityId.startsWith('operator:') &&
      Boolean(values.userId) &&
      (values.scope === 'entity' || Boolean(values.venueId)),
    entityId: values.entityId,
    userId: values.userId,
    venueId: values.scope === 'venue' ? values.venueId : undefined,
  });
  const existingPolicy = policyQuery.data?.policy;

  useEffect(() => {
    if (!values.entityId) return;

    if (existingPolicy) {
      setFieldValue('resourcePermissions', getResourcePermissionsFromPolicy(existingPolicy), false);
      return;
    }

    setFieldValue('resourcePermissions', getInitialResourcePermissions(values.scope, values.roleTemplate), false);
  }, [existingPolicy?.id, setFieldValue, values.entityId, values.roleTemplate, values.scope]);

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
            isDisabled={!values.entityId}
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
                      options={getResourceOptions(values.resourcePermissions[index]?.resource ?? '')}
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
                    />
                    <Button
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => remove(index)}
                      isDisabled={values.resourcePermissions.length === 1}
                    >
                      Remove
                    </Button>
                  </SimpleGrid>
                ))}
                <Button
                  variant="outline"
                  onClick={() =>
                    push({
                      resource: '',
                      access: [getInitialAccess(values.scope, values.roleTemplate)[0] ?? 'NOACCESS'],
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
  roleTemplate: 'Admin',
  scope: 'entity',
  userEmail: user.email,
  userId: user.userId,
  venueId: '',
  resourcePermissions: getInitialResourcePermissions('entity', 'Admin'),
});

const AssignAccessForm = ({ onBack, onComplete, initialEntityId, user, context }: Props) => {
  const { t } = useTranslation();
  const assignAccessMutation = useAssignUserAccess();
  const { user: authUser } = useAuth();

  return (
    <Formik
      enableReinitialize
      initialValues={getInitialValues({ initialEntityId, user })}
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
            currentUserRole: authUser?.userRole,
            currentUserSecurityPolicy: authUser?.securityPolicy,
            currentUserId: authUser?.userId,
          });
          onComplete();
        } catch (error) {
          setStatus(error);
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting, isValid, status }) => (
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

            <AccessPolicyFields />

            <Divider />

            <Flex justifyContent="space-between" gap={3} flexWrap="wrap">
              <Button variant="outline" onClick={onBack} isDisabled={isSubmitting}>
                {context.backLabel}
              </Button>
              <Button
                colorScheme="blue"
                type="submit"
                isLoading={isSubmitting}
                isDisabled={!isValid || isSubmitting}
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
