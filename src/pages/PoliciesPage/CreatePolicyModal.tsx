import React, { useState } from 'react';
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useDisclosure,
  useToast,
  Grid,
  GridItem,
  Heading,
  Text,
  Divider,
  Box,
  useColorModeValue,
  Tag,
  TagLabel,
  TagCloseButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Flex,
  HStack,
} from '@chakra-ui/react';
import { Plus, CaretDown } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';
import {
  useCreateManagementPolicy,
  ManagementPolicy,
} from 'hooks/Network/ManagementRoles';
import { getApiErrorMessage } from 'utils/apiErrorMessage';

import {
  RESOURCES,
  ACTIONS,
  DEVICE_COMMAND_ACTIONS,
  RESOURCE_ACTIONS,
  getValidActionsForResource,
  filterValidActionsForResource,
} from 'constants/managementPolicyPermissions';

export {
  RESOURCES,
  ACTIONS,
  DEVICE_COMMAND_ACTIONS,
  RESOURCE_ACTIONS,
  getValidActionsForResource,
  filterValidActionsForResource,
};

type ResourcePermissionInputProps = {
  resource: string;
  selectedActions: string[];
  onToggle: (resource: string, action: string) => void;
};

const ResourcePermissionInput = ({
  resource,
  selectedActions,
  onToggle,
}: ResourcePermissionInputProps) => {
  const panelBg = useColorModeValue('white', 'gray.700');
  const panelBorder = useColorModeValue('gray.300', 'gray.600');
  const availableActions = getValidActionsForResource(resource);

  const removeAction = (action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(resource, action);
  };

  return (
    <Menu closeOnSelect={false}>
      <MenuButton
        as={Box}
        w="100%"
        minH="38px"
        p={1.5}
        bg={panelBg}
        border="1px"
        borderColor={panelBorder}
        borderRadius="md"
        cursor="pointer"
        _hover={{ borderColor: 'blue.400' }}
      >
        <Flex align="center" justify="space-between" w="100%">
          <Flex wrap="wrap" gap={1.5} align="center" flex="1">
            {selectedActions.length === 0 ? (
              <Text fontSize="xs" color="gray.400" italic px={1}>
                No permissions selected (NOACCESS)
              </Text>
            ) : (
              selectedActions.map((action) => (
                <Tag
                  key={action}
                  size="sm"
                  variant="subtle"
                  colorScheme={action === 'FULL' ? 'purple' : action === 'DELETE' ? 'red' : 'blue'}
                  borderRadius="full"
                >
                  <TagLabel fontSize="xs" fontWeight="semibold">
                    {action}
                  </TagLabel>
                  <TagCloseButton onClick={(e) => removeAction(action, e)} />
                </Tag>
              ))
            )}
          </Flex>
          <CaretDown size={14} color="gray" />
        </Flex>
      </MenuButton>
      <MenuList minW="180px" zIndex={1400} p={1}>
        {availableActions.map((action) => {
          const isSelected = selectedActions.includes(action);
          return (
            <MenuItem
              key={action}
              fontSize="xs"
              onClick={() => onToggle(resource, action)}
              borderRadius="sm"
              py={1.5}
            >
              <HStack w="100%" justify="space-between">
                <Text fontWeight={action === 'FULL' ? 'bold' : 'normal'}>{action}</Text>
                {isSelected && <Text color="blue.400" fontWeight="bold">✓</Text>}
              </HStack>
            </MenuItem>
          );
        })}
      </MenuList>
    </Menu>
  );
};

