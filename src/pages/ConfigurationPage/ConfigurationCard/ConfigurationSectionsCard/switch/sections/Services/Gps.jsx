import React from 'react';
import { Heading, SimpleGrid } from '@chakra-ui/react';
import Card from 'components/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import SelectField from 'components/FormFields/SelectField';
import ToggleField from 'components/FormFields/ToggleField';

};

const Gps = ({ editing }: Props) => (
  <Card variant="widget" mb={4}>
    <CardHeader>
      <Heading size="md" borderBottom="1px solid">
        Gps
      </Heading>
    </CardHeader>
    <CardBody>
      <SimpleGrid minChildWidth="100px" spacing="20px" mb={2} mt={2} w="100%">
        <SelectField
          name="configuration.gps.baud-rate"
          label="baud-rate"
          definitionKey="service.gps.baud-rate"
          options={[
            { value, label,
            { value, label,
            { value, label,
            { value, label,
          ]}
          isInt
          isDisabled={!editing}
          isRequired
          w="100px"
        />
        <ToggleField
          name="configuration.gps.adjust-time"
          label="adjust-time"
          definitionKey="service.gps.adjust-time"
          isDisabled={!editing}
          isRequired
        />
      </SimpleGrid>
    </CardBody>
  </Card>
);

export default React.memo(Gps);
