import * as React from 'react';
import { Heading, SimpleGrid } from '@chakra-ui/react';
import Card from 'components/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import NumberField from 'components/FormFields/NumberField';
import SelectField from 'components/FormFields/SelectField';

type Props = {
  isEditing: boolean;
};

const modeOptions = [
  {
    value: 'always',
    label: 'Always',
  },
  {
    value: 'polled',
    label: 'Polled',
  },
  {
    value: 'final',
    label: 'Final',
  },
  {
    value: 'raw-data',
    label: 'Raw Data',
  },
];

const Fingerprint = ({ isEditing }: Props) => (
  <Card variant="widget" mb={4}>
    <CardHeader>
      <Heading size="md" borderBottom="1px solid">
        Fingerprinting
      </Heading>
    </CardHeader>
    <CardBody>
      <SimpleGrid minChildWidth="200px" spacing="20px" mb={2} mt={2} w="100%">
        <SelectField
          name="configuration.fingerprint.mode"
          label="mode"
          options={modeOptions}
          isRequired
          isDisabled={!isEditing}
        />
        <NumberField
          name="configuration.fingerprint.minimumAge"
          label="minimumAge"
          isRequired
          isDisabled={!isEditing}
        />
        <NumberField
          name="configuration.fingerprint.maximumAge"
          label="maximumAge"
          isRequired
          isDisabled={!isEditing}
        />
        <NumberField
          name="configuration.fingerprint.periodicity"
          label="periodicity"
          isRequired
          isDisabled={!isEditing}
        />
      </SimpleGrid>
    </CardBody>
  </Card>
);

export default Fingerprint;
