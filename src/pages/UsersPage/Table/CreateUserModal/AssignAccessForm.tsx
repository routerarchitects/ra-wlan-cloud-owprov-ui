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
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';
import { FieldArray, Form, Formik, useFormikContext } from 'formik';
import { useTranslation } from 'react-i18next';
import * as Yup from 'yup';
import MultiSelectField from 'components/FormFields/MultiSelectField';
import SelectField from 'components/FormFields/SelectField';
import StringField from 'components/FormFields/StringField';
import { useAuth } from 'contexts/AuthProvider';
import { useGetEntities } from 'hooks/Network/Entity';
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

const scopeOptions: { label: string; value: ManagementScope }[] = [
  { label: 'Entity', value: 'entity' },
  { label: 'Venue', value: 'venue' },
];

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
      entry.resources.filter((resource) => resource !== '').forEach((resource) => {
        const existingAccess = resourceMap.get(resource) ?? [];
        resourceMap.set(resource, Array.from(new Set([...existingAccess, ...(entry.access.length > 0 ? entry.access : ['NOACCESS'])])));
      });
      return resourceMap;
    }, new Map<string, ManagementAccessPermission[]>()),
    ([resource, access]) => ({ resource, access }),
  );

const extractAllowedEntityIds = (securityPolicy?: string) => {
  if (!securityPolicy) return [];

  try {
    const parsed = JSON.parse(securityPolicy) as unknown;
    const ids = new Set<string>();

    const visit = (value: unknown) => {
      if (!value) return;
      if (typeof value === 'string') {
        ids.add(value);
        return;
      }
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      if (typeof value !== 'object') return;

      Object.entries(value as Record<string, unknown>).forEach(([key, nestedValue]) => {
        if (['entity', 'entityId'].includes(key) && typeof nestedValue === 'string') {
          ids.add(nestedValue);
          return;
        }
        if (['entities', 'entityIds'].includes(key)) {
          visit(nestedValue);
        }
      });
    };

    visit(parsed);
    return Array.from(ids);
  } catch {
    return [];
  }
};

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

const EntityResolver = () => {
  const { values, setFieldValue } = useFormikContext<AssignAccessFormValues>();
  const { user: authUser } = useAuth();
  const entityQuery = useGetEntities();
  const allowedEntityIds = useMemo(() => {
    if (authUser?.userRole === 'root') return [];

    const ids = extractAllowedEntityIds(authUser?.securityPolicy);
    if (ids.length > 0) return ids;

    return authUser?.owner ? [authUser.owner] : [];
  }, [authUser?.owner, authUser?.securityPolicy, authUser?.userRole]);
  const visibleEntities = useMemo(() => {
    if (allowedEntityIds.length === 0) return entityQuery.data ?? [];

    return (entityQuery.data ?? []).filter((entity) => allowedEntityIds.includes(entity.id));
  }, [allowedEntityIds, entityQuery.data]);
  const policyQuery = useGetManagementPolicyForUserEntity({
    enabled: Boolean(values.entityId) && Boolean(values.userId),
    entityId: values.entityId,
    userId: values.userId,
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

  if (entityQuery.isLoading) {
    return (
      <Flex alignItems="center" justifyContent="center" py={6}>
        <Spinner />
      </Flex>
    );
  }

  return (
    <Stack spacing={4}>
      <SimpleGrid minChildWidth="280px" spacing="20px">
        <SelectField
          name="scope"
          label="Scope"
          options={scopeOptions}
          isRequired
          onChangeEffect={(event) => {
            const nextScope = event.target.value as ManagementScope;
            setFieldValue('resourcePermissions', getInitialResourcePermissions(nextScope, values.roleTemplate), false);
          }}
        />
        <SelectField
          name="entityId"
          label="Entity"
          options={[
            { label: 'Select entity', value: '' },
            ...visibleEntities.map((entity) => ({
              label: entity.name,
              value: entity.id,
            })),
          ]}
          isRequired
        />
        <SelectField name="roleTemplate" label="Role Template" options={roleTemplateOptions} isRequired />
        <StringField name="venueId" label="Venue ID" isRequired={values.scope === 'venue'} isHidden={values.scope !== 'venue'} />
      </SimpleGrid>

      <Box borderWidth="1px" borderRadius="md" p={4}>
        <Stack spacing={3}>
          <Text fontWeight="semibold">Resource Permissions</Text>
          <Text fontSize="sm" color="gray.500">
            Configure access per resource. Existing policies for this user and entity are loaded automatically.
          </Text>
          <FieldArray name="resourcePermissions">
            {({ push, remove }) => (
              <Stack spacing={3}>
                {values.resourcePermissions.map((_, index) => (
                  <SimpleGrid key={`${values.entityId}-${index}`} minChildWidth="220px" spacing="12px" alignItems="end">
                    <SelectField
                      name={`resourcePermissions.${index}.resource`}
                      label={index === 0 ? 'Resource' : ''}
                      options={resourceOptions}
                      isRequired
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
                  onClick={() => push({ resource: '', access: [getInitialAccess(values.scope, values.roleTemplate)[0] ?? 'NOACCESS'] })}
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
          Access is loaded for the selected entity.
        </Text>
        {existingPolicy ? (
          <Text fontSize="sm" color="green.500" mt={1}>
            Existing policy found. Submit will update {existingPolicy.name}.
          </Text>
        ) : values.entityId ? (
          <Text fontSize="sm" color="orange.500" mt={1}>
            No policy found for this user and entity. Submit will create one.
          </Text>
        ) : null}
        {visibleEntities.length === 0 ? (
          <Text fontSize="sm" color="red.500" mt={1}>
            No permitted entities available to select.
          </Text>
        ) : null}
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
          });
          onComplete();
        } catch (error) {
          setStatus(error);
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting, isValid, status, values }) => {
        return (
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
                    <AlertDescription>
                      {status instanceof Error ? status.message : t('common.error')}
                    </AlertDescription>
                  </Box>
                </Alert>
              ) : null}

              <EntityResolver />

              <Divider />

              <Flex justifyContent="space-between" gap={3} flexWrap="wrap">
                <Button variant="outline" onClick={onBack} isDisabled={isSubmitting}>
                  {context.backLabel}
                </Button>
                <Button colorScheme="blue" type="submit" isLoading={isSubmitting} isDisabled={!isValid || isSubmitting}>
                  {status ? context.retryLabel : context.submitLabel}
                </Button>
              </Flex>

              <Text fontSize="xs" color="gray.500">
                Scope: {values.scope}. The selected entity is used to load policy data.
              </Text>
            </Stack>
          </Form>
        );
      }}
    </Formik>
  );
};

export default AssignAccessForm;
