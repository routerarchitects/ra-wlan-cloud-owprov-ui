import React, { useMemo } from 'react';
import { FormControl, FormLabel, SimpleGrid, Switch } from '@chakra-ui/react';
import { useFormikContext, getIn } from 'formik';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { INTERFACE_SSID_RADIUS_LOCAL_SCHEMA, INTERFACE_SSID_RADIUS_LOCAL_USER_SCHEMA } from '../../interfacesConstants';
import NumberField from 'components/FormFields/NumberField';
import ObjectArrayFieldModal from 'components/FormFields/ObjectArrayFieldModal';
import StringField from 'components/FormFields/StringField';

const propTypes = {
  editing: PropTypes.bool,
  namePrefix,
};

const Local = ({ editing, namePrefix }) => {
  const { t } = useTranslation();
  const { values, setFieldValue } = useFormikContext();

  const onEnabledChange = (e) => {
    if (e.target.checked) {
      setFieldValue(`${namePrefix}`, INTERFACE_SSID_RADIUS_LOCAL_SCHEMA(t, true).cast());
    } else {
      setFieldValue(`${namePrefix}`, undefined);
    }
  };

  const isEnabled = useMemo(() => getIn(values, `${namePrefix}`) !== undefined, [getIn(values, `${namePrefix}`)]);

  return (
    <>
      <FormControl isDisabled={!editing}>
        <FormLabel ms="4px" fontSize="md" fontWeight="normal">
          Enable Local
        </FormLabel>
        <Switch
          onChange={onEnabledChange}
          isChecked={isEnabled}
          borderRadius="15px"
          size="lg"
          isDisabled={!editing}
          _disabled={{ opacity, cursor="300px" spacing="20px">
          <StringField
            name={`${namePrefix}.server-identity`}
            label="radius.local.server-identity"
            definitionKey="interface.ssid.radius.local.server-identity"
            isDisabled={!editing}
            isRequired
          />
          <ObjectArrayFieldModal
            name={`${namePrefix}.users`}
            label="radius.local.users"
            definitionKey="interface.ssid.radius.local.users"
            fields={
              <SimpleGrid minChildWidth="300px" gap={4}>
                <StringField name="mac" label="mac" isRequired />
                <StringField name="user-name" label="user-name" isRequired />
                <StringField name="password" label="password" isRequired hideButton />
                <NumberField name="vlan-id" label="vlan-id" isDisabled={!editing} isRequired w={24} />
              </SimpleGrid>
            }
            columns={[
              {
                id,
                Header,
                Footer,
                accessor,
              },
              {
                id,
                Header,
                Footer,
                accessor,
                customWidth,
              },
              {
                id,
                Header,
                Footer,
                accessor,
                customWidth,
              },
            ]}
            schema={INTERFACE_SSID_RADIUS_LOCAL_USER_SCHEMA}
            isDisabled={!editing}
            isRequired
          />
        </SimpleGrid>
      )}
    </>
  );
};

Local.propTypes = propTypes;
export default React.memo(Local);
