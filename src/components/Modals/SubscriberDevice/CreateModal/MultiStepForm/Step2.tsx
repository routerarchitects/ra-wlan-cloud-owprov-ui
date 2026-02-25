import * as React from 'react';
import { Flex, Heading, Select, SimpleGrid } from '@chakra-ui/react';
import { Formik, Form, FormikProps } from 'formik';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';
import * as Yup from 'yup';
import AddressSearchField from 'components/CustomFields/AddressSearchField';
import CreatableSelectField from 'components/FormFields/CreatableSelectField';
import SelectField from 'components/FormFields/SelectField';
import StringField from 'components/FormFields/StringField';
import COUNTRY_LIST from 'constants/countryList';
import { SubscriberDeviceLocationSchema } from 'constants/formSchemas';
import { DeviceLocation } from 'models/Device';

interface Props {
  formRef: React.Ref<FormikProps<Record<string, unknown>>> | undefined;
  finishStep: (v: Record<string, unknown>) => void;
  locationSuggestions: { serialNumber: string; location: DeviceLocation }[];
  initialData?: Record<string, unknown>;
}

const CreateSubscriberDeviceStep2 = (
  {
    formRef,
    finishStep,
    locationSuggestions,
    initialData
  }: Props
) => {
  const { t } = useTranslation();
  const initialLocation = (initialData?.location as Record<string, unknown>) ?? {};

  const onChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
    setFieldValue: (field: string, value: unknown, shouldValidate?: boolean | undefined) => void,
  ) => {
    const found = locationSuggestions.find(({ serialNumber }) => serialNumber === e.target.value);

    if (found)
      setFieldValue('location', {
        ...found.location,
        addressLineOne:
          found.location.addressLines && found.location.addressLines[0] ? found.location.addressLines[0] : '',
        addressLineTwo:
          found.location.addressLines && found.location.addressLines.length >= 2 ? found.location.addressLines[1] : '',
      });
  };

  return (
    <Formik
      innerRef={formRef as (instance: FormikProps<{ location: DeviceLocation }> | null) => void}
      enableReinitialize
      initialValues={{
        location: {
          type: (initialLocation.type as string) ?? 'SERVICE',
          addressLineOne:
            (initialLocation.addressLineOne as string) ?? ((initialLocation.addressLines as string[] | undefined)?.[0] ?? ''),
          addressLineTwo:
            (initialLocation.addressLineTwo as string) ?? ((initialLocation.addressLines as string[] | undefined)?.[1] ?? ''),
          city: (initialLocation.city as string) ?? '',
          state: (initialLocation.state as string) ?? '',
          postal: (initialLocation.postal as string) ?? '',
          country: (initialLocation.country as string) ?? '',
          buildingName: (initialLocation.buildingName as string) ?? '',
          mobiles: (initialLocation.mobiles as string[]) ?? [],
          phones: (initialLocation.phones as string[]) ?? [],
          geoCode: (initialLocation.geoCode as string) ?? '',
        },
      }}
      validateOnMount
      validationSchema={Yup.object().shape({
        location: SubscriberDeviceLocationSchema(t),
      })}
      onSubmit={({ location }: { location: DeviceLocation }) => {
        const addressLines = [location.addressLineOne];
        if (location.addressLineTwo !== '') addressLines.push(location.addressLineTwo);
        finishStep({ location: { ...location, addressLines } });
      }}
    >
      {({ setFieldValue }) => (
        <>
          <Flex mb={2}>
            <Heading pt={0.5} size="md">
              {t('locations.one')}
            </Heading>
            <Select onChange={(e) => onChange(e, setFieldValue)} w="250px" ml={2} size="sm">
              <option value="">{t('operator.import_location_from_device')}</option>
              {locationSuggestions.map(({ serialNumber }) => (
                <option key={uuid()} value={serialNumber}>
                  {serialNumber}
                </option>
              ))}
            </Select>
          </Flex>
          <Form>
            <SimpleGrid minChildWidth="300px" spacing="20px" mb={8}>
              <SelectField
                name="location.type"
                label={t('common.type')}
                options={[
                  { label: 'SERVICE', value: 'SERVICE' },
                  { label: 'EQUIPMENT', value: 'EQUIPMENT' },
                  { label: 'AUTO', value: 'AUTO' },
                  { label: 'MANUAL', value: 'MANUAL' },
                  { label: 'SPECIAL', value: 'SPECIAL' },
                  { label: 'UNKNOWN', value: 'UNKNOWN' },
                  { label: 'CORPORATE', value: 'CORPORATE' },
                ]}
              />
              <CreatableSelectField name="location.phones" label={t('contacts.phones')} placeholder="+1(202)555-0103" />
              <CreatableSelectField
                name="location.mobiles"
                label={t('contacts.mobiles')}
                placeholder="+1(202)555-0103"
              />
            </SimpleGrid>

            <AddressSearchField
              placeholder={t('common.address_search_autofill')}
              namePrefix="location"
              maxWidth="600px"
              mb={2}
            />
            <SimpleGrid minChildWidth="300px" spacing="20px" mb={8}>
              <StringField name="location.addressLineOne" label={t('locations.address_line_one')} />
              <StringField name="location.addressLineTwo" label={t('locations.address_line_two')} />
              <StringField name="location.city" label={t('locations.city')} />
              <StringField name="location.state" label={t('locations.state')} />
              <StringField name="location.postal" label={t('locations.postal')} />
              <SelectField name="location.country" label={t('locations.country')} options={COUNTRY_LIST} />
              <StringField name="location.buildingName" label={t('locations.building_name')} />
              <StringField name="location.geoCode" label={t('locations.geocode')} />
            </SimpleGrid>
          </Form>
        </>
      )}
    </Formik>
  );
};

export default CreateSubscriberDeviceStep2;
