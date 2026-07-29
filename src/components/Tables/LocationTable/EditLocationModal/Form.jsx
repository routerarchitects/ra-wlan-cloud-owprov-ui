import React, { useEffect, useState } from 'react';
import { useToast, Tabs, TabList, TabPanels, TabPanel, Tab, SimpleGrid } from '@chakra-ui/react';
import { Formik, Field, Form } from 'formik';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';
import AddressSearchField from 'components/CustomFields/AddressSearchField';
import NotesTable from 'components/CustomFields/NotesTable';
import CreatableSelectField from 'components/FormFields/CreatableSelectField';
import SelectField from 'components/FormFields/SelectField';
import SelectWithSearchField from 'components/FormFields/SelectWithSearchField';
import StringField from 'components/FormFields/StringField';
import COUNTRY_LIST from 'constants/countryList';
import { CreateLocationSchema } from 'constants/formSchemas';
import TIMEZONE_LIST, { getTimezoneOptions } from 'constants/timezoneList';
import { LocationShape } from 'constants/propShapes';
import { useGetEntities } from 'hooks/Network/Entity';
import { useUpdateLocation } from 'hooks/Network/Locations';

const propTypes = {
  editing: PropTypes.bool.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  refresh: PropTypes.func.isRequired,
  location: PropTypes.shape(LocationShape).isRequired,
  formRef: PropTypes.instanceOf(Object).isRequired,
};

const EditLocationForm = ({ editing, isOpen, onClose, refresh, location, formRef }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [formKey, setFormKey] = useState(uuid());
  const { data: entities } = useGetEntities({ t, toast });
  const updateLocation = useUpdateLocation({ id: location.id });

  useEffect(() => {
    setFormKey(uuid());
  }, [isOpen]);

  return (
    <Formik
      innerRef={formRef}
      enableReinitialize
      key={formKey}
      initialValues={{
        ...location,
        timezone: location.timezone ?? '',
        addressLineOne: location.addressLines[0],
        addressLineTwo: location.addressLines.length >= 2 ? location.addressLines[1] : '',
      }}
      validationSchema={CreateLocationSchema(t)}
      onSubmit={(
        {
          name,
          description,
          type,
          timezone,
          addressLineOne,
          addressLineTwo,
          city,
          state,
          postal,
          country,
          buildingName,
          mobiles,
          phones,
          geoCode,
          entity,
          notes,
        },
        { setSubmitting, resetForm },
      ) => {
        const cleanAddressLines = [addressLineOne, addressLineTwo].filter(
          (line) => line && line.trim() !== '',
        );
        return updateLocation.mutateAsync(
          {
            name,
            description,
            type,
            timezone,
            addressLines: cleanAddressLines,
            city,
            state,
            postal,
            country,
            buildingName,
            mobiles,
            phones,
            geoCode,
            entity,
            notes: notes.filter((note) => note.isNew),
          },
          {
            onSuccess: () => {
              toast({
                id: 'location-update-success',
                title: t('common.success'),
                description: t('crud.success_update_obj', {
                  obj: t('locations.one'),
                }),
                status: 'success',
                duration: 5000,
                isClosable: true,
                position: 'top-right',
              });

              setSubmitting(false);
              resetForm();
              refresh();
              onClose();
            },
            onError: (e) => {
              toast({
                id: uuid(),
                title: t('common.error'),
                description: t('crud.error_update_obj', {
                  obj: t('locations.one'),
                  e: e?.response?.data?.ErrorDescription,
                }),
                status: 'error',
                duration: 5000,
                isClosable: true,
                position: 'top-right',
              });
              setSubmitting(false);
            },
          },
        );
      }}
    >
      {({ setFieldValue }) => (
        <Tabs variant="enclosed">
          <TabList>
            <Tab>{t('common.main')}</Tab>
            <Tab>{t('common.notes')}</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <Form>
                <SimpleGrid minChildWidth="300px" spacing="20px" mb={8}>
                  <StringField name="name" label={t('common.name')} isRequired isDisabled={!editing} />
                  <StringField name="description" label={t('common.description')} isDisabled={!editing} />
                  <SelectWithSearchField
                    name="entity"
                    label={t('inventory.parent')}
                    options={
                      entities?.map((ent) => ({
                        value: ent.id,
                        label: `${ent.name}${ent.description ? `: ${ent.description}` : ''}`,
                      })) ?? []
                    }
                    isRequired
                    isDisabled={!editing}
                  />
                  <SelectField
                    name="type"
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
                    isDisabled={!editing}
                  />
                  <CreatableSelectField
                    name="phones"
                    label={t('contacts.phones')}
                    placeholder="+1(202)555-0103"
                    isDisabled={!editing}
                  />
                  <CreatableSelectField
                    name="mobiles"
                    label={t('contacts.mobiles')}
                    placeholder="+1(202)555-0103"
                    isDisabled={!editing}
                  />
                </SimpleGrid>

                <AddressSearchField
                  placeholder={t('common.address_search_autofill')}
                  maxWidth="600px"
                  mb={2}
                  isDisabled={!editing}
                />
                <SimpleGrid minChildWidth="300px" spacing="20px" mb={8}>
                  <SelectField
                    name="timezone"
                    label={t('locations.timezone')}
                    options={[{ label: t('common.none'), value: '' }, ...getTimezoneOptions(location?.timezone)]}
                    isRequired
                    isDisabled={!editing}
                  />
                  <StringField
                    name="addressLineOne"
                    label={t('locations.address_line_one')}
                    isDisabled={!editing}
                  />
                  <StringField name="addressLineTwo" label={t('locations.address_line_two')} isDisabled={!editing} />
                  <StringField name="city" label={t('locations.city')} isDisabled={!editing} />
                  <StringField name="state" label={t('locations.state')} isDisabled={!editing} />
                  <StringField name="postal" label={t('locations.postal')} isDisabled={!editing} />
                  <SelectField
                    name="country"
                    label={t('locations.country')}
                    options={[{ label: t('common.none'), value: '' }, ...COUNTRY_LIST]}
                    isDisabled={!editing}
                  />
                  <StringField name="buildingName" label={t('locations.building_name')} isDisabled={!editing} />
                  <StringField name="geoCode" label={t('locations.geocode')} isDisabled={!editing} />
                </SimpleGrid>
              </Form>
            </TabPanel>
            <TabPanel>
              <Field name="notes">
                {({ field }) => <NotesTable notes={field.value} setNotes={setFieldValue} isDisabled={!editing} />}
              </Field>
            </TabPanel>
          </TabPanels>
        </Tabs>
      )}
    </Formik>
  );
};

EditLocationForm.propTypes = propTypes;

export default EditLocationForm;
