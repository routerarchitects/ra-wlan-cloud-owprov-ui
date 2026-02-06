import React, { useCallback, useState } from 'react';
import { useDisclosure, Modal, ModalOverlay, ModalContent, ModalBody } from '@chakra-ui/react';
import { useMutation } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import CreateTagForm from './Form';
import CloseButton from 'components/Buttons/CloseButton';
import CreateButton from 'components/Buttons/CreateButton';
import SaveButton from 'components/Buttons/SaveButton';
import ConfirmCloseAlert from 'components/Modals/Actions/ConfirmCloseAlert';
import ModalHeader from 'components/Modals/ModalHeader';
import useGetDeviceTypes, { useGetDeviceTypeInfo } from 'hooks/Network/DeviceTypes';
import useFormRef from 'hooks/useFormRef';
import { axiosProv } from 'utils/axiosInstances';

const propTypes = {
  refresh: PropTypes.func.isRequired,
  entityId: PropTypes.string,
  subId: PropTypes.string,
  deviceClass: PropTypes.string,
};

const defaultProps = {
  entityId: '',
  subId: '',
  deviceClass: '',
};

const CreateTagModal = ({ refresh, entityId, subId, deviceClass }) => {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: showConfirm, onOpen: openConfirm, onClose: closeConfirm } = useDisclosure();
  const { form, formRef } = useFormRef();
  const { data: deviceTypes } = useGetDeviceTypes();
  const { data: deviceTypeInfo } = useGetDeviceTypeInfo();
  const deviceClasses = deviceTypeInfo?.deviceClasses ?? [];
  const deviceTypesByClass = deviceTypeInfo?.deviceTypesByClass ?? {};
  const [configuration, setConfiguration] = useState(null);

  const onConfigurationChange = useCallback((conf) => setConfiguration(conf), []);

  const create = useMutation((newObj) =>
    axiosProv.post(
      `inventory/${newObj.serialNumber}${
        newObj.__newConfig
          ? `?createObjects=${JSON.stringify({
              objects: [{ configuration: newObj.__newConfig }],
            })}`
          : ''
      }`,
      newObj,
    ),
  );

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
      <CreateButton onClick={openModal} ml={{base: 0, md: 2}} />
      <Modal onClose={closeModal} isOpen={isOpen} size="xl">
        <ModalOverlay />
        <ModalContent maxWidth={{ sm: '90%', md: '900px', lg: '1000px', xl: '80%' }}>
          <ModalHeader
            title={t('crud.create_object', { obj: t('inventory.tag', { count: 1 }) })}
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
            <CreateTagForm
              deviceTypesList={deviceTypes ?? []}
              deviceClasses={deviceClasses}
              deviceTypesByClass={deviceTypesByClass}
              create={create}
              isOpen={isOpen}
              onClose={onClose}
              refresh={refresh}
              formRef={formRef}
              entityId={entityId}
              subId={subId}
              configuration={configuration}
              onConfigurationChange={onConfigurationChange}
              deviceClass={deviceClass}
            />
          </ModalBody>
        </ModalContent>
        <ConfirmCloseAlert isOpen={showConfirm} confirm={closeCancelAndForm} cancel={closeConfirm} />
      </Modal>
    </>
  );
};

CreateTagModal.propTypes = propTypes;
CreateTagModal.defaultProps = defaultProps;

export default CreateTagModal;
