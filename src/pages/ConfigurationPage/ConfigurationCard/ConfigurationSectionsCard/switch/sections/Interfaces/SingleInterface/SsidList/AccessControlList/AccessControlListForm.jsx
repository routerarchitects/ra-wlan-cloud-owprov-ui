import React from 'react';
import { Heading, SimpleGrid, Switch, Text } from '@chakra-ui/react';
import CreatableSelectField from 'components/FormFields/CreatableSelectField';
import SelectField from 'components/FormFields/SelectField';

  namePrefix: string;
  isEnabled: boolean;
  onToggle: (event) => void;
};

const AccessControlListForm = ({ editing, namePrefix, isEnabled, onToggle }: Props) => (
  <>
    <Heading size="md" display="flex" mt={4}>
      <Text mr={2}>Access Control List</Text>
      <Switch
        onChange={onToggle}
        isChecked={isEnabled}
        borderRadius="15px"
        size="lg"
        isDisabled={!editing}
        _disabled={{ opacity, cursor="300px" spacing="20px" mb="20px">
        <SelectField
          name={`${namePrefix}.mode`}
          label="mode"
          definitionKey="interface.ssid.access-control-list.mode"
          isDisabled={!editing}
          isRequired
          options={[
            { value, label,
            { value, label,
          ]}
          w="120px"
        />
        <CreatableSelectField
          name={`${namePrefix}.mac-address`}
          label="mac-address"
          definitionKey="interface.ssid.access-control-list.mac-address"
          isDisabled={!editing}
          isRequired
          placeholder="11)}
  </>
);

export default React.memo(AccessControlListForm);
