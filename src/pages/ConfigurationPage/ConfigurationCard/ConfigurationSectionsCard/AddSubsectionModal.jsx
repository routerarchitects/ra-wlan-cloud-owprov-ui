import React from 'react';
import {
  Button,
  Center,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  SimpleGrid,
  useDisclosure,
} from '@chakra-ui/react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import CloseButton from 'components/Buttons/CloseButton';
import CreateButton from 'components/Buttons/CreateButton';
import ModalHeader from 'components/Modals/ModalHeader';

const propTypes = {
  editing: PropTypes.bool.isRequired,
  activeSubs: PropTypes.arrayOf(PropTypes.string).isRequired,
  addSub: PropTypes.func.isRequired,
  subsections: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    }),
  ),
};

const AddSubsectionModal = ({ editing, activeSubs, addSub, subsections }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { t } = useTranslation();

  const addNewSub = (sub) => {
    addSub(sub);
    onClose();
  };

  const defaultSubsections = [
    { key: 'globals', label: t('configurations.globals') },
    { key: 'unit', label: t('configurations.unit') },
    { key: 'metrics', label: t('configurations.metrics') },
    { key: 'services', label: t('configurations.services') },
    { key: 'radios', label: t('configurations.radios') },
    { key: 'interfaces', label: t('configurations.interfaces') },
    { key: 'third-party', label: t('configurations.third_party') },
  ];
  const sections = subsections ?? defaultSubsections;

  return (
    <>
      <CreateButton
        label={t('configurations.add_subsection')}
        onClick={onOpen}
        isDisabled={!editing}
        ml={2}
        isCompact
      />
      <Modal onClose={onClose} isOpen={isOpen} size="sm" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader title={t('configurations.add_subsection')} right={<CloseButton ml={2} onClick={onClose} />} />
          <ModalBody>
            <SimpleGrid minChildWidth="200px" spacing={4}>
              {sections.map((section) => (
                <Center key={section.key}>
                  <Button
                    colorScheme="blue"
                    isDisabled={activeSubs.includes(section.key)}
                    onClick={() => addNewSub(section.key)}
                  >
                    {section.label}
                  </Button>
                </Center>
              ))}
            </SimpleGrid>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

AddSubsectionModal.propTypes = propTypes;
export default React.memo(AddSubsectionModal);
