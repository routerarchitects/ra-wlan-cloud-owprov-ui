import React, { useEffect, useState } from 'react';
import { useToast, SimpleGrid } from '@chakra-ui/react';
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';
import DeviceRulesField from 'components/CustomFields/DeviceRulesField';
import SpecialConfigurationManager from 'components/CustomFields/SpecialConfigurationManager';
import MultiSelectField from 'components/FormFields/MultiSelectField';
import SelectField from 'components/FormFields/SelectField';
import SelectWithSearchField from 'components/FormFields/SelectWithSearchField';
import StringField from 'components/FormFields/StringField';
import { CreateConfigurationSchema } from 'constants/formSchemas';
import { ConfigurationProvider } from 'contexts/ConfigurationProvider';
import { useGetEntities } from 'hooks/Network/Entity';
import { useGetVenues } from 'hooks/Network/Venues';
import { canEditConfiguration } from 'utils/deviceGroup';

const propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  create: PropTypes.instanceOf(Object).isRequired,
  refresh: PropTypes.func.isRequired,
  formRef: PropTypes.instanceOf(Object).isRequired,
  deviceTypesList: PropTypes.arrayOf(PropTypes.string).isRequired,
  deviceClasses: PropTypes.arrayOf(PropTypes.string).isRequired,
  deviceTypesByClass: PropTypes.instanceOf(Object).isRequired,
  onConfigurationChange: PropTypes.func.isRequired,
  currentConfiguration: PropTypes.instanceOf(Object),
  entityId: PropTypes.string,
};
const defaultProps = {
  currentConfiguration: null,
  entityId: null,
};

