import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  useToast,
  Spinner,
  Center,
  useDisclosure,
  useBoolean,
  IconButton,
  Tooltip,
  Popover,
  Box,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverCloseButton,
  PopoverHeader,
  PopoverBody,
  PopoverFooter,
  Button,
} from '@chakra-ui/react';
import { ArrowSquareOut, PaperPlaneTilt, Trash } from '@phosphor-icons/react';
import { useMutation } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import DeviceActionDropdown from './ActionDropdown';
import EditTagForm from './Form';
import CloseButton from 'components/Buttons/CloseButton';
import EditButton from 'components/Buttons/EditButton';
import SaveButton from 'components/Buttons/SaveButton';
import ConfirmCloseAlert from 'components/Modals/Actions/ConfirmCloseAlert';
import ModalHeader from 'components/Modals/ModalHeader';
import { useGetDeviceConfigurationOverrides } from 'hooks/Network/ConfigurationOverride';
import useGetDeviceTypes, { useGetDeviceTypeInfo } from 'hooks/Network/DeviceTypes';
import { useGetGatewayUi } from 'hooks/Network/Endpoints';
import { useDeleteTag, useGetTag } from 'hooks/Network/Inventory';
import { axiosProv } from 'utils/axiosInstances';

const propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  tag: PropTypes.shape({
    serialNumber: PropTypes.string.isRequired,
    name: PropTypes.stirng,
  }),
  refresh: PropTypes.func.isRequired,
  pushConfig: PropTypes.instanceOf(Object).isRequired,
  onOpenScan: PropTypes.func.isRequired,
  onOpenFactoryReset: PropTypes.func.isRequired,
  onOpenUpgradeModal: PropTypes.func.isRequired,
};

const defaultProps = {
  tag: null,
};

