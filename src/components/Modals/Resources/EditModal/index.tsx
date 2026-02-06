import React, { useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Spinner,
  Center,
  useDisclosure,
  useBoolean,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import {
  CaptivePortalResource,
  InterfaceSsidResource,
  InterfaceSsidRadiusResource,
  InterfaceVlanResource,
  InterfaceIpv4Resource,
  OpenRoamingSsidResource,
  SingleRadioResource,
  InterfaceTunnelResource,
} from '../Sections';
import CloseButton from 'components/Buttons/CloseButton';
import EditButton from 'components/Buttons/EditButton';
import SaveButton from 'components/Buttons/SaveButton';
import ConfirmCloseAlert from 'components/Modals/Actions/ConfirmCloseAlert';
import ModalHeader from 'components/Modals/ModalHeader';
import { useGetRadiusEndpoints } from 'hooks/Network/RadiusEndpoints';
import { useGetResource } from 'hooks/Network/Resources';
import useFormRef from 'hooks/useFormRef';
import { Resource } from 'models/Resource';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  resource?: Resource;
  refresh: () => void;
}

const EditResourceModal: React.FC<Props> = ({ isOpen, onClose, resource, refresh }) => {
  const { t } = useTranslation();
  const [editing, setEditing] = useBoolean();
  const { isOpen: showConfirm, onOpen: openConfirm, onClose: closeConfirm } = useDisclosure();
  const { form, formRef } = useFormRef();
  const {
    data: resourceData,
    isLoading,
    refetch,
  } = useGetResource({
    id: resource?.id ?? '',
    enabled: resource?.id !== '' && isOpen,
  });
  const getRadiusEndpoints = useGetRadiusEndpoints();
  const closeModal = () => (form.dirty ? openConfirm() : onClose());

  const closeCancelAndForm = () => {
    closeConfirm();
    onClose();
  };

  const getType = () => {
    if (resourceData) {
      return resourceData.variables[0]?.prefix ?? null;
    }

    return null;
  };

  const refreshAll = () => {
    refetch();
    refresh();
  };

  const deviceGroup = 'ap';
  const getForm = () => {
    if (isLoading || !resourceData)
      return (
        <Center>
          <Spinner />
        </Center>
      );

    const resourceType = getType();

    if (resourceType === 'interface.captive')
      return (
        <CaptivePortalResource
          deviceGroup={deviceGroup}
          resource={resourceData}
          isOpen={isOpen}
          onClose={onClose}
          refresh={refreshAll}
          formRef={formRef}
          isDisabled={!editing}
        />
      );

    if (resourceType === 'interface.ssid.radius')
      return (
        <InterfaceSsidRadiusResource
          deviceGroup={deviceGroup}
          resource={resourceData}
          isOpen={isOpen}
          onClose={onClose}
          refresh={refreshAll}
          formRef={formRef}
          isDisabled={!editing}
        />
      );
    if (resourceType === 'interface.tunnel')
      return (
        <InterfaceTunnelResource
          deviceGroup={deviceGroup}
          resource={resourceData}
          isOpen={isOpen}
          onClose={onClose}
          refresh={refreshAll}
          formRef={formRef}
          isDisabled={!editing}
        />
      );

    if (resourceType === 'interface.ssid.openroaming')
      return (
        <OpenRoamingSsidResource
          deviceGroup={deviceGroup}
          resource={resourceData}
          isOpen={isOpen}
          onClose={onClose}
          refresh={refreshAll}
          formRef={formRef}
          isDisabled={!editing}
          radiusEndpoints={getRadiusEndpoints.data ?? []}
        />
      );

    if (resourceType === 'interface.vlan')
      return (
        <InterfaceVlanResource
          deviceGroup={deviceGroup}
          resource={resourceData}
          isOpen={isOpen}
          onClose={onClose}
          refresh={refreshAll}
          formRef={formRef}
          isDisabled={!editing}
        />
      );

    if (resourceType === 'interface.ssid')
      return (
        <InterfaceSsidResource
          deviceGroup={deviceGroup}
          resource={resourceData}
          isOpen={isOpen}
          onClose={onClose}
          refresh={refreshAll}
          formRef={formRef}
          isDisabled={!editing}
        />
      );
    if (resourceType === 'interface.ipv4')
      return (
        <InterfaceIpv4Resource
          deviceGroup={deviceGroup}
          resource={resourceData}
          isOpen={isOpen}
          onClose={onClose}
          refresh={refreshAll}
          formRef={formRef}
          isDisabled={!editing}
        />
      );

    if (resourceType === 'radio')
      return (
        <SingleRadioResource
          deviceGroup={deviceGroup}
          resource={resourceData}
          isOpen={isOpen}
          onClose={onClose}
          refresh={refreshAll}
          formRef={formRef}
          isDisabled={!editing}
        />
      );

    return null;
  };

  useEffect(() => {
    if (isOpen) setEditing.off();
  }, [isOpen]);

  return (
    <Modal onClose={closeModal} isOpen={isOpen} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxWidth={{ sm: '600px', md: '700px', lg: '800px', xl: '50%' }}>
        <ModalHeader
          title={t('crud.edit_obj', { obj: t('resources.configuration_resource') })}
          right={
            <>
              <SaveButton
                onClick={form.submitForm}
                isLoading={form.isSubmitting}
                isDisabled={!editing || !form.isValid || !form.dirty}
              />
              <EditButton ml={2} isDisabled={editing} onClick={setEditing.toggle} isCompact />
              <CloseButton ml={2} onClick={closeModal} />
            </>
          }
        />
        <ModalBody>{getForm()}</ModalBody>
      </ModalContent>
      <ConfirmCloseAlert isOpen={showConfirm} confirm={closeCancelAndForm} cancel={closeConfirm} />
    </Modal>
  );
};

export default EditResourceModal;
