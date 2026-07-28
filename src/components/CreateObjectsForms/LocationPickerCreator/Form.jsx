import React from 'react';
import { SimpleGrid, Box } from '@chakra-ui/react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import AddressSearchField from 'components/CustomFields/AddressSearchField';
import CreatableSelectField from 'components/FormFields/CreatableSelectField';
import SelectField from 'components/FormFields/SelectField';
import StringField from 'components/FormFields/StringField';
import COUNTRY_LIST from 'constants/countryList';
import TIMEZONE_LIST from 'constants/timezoneList';

const propTypes = {
  name: PropTypes.string.isRequired,
};

const Form = ({ name }) => {
  const { t } = useTranslation();

  return (
    <Box px={6} pt={4}>
      <SimpleGrid minChildWidth="300px" spacing="20px" mb={8}>
        <StringField name={`${name}.name`} label={t('common.name')} isRequired />
        <StringField name={`${name}.description`} label={t('common.description')} />
        <SelectField
          name={`${name}.type`}
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
        <CreatableSelectField name={`${name}.phones`} label={t('contacts.phones')} placeholder="+1(202)555-0103" />
        <CreatableSelectField name={`${name}.mobiles`} label={t('contacts.mobiles')} placeholder="+1(202)555-0103" />
      </SimpleGrid>
      <AddressSearchField placeholder={t('common.address_search_autofill')} namePrefix={name} maxWidth="600px" mb={2} />
      <SimpleGrid minChildWidth="300px" spacing="20px" mb={8}>
        <SelectField
          name={`${name}.timezone`}
          label={t('locations.timezone')}
          options={[{ label: t('common.none'), value: '' }, ...TIMEZONE_LIST]}
          isRequired
        />
        <StringField name={`${name}.addressLineOne`} label={t('locations.address_line_one')} isRequired />
        <StringField name={`${name}.addressLineTwo`} label={t('locations.address_line_two')} />
        <StringField name={`${name}.city`} label={t('locations.city')} isRequired />
        <StringField name={`${name}.state`} label={t('locations.state')} isRequired />
        <StringField name={`${name}.postal`} label={t('locations.postal')} isRequired />
        <SelectField
          name={`${name}.country`}
          label={t('locations.country')}
          options={[{ label: t('common.none'), value: '' }, ...COUNTRY_LIST]}
          isRequired
        />
        <StringField name={`${name}.buildingName`} label={t('locations.building_name')} />
        <StringField name={`${name}.geoCode`} label={t('locations.geocode')} />
      </SimpleGrid>
    </Box>
  );
};

Form.propTypes = propTypes;

export default React.memo(Form);