const EditTagModal = ({
  isOpen,
  onClose,
  tag,
  refresh,
  pushConfig,
  onOpenScan,
  onOpenFactoryReset,
  onOpenUpgradeModal,
}) => {
  const { t } = useTranslation();
  const [editing, setEditing] = useBoolean();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: showConfirm, onOpen: openConfirm, onClose: closeConfirm } = useDisclosure();
  const toast = useToast();
  const [form, setForm] = useState({});
  const [configuration, setConfiguration] = useState(null);
  const { mutateAsync: deleteTag, isLoading: isDeleting } = useDeleteTag({
    name: tag?.name,
    refreshTable: refresh,
    onClose,
  });

  const handleDeleteClick = () =>
    deleteTag(tag.serialNumber, {
      onSuccess: () => {
        onClose();
      },
    });

  const { data: gwUi } = useGetGatewayUi();
  const formRef = useCallback(
    (node) => {
      if (
        node !== null &&
        (form.submitForm !== node.submitForm ||
          form.isSubmitting !== node.isSubmitting ||
          form.isValid !== node.isValid ||
          form.dirty !== node.dirty)
      ) {
        setForm(node);
      }
    },
    [form],
  );
  const { data: deviceTypesList } = useGetDeviceTypes();
  const { data: deviceTypeInfo } = useGetDeviceTypeInfo();
  const deviceClasses = deviceTypeInfo?.deviceClasses ?? [];
  const deviceTypesByClass = deviceTypeInfo?.deviceTypesByClass ?? {};
  const { data: tagData, isLoading } = useGetTag({
    t,
    toast,
    serialNumber: tag?.serialNumber,
    enabled: tag?.serialNumber !== '' && isOpen,
  });
  const getOverrides = useGetDeviceConfigurationOverrides({ serialNumber: tag?.serialNumber });
  const updateTag = useMutation((tagInfo) =>
    axiosProv.put(
      `inventory/${tag?.serialNumber}${
        tagInfo.__newConfig
          ? `?createObjects=${JSON.stringify({
              objects: [{ configuration: tagInfo.__newConfig }],
            })}`
          : ''
      }`,
      tagInfo,
    ),
  );

  const onConfigurationChange = useCallback((conf) => setConfiguration(conf), []);

  const closeModal = () => (form.dirty || configuration?.__form?.isDirty ? openConfirm() : onClose());
  const closeCancelAndForm = () => {
    closeConfirm();
    onClose();
  };

  const handlePushConfig = () => pushConfig.mutateAsync(tag.serialNumber);
  const handleOpenInGateway = () => window.open(`${gwUi}/#/devices/${tag.serialNumber}`, '_blank');

  useEffect(() => {
    if (isOpen) {
      setConfiguration(null);
      setEditing.off();
    }
  }, [isOpen]);

  return (
    <Modal onClose={closeModal} isOpen={isOpen} size="xl">
      <ModalOverlay />
      <ModalContent maxWidth={{ sm: '90%', md: '900px', lg: '1000px', xl: '80%' }}>
        <ModalHeader
          title={t('crud.edit_obj', { obj: tag?.name ?? tag?.serialNumber })}
          right={
            <>
              <Popover isOpen={isDeleteOpen} onOpen={onDeleteOpen} onClose={onDeleteClose}>
                <Tooltip hasArrow label={t('crud.delete')} placement="top" isDisabled={isDeleteOpen}>
                  <Box>
                    <PopoverTrigger>
                      <IconButton aria-label="Open Device Delete" colorScheme="red" icon={<Trash size={20} />} />
                    </PopoverTrigger>
                  </Box>
                </Tooltip>
                <PopoverContent fontSize="md" fontWeight="normal">
                  <PopoverArrow />
                  <PopoverCloseButton />
                  <PopoverHeader>
                    {t('crud.delete')} {tag?.name}
                  </PopoverHeader>
                  <PopoverBody>{t('crud.delete_confirm', { obj: t('inventory.tag_one') })}</PopoverBody>
                  <PopoverFooter>
                    <Center>
                      <Button colorScheme="gray" mr="1" onClick={onDeleteClose}>
                        {t('common.cancel')}
                      </Button>
                      <Button colorScheme="red" ml="1" onClick={handleDeleteClick} isLoading={isDeleting}>
                        {t('common.yes')}
                      </Button>
                    </Center>
                  </PopoverFooter>
                </PopoverContent>
              </Popover>
              <DeviceActionDropdown
                device={tag}
                isDisabled={editing}
                onOpenScan={onOpenScan}
                onOpenFactoryReset={onOpenFactoryReset}
                onOpenUpgradeModal={onOpenUpgradeModal}
              />
              <Tooltip hasArrow label={t('common.view_in_gateway')} placement="top">
                <IconButton
                  aria-label="Go to device gateway page"
                  ml={2}
                  colorScheme="blue"
                  icon={<ArrowSquareOut size={20} />}
                  onClick={handleOpenInGateway}
                />
              </Tooltip>
              <Tooltip hasArrow label={t('configurations.push_configuration')} placement="top">
                <IconButton
                  ml={2}
                  colorScheme="teal"
                  icon={<PaperPlaneTilt size={20} />}
                  isDisabled={editing}
                  isLoading={pushConfig.isLoading}
                  onClick={handlePushConfig}
                />
              </Tooltip>
              <SaveButton
                onClick={form.submitForm}
                isLoading={form.isSubmitting}
                isDisabled={!editing || !form.isValid || (configuration !== null && !configuration.__form.isValid)}
                hidden={!editing}
                ml={2}
              />
              <EditButton ml={2} label={t('common.edit')} isDisabled={editing} onClick={setEditing.toggle} isCompact />
              <CloseButton ml={2} onClick={closeModal} />
            </>
          }
        />
        <ModalBody>
          {!isLoading && tagData && getOverrides.data ? (
            <EditTagForm
              editing={editing}
              tag={{ ...tagData, overrides: getOverrides.data.overrides }}
              updateTag={updateTag}
              isOpen={isOpen}
              onClose={setEditing.off}
              refresh={refresh}
              formRef={formRef}
              deviceTypesList={deviceTypesList ?? []}
              deviceClasses={deviceClasses}
              deviceTypesByClass={deviceTypesByClass}
              configuration={configuration}
              onConfigurationChange={onConfigurationChange}
            />
          ) : (
            <Center>
              <Spinner />
            </Center>
          )}
        </ModalBody>
      </ModalContent>
      <ConfirmCloseAlert isOpen={showConfirm} confirm={closeCancelAndForm} cancel={closeConfirm} />
    </Modal>
  );
};

EditTagModal.propTypes = propTypes;
EditTagModal.defaultProps = defaultProps;

export default EditTagModal;
