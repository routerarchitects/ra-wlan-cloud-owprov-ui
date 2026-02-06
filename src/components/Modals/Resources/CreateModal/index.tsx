import React, { useState } from 'react';
import {
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  FormControl,
  FormLabel,
  Select,
  Alert,
  AlertIcon,
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
import CreateButton from 'components/Buttons/CreateButton';
import SaveButton from 'components/Buttons/SaveButton';
import ConfirmCloseAlert from 'components/Modals/Actions/ConfirmCloseAlert';
import ModalHeader from 'components/Modals/ModalHeader';
import { useGetDeviceTypeInfo } from 'hooks/Network/DeviceTypes';
import { useGetRadiusEndpoints } from 'hooks/Network/RadiusEndpoints';
import useFormRef from 'hooks/useFormRef';

interface Props {
  refresh: () => void;
  entityId: string;
  isVenue?: boolean;
}

const CreateResourceModal: React.FC<Props> = ({ refresh, entityId, isVenue = false }) => {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedVariable, setSelectedVariable] = useState('interface.ssid');
  const [selectedGroup, setSelectedGroup] = useState('');
  const { isOpen: showConfirm, onOpen: openConfirm, onClose: closeConfirm } = useDisclosure();
  const { form, formRef } = useFormRef();
  const getRadiusEndpoints = useGetRadiusEndpoints();
  const { data: deviceTypeInfo } = useGetDeviceTypeInfo();
  const deviceClasses = deviceTypeInfo?.deviceClasses ?? [];
  const isGroupSupported = selectedGroup === 'ap';

  const closeModal = () => (form.dirty ? openConfirm() : onClose());

  const closeCancelAndForm = () => {
    closeConfirm();
    onClose();
  };

  const onVariableChange = (e: React.ChangeEvent<HTMLSelectElement>) => setSelectedVariable(e.target.value);
  const onGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => setSelectedGroup(e.target.value);

  React.useEffect(() => {
    if (!selectedGroup) {
      if (deviceClasses.includes('ap')) {
        setSelectedGroup('ap');
      } else if (deviceClasses.length > 0) {
        setSelectedGroup(deviceClasses[0]);
      }
    }
  }, [deviceClasses, selectedGroup]);

  React.useEffect(() => {
    if (selectedGroup && selectedGroup !== 'ap') {
      setSelectedVariable('interface.ssid');
    }
  }, [selectedGroup]);

  return (
    <>
      <CreateButton ml={2} onClick={onOpen} isCompact />
      <Modal onClose={closeModal} isOpen={isOpen} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent maxWidth={{ sm: '600px', md: '700px', lg: '800px', xl: '50%' }}>
          <ModalHeader
            title={t('crud.create_object', { obj: t('resources.configuration_resource') })}
            right={
              <>
                <SaveButton
                  onClick={form.submitForm}
                  isLoading={form.isSubmitting}
                  isDisabled={!form.isValid || !form.dirty}
                />
                <CloseButton ml={2} onClick={closeModal} />
              </>
            }
          />
          <ModalBody>
            <FormControl isRequired mb={4}>
              <FormLabel ms="4px" fontSize="md" fontWeight="normal">
                Device Group
              </FormLabel>
              <Select value={selectedGroup} onChange={onGroupChange} borderRadius="15px" fontSize="sm" w="200px">
                {deviceClasses.map((deviceGroup) => (
                  <option key={deviceGroup} value={deviceGroup}>
                    {deviceGroup}
                  </option>
                ))}
              </Select>
            </FormControl>
            {!isGroupSupported && selectedGroup && (
              <Alert status="warning" mb={4} borderRadius="12px">
                <AlertIcon />
                Configuration resources are not supported for the selected device group.
              </Alert>
            )}
            <FormControl isRequired mb={4}>
              <FormLabel ms="4px" fontSize="md" fontWeight="normal">
                Configuration Section
              </FormLabel>
              <Select
                value={selectedVariable}
                onChange={onVariableChange}
                borderRadius="15px"
                fontSize="sm"
                w="200px"
                isDisabled={!isGroupSupported}
              >
                <option value="interface.ssid">interface.ssid</option>
                <option value="interface.captive">interface.captive</option>
                <option value="interface.ipv4">interface.ipv4</option>
                <option value="radio">radio</option>
                <option
                  value="interface.ssid.openroaming"
                  hidden={!getRadiusEndpoints.data || getRadiusEndpoints.data.length === 0}
                >
                  OpenRoaming SSID
                </option>
                <option value="interface.ssid.radius">interface.ssid.radius</option>
                <option value="interface.tunnel">interface.tunnel</option>
                <option value="interface.vlan">interface.vlan</option>
              </Select>
            </FormControl>
            {isGroupSupported && (
              <>
                {selectedVariable === 'interface.captive' && (
                  <CaptivePortalResource
                    deviceGroup={selectedGroup}
                    isOpen={isOpen}
                    onClose={onClose}
                    refresh={refresh}
                    formRef={formRef}
                    parent={{ entity: isVenue ? undefined : entityId, venue: isVenue ? entityId : undefined }}
                    isDisabled={false}
                  />
                )}
                {selectedVariable === 'interface.ssid.radius' && (
                  <InterfaceSsidRadiusResource
                    deviceGroup={selectedGroup}
                    isOpen={isOpen}
                    onClose={onClose}
                    refresh={refresh}
                    isDisabled={false}
                    formRef={formRef}
                    parent={{ entity: isVenue ? undefined : entityId, venue: isVenue ? entityId : undefined }}
                  />
                )}
                {selectedVariable === 'interface.ssid.openroaming' && getRadiusEndpoints.data && (
                  <OpenRoamingSsidResource
                    deviceGroup={selectedGroup}
                    isOpen={isOpen}
                    onClose={onClose}
                    refresh={refresh}
                    isDisabled={false}
                    formRef={formRef}
                    parent={{ entity: isVenue ? undefined : entityId, venue: isVenue ? entityId : undefined }}
                    radiusEndpoints={getRadiusEndpoints.data}
                  />
                )}
                {selectedVariable === 'interface.tunnel' && (
                  <InterfaceTunnelResource
                    deviceGroup={selectedGroup}
                    isOpen={isOpen}
                    onClose={onClose}
                    refresh={refresh}
                    formRef={formRef}
                    parent={{ entity: isVenue ? undefined : entityId, venue: isVenue ? entityId : undefined }}
                    isDisabled={false}
                  />
                )}
                {selectedVariable === 'interface.vlan' && (
                  <InterfaceVlanResource
                    deviceGroup={selectedGroup}
                    isOpen={isOpen}
                    onClose={onClose}
                    refresh={refresh}
                    isDisabled={false}
                    formRef={formRef}
                    parent={{ entity: isVenue ? undefined : entityId, venue: isVenue ? entityId : undefined }}
                  />
                )}
                {selectedVariable === 'interface.ssid' && (
                  <InterfaceSsidResource
                    deviceGroup={selectedGroup}
                    isOpen={isOpen}
                    onClose={onClose}
                    refresh={refresh}
                    formRef={formRef}
                    parent={{ entity: isVenue ? undefined : entityId, venue: isVenue ? entityId : undefined }}
                    isDisabled={false}
                  />
                )}
                {selectedVariable === 'radio' && (
                  <SingleRadioResource
                    deviceGroup={selectedGroup}
                    isOpen={isOpen}
                    onClose={onClose}
                    refresh={refresh}
                    formRef={formRef}
                    parent={{ entity: isVenue ? undefined : entityId, venue: isVenue ? entityId : undefined }}
                    isDisabled={false}
                  />
                )}
                {selectedVariable === 'interface.ipv4' && (
                  <InterfaceIpv4Resource
                    deviceGroup={selectedGroup}
                    isOpen={isOpen}
                    onClose={onClose}
                    refresh={refresh}
                    formRef={formRef}
                    parent={{ entity: isVenue ? undefined : entityId, venue: isVenue ? entityId : undefined }}
                    isDisabled={false}
                  />
                )}
              </>
            )}
          </ModalBody>
        </ModalContent>
        <ConfirmCloseAlert isOpen={showConfirm} confirm={closeCancelAndForm} cancel={closeConfirm} />
      </Modal>
    </>
  );
};

export default CreateResourceModal;
