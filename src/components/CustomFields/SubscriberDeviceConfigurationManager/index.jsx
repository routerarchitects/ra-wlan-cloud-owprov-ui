import React, { useCallback, useEffect, useState } from 'react';
import { Button, Center } from '@chakra-ui/react';
import PropTypes from 'prop-types';
import isEqual from 'react-fast-compare';
import { useTranslation } from 'react-i18next';
import { BASE_SECTIONS } from 'constants/configuration';
import ConfigurationSectionsCard from 'pages/ConfigurationPage/ConfigurationCard/ConfigurationSectionsCard';

const SECTION_DEFAULTS = {
  globals: 'Globals',
  unit: 'Unit',
  metrics: 'Metrics',
  services: 'Services',
  radios: 'Radios',
  ethernet: 'Ethernet',
  interfaces: 'Interfaces',
  'third-party': 'Third Party',
};

const getSectionPayloadBase = (conf, sectionData) => ({
  name: sectionData?.name || SECTION_DEFAULTS[conf] || conf,
  description: sectionData?.description || '',
  weight: Number.isFinite(sectionData?.weight) ? sectionData.weight : 1,
  configuration: {},
});

const convertConfigManagerData = (sections) => {
  if (sections === null) return null;

  const invalidValues = Array.isArray(sections.invalidValues) ? sections.invalidValues : [];
  const newObj = {
    __form: {
      isDirty: Boolean(sections.isDirty),
      isValid: invalidValues.length === 0,
    },
    data: sections.activeConfigurations
      .map((conf) => {
        const sectionEntry = sections.data?.[conf];
        if (!sectionEntry?.data) return null;
        const deviceConfig = sectionEntry.data.configuration;
        const config = getSectionPayloadBase(conf, sectionEntry.data);
        if (conf === 'interfaces') config.configuration = { interfaces: deviceConfig };
        else config.configuration[conf] = deviceConfig;
        return config;
      })
      .filter(Boolean),
  };
  return newObj;
};

const propTypes = {
  editing: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  isEnabledByDefault: PropTypes.bool,
  isDeletePossible: PropTypes.bool,
  configuration: PropTypes.arrayOf(PropTypes.instanceOf(Object)),
  deviceGroup: PropTypes.string,
};

const defaultProps = {
  isEnabledByDefault: false,
  isDeletePossible: false,
  configuration: null,
  deviceGroup: null,
};

const SubscriberDeviceConfigurationManager = ({
  editing,
  onChange,
  isEnabledByDefault,
  isDeletePossible,
  configuration,
  deviceGroup,
}) => {
  const { t } = useTranslation();
  const [sections, setSections] = useState(isEnabledByDefault ? BASE_SECTIONS : null);

  const handleCreateClick = useCallback(() => {
    setSections(BASE_SECTIONS);
  }, []);
  const handleDeleteClick = useCallback(() => {
    setSections(null);
  }, []);

  useEffect(
    () => {
      const newConfig = convertConfigManagerData(sections);
      onChange(newConfig);
    },
    [sections],
    isEqual,
  );

  useEffect(() => {
    if (configuration) {
      setSections(BASE_SECTIONS);
    }
  }, [configuration]);

  if (sections === null) {
    return (
      <Center>
        <Button onClick={handleCreateClick} colorScheme="blue" isDisabled={!editing} my={4}>
          {t('configurations.start_special_creation')}
        </Button>
      </Center>
    );
  }

  return (
    <ConfigurationSectionsCard
      label={t('configurations.configuration_sections')}
      editing={editing}
      defaultConfig={configuration}
      setSections={setSections}
      onDelete={isDeletePossible ? handleDeleteClick : null}
      deviceGroup={deviceGroup}
    />
  );
};

SubscriberDeviceConfigurationManager.propTypes = propTypes;
SubscriberDeviceConfigurationManager.defaultProps = defaultProps;
export default React.memo(SubscriberDeviceConfigurationManager);
