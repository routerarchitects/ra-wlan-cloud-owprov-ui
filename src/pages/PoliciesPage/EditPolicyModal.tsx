import React, { useEffect, useState } from 'react';
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
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
import { CaretDown } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from 'contexts/AuthProvider';
import {
  useUpdateManagementPolicy,
  ManagementPolicy,
} from 'hooks/Network/ManagementRoles';
import { getApiErrorMessage } from 'utils/apiErrorMessage';

export const RESOURCES = [
  'entity',
  'venue',
  'configuration',
  'inventory',
  'operator',
  'subscriber',
  'contact',
  'location',
  'managementRole',
];

const ACTIONS = ['READ', 'CREATE', 'MODIFY', 'DELETE', 'FULL'];

type ResourcePermissionInputProps = {
  resource: string;
  selectedActions: string[];
  onToggle: (resource: string, action: string) => void;
  isDisabled?: boolean;
};

const ResourcePermissionInput = ({
  resource,
  selectedActions,
  onToggle,
  isDisabled = false,
}: ResourcePermissionInputProps) => {
  const panelBg = useColorModeValue('white', 'gray.700');
  const panelBorder = useColorModeValue('gray.300', 'gray.600');

  const removeAction = (action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDisabled) return;
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
        cursor={isDisabled ? 'not-allowed' : 'pointer'}
        opacity={isDisabled ? 0.7 : 1}
        _hover={{ borderColor: isDisabled ? panelBorder : 'blue.400' }}
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
                  {!isDisabled && (
                    <TagCloseButton onClick={(e) => removeAction(action, e)} />
                  )}
                </Tag>
              ))
            )}
          </Flex>
          <CaretDown size={14} color="gray" />
        </Flex>
      </MenuButton>
      {!isDisabled && (
        <MenuList minW="180px" zIndex={1400} p={1}>
          {ACTIONS.map((action) => {
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
      )}
    </Menu>
  );
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  policy: ManagementPolicy;
};

const EditPolicyModal = ({ isOpen, onClose, policy }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isRoot = user?.userRole === 'root';
  const toast = useToast();
  const updatePolicyMutation = useUpdateManagementPolicy();
  const panelBg = useColorModeValue('white', 'gray.700');
  const panelBorder = useColorModeValue('gray.200', 'whiteAlpha.200');
  const subtleBg = useColorModeValue('gray.50', 'gray.800');
  const mutedText = useColorModeValue('gray.600', 'gray.300');

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [preset, setPreset] = useState('full'); // 'full', 'read', 'custom'

  // Custom resource states: maps resource to array of selected actions
  const [customAccess, setCustomAccess] = useState<Record<string, string[]>>(
    RESOURCES.reduce((acc, r) => ({ ...acc, [r]: ['READ'] }), {}),
  );

  // Sync state with selected policy
  useEffect(() => {
    if (policy) {
      setName(policy.name);
      setDescription(policy.description || '');

      // Detect preset & custom permissions mapping
      const detect = () => {
        const entries = policy.entries || [];
        if (entries.length === 0) {
          return {
            detectedPreset: 'custom',
            mapping: RESOURCES.reduce((acc, r) => ({ ...acc, [r]: [] }), {} as Record<string, string[]>),
          };
        }

        const isFull =
          entries.length === 1 &&
          entries[0].access.includes('FULL') &&
          entries[0].resources.length === RESOURCES.length;
        if (isFull) {
          return {
            detectedPreset: 'full',
            mapping: RESOURCES.reduce((acc, r) => ({ ...acc, [r]: ['READ', 'CREATE', 'MODIFY', 'DELETE', 'FULL'] }), {}),
          };
        }

        const isRead =
          entries.length === 1 &&
          entries[0].access.includes('READ') &&
          entries[0].resources.length === RESOURCES.length;
        if (isRead) {
          return {
            detectedPreset: 'read',
            mapping: RESOURCES.reduce((acc, r) => ({ ...acc, [r]: ['READ'] }), {}),
          };
        }

        // Custom mapping
        const mapping = RESOURCES.reduce((acc, r) => ({ ...acc, [r]: [] }), {} as Record<string, string[]>);
        entries.forEach((entry) => {
          const accessList = entry.access || [];
          const cleanAccess = accessList.includes('FULL') ? ['FULL'] : accessList;
          entry.resources.forEach((res: string) => {
            const key = res === 'device' ? 'inventory' : res;
            if (mapping[key]) {
              mapping[key] = Array.from(new Set([...(mapping[key] || []), ...cleanAccess]));
            }
          });
        });
        return { detectedPreset: 'custom', mapping };
      };

      const { detectedPreset, mapping } = detect();
      setPreset(detectedPreset);
      setCustomAccess(mapping);
    }
  }, [policy, isOpen]);

  const toggleAction = (resource: string, action: string) => {
    if (!isRoot) return;
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
      if (current.includes('FULL')) {
        const subActions = ['READ', 'CREATE', 'MODIFY', 'DELETE'];
        updated = subActions.filter((a) => a !== action);
      } else if (current.includes(action)) {
        updated = current.filter((a) => a !== action);
      } else {
        updated = [...current, action];
        if (
          updated.includes('READ') &&
          updated.includes('CREATE') &&
          updated.includes('MODIFY') &&
          updated.includes('DELETE')
        ) {
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

    let entries: { resources: string[]; access: string[] }[] = [];

    if (preset === 'full') {
      entries = [
        {
          resources: RESOURCES,
          access: ['FULL'],
        },
      ];
    } else if (preset === 'read') {
      entries = [
        {
          resources: RESOURCES,
          access: ['READ'],
        },
      ];
    } else {
      const accessGroups: Record<string, string[]> = {};
      Object.entries(customAccess).forEach(([resource, accessList]) => {
        if (accessList && accessList.length > 0) {
          const finalAccess = accessList.includes('FULL') ? ['FULL'] : accessList;
          const key = [...finalAccess].sort().join(',');
          if (!accessGroups[key]) {
            accessGroups[key] = [];
          }
          accessGroups[key].push(resource);
        }
      });

      entries = Object.entries(accessGroups).map(([key, resources]) => ({
        resources,
        access: key.split(','),
      }));
    }

    const payload: ManagementPolicy = {
      id: policy.id,
      name,
      description,
      entity: '',
      venue: '',
      entries,
    };

    updatePolicyMutation.mutate(payload, {
      onSuccess: () => {
        toast({
          title: t('common.success'),
          description: t('crud.success_update_obj', { obj: name }),
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onClose();
      },
      onError: (e: any) => {
        toast({
          title: t('common.error'),
          description: getApiErrorMessage(e, 'We could not update this policy.'),
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      },
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent bg={panelBg}>
        <ModalHeader>
          {isRoot
            ? t('crud.edit_obj', { obj: t('policies.one') })
            : `${t('common.view', { defaultValue: 'View' })} ${t('policies.one')}`}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Grid templateColumns="repeat(2, 1fr)" gap={4}>
            <GridItem colSpan={2}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">{t('common.name')}</FormLabel>
                <Input
                  isDisabled={!isRoot}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. CSR Policy"
                />
              </FormControl>
            </GridItem>

            <GridItem colSpan={2}>
              <FormControl>
                <FormLabel fontSize="sm">{t('common.description')}</FormLabel>
                <Textarea
                  isDisabled={!isRoot}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write policy description..."
                  rows={2}
                />
              </FormControl>
            </GridItem>
          </Grid>

          <Divider my={4} />

          <Heading size="xs" mb={2}>
            Permissions Configuration
          </Heading>
          <FormControl mb={4}>
            <FormLabel fontSize="sm">Access Profile Preset</FormLabel>
            <Select
              isDisabled={!isRoot}
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              bg={panelBg}
            >
              <option value="full">Full Access (All Permissions)</option>
              <option value="read">Read-Only (All View Permissions)</option>
              <option value="custom">Custom Permissions Grid</option>
            </Select>
          </FormControl>

          {preset === 'custom' && (
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
                        {resource === 'managementRole' ? 'Management Role' : resource}
                      </Text>
                    </GridItem>
                    <GridItem>
                      <ResourcePermissionInput
                        resource={resource}
                        selectedActions={customAccess[resource] || []}
                        onToggle={toggleAction}
                        isDisabled={!isRoot}
                      />
                    </GridItem>
                  </React.Fragment>
                ))}
              </Grid>
            </Box>
          )}
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="gray" mr={3} onClick={onClose}>
            {t('common.cancel')}
          </Button>
          {isRoot && (
            <Button colorScheme="blue" onClick={handleSave} isLoading={updatePolicyMutation.isLoading}>
              {t('common.save')}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EditPolicyModal;
