import React from 'react';
import { Flex, Heading, SimpleGrid } from '@chakra-ui/react';
import StringField from 'components/FormFields/StringField';
import ToggleField from 'components/FormFields/ToggleField';

type Props = {
  editing: boolean;
  namePrefix: string;
  // eslint-disable-next-line react/no-unused-prop-types
  isPasspoint?: boolean;
};
const OpenRoamingRadiusForm = ({ editing, namePrefix }: Props) => (
  <>
    <Flex mt={6}>
      <div>
        <Heading size="md" display="flex" mt={2} mr={2} borderBottom="1px solid">
          Radius
        </Heading>
      </div>
    </Flex>
    <SimpleGrid minChildWidth="300px" spacing="20px">
      <StringField
        name={`${namePrefix}.nas-identifier`}
        label="nas-identifier"
        isDisabled={!editing}
        emptyIsUndefined
      />
      <ToggleField
        name={`${namePrefix}.chargeable-user-id`}
        label="chargeable-user-id"
        isDisabled={!editing}
        falseIsUndefined
      />
    </SimpleGrid>
  </>
);

export default React.memo(OpenRoamingRadiusForm);
