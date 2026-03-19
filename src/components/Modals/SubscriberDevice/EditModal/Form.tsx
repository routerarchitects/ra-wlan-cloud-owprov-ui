import React, { Ref, useEffect, useState } from 'react';
import { Tabs, TabList, TabPanels, TabPanel, Tab, SimpleGrid, Heading } from '@chakra-ui/react';
import { Formik, Form, FormikProps } from 'formik';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';
import SubscriberDeviceContactForm from './Contact';
import SubscriberDeviceLocationForm from './Location';
import DeviceRulesField from 'components/CustomFields/DeviceRulesField';
import NotesTable from 'components/CustomFields/NotesTable';
import SubscriberDeviceConfigurationManager from 'components/CustomFields/SubscriberDeviceConfigurationManager';
import SelectField from 'components/FormFields/SelectField';
import StringField from 'components/FormFields/StringField';
import { SubscriberDeviceSchema } from 'constants/formSchemas';
import { useUpdateSubscriberDevice } from 'hooks/Network/SubscriberDevices';
import useMutationResult from 'hooks/useMutationResult';
import useSelectList from 'hooks/useSelectList';
import { Configuration } from 'models/Configuration';
import { Device } from 'models/Device';
import { ModalProps } from 'models/Modal';
import { ServiceClass } from 'models/ServiceClass';
import { Subscriber } from 'models/Subscriber';

interface Props {
  editing: boolean;
  modalProps: ModalProps;
  refresh: () => void;
  subscriberDevice: Device;
  formRef: Ref<FormikProps<Device>> | undefined;
  externalData: {
    deviceTypes: string[];
    deviceClasses: string[];
    deviceTypesByClass: Record<string, string[]>;
    serviceClasses: ServiceClass[];
    subscribers: Subscriber[];
  };
  configuration?: Configuration[];
  defaultConfiguration?: Configuration[];
  onConfigurationChange: (conf: Configuration) => void;
}
const defaultProps = {
  configuration: undefined,
  defaultConfiguration: undefined,
};

