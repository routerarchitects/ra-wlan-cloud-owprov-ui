import React, { useMemo } from 'react';
import { FormControl, FormLabel, Heading, SimpleGrid, Switch } from '@chakra-ui/react';
import { useFormikContext, getIn } from 'formik';
import { useTranslation } from 'react-i18next';
import { INTERFACE_SSID_RADIUS_LOCAL_SCHEMA, INTERFACE_SSID_RADIUS_LOCAL_USER_SCHEMA } from './schemas';
import NumberField from 'components/FormFields/NumberField';
import ObjectArrayFieldModal from 'components/FormFields/ObjectArrayFieldModal';
import StringField from 'components/FormFields/StringField';
import ToggleField from 'components/FormFields/ToggleField';

const InterfaceSsidRadiusResourceForm = ({ isDisabled }: { isDisabled: boolean }) => {
  const { t } = useTranslation();
  const { values, setFieldValue } = useFormikContext();

  const onEnabledAccountingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setFieldValue('accounting', {
        host: '192.168.178.192',
        port: 1813,
        secret: '',
      });
    } else {
      setFieldValue('accounting', undefined);
    }
  };

  const isAccountingEnabled = useMemo(() => getIn(values, 'accounting') !== undefined, [getIn(values, 'accounting')]);

  const onEnableDynamicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setFieldValue('dynamic-authorization', {
        host: '192.168.178.192',
        port: 1814,
        secret: '',
      });
    } else {
      setFieldValue('dynamic-authorization', undefined);
    }
  };

  const isDynamicEnabled = useMemo(
    () => getIn(values, 'dynamic-authorization') !== undefined,
    [getIn(values, 'dynamic-authorization')],
  );

  const onLocalEnabled = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setFieldValue('local', INTERFACE_SSID_RADIUS_LOCAL_SCHEMA(t, true).cast());
    } else {
      setFieldValue('local', undefined);
    }
  };

  const isLocalEnabled = useMemo(() => getIn(values, 'local') !== undefined, [getIn(values, 'local')]);

  return (
    <>
      <Heading size="md" mt={6} mb={2} textDecoration="underline">
        interface.ssid.radius
      </Heading>
      <SimpleGrid minChildWidth="300px" spacing="20px">
        <StringField name="authentication.host" label="authentication.host" isRequired isDisabled={isDisabled} />
        <NumberField
          name="authentication.port"
          label="authentication.port"
          isRequired
          hideArrows
          w={24}
          isDisabled={isDisabled}
        />
        <StringField
          name="authentication.secret"
          label="authentication.secret"
          isRequired
          hideButton
          isDisabled={isDisabled}
        />
        <ToggleField
          name="authentication.mac-filter"
          label="authentication.mac-filter"
          falseIsUndefined
          isDisabled={isDisabled}
        />
      </SimpleGrid>
      <FormControl>
        <FormLabel ms="4px" fontSize="md" fontWeight="normal">
          Enable Accounting
        </FormLabel>
        <Switch
          onChange={onEnabledAccountingChange}
          isChecked={isAccountingEnabled}
          borderRadius="15px"
          size="lg"
          _disabled={{ opacity: 0.8, cursor: 'not-allowed' }}
          isDisabled={isDisabled}
        />
      </FormControl>
      {isAccountingEnabled && (
        <SimpleGrid minChildWidth="300px" spacing="20px">
          <StringField name="accounting.host" label="accounting.host" isRequired isDisabled={isDisabled} />
          <NumberField
            name="accounting.port"
            label="accounting.port"
            isRequired
            hideArrows
            w={24}
            isDisabled={isDisabled}
          />
          <StringField
            name="accounting.secret"
            label="accounting.secret"
            isRequired
            hideButton
            isDisabled={isDisabled}
          />
        </SimpleGrid>
      )}
      <FormControl>
        <FormLabel ms="4px" fontSize="md" fontWeight="normal">
          Enable Dynamic Authorization
        </FormLabel>
        <Switch
          onChange={onEnableDynamicChange}
          isChecked={isDynamicEnabled}
          borderRadius="15px"
          size="lg"
          _disabled={{ opacity: 0.8, cursor: 'not-allowed' }}
          isDisabled={isDisabled}
        />
      </FormControl>
      {isDynamicEnabled && (
        <SimpleGrid minChildWidth="300px" spacing="20px" mb={4}>
          <StringField
            name="dynamic-authorization.host"
            label="dynamic-authorization.host"
            isRequired
            isDisabled={isDisabled}
          />
          <NumberField
            name="dynamic-authorization.port"
            label="dynamic-authorization.port"
            isRequired
            isDisabled={isDisabled}
          />
          <StringField
            name="dynamic-authorization.secret"
            label="dynamic-authorization.secret"
            isRequired
            hideButton
            isDisabled={isDisabled}
          />
        </SimpleGrid>
      )}
      <SimpleGrid minChildWidth="300px" spacing="20px">
        <StringField name="nas-identifier" label="nas-identifier" isDisabled={isDisabled} />
        <ToggleField name="chargeable-user-id" label="chargeable-user-id" isDisabled={isDisabled} />
      </SimpleGrid>
      <FormControl>
        <FormLabel ms="4px" fontSize="md" fontWeight="normal">
          Enable Local
        </FormLabel>
        <Switch
          onChange={onLocalEnabled}
          isChecked={isLocalEnabled}
          borderRadius="15px"
          size="lg"
          _disabled={{ opacity: 0.8, cursor: 'not-allowed' }}
          isDisabled={isDisabled}
        />
      </FormControl>
      {isLocalEnabled && (
        <SimpleGrid minChildWidth="300px" spacing="20px">
          <StringField name="local.server-identity" label="server-identity" isRequired isDisabled={isDisabled} />
          <ObjectArrayFieldModal
            name="local.users"
            label="users"
            isDisabled={isDisabled}
            fields={
              <SimpleGrid minChildWidth="300px" gap={4}>
                <StringField name="mac" label="mac" isRequired />
                <StringField name="user-name" label="user-name" isRequired />
                <StringField name="password" label="password" isRequired hideButton />
                <NumberField name="vlan-id" label="vlan-id" isRequired w={24} />
              </SimpleGrid>
            }
            columns={[
              {
                id: 'user-name',
                Header: 'user-name',
                Footer: '',
                accessor: 'user-name',
              },
              {
                id: 'mac',
                Header: 'mac',
                Footer: '',
                accessor: 'mac',
                customWidth: '150px',
              },
              {
                id: 'vlan-id',
                Header: 'vlan-id',
                Footer: '',
                accessor: 'vlan-id',
                customWidth: '100px',
              },
            ]}
            schema={INTERFACE_SSID_RADIUS_LOCAL_USER_SCHEMA}
            isRequired
          />
        </SimpleGrid>
      )}
    </>
  );
};

export default React.memo(InterfaceSsidRadiusResourceForm);
