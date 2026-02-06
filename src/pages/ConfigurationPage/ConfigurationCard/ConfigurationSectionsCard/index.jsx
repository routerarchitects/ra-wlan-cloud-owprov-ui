import React from 'react';
import { Alert, AlertDescription, AlertIcon, AlertTitle, Box } from '@chakra-ui/react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Card from 'components/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import ApConfigurationSectionsCard from './ap';

const propTypes = {
  configId: PropTypes.string.isRequired,
  defaultConfig: PropTypes.arrayOf(PropTypes.instanceOf(Object)),
  editing: PropTypes.bool.isRequired,
  setSections: PropTypes.func.isRequired,
  label: PropTypes.string,
  onDelete: PropTypes.func,
  deviceGroup: PropTypes.string,
};

const defaultProps = {
  defaultConfig: null,
  label: null,
  onDelete: null,
  deviceGroup: null,
};

const ConfigurationSectionsCard = (props) => {
  const { t } = useTranslation();
  const { deviceGroup, label } = props;
  const effectiveGroup = deviceGroup || 'ap';

  if (effectiveGroup === 'ap') return <ApConfigurationSectionsCard {...props} />;

  return (
    <Card>
      <CardHeader>
        <Box fontSize="lg" fontWeight="semibold">
          {label ?? t('configurations.configuration_sections')}
        </Box>
      </CardHeader>
      <CardBody>
        <Alert status="warning" variant="left-accent">
          <AlertIcon />
          <Box>
            <AlertTitle>Unsupported device group</AlertTitle>
            <AlertDescription>
              Device group "{effectiveGroup}" is not supported for configuration yet. Please select a supported group.
            </AlertDescription>
          </Box>
        </Alert>
      </CardBody>
    </Card>
  );
};

ConfigurationSectionsCard.propTypes = propTypes;
ConfigurationSectionsCard.defaultProps = defaultProps;
export default React.memo(ConfigurationSectionsCard);
