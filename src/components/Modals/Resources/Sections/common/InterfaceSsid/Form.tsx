import React, { useMemo } from 'react';
import { Box, Heading, SimpleGrid } from '@chakra-ui/react';
import { getIn, useFormikContext } from 'formik';
import MultiSelectField from 'components/FormFields/MultiSelectField';
import SelectField from 'components/FormFields/SelectField';
import StringField from 'components/FormFields/StringField';
// eslint-disable-next-line max-len
import AdvancedSettings from 'pages/ConfigurationPage/ConfigurationCard/ConfigurationSectionsCard/ap/sections/InterfaceSection/SingleInterface/SsidList/AdvancedSettings';
import Encryption from 'pages/ConfigurationPage/ConfigurationCard/ConfigurationSectionsCard/ap/sections/InterfaceSection/SingleInterface/SsidList/Encryption';
import PassPoint from 'pages/ConfigurationPage/ConfigurationCard/ConfigurationSectionsCard/ap/sections/InterfaceSection/SingleInterface/SsidList/PassPoint';

const namePrefix = 'editing';

const InterfaceSsidResourceForm = ({ isDisabled }: { isDisabled: boolean }) => {
  const { values } = useFormikContext();

  const isPasspoint = useMemo(
    // @ts-ignore
    () => values !== undefined && values['pass-point'] !== undefined && values['pass-point'] !== null,
    [getIn(values, `${namePrefix}`)],
  );

  return (
    <>
      <Heading size="md" mt={6} mb={2} textDecoration="underline">
        interface.ssid
      </Heading>
      <SimpleGrid minChildWidth="300px" spacing="20px" mt={2}>
        <StringField
          name={`${namePrefix}.name`}
          label="name"
          definitionKey="interface.ssid.name"
          isDisabled={isDisabled}
          isRequired
        />
        <SelectField
          name={`${namePrefix}.bss-mode`}
          label="bss-mode"
          definitionKey="interface.ssid.bss-mode"
          isDisabled={isDisabled}
          options={[
            { value: 'ap', label: 'ap' },
            { value: 'sta', label: 'sta' },
            { value: 'mesh', label: 'mesh' },
            { value: 'wds-ap', label: 'wds-ap' },
            { value: 'wds-sta', label: 'wds-sta' },
          ]}
          isRequired
        />
        <MultiSelectField
          name={`${namePrefix}.wifi-bands`}
          label="wifi-bands"
          definitionKey="interface.ssid.wifi-bands"
          isDisabled={isDisabled}
          options={[
            { value: '2G', label: '2G' },
            { value: '5G', label: '5G' },
            { value: '6G', label: '6G' },
          ]}
          isRequired
        />
      </SimpleGrid>
      <Encryption
        editing={!isDisabled}
        ssidName={namePrefix}
        namePrefix={`${namePrefix}.encryption`}
        radiusPrefix={`${namePrefix}.radius`}
        isPasspoint={isPasspoint}
      />
      <Box my={2}>
        <PassPoint
          isDisabled={isDisabled}
          namePrefix={`${namePrefix}.pass-point`}
          radiusPrefix={`${namePrefix}.radius`}
        />
      </Box>
      <AdvancedSettings editing={!isDisabled} namePrefix={namePrefix} />
    </>
  );
};

export default React.memo(InterfaceSsidResourceForm);
