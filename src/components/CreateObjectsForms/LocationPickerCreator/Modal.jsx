import React, { useEffect } from 'react';
import { Modal, ModalBody, ModalContent, ModalOverlay, SimpleGrid, useDisclosure } from '@chakra-ui/react';
import { Form, Formik } from 'formik';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import CloseButton from 'components/Buttons/CloseButton';
import SaveButton from 'components/Buttons/SaveButton';
import AddressSearchField from 'components/CustomFields/AddressSearchField';
import CreatableSelectField from 'components/FormFields/CreatableSelectField';
import SelectField from 'components/FormFields/SelectField';
import StringField from 'components/FormFields/StringField';
import ConfirmCloseAlert from 'components/Modals/Actions/ConfirmCloseAlert';
import ModalHeader from 'components/Modals/ModalHeader';
import COUNTRY_LIST from 'constants/countryList';
import { CreateLocationSchema } from 'constants/formSchemas';
import TIMEZONE_LIST from 'constants/timezoneList';
import useFormRef from 'hooks/useFormRef';

const propTypes = {
  reset: PropTypes.func.isRequired,
  setLocation: PropTypes.func.isRequired,
};

const LocationPickerCreatorModal = ({ setLocation, reset }) => {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isAlertOpen, onOpen: onAlertOpen, onClose: onAlertClose } = useDisclosure();
  const { form, formRef } = useFormRef();

  const closeModal = () => {
    if (form?.dirty) onAlertOpen();
    else {
      reset();
      onClose();
    }
  };
  const closeCancelAndForm = () => {
    onClose();
    reset();
  };

  useEffect(() => {
    onOpen();
  }, []);

  return (
    <Modal onClose={closeModal} isOpen={isOpen} size="xl">
      <ModalOverlay />
      <ModalContent maxWidth={{ sm: '600px', md: '700px', lg: '800px', xl: '50%' }}>
        <ModalHeader
          title={t('crud.create_object', { obj: t('locations.one') })}
          right={
            <>
              <SaveButton
                onClick={form.submitForm}
                isLoading={form.isSubmitting}
                isDisabled={!form.isValid || !form.dirty}
              />
              <CloseButton ml={2} onClick={closeModal} />
            </>
          }
        />
        <ModalBody>
          <Formik
            innerRef={formRef}
            initialValues={{
              name: '',
              description: '',
              type: 'SERVICE',
              timezone: '',
              addressLineOne: '',
              addressLineTwo: '',
              city: '',
              state: '',
              postal: '',
              country: '',
              buildingName: '',
              mobiles: [],
              phones: [],
              geoCode: '',
              note: '',
            }}
            validationSchema={CreateLocationSchema(t, false)}
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
                note,
              },
              { resetForm },
            ) => {
              const cleanAddressLines = [addressLineOne, addressLineTwo].filter(
                (line) => line && line.trim() !== '',
              );
              setLocation({
                name,
                description,
                type,
                timezone,
                addressLineOne,
                addressLineTwo,
                addressLines: cleanAddressLines,
                city,
                state,
                postal,
                country,
                buildingName,
                mobiles,
                phones,
                geoCode,
                notes: note.length > 0 ? [{ note }] : undefined,
              });
              resetForm();
              onClose();
            }}
          >
            <Form>
              <SimpleGrid minChildWidth="300px" spacing="20px" mb={8}>
                <StringField name="name" label={t('common.name')} isRequired />
                <StringField name="description" label={t('common.description')} />
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
                />
                <CreatableSelectField name="phones" label={t('contacts.phones')} placeholder="+1(202)555-0103" />
                <CreatableSelectField name="mobiles" label={t('contacts.mobiles')} placeholder="+1(202)555-0103" />
              </SimpleGrid>
              <AddressSearchField placeholder={t('common.address_search_autofill')} maxWidth="600px" mb={2} />
              <SimpleGrid minChildWidth="300px" spacing="20px" mb={8}>
                <SelectField
                  name="timezone"
                  label={t('locations.timezone')}
                  options={[{ label: t('common.none'), value: '' }, ...TIMEZONE_LIST]}
                  isRequired
                />
                <StringField name="addressLineOne" label={t('locations.address_line_one')} isRequired />
                <StringField name="addressLineTwo" label={t('locations.address_line_two')} />
                <StringField name="city" label={t('locations.city')} isRequired />
                <StringField name="state" label={t('locations.state')} isRequired />
                <StringField name="postal" label={t('locations.postal')} isRequired />
                <SelectField
                  name="country"
                  label={t('locations.country')}
                  options={[{ label: t('common.none'), value: '' }, ...COUNTRY_LIST]}
                  isRequired
                />
                <StringField name="buildingName" label={t('locations.building_name')} />
                <StringField name="geoCode" label={t('locations.geocode')} />
                <StringField name="note" label={t('common.note')} />
              </SimpleGrid>
            </Form>
          </Formik>
        </ModalBody>
      </ModalContent>
      <ConfirmCloseAlert isOpen={isAlertOpen} confirm={closeCancelAndForm} cancel={onAlertClose} />
    </Modal>
  );
};

LocationPickerCreatorModal.propTypes = propTypes;
export default LocationPickerCreatorModal;
