import React from 'react';
import { Flex, Heading, SimpleGrid } from '@chakra-ui/react';
import OpenRoamingRadius from './Radius';
import SelectField from 'components/FormFields/SelectField';
import StringField from 'components/FormFields/StringField';
import ToggleField from 'components/FormFields/ToggleField';
import {
  ENCRYPTION_OPTIONS,
  ENCRYPTION_PROTOS_REQUIRE_RADIUS,
} from 'pages/ConfigurationPage/ConfigurationCard/ConfigurationSectionsCard/ap/sections/InterfaceSection/interfacesConstants';

interface Props {
  editing: boolean;
  namePrefix: string;
  radiusPrefix: string;
  onProtoChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  needIeee: boolean;
  isKeyNeeded: boolean;
  isPasspoint?: boolean;
}

const OpenRoamingEncryptionForm = ({
  editing,
  namePrefix,
  radiusPrefix,
  onProtoChange,
  needIeee,
  isKeyNeeded,
  isPasspoint,
}: Props) => (
  <>
    <Flex mt={4}>
      <Heading size="md" borderBottom="1px solid">
        Authentication
      </Heading>
    </Flex>
    <SimpleGrid minChildWidth="300px" spacing="20px">
      <SelectField
        name={`${namePrefix}.proto`}
        label="protocol"
        definitionKey="interface.ssid.encryption.proto"
        options={ENCRYPTION_OPTIONS.filter(({ value }) => ENCRYPTION_PROTOS_REQUIRE_RADIUS.includes(value))}
        isDisabled={!editing}
        isRequired
        onChange={onProtoChange}
        w="300px"
      />
      {isKeyNeeded && (
        <StringField
          name={`${namePrefix}.key`}
          label="key"
          definitionKey="interface.ssid.encryption.key"
          isDisabled={!editing}
          isRequired
          hideButton
        />
      )}
      {needIeee && (
        <SelectField
          name={`${namePrefix}.ieee80211w`}
          label="ieee80211w"
          definitionKey="interface.ssid.encryption.ieee80211w"
          options={[
            { value: 'disabled', label: 'disabled' },
            { value: 'optional', label: 'optional' },
            { value: 'required', label: 'required' },
          ]}
          isDisabled={!editing}
          isRequired
          w="120px"
        />
      )}
      <ToggleField
        name={`${namePrefix}.key-caching`}
        label="key-caching"
        definitionKey="interface.ssid.encryption.key-caching"
        isDisabled={!editing}
        defaultValue
      />
    </SimpleGrid>
    <OpenRoamingRadius editing={editing} namePrefix={radiusPrefix} isPasspoint={isPasspoint} />
  </>
);

export default React.memo(OpenRoamingEncryptionForm);
