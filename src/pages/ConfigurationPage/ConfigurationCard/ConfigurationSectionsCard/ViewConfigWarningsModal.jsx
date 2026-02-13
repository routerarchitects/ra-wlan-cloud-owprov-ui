import React from 'react';
import { IconButton, Tooltip, useDisclosure, Modal, ModalBody, ModalContent, ModalOverlay } from '@chakra-ui/react';
import { CheckCircle, WarningOctagon } from '@phosphor-icons/react';
import PropTypes from 'prop-types';
import isEqual from 'react-fast-compare';
import { useTranslation } from 'react-i18next';
import CloseButton from 'components/Buttons/CloseButton';
import ModalHeader from 'components/Modals/ModalHeader';

const propTypes = {
  warnings: PropTypes.instanceOf(Object).isRequired,
  activeConfigurations: PropTypes.arrayOf(PropTypes.string).isRequired,
  isDisabled: PropTypes.bool,
};

const defaultProps = {
  isDisabled: false,
};

const ViewConfigWarningsModal = ({ warnings, activeConfigurations, isDisabled }) => {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const warningsAmount =
    (warnings.globals ?? []).length +
    (warnings.unit ?? []).length +
    (warnings.metrics ?? []).length +
    (warnings.services ?? []).length +
    (warnings.nat ?? []).length +
    (warnings.radios ?? []).length +
    (warnings.ethernet ?? []).length +
    (warnings.interfaces ?? []).length +
    (warnings['third-party'] ?? []).length;

  return (
    <>
      <Tooltip
        label={`${warningsAmount} ${warningsAmount === 1 ? t('common.warning') : t('common.warnings')}`}
        hasArrow
        shouldWrapChildren
      >
        <IconButton
          colorScheme={warningsAmount === 0 ? 'green' : 'yellow'}
          type="button"
          onClick={onOpen}
          icon={warningsAmount === 0 ? <CheckCircle size={20} /> : <WarningOctagon size={20} />}
          isDisabled={isDisabled || warningsAmount === 0}
        />
      </Tooltip>
      <Modal onClose={onClose} isOpen={isOpen} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent maxWidth={{ sm: '600px', md: '700px', lg: '800px', xl: '50%' }}>
          <ModalHeader
            title={`${warningsAmount} ${warningsAmount === 1 ? t('common.warning') : t('common.warnings')}`}
            right={<CloseButton ml={2} onClick={onClose} />}
          />
          <ModalBody>
            <pre>
              {JSON.stringify(
                {
                  globals: activeConfigurations.includes('globals') ? warnings.globals : undefined,
                  unit: activeConfigurations.includes('unit') ? warnings.unit : undefined,
                  metrics: activeConfigurations.includes('metrics') ? warnings.metrics : undefined,
                  services: activeConfigurations.includes('services') ? warnings.services : undefined,
                  nat: activeConfigurations.includes('nat') ? warnings.nat : undefined,
                  radios: activeConfigurations.includes('radios') ? warnings.radios : undefined,
                  ethernet: activeConfigurations.includes('ethernet') ? warnings.ethernet : undefined,
                  interfaces: activeConfigurations.includes('interfaces') ? warnings.interfaces : undefined,
                  'third-party': activeConfigurations.includes('third-party') ? warnings['third-party'] : undefined,
                },
                null,
                2,
              )}
            </pre>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

ViewConfigWarningsModal.propTypes = propTypes;
ViewConfigWarningsModal.defaultProps = defaultProps;

export default React.memo(ViewConfigWarningsModal, isEqual);