const EditSubscriberDeviceForm = (
  {
    editing,
    modalProps: { isOpen, onClose },
    refresh,
    subscriberDevice,
    externalData,
    formRef,
    configuration,
    onConfigurationChange,
    defaultConfiguration
  }: Props
) => {
  const { t } = useTranslation();
  const { onSuccess, onError } = useMutationResult({
    objName: t('devices.one'),
    operationType: 'update',
    refresh,
    onClose,
  });
  const [formKey, setFormKey] = useState(uuid());
  const updateSubscriberDevice = useUpdateSubscriberDevice({ id: subscriberDevice.id });

  const serviceClassesOptions = useSelectList({
    values: externalData.serviceClasses,
    hasEmpty: true,
    valueKey: 'id',
    labelKey: 'name',
  });
  const subscriberOptions = useSelectList({
    values: externalData.subscribers,
    hasEmpty: true,
    valueKey: 'id',
    labelKey: 'name',
  });
  const getSubscriberPrimaryEmail = React.useCallback(
    (id?: string) => externalData.subscribers.find((subscriber) => subscriber.id === id)?.email ?? '',
    [externalData.subscribers],
  );
  const getDeviceGroupFromType = React.useCallback(
    (deviceType: string) => {
      if (!deviceType) return '';
      const entries = Object.entries(externalData.deviceTypesByClass ?? {});
      const match = entries.find(([, types]) => types?.includes(deviceType));
      return match ? match[0] : '';
    },
    [externalData.deviceTypesByClass],
  );
  const getDeviceTypesForGroup = React.useCallback(
    (deviceGroup: string) => {
      if (!deviceGroup) return externalData.deviceTypes;
      const typesForGroup = externalData.deviceTypesByClass[deviceGroup] ?? [];
      return typesForGroup.length > 0 ? typesForGroup : externalData.deviceTypes;
    },
    [externalData.deviceTypes, externalData.deviceTypesByClass],
  );
  const defaultGroup =
    // @ts-ignore
    (subscriberDevice as { deviceGroup?: string })?.deviceGroup ??
    getDeviceGroupFromType(subscriberDevice.deviceType) ??
    (externalData.deviceClasses.includes('ap') ? 'ap' : externalData.deviceClasses[0] ?? '');
  const defaultDeviceType = subscriberDevice.deviceType || getDeviceTypesForGroup(defaultGroup)[0] || '';

  useEffect(() => {
    setFormKey(uuid());
  }, [isOpen]);

  return (
    <Formik
      innerRef={formRef}
      enableReinitialize
      key={formKey}
      initialValues={{
        ...subscriberDevice,
        deviceGroup: defaultGroup,
        deviceType: defaultDeviceType,
        contact: {
          ...subscriberDevice.contact,
          primaryEmail:
            getSubscriberPrimaryEmail((subscriberDevice as unknown as { subscriberId?: string }).subscriberId) ||
            subscriberDevice.contact?.primaryEmail ||
            '',
        },
        location: {
          ...subscriberDevice.location,
          addressLineOne: subscriberDevice.location.addressLines ? subscriberDevice.location.addressLines[0] : '',
          addressLineTwo: subscriberDevice.location.addressLines ? subscriberDevice.location.addressLines[1] : '',
        },
      }}
      validationSchema={SubscriberDeviceSchema(t)}
      onSubmit={(data, { setSubmitting, resetForm }) => {
        const addressLines = [data.location.addressLineOne ?? ''];
        if (data.location.addressLineTwo) addressLines.push(data.location.addressLineTwo);
        const subscriberPrimaryEmail =
          getSubscriberPrimaryEmail((data as unknown as { subscriberId?: string }).subscriberId) ||
          data.contact.primaryEmail ||
          '';

        updateSubscriberDevice.mutateAsync(
          {
            ...data,
            configuration: configuration ?? undefined,
            contact: {
              ...data.contact,
              primaryEmail: subscriberPrimaryEmail,
            },
            location: {
              ...data.location,
              addressLines,
            },
            // @ts-ignore
            notes: data.notes.filter((note) => note.isNew),
          },
          {
            onSuccess: () => {
              onSuccess({ setSubmitting, resetForm });
            },
            onError: (e) => {
              onError(e, { resetForm });
            },
          },
        );
      }}
    >
      {({ values, setFieldValue }) => {
        const selectedGroup = values.deviceGroup as string;
        const base = getDeviceTypesForGroup(selectedGroup).slice();
        if (values.deviceType && !base.includes(values.deviceType)) base.push(values.deviceType);
        const deviceTypeOptions = base.map((deviceType) => ({ value: deviceType, label: deviceType }));

        return (
          <Tabs variant="enclosed">
            <TabList>
              <Tab>{t('common.main')}</Tab>
              <Tab>{t('locations.one')}</Tab>
              <Tab>{t('contacts.one')}</Tab>
              <Tab>{t('common.notes')}</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <Form>
                  <Heading size="md" mb={2}>
                    {t('common.identification')}
                  </Heading>
                  <SimpleGrid minChildWidth="200px" spacing="10px" mb={4}>
                    <StringField name="name" label={t('common.name')} isRequired isDisabled={!editing} />
                    <SelectField
                      name="subscriberId"
                      label={t('subscribers.one')}
                      options={subscriberOptions}
                      isRequired
                      isDisabled={!editing}
                      onChangeEffect={(e) => setFieldValue('contact.primaryEmail', getSubscriberPrimaryEmail(e.target.value))}
                    />
                    <StringField name="description" label={t('common.description')} isDisabled={!editing} />
                  </SimpleGrid>
                  <Heading size="md" mb={2}>
                    {t('common.device_details')}
                  </Heading>
                  <SimpleGrid minChildWidth="200px" spacing="10px" mb={4}>
                    <StringField
                      name="serialNumber"
                      label={t('inventory.serial_number')}
                      isRequired
                      isDisabled={!editing}
                    />
                    <SelectField
                      name="deviceGroup"
                      label="Device Group"
                      options={externalData.deviceClasses.map((deviceGroup) => ({
                        value: deviceGroup,
                        label: deviceGroup,
                      }))}
                      isRequired
                      isDisabled={!editing}
                      onChangeEffect={(e) => {
                        const nextGroup = e.target.value as string;
                        const nextDeviceType = getDeviceTypesForGroup(nextGroup)[0] ?? '';
                        setFieldValue('deviceType', nextDeviceType);
                      }}
                    />
                    <SelectField
                      name="deviceType"
                      label={t('inventory.device_type')}
                      options={deviceTypeOptions}
                      isRequired
                      isDisabled={!editing || !selectedGroup}
                    />
                    <DeviceRulesField isDisabled={!editing} />
                  </SimpleGrid>
                  <Heading size="md" mb={2}>
                    {t('subscribers.billing_contact_info')}
                  </Heading>
                  <SimpleGrid minChildWidth="200px" spacing="10px" mb={4}>
                    <SelectField
                      name="serviceClass"
                      label={t('service.one')}
                      options={serviceClassesOptions}
                      isDisabled={!editing}
                    />
                    <StringField name="billingCode" label={t('service.billing_code')} isDisabled={!editing} />
                  </SimpleGrid>
                  <SubscriberDeviceConfigurationManager
                    editing={editing}
                    onChange={onConfigurationChange}
                    configuration={defaultConfiguration}
                    deviceGroup={selectedGroup}
                  />
                </Form>
              </TabPanel>
              <TabPanel>
                <SubscriberDeviceLocationForm editing={editing} />
              </TabPanel>
              <TabPanel>
                <SubscriberDeviceContactForm editing={editing} />
              </TabPanel>
              <TabPanel>
                <NotesTable name="notes" isDisabled={!editing} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        );
      }}
    </Formik>
  );
};

EditSubscriberDeviceForm.defaultProps = defaultProps;

export default EditSubscriberDeviceForm;
