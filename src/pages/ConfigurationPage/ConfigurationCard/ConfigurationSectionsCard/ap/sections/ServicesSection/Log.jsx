import React from 'react';
import { Heading, SimpleGrid } from '@chakra-ui/react';
import PropTypes from 'prop-types';
import Card from 'components/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import NumberField from 'components/FormFields/NumberField';
import SelectField from 'components/FormFields/SelectField';
import StringField from 'components/FormFields/StringField';

const propTypes = {
  editing: PropTypes.bool.isRequired,
};

const Log = ({ editing }) => (
  <Card variant="widget" mb={4}>
    <CardHeader>
      <Heading size="md" borderBottom="1px solid">
        Log
      </Heading>
    </CardHeader>
    <CardBody>
      <SimpleGrid minChildWidth="300px" spacing="20px" mb={8} mt={2} w="100%">
        <StringField
          name="configuration.log.host"
          label="host"
          definitionKey="service.log.host"
          isDisabled={!editing}
          isRequired
        />
        <NumberField
          name="configuration.log.port"
          label="port"
          definitionKey="service.log.port"
          isDisabled={!editing}
          isRequired
          w={24}
        />
        <SelectField
          name="configuration.log.proto"
          label="proto"
          definitionKey="service.log.proto"
          isDisabled={!editing}
          isRequired
          options={[
            { value: 'udp', label: 'udp' },
            {
              value: 'tcp',
              label: 'tcp',
            },
          ]}
        />
        <NumberField
          name="configuration.log.size"
          label="size"
          definitionKey="service.log.size"
          isDisabled={!editing}
          isRequired
          w={24}
        />
      </SimpleGrid>
    </CardBody>
  </Card>
);

Log.propTypes = propTypes;
export default React.memo(Log);
