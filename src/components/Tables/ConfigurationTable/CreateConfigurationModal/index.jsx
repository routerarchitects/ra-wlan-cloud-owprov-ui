import React, { useCallback, useState } from 'react';
import { useDisclosure, Modal, ModalOverlay, ModalContent, ModalBody } from '@chakra-ui/react';
import { useMutation } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import CreateConfigurationForm from './Form';
import CloseButton from 'components/Buttons/CloseButton';
import CreateButton from 'components/Buttons/CreateButton';
import SaveButton from 'components/Buttons/SaveButton';
import ConfirmCloseAlert from 'components/Modals/Actions/ConfirmCloseAlert';
import ModalHeader from 'components/Modals/ModalHeader';
import useGetDeviceTypes, { useGetDeviceTypeInfo } from 'hooks/Network/DeviceTypes';
import useFormRef from 'hooks/useFormRef';
import { axiosProv } from 'utils/axiosInstances';

const propTypes = {
  refresh: PropTypes.func,
  entityId: PropTypes.string,
};

const defaultProps = {
  refresh: () => {},
  entityId: null,
};

const CreateConfigurationModal = ({ refresh, entityId }) => {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: showConfirm, onOpen: openConfirm, onClose: closeConfirm } = useDisclosure();
  const { form, formRef } = useFormRef();
  const { data: deviceTypes } = useGetDeviceTypes();
  const { data: deviceTypeInfo } = useGetDeviceTypeInfo();
  const deviceClasses = deviceTypeInfo?.deviceClasses ?? [];
  const deviceTypesByClass = deviceTypeInfo?.deviceTypesByClass ?? {};
  const [configuration, setConfiguration] = useState(null);
  const create = useMutation((newObj) =>
    axiosProv.post('configuration/1', {
      ...newObj,
      configuration: configuration?.data.configuration ?? null,
    }),
  );

  const onConfigurationChange = useCallback((conf) => setConfiguration(conf), []);

  const openModal = () => {
    setConfiguration(null);
    onOpen();
  };
  const closeModal = () => (form.dirty || configuration?.__form?.isDirty ? openConfirm() : onClose());
  const closeCancelAndForm = () => {
    closeConfirm();
    onClose();
  };

  return (
    <>
      <CreateButton onClick={openModal} ml={2} />
      <Modal onClose={closeModal} isOpen={isOpen} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent maxWidth={{ sm: '90%', md: '900px', lg: '1000px', xl: '80%' }}>
          <ModalHeader
            title={t('crud.create_object', { obj: t('configurations.one') })}
            right={
              <>
                <SaveButton
                  onClick={form.submitForm}
                  isLoading={form.isSubmitting}
                  isDisabled={!form.isValid || !form.dirty || (configuration !== null && !configuration.__form.isValid)}
                />
                <CloseButton ml={2} onClick={closeModal} />
              </>
            }
          />
          <ModalBody>
            <CreateConfigurationForm
              deviceTypesList={deviceTypes ?? []}
              deviceClasses={deviceClasses}
              deviceTypesByClass={deviceTypesByClass}
              create={create}
              isOpen={isOpen}
              onClose={onClose}
              refresh={refresh}
              formRef={formRef}
              entityId={entityId}
              onConfigurationChange={onConfigurationChange}
            />
          </ModalBody>
        </ModalContent>
        <ConfirmCloseAlert isOpen={showConfirm} confirm={closeCancelAndForm} cancel={closeConfirm} />
      </Modal>
    </>
  );
};

CreateConfigurationModal.propTypes = propTypes;
CreateConfigurationModal.defaultProps = defaultProps;

export default CreateConfigurationModal;
