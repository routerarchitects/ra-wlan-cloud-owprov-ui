import React, { Ref, useEffect, useMemo } from 'react';
import { Modal, ModalOverlay, ModalContent, ModalBody, Spinner, Center, useBoolean } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
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
import { Configuration } from 'models/Configuration';
import { Device } from 'models/Device';
import { axiosProv } from 'utils/axiosInstances';

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
  const subscriberDeviceConfigurationId = (
    subscriberDeviceData as
      | {
          deviceConfiguration?: string;
          extendedInfo?: { deviceConfiguration?: { id?: string } };
        }
      | undefined
  )?.deviceConfiguration
    ?? (subscriberDeviceData as { extendedInfo?: { deviceConfiguration?: { id?: string } } } | undefined)?.extendedInfo
      ?.deviceConfiguration?.id
    ?? '';
  const hasConfigurationId = subscriberDeviceConfigurationId !== '';
  const { data: subscriberDeviceConfiguration, isFetching: isFetchingConfiguration } = useQuery(
    ['get-subscriber-device-configuration', subscriberDeviceConfigurationId],
    () =>
      axiosProv
        .get(`configuration/${subscriberDeviceConfigurationId}?withExtendedInfo=true`)
        .then(({ data: configurationData }) => configurationData),
    {
      enabled: isOpen && hasConfigurationId,
      retry: false,
    },
  );
  const resolvedDefaultConfiguration = useMemo(() => {
    const directConfiguration = (subscriberDeviceData as { configuration?: Configuration[] } | undefined)?.configuration;
    if (Array.isArray(directConfiguration) && directConfiguration.length > 0) return directConfiguration;

    const mappedConfiguration = (subscriberDeviceConfiguration as { configuration?: Configuration[] } | undefined)
      ?.configuration;
    if (Array.isArray(mappedConfiguration)) return mappedConfiguration;

    return undefined;
  }, [subscriberDeviceData, subscriberDeviceConfiguration]);
  const {
    data: { configuration, isDirty: isConfigurationDirty, isValid: isConfigurationValid },
    onChange: onConfigurationChange,
    reset,
    // @ts-ignore
  } = useNestedConfigurationForm({ defaultConfiguration: resolvedDefaultConfiguration });

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
          {isOpen &&
          isLoaded &&
          !isLoading &&
          (!hasConfigurationId || !isFetchingConfiguration) &&
          subscriberDeviceData !== undefined ? (
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
              defaultConfiguration={resolvedDefaultConfiguration}
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
