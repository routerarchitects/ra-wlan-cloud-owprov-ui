import React from 'react';
import { Heading, SimpleGrid } from '@chakra-ui/react';
import { EVENT_TYPES_OPTIONS } from './metricsConstants';
import Card from 'components/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import MultiSelectField from 'components/FormFields/MultiSelectField';

type Props = {
  editing: boolean;
};

const Realtime = ({ editing }: Props) => (
  <Card variant="widget" mb={4}>
    <CardHeader>
      <Heading size="md" borderBottom="1px solid">
        Realtime
      </Heading>
    </CardHeader>
    <CardBody>
      <SimpleGrid minChildWidth="300px" spacing="20px" mb={8} mt={2} w="100%">
        <MultiSelectField
          name="configuration.realtime.types"
          label="types"
          definitionKey="metrics.realtime.types"
          options={EVENT_TYPES_OPTIONS}
          isDisabled={!editing}
        />
      </SimpleGrid>
    </CardBody>
  </Card>
);

export default React.memo(Realtime);
