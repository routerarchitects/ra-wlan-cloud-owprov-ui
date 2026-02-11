import React, { Ref, useEffect } from 'react';
import { Modal, ModalOverlay, ModalContent, ModalBody, Spinner, Center, useBoolean } from '@chakra-ui/react';
import { FormikProps } from 'formik';
import { useTranslation } from 'react-i18next';
import EditSubscriberDeviceForm from './Form';
import CloseButton from 'components/Buttons/CloseButton';
import EditButton from 'components/Buttons/EditButton';
import SaveButton from 'components/Buttons/SaveButton';
import ConfirmCloseAlert from 'components/Modals/Actions/ConfirmCloseAlert';
import ModalHeader from 'components/Modals/ModalHeader';
import DeviceActionDropdown from 'components/Tables/InventoryTable/EditTagModal/ActionDropdown';
import { useGetSubscriberDevice } from 'hooks/Network/SubscriberDevices';
import useFormModal from 'hooks/useFormModal';
import useFormRef from 'hooks/useFormRef';
import useNestedConfigurationForm from 'hooks/useNestedConfigurationForm';
import useOperatorChildren from 'hooks/useOperatorChildren';
import { Device } from 'models/Device';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  subscriberDevice?: Device;
  refresh: () => void;
  operatorId: string;
  onOpenScan: (serial: string) => void;
  onOpenFactoryReset: (serial: string) => void;
  onOpenUpgradeModal: (serial: string) => void;
}

const EditSubscriberDeviceModal = ({
  isOpen,
  onClose,
  subscriberDevice,
  refresh,
  operatorId,
  onOpenScan,
  onOpenFactoryReset,
  onOpenUpgradeModal,
}: Props) => {
  const { t } = useTranslation();
  const { form, formRef } = useFormRef();
  const [editing, setEditing] = useBoolean();
  const { isConfirmOpen, closeConfirm, closeModal, closeCancelAndForm } = useFormModal({
    isDirty: form?.dirty,
    onModalClose: onClose,
  });
  const { isLoaded, deviceTypes, deviceClasses, deviceTypesByClass, serviceClasses, subscribers } = useOperatorChildren({
    operatorId,
  });
  const {
    data: subscriberDeviceData,
    isLoading,
    refetch,
  } = useGetSubscriberDevice({
    id: subscriberDevice?.id ?? '',
    enabled: subscriberDevice?.id !== '' && isOpen,
  });
  const {
    data: { configuration, isDirty: isConfigurationDirty, isValid: isConfigurationValid },
    onChange: onConfigurationChange,
    reset,
    // @ts-ignore
  } = useNestedConfigurationForm({ defaultConfiguration: subscriberDeviceData?.configuration ?? undefined });

  const refreshAfterUpdate = () => {
    reset();
    refresh();
    refetch();
  };

  useEffect(() => {
    if (isOpen) {
      onConfigurationChange(null);
      setEditing.off();
    }
  }, [isOpen]);

  return (
    <Modal onClose={closeModal} isOpen={isOpen} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxWidth={{ sm: '90%', md: '900px', lg: '1000px', xl: '80%' }}>
        <ModalHeader
          title={t('crud.edit_obj', { obj: t('certificates.device') })}
          right={
            <>
              <SaveButton
                onClick={form.submitForm}
                isLoading={form.isSubmitting}
                isDisabled={
                  !editing || !form.isValid || !isConfigurationValid || (!form.dirty && !isConfigurationDirty)
                }
              />
              {subscriberDevice && (
                <DeviceActionDropdown
                  device={subscriberDevice}
                  isDisabled={editing}
                  refresh={refresh}
                  onOpenScan={onOpenScan}
                  onOpenFactoryReset={onOpenFactoryReset}
                  onOpenUpgradeModal={onOpenUpgradeModal}
                />
              )}
              <EditButton ml={2} isDisabled={editing} onClick={setEditing.toggle} isCompact />
              <CloseButton ml={2} onClick={closeModal} />
            </>
          }
        />
        <ModalBody>
          {isOpen && isLoaded && !isLoading && subscriberDeviceData !== undefined ? (
            <EditSubscriberDeviceForm
              editing={editing}
              subscriberDevice={subscriberDeviceData}
              externalData={{
                deviceTypes,
                deviceClasses,
                deviceTypesByClass,
                serviceClasses,
                subscribers: subscribers ?? [],
              }}
              modalProps={{
                isOpen,
                onOpen: () => {},
                onClose: closeCancelAndForm,
              }}
              refresh={refreshAfterUpdate}
              formRef={formRef as Ref<FormikProps<Device>> | undefined}
              configuration={configuration || undefined}
              // @ts-ignore
              defaultConfiguration={subscriberDeviceData.configuration}
              onConfigurationChange={onConfigurationChange}
            />
          ) : (
            <Center>
              <Spinner />
            </Center>
          )}
        </ModalBody>
      </ModalContent>
      <ConfirmCloseAlert isOpen={isConfirmOpen} confirm={closeCancelAndForm} cancel={closeConfirm} />
    </Modal>
  );
};

export default EditSubscriberDeviceModal;
