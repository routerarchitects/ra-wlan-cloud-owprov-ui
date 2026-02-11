import * as React from 'react';
import { Heading, SimpleGrid } from '@chakra-ui/react';
import { Formik, Form, FormikProps } from 'formik';
import { useTranslation } from 'react-i18next';
import * as Yup from 'yup';
import DeviceRulesField from 'components/CustomFields/DeviceRulesField';
import SubscriberDeviceConfigurationManager from 'components/CustomFields/SubscriberDeviceConfigurationManager';
import SelectField from 'components/FormFields/SelectField';
import StringField from 'components/FormFields/StringField';
import { DeviceRulesSchema } from 'constants/formSchemas';
import { Configuration } from 'models/Configuration';

const defaultConfiguration: Record<string, unknown>[] = [];

const Schema = (t: (str: string) => string) =>
  Yup.object().shape({
    serialNumber: Yup.string()
      .required(t('form.required'))
      .test('test-serial-regex', t('inventory.invalid_serial_number'), (v) => {
        if (v) {
          if (v.length !== 12) return false;
          if (!v.match('^[a-fA-F0-9]+$')) return false;
        }
        return true;
      })
      .default(''),
    deviceRules: DeviceRulesSchema(t).required('form.required').default({
      rrm: 'inherit',
      rcOnly: 'inherit',
      firmwareUpgrade: 'inherit',
    }),
    deviceGroup: Yup.string().required(t('form.required')).default(''),
    deviceType: Yup.string().required(t('form.required')).default(''),
  });

interface Props {
  formRef: React.Ref<FormikProps<Record<string, unknown>>> | undefined;
  finishStep: (v: Record<string, unknown>) => void;
  deviceTypes: string[];
  deviceClasses: string[];
  deviceTypesByClass: Record<string, string[]>;
  onConfigurationChange: (conf: Configuration) => void;
}

const CreateSubscriberDeviceStep1 = (
  {
    formRef,
    finishStep,
    deviceTypes,
    deviceClasses,
    deviceTypesByClass,
    onConfigurationChange
  }: Props
) => {
  const { t } = useTranslation();
  const defaultGroup = deviceClasses.includes('ap') ? 'ap' : deviceClasses[0] ?? '';

  return (
    <Formik
      validateOnMount
      innerRef={formRef}
      initialValues={{ ...Schema(t).cast(undefined), deviceGroup: defaultGroup }}
      validationSchema={Schema(t)}
      onSubmit={(data) => finishStep(data)}
    >
      {({ values, setFieldValue }) => {
        const selectedGroup = values.deviceGroup as string;
        const typesForGroup = selectedGroup ? deviceTypesByClass[selectedGroup] ?? [] : deviceTypes;
        const resolvedTypes = typesForGroup?.length ? typesForGroup : deviceTypes;
        const deviceTypeOptions = resolvedTypes.map((deviceType) => ({
          value: deviceType,
          label: deviceType,
        }));
        const selectedType = values.deviceType as string;

        React.useEffect(() => {
          if (!selectedGroup) return;
          if (!selectedType && resolvedTypes.length > 0) {
            setFieldValue('deviceType', resolvedTypes[0]);
          }
        }, [selectedGroup, selectedType, resolvedTypes.join('|')]);

        return (
          <Form>
            <Heading size="md" mb={2}>
              {t('common.device_details')}
            </Heading>
            <SimpleGrid minChildWidth="200px" spacing="10px" mb={4}>
              <StringField name="serialNumber" label={t('inventory.serial_number')} isRequired />
              <SelectField
                name="deviceGroup"
                label="Device Group"
                options={deviceClasses.map((deviceGroup) => ({
                  value: deviceGroup,
                  label: deviceGroup,
                }))}
                isRequired
                onChangeEffect={() => setFieldValue('deviceType', '')}
              />
              <SelectField
                name="deviceType"
                label={t('inventory.device_type')}
                options={deviceTypeOptions}
                isRequired
                isDisabled={!selectedGroup}
              />
              <DeviceRulesField />
            </SimpleGrid>
            <SubscriberDeviceConfigurationManager
              editing
              onChange={onConfigurationChange}
              configuration={defaultConfiguration}
              deviceGroup={selectedGroup}
            />
          </Form>
        );
      }}
    </Formik>
  );
};

export default CreateSubscriberDeviceStep1;
