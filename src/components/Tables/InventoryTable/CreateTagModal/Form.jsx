import React, { useEffect, useState } from 'react';
import { useToast, SimpleGrid } from '@chakra-ui/react';
import { Formik, Form } from 'formik';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';
import SpecialConfigurationManager from '../../../CustomFields/SpecialConfigurationManager';
import DeviceRulesField from 'components/CustomFields/DeviceRulesField';
import DeviceTypeFields from 'components/Tables/InventoryTable/DeviceTypeFields';
import SelectField from 'components/FormFields/SelectField';
import SelectWithSearchField from 'components/FormFields/SelectWithSearchField';
import StringField from 'components/FormFields/StringField';
import ToggleField from 'components/FormFields/ToggleField';
import { CreateTagSchema } from 'constants/formSchemas';
import { useGetEntities } from 'hooks/Network/Entity';
import { useGetVenues } from 'hooks/Network/Venues';
import { canEditConfiguration, isDeviceSelectionComplete } from 'utils/deviceGroup';

const propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  create: PropTypes.instanceOf(Object).isRequired,
  refresh: PropTypes.func.isRequired,
  formRef: PropTypes.instanceOf(Object).isRequired,
  onConfigurationChange: PropTypes.func.isRequired,
  configuration: PropTypes.instanceOf(Object),
  deviceTypesList: PropTypes.arrayOf(PropTypes.string).isRequired,
  deviceClasses: PropTypes.arrayOf(PropTypes.string).isRequired,
  deviceTypesByClass: PropTypes.instanceOf(Object).isRequired,
  entityId: PropTypes.string.isRequired,
  deviceClass: PropTypes.string.isRequired,
  subId: PropTypes.string.isRequired,
};

const defaultProps = {
  configuration: null,
};

const CreateTagForm = ({
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
  configuration,
  deviceClass,
  subId,
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [formKey, setFormKey] = useState(uuid());
  const { data: entities } = useGetEntities({ t, toast });
  const { data: venues } = useGetVenues({ t, toast });

  const getEntityId = () => {
    if (entityId === '') return '';
    const splitEntity = entityId.split(':');
    if (splitEntity[0] === 'entity') return `ent:${splitEntity[1]}`;
    return `ven:${splitEntity[1]}`;
  };

  const createParameters = ({
    serialNumber,
    name,
    description,
    note,
    deviceType,
    devClass,
    deviceRules,
    entity,
    doNotAllowOverrides,
  }) => ({
    serialNumber: serialNumber.toLowerCase(),
    name,
    deviceRules,
    deviceType,
    devClass: deviceClass !== '' ? deviceClass : devClass,
    description: description.length > 0 ? description : undefined,
    notes: note.length > 0 ? [{ note }] : undefined,
    entity: entity === '' || entity.split(':')[0] !== 'ent' ? '' : entity.split(':')[1],
    venue: entity === '' || entity.split(':')[0] !== 'ven' ? '' : entity.split(':')[1],
    doNotAllowOverrides,
    subscriber: subId !== '' ? subId : '',
  });

  useEffect(() => {
    setFormKey(uuid());
  }, [isOpen]);


  return (
    <Formik
      innerRef={formRef}
      key={formKey}
      initialValues={{
        serialNumber: '',
        name: '',
        description: '',
        deviceGroup: deviceClasses.includes('ap') ? 'ap' : deviceClasses[0] ?? '',
        deviceType: '',
        deviceRules: {
          rrm: 'inherit',
          rcOnly: 'inherit',
          firmwareUpgrade: 'inherit',
        },
        devClass: deviceClass !== '' ? deviceClass : 'any',
        note: '',
        entity: getEntityId(),
        doNotAllowOverrides: false,
      }}
      validationSchema={CreateTagSchema(t)}
      onSubmit={(formData, { setSubmitting, resetForm }) => {
        const params = createParameters(formData);

        if (configuration !== null) {
          params.__newConfig = {
            ...configuration.data,
            name: `device:${formData.serialNumber}`,
            description: 'Created from the Edit Tag menu',
            deviceTypes: [formData.deviceType],
          };
        }
        create.mutateAsync(params, {
          onSuccess: () => {
            setSubmitting(false);
            resetForm();
            toast({
              id: 'tag-creation-success',
              title: t('common.success'),
              description: t('crud.success_create_obj', {
                obj: t('certificates.device'),
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
                obj: t('certificates.device'),
                e: e?.response?.data?.ErrorDescription,
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
      {({ values }) => {
        const hasDeviceSelection = isDeviceSelectionComplete(values.deviceGroup, values.deviceType);
        return (
          <Form>
        <SimpleGrid minChildWidth="300px" spacing="20px" mb={6}>
          <StringField name="serialNumber" label={t('inventory.serial_number')} isRequired />
          <StringField name="name" label={t('common.name')} isRequired />
          <DeviceTypeFields deviceClasses={deviceClasses} deviceTypesByClass={deviceTypesByClass} />
          <SelectWithSearchField
            name="entity"
            label={t('inventory.parent')}
            options={[
              { label: t('common.none'), value: '' },
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
            isHidden={entityId !== '' || subId !== '' || deviceClass === 'subscriber'}
          />
          <DeviceRulesField />
          <SelectField
            name="devClass"
            label={t('inventory.dev_class')}
            options={[
              { value: 'any', label: 'any' },
              { value: 'entity', label: 'entity' },
              { value: 'venue', label: 'venue' },
              { value: 'subscriber', label: 'subscriber' },
            ]}
            isRequired
            isHidden={deviceClass !== ''}
          />
          <ToggleField name="doNotAllowOverrides" label={t('overrides.ignore_overrides')} isRequired />
          <StringField name="description" label={t('common.description')} />
          <StringField name="note" label={t('common.note')} />
        </SimpleGrid>
        <SpecialConfigurationManager
          editing={canEditConfiguration(values.deviceGroup, values.deviceType)}
          isEnabledByDefault={hasDeviceSelection}
          onChange={onConfigurationChange}
          deviceGroup={values.deviceGroup}
        />
      </Form>
        );
      }}
    </Formik>
  );
};

CreateTagForm.propTypes = propTypes;
CreateTagForm.defaultProps = defaultProps;

export default CreateTagForm;