const CreatePolicyModal = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const createPolicyMutation = useCreateManagementPolicy();
  const panelBg = useColorModeValue('white', 'gray.700');
  const panelBorder = useColorModeValue('gray.200', 'whiteAlpha.200');
  const subtleBg = useColorModeValue('gray.50', 'gray.800');
  const mutedText = useColorModeValue('gray.600', 'gray.300');

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Custom resource states: maps resource to array of selected actions
  const [customAccess, setCustomAccess] = useState<Record<string, string[]>>(() =>
    RESOURCES.reduce((acc, r) => ({ ...acc, [r]: [] }), {} as Record<string, string[]>),
  );

  const toggleAction = (resource: string, action: string) => {
    setCustomAccess((prev) => {
      const current = prev[resource] || [];
      if (action === 'FULL') {
        const isFullSelected = current.includes('FULL');
        return {
          ...prev,
          [resource]: isFullSelected ? [] : ['FULL'],
        };
      }

      let updated: string[];
      const subActions = getValidActionsForResource(resource).filter((a) => a !== 'FULL');

      if (current.includes('FULL')) {
        updated = subActions.filter((a) => a !== action);
      } else if (current.includes(action)) {
        updated = current.filter((a) => a !== action);
      } else {
        updated = [...current, action];
        const allSelected = subActions.every((a) => updated.includes(a));
        if (allSelected) {
          updated = ['FULL'];
        }
      }

      return {
        ...prev,
        [resource]: updated,
      };
    });
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Policy name is required.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Group by access permissions list to make payload compact
    const accessGroups: Record<string, string[]> = {};
    Object.entries(customAccess).forEach(([resource, accessList]) => {
      if (accessList && accessList.length > 0) {
        const finalAccess = filterValidActionsForResource(resource, accessList);
        if (finalAccess.length === 0) return;
        const key = [...finalAccess].sort().join(',');
        if (!accessGroups[key]) {
          accessGroups[key] = [];
        }
        accessGroups[key].push(resource);
      }
    });

    const entries = Object.entries(accessGroups).map(([key, resources]) => ({
      resources,
      access: key.split(','),
    }));

    const payload: ManagementPolicy = {
      id: uuid(),
      name,
      description,
      entity: '',
      venue: '',
      entries,
    };

    createPolicyMutation.mutate(payload, {
      onSuccess: () => {
        toast({
          title: t('common.success'),
          description: t('crud.success_create_obj', { obj: name }),
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        resetForm();
        onClose();
      },
      onError: (e: any) => {
        toast({
          title: t('common.error'),
          description: getApiErrorMessage(e, 'We could not create this policy.'),
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      },
    });
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setCustomAccess(
      RESOURCES.reduce(
        (acc, r) => ({ ...acc, [r]: [] }),
        {} as Record<string, string[]>,
      ),
    );
  };

  return (
    <>
      <Button colorScheme="blue" leftIcon={<Plus size={18} />} onClick={onOpen}>
        {t('crud.create')}
      </Button>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent bg={panelBg}>
          <ModalHeader>{t('crud.create_object', { obj: t('policies.one') })}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
              <GridItem colSpan={2}>
                <FormControl isRequired>
                  <FormLabel fontSize="sm">{t('common.name')}</FormLabel>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CSR Policy" />
                </FormControl>
              </GridItem>

              <GridItem colSpan={2}>
                <FormControl>
                  <FormLabel fontSize="sm">{t('common.description')}</FormLabel>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Write policy description..."
                    rows={2}
                  />
                </FormControl>
              </GridItem>
            </Grid>

            <Divider my={4} />

            <Flex justify="space-between" align="center" mb={3}>
              <Heading size="xs">
                Permissions Configuration
              </Heading>
              <HStack spacing={2}>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() =>
                    setCustomAccess(
                      RESOURCES.reduce(
                        (acc, r) => ({ ...acc, [r]: ['FULL'] }),
                        {} as Record<string, string[]>,
                      ),
                    )
                  }
                >
                  Full Access
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() =>
                    setCustomAccess(
                      RESOURCES.reduce(
                        (acc, r) => ({ ...acc, [r]: r === 'deviceCommand' ? [] : ['READ'] }),
                        {} as Record<string, string[]>,
                      ),
                    )
                  }
                >
                  Read Only
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() =>
                    setCustomAccess(
                      RESOURCES.reduce(
                        (acc, r) => ({ ...acc, [r]: [] }),
                        {} as Record<string, string[]>,
                      ),
                    )
                  }
                >
                  Clear All
                </Button>
              </HStack>
            </Flex>

            <Box border="1px" borderColor={panelBorder} borderRadius="md" p={3} bg={subtleBg}>
              <Grid templateColumns="160px 1fr" gap={3} alignItems="center">
                <GridItem fontWeight="bold" fontSize="xs" color={mutedText}>
                  Resource Name
                </GridItem>
                <GridItem fontWeight="bold" fontSize="xs" color={mutedText}>
                  Access Level Permissions
                </GridItem>
                {RESOURCES.map((resource) => (
                  <React.Fragment key={resource}>
                    <GridItem>
                      <Text fontSize="sm" textTransform="capitalize" fontWeight="medium">
                        {resource === 'managementRole'
                          ? 'Management Role'
                          : resource === 'deviceCommand'
                          ? 'Device Commands'
                          : resource}
                      </Text>
                    </GridItem>
                    <GridItem>
                      <ResourcePermissionInput
                        resource={resource}
                        selectedActions={customAccess[resource] || []}
                        onToggle={toggleAction}
                      />
                    </GridItem>
                  </React.Fragment>
                ))}
              </Grid>
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="gray" mr={3} onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button colorScheme="blue" onClick={handleSave} isLoading={createPolicyMutation.isLoading}>
              {t('common.save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default CreatePolicyModal;
