import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  FormControl,
  FormErrorMessage,
  Heading,
  Input,
  InputGroup,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Text,
  Textarea,
  useBoolean,
} from '@chakra-ui/react';
import { WarningCircle } from '@phosphor-icons/react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';
import CloseButton from 'components/Buttons/CloseButton';
import SaveButton from 'components/Buttons/SaveButton';
import ModalHeader from 'components/Modals/ModalHeader';
import { uppercaseFirstLetter } from 'utils/stringHelper';

const fileToString = async (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = ({ target: { result = null } }) => resolve(result);
    reader.onerror = () => resolve(null);
  });

const configurationSections = ['globals', 'unit', 'metrics', 'services', 'radios', 'ethernet', 'interfaces', 'third-party'];

const transformComputedConfigToEditable = (config) => {
  const configurations = [];

  try {
    for (const [section, value] of Object.entries(config)) {
      if (configurationSections.includes(section)) {
        const configuration = {
          name: uppercaseFirstLetter(section),
          description: '',
          weight: 1,
          configuration: {},
        };
        configuration.configuration[section] = value;
        configurations.push(configuration);
      }
    }

    return JSON.stringify(configurations, null, 4);
  } catch {
    return '';
  }
};

const propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  setValue: PropTypes.func.isRequired,
};

const ImportConfigurationModal = ({ isOpen, onClose, setValue }) => {
  const { t } = useTranslation();
  const [tempValue, setTempValue] = useState('');
  const [refreshId, setRefreshId] = useState('');
  const [error, { on, off }] = useBoolean();

  const saveValue = () => {
    try {
      const final = JSON.parse(transformComputedConfigToEditable(JSON.parse(tempValue)));
      if (final) {
        const newVal = final.map((conf) => ({
          ...conf,
          configuration: JSON.stringify(conf.configuration),
        }));
        setValue(newVal);
        onClose();
      }
    } catch (e) {
      on();
    }
  };

  const parseFile = async (file) => {
    const fileStr = await fileToString(file);

    if (!fileStr) on();
    else {
      try {
        const res = JSON.parse(fileStr);
        const transformConfig = transformComputedConfigToEditable(res);
        if (transformConfig) {
          setTempValue(JSON.stringify(res, null, 2));
          off();
        } else on();
      } catch {
        on();
      }
    }
  };

  const onChange = (e) => {
    if (e.target.files?.length > 0) parseFile(e.target.files[0]);
  };

  const onTextAreaChange = (e) => {
    setTempValue(e.target.value);
    try {
      const json = JSON.parse(e.target.value);
      const res = transformComputedConfigToEditable(json);
      if (res) off();
      else on();
    } catch {
      on();
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setRefreshId(uuid());
      setTempValue('');
    }
  }, [isOpen]);

  return (
    <Modal onClose={onClose} isOpen={isOpen} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxWidth={{ sm: '600px', md: '700px', lg: '800px', xl: '50%' }}>
        <ModalHeader
          title={t('configurations.import_file')}
          right={
            <>
              <SaveButton onClick={saveValue} isDisabled={tempValue.length === 0 || error} />
              <CloseButton ml={2} onClick={onClose} />
            </>
          }
        />
        <ModalBody>
          <Alert my={2} colorScheme="red">
            <WarningCircle size={20} />
            <Text ml={2}>{t('configurations.import_warning')}</Text>
          </Alert>
          <Heading size="sm">{t('configurations.import_file_explanation')}</Heading>
          <Box mt={2}>
            <FormControl isInvalid={error}>
              <InputGroup>
                <Input
                  borderRadius="15px"
                  pt={1}
                  fontSize="sm"
                  type="file"
                  onChange={onChange}
                  key={refreshId}
                  accept=".json"
                  w={72}
                />
              </InputGroup>
              <FormErrorMessage mt={2}>{t('form.invalid_file_content')}</FormErrorMessage>
            </FormControl>
          </Box>
          <Textarea h="512px" value={tempValue} onChange={onTextAreaChange} mt={2} />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

ImportConfigurationModal.propTypes = propTypes;
export default ImportConfigurationModal;
