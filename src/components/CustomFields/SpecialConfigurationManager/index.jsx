import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription, AlertIcon, AlertTitle, Box, Button, Center, Heading, Spacer } from '@chakra-ui/react';
import PropTypes from 'prop-types';
import isEqual from 'react-fast-compare';
import { useTranslation } from 'react-i18next';
import { isSupportedDeviceGroup } from 'utils/deviceGroup';
import SpecialConfigurationForm from './SpecialConfigurationForm';
import DeleteButton from 'components/Buttons/DeleteButton';
import { BASE_SECTIONS } from 'constants/configuration';
import { useGetConfiguration } from 'hooks/Network/Configurations';
import ConfigurationSectionsCard from 'pages/ConfigurationPage/ConfigurationCard/ConfigurationSectionsCard';

const convertConfigManagerData = (form, sections) => {
  if (form === null || sections === null) return null;
  if (!form?.values) return null;

  const newObj = {
    __form: {
      isDirty: form.dirty || sections.isDirty,
      isValid: sections.invalidValues.length === 0,
    },
    data: {
      ...form.values,
      configuration: sections.activeConfigurations.map((conf) => {
        const deviceConfig = sections.data[conf].data.configuration;
        const config = { ...sections.data[conf].data, configuration: {} };
        if (conf === 'interfaces') config.configuration = { interfaces: deviceConfig };
        else config.configuration[conf] = deviceConfig;
        return config;
      }),
    },
  };
  return newObj;
};

const propTypes = {
  editing: PropTypes.bool.isRequired,
  configId: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onDelete: PropTypes.func,
  isEnabledByDefault: PropTypes.bool,
  isOnlySections: PropTypes.bool,
  isDeletePossible: PropTypes.bool,
  deviceGroup: PropTypes.string,
};

const defaultProps = {
  configId: null,
  isEnabledByDefault: false,
  isOnlySections: false,
  isDeletePossible: false,
  onDelete: null,
  deviceGroup: null,
};

const SpecialConfigurationManager = ({
  editing,
  configId,
  onChange,
  onDelete,
  isEnabledByDefault,
  isOnlySections,
  isDeletePossible,
  deviceGroup,
}) => {
  const { t } = useTranslation();
  const isGroupSupported = !deviceGroup || isSupportedDeviceGroup(deviceGroup);
  const [sections, setSections] = useState(isEnabledByDefault ? BASE_SECTIONS : null);
  const [form, setForm] = useState(isEnabledByDefault ? {} : null);
  const hasUserEnabledRef = useRef(isEnabledByDefault);
  const formRef = useCallback(
    (node) => {
      if (
        node !== null &&
        (form.submitForm !== node.submitForm ||
          form.isSubmitting !== node.isSubmitting ||
          form.isValid !== node.isValid ||
          form.dirty !== node.dirty ||
          !isEqual(form.values, node.values))
      ) {
        setForm(node);
      }
    },
    [form],
  );
  const { data: configuration } = useGetConfiguration({ id: configId });

  const handleCreateClick = useCallback(() => {
    hasUserEnabledRef.current = true;
    setSections(BASE_SECTIONS);
    setForm({});
  }, []);
  const handleDeleteClick = useCallback(() => {
    if (onDelete) onDelete();
    hasUserEnabledRef.current = false;
    setSections(null);
    setForm(null);
  }, []);

  useEffect(
    () => {
      const newConfig = convertConfigManagerData(form, sections);
      onChange(newConfig);
    },
    [form, sections],
    isEqual,
  );

  useEffect(() => {
    if (configuration) {
      setSections(BASE_SECTIONS);
      setForm({});
    } else if (!isEnabledByDefault && !hasUserEnabledRef.current) {
      setSections(null);
      setForm(null);
    }
  }, [configuration]);

  if (!isGroupSupported) {
    return (
      <Alert status="warning" variant="left-accent" my={4}>
        <AlertIcon />
        <Box>
          <AlertTitle>Unsupported device group</AlertTitle>
          <AlertDescription>
            Device group "{deviceGroup}" is not supported for configuration yet. Please select a supported group.
          </AlertDescription>
        </Box>
      </Alert>
    );
  }

  if (sections === null || form === null) {
    return (
      <Center>
        <Button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleCreateClick();
          }}
          colorScheme="blue"
          isDisabled={!editing}
          my={4}
        >
          {t('configurations.start_special_creation')}
        </Button>
      </Center>
    );
  }

  return (
    <>
      {!isOnlySections && (
        <>
          <Heading display="flex" size="md" mb={2}>
            {t('common.base_information')}
            <Spacer />
            <DeleteButton onClick={handleDeleteClick} isDisabled={!editing} />
          </Heading>
          <SpecialConfigurationForm editing={editing} formRef={formRef} configuration={configuration} />
        </>
      )}
      <ConfigurationSectionsCard
        label={t('configurations.configuration_sections')}
        editing={editing}
        configId={configId}
        setSections={setSections}
        onDelete={isDeletePossible ? handleDeleteClick : null}
        deviceGroup={deviceGroup}
      />
    </>
  );
};

SpecialConfigurationManager.propTypes = propTypes;
SpecialConfigurationManager.defaultProps = defaultProps;
export default React.memo(SpecialConfigurationManager);
