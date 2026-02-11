import React from 'react';
import { IconButton, Tooltip, useDisclosure, Modal, ModalBody, ModalContent, ModalOverlay } from '@chakra-ui/react';
import { CheckCircle, WarningOctagon } from '@phosphor-icons/react';
import PropTypes from 'prop-types';
import isEqual from 'react-fast-compare';
import { useTranslation } from 'react-i18next';
import CloseButton from 'components/Buttons/CloseButton';
import ModalHeader from 'components/Modals/ModalHeader';

const propTypes = {
  errors: PropTypes.instanceOf(Object).isRequired,
  activeConfigurations: PropTypes.arrayOf(PropTypes.string).isRequired,
  isDisabled: PropTypes.bool,
};

const defaultProps = {
  isDisabled: false,
};

const ViewConfigErrorsModal = ({ errors, activeConfigurations, isDisabled }) => {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const errorAmount =
    (errors.globals ?? []).length +
    (errors.unit ?? []).length +
    (errors.metrics ?? []).length +
    (errors.services ?? []).length +
    (errors.radios ?? []).length +
    (errors.ethernet ?? []).length +
    (errors.interfaces ?? []).length +
    (errors['third-party'] ?? []).length;

  return (
    <>
      <Tooltip
        label={`${errorAmount} ${errorAmount === 1 ? t('common.error') : t('common.errors')}`}
        hasArrow
        shouldWrapChildren
      >
        <IconButton
          colorScheme={errorAmount === 0 ? 'green' : 'red'}
          type="button"
          onClick={onOpen}
          ml={2}
          icon={errorAmount === 0 ? <CheckCircle size={20} /> : <WarningOctagon size={20} />}
          isDisabled={isDisabled || errorAmount === 0}
        />
      </Tooltip>
      <Modal onClose={onClose} isOpen={isOpen} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent maxWidth={{ sm: '600px', md: '700px', lg: '800px', xl: '50%' }}>
          <ModalHeader
            title={`${errorAmount} ${errorAmount === 1 ? t('common.error') : t('common.errors')}`}
            right={<CloseButton ml={2} onClick={onClose} />}
          />
          <ModalBody>
            <pre>
              {JSON.stringify(
                {
                  globals: activeConfigurations.includes('globals') ? errors.globals : undefined,
                  unit: activeConfigurations.includes('unit') ? errors.unit : undefined,
                  metrics: activeConfigurations.includes('metrics') ? errors.metrics : undefined,
                  services: activeConfigurations.includes('services') ? errors.services : undefined,
                  radios: activeConfigurations.includes('radios') ? errors.radios : undefined,
                  ethernet: activeConfigurations.includes('ethernet') ? errors.ethernet : undefined,
                  interfaces: activeConfigurations.includes('interfaces') ? errors.interfaces : undefined,
                  'third-party': activeConfigurations.includes('third-party') ? errors['third-party'] : undefined,
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

ViewConfigErrorsModal.propTypes = propTypes;
ViewConfigErrorsModal.defaultProps = defaultProps;

export default React.memo(ViewConfigErrorsModal, isEqual);
