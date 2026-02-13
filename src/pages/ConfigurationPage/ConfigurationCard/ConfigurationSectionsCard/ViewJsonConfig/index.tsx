import React from 'react';
import { IconButton, Tooltip, useDisclosure, Modal, ModalBody, ModalContent, ModalOverlay } from '@chakra-ui/react';
import { ArrowsOut } from '@phosphor-icons/react';
import isEqual from 'react-fast-compare';
import { useTranslation } from 'react-i18next';
import useInterfacesJsonDisplay from './useInterfacesJsonDisplay';
import CloseButton from 'components/Buttons/CloseButton';
import ModalHeader from 'components/Modals/ModalHeader';
import { InterfaceProps } from 'models/ConfigurationSections/Interfaces';

interface Props {
  configurations: {
    globals?: string;
    unit?: string;
    metrics?: string;
    services?: string;
    nat?: string;
    radios?: string;
    ethernet?: string;
    interfaces?: {
      configuration: InterfaceProps[];
    };
    'third-party'?: string;
  };
  activeConfigurations: string[];
  isDisabled?: boolean;
}

const ViewJsonConfigModal: React.FC<Props> = ({ configurations, activeConfigurations, isDisabled }) => {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const interfaces = useInterfacesJsonDisplay({ interfaces: configurations.interfaces?.configuration, isOpen });

  const configStringToDisplay = () => {
    try {
      const finalConfig = {};
      const configToDisplay = {
        globals: activeConfigurations.includes('globals') ? configurations.globals : undefined,
        unit: activeConfigurations.includes('unit') ? configurations.unit : undefined,
        metrics: activeConfigurations.includes('metrics') ? configurations.metrics : undefined,
        services: activeConfigurations.includes('services') ? configurations.services : undefined,
        nat: activeConfigurations.includes('nat') ? configurations.nat : undefined,
        radios: activeConfigurations.includes('radios') ? configurations.radios : undefined,
        ethernet: activeConfigurations.includes('ethernet') ? configurations.ethernet : undefined,
        'third-party': activeConfigurations.includes('third-party') ? configurations['third-party'] : undefined,
      };

      for (const [key, config] of Object.entries(configToDisplay)) {
        if (config) {
          // @ts-ignore
          finalConfig[key] = config.configuration;
        }
      }

      return JSON.stringify(
        { ...finalConfig, interfaces: activeConfigurations.includes('interfaces') ? interfaces : undefined },
        null,
        2,
      );
    } catch (e) {
      return null;
    }
  };

  return (
    <>
      <Tooltip label={t('common.view_json')}>
        <IconButton
          aria-label="Show JSON Configuration"
          colorScheme="gray"
          type="button"
          onClick={onOpen}
          icon={<ArrowsOut size={20} />}
          isDisabled={isDisabled}
          ml={2}
        />
      </Tooltip>
      <Modal onClose={onClose} isOpen={isOpen} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent maxWidth={{ sm: '600px', md: '700px', lg: '800px', xl: '50%' }}>
          <ModalHeader
            title={t('configurations.configuration_json')}
            right={<CloseButton ml={2} onClick={onClose} />}
          />
          <ModalBody>
            <pre>{configStringToDisplay()}</pre>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default React.memo(ViewJsonConfigModal, isEqual);
