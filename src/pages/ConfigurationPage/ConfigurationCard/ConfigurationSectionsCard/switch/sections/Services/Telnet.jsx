import React from 'react';
import { Heading, SimpleGrid } from '@chakra-ui/react';
import PropTypes from 'prop-types';
import Card from 'components/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import ToggleField from 'components/FormFields/ToggleField';

const propTypes = {
  editing: PropTypes.bool,
};

const Telnet = ({ editing }) => (
  <Card variant="widget" mb={4}>
    <CardHeader>
      <Heading size="md" borderBottom="1px solid">
        telnet
      </Heading>
    </CardHeader>
    <CardBody>
      <SimpleGrid minChildWidth="300px" spacing="20px" mb={8} mt={2} w="100%">
        <ToggleField
          name="configuration.telnet.enable"
          label="enable"
          definitionKey="service.telnet.enable"
          isDisabled={!editing}
        />
      </SimpleGrid>
    </CardBody>
  </Card>
);

Telnet.propTypes = propTypes;
export default React.memo(Telnet);