const CreateConfigurationForm = ({
  isOpen,
  onClose,
  create,
  refresh,
  formRef,
  deviceTypesList,
  deviceClasses,
  deviceTypesByClass,
  entityId,
  onConfigurationChange,
  currentConfiguration,
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [formKey, setFormKey] = useState(uuid());
  const { data: entities } = useGetEntities({ t, toast });
  const { data: venues } = useGetVenues({ t, toast });

  const getEntityId = () => {
    if (!entityId) return 'ent:0000-0000-0000';
    const splitEntity = entityId.split(':');
    if (splitEntity[0] === 'entity') return `ent:${splitEntity[1]}`;
    return `ven:${splitEntity[1]}`;
  };

  const createParameters = ({ name, description, note, deviceGroup, deviceTypes, entity, deviceRules, __CREATE_CONFIG }) => ({
    name,
    deviceGroup,
    deviceRules,
    deviceTypes,
    description: description.length > 0 ? description : undefined,
    notes: note.length > 0 ? [{ note }] : undefined,
    entity: entity === '' || entity.split(':')[0] !== 'ent' ? '' : entity.split(':')[1],
    venue: entity === '' || entity.split(':')[0] !== 'ven' ? '' : entity.split(':')[1],
    configuration: __CREATE_CONFIG ?? undefined,
  });

  useEffect(() => {
    setFormKey(uuid());
  }, [isOpen]);

  return (
    <Formik
      innerRef={formRef}
      key={formKey}
      initialValues={{
        name: '',
        description: '',
        deviceGroup: deviceClasses.includes('ap') ? 'ap' : deviceClasses[0] ?? '',
        deviceTypes: [],
        deviceRules: {
          rrm: 'inherit',
          rcOnly: 'inherit',
          firmwareUpgrade: 'inherit',
        },
        note: '',
        entity: getEntityId(),
        __CREATE_CONFIG: null,
      }}
      validationSchema={CreateConfigurationSchema(t)}
      onSubmit={(formData, { setSubmitting, resetForm }) => {
        const configEntries = Array.isArray(currentConfiguration?.data?.configuration)
          ? currentConfiguration.data.configuration
          : formData?.__CREATE_CONFIG;
        if (!Array.isArray(configEntries) || configEntries.length === 0) {
          toast({
            id: 'configuration-sections-required',
            title: t('common.error'),
            description: t('configurations.start_special_creation'),
            status: 'error',
            duration: 5000,
            isClosable: true,
            position: 'top-right',
          });
          setSubmitting(false);
          return;
        }
        create.mutate(createParameters({ ...formData, __CREATE_CONFIG: configEntries }), {
          onSuccess: () => {
            setSubmitting(false);
            resetForm();
            toast({
              id: 'configuration-creation-success',
              title: t('common.success'),
              description: t('crud.success_create_obj', {
                obj: t('configurations.one'),
              }),
              status: 'success',
              duration: 5000,
              isClosable: true,
              position: 'top-right',
            });
            refresh();
            onClose();
          },
          onError: (e) => {
            toast({
              id: uuid(),
              title: t('common.error'),
              description: t('crud.error_create_obj', {
                obj: t('configurations.one'),
                e: e?.response?.data?.ErrorDescription ?? e?.message ?? 'Unknown error',
              }),
              status: 'error',
              duration: 5000,
              isClosable: true,
              position: 'top-right',
            });
            setSubmitting(false);
          },
        });
      }}
    >
      {({ errors, touched, setFieldValue, values }) => {
        const selectedGroup = values.deviceGroup;
        const typesForGroup = selectedGroup ? deviceTypesByClass[selectedGroup] ?? [] : [];
        const deviceTypeOptions = typesForGroup.map((deviceType) => ({
          value: deviceType,
          label: deviceType,
        }));
        return (
        <>
          <SimpleGrid minChildWidth="300px" spacing="20px" mb={6}>
            <StringField name="name" label={t('common.name')} errors={errors} touched={touched} isRequired />
            <SelectField
              name="deviceGroup"
              label="Device Group"
              errors={errors}
              touched={touched}
              options={deviceClasses.map((deviceGroup) => ({
                value: deviceGroup,
                label: deviceGroup,
              }))}
              isRequired
            />
            <MultiSelectField
              name="deviceTypes"
              label={t('configurations.device_types')}
              errors={errors}
              touched={touched}
              options={deviceTypeOptions}
              isRequired
              setFieldValue={setFieldValue}
              canSelectAll
              isPortal
              isDisabled={!selectedGroup}
            />
            <SelectWithSearchField
              name="entity"
              label={t('inventory.parent')}
              errors={errors}
              touched={touched}
              isRequired
              options={[
                {
                  label: t('entities.title'),
                  options:
                    entities?.map((ent) => ({
                      value: `ent:${ent.id}`,
                      label: `${ent.name}${ent.description ? `: ${ent.description}` : ''}`,
                    })) ?? [],
                },
                {
                  label: t('venues.title'),
                  options:
                    venues?.map((ven) => ({
                      value: `ven:${ven.id}`,
                      label: `${ven.name}${ven.description ? `: ${ven.description}` : ''}`,
                    })) ?? [],
                },
              ]}
              setFieldValue={setFieldValue}
              isHidden={entityId !== null}
              isPortal
            />
            <DeviceRulesField />
            <StringField name="description" label={t('common.description')} errors={errors} touched={touched} />
            <StringField name="note" label={t('common.note')} errors={errors} touched={touched} />
          </SimpleGrid>
          <ConfigurationProvider entityId={getEntityId()}>
            <SpecialConfigurationManager
              editing={canEditConfiguration(values.deviceGroup, undefined, values.deviceTypes)}
              isEnabledByDefault={false}
              isOnlySections
              onChange={(conf) => {
                onConfigurationChange(conf);
                setFieldValue(
                  '__CREATE_CONFIG',
                  Array.isArray(conf?.data?.configuration) ? conf.data.configuration : null,
                  false,
                );
              }}
              deviceGroup={values.deviceGroup}
            />
          </ConfigurationProvider>
        </>
        );
      }}
    </Formik>
  );
};

CreateConfigurationForm.propTypes = propTypes;
CreateConfigurationForm.defaultProps = defaultProps;

export default CreateConfigurationForm;
