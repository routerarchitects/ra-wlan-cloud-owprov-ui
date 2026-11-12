import React, { useState, useEffect } from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Select,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Spinner,
  Alert,
  AlertIcon,
  Box,
  Flex,
  useToast,
  Divider,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Text,
  Checkbox,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  useColorModeValue,
} from '@chakra-ui/react';
import { Trash, Plus, Info, CaretDown, PencilSimple } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';
import { useAuth } from 'contexts/AuthProvider';
import {
  useGetManagementRoles,
  useCreateManagementRole,
  useUpdateManagementRole,
  useDeleteManagementRole,
  useGetEntities,
  useGetVenues,
  useGetManagementPolicies,
  ManagementRole,
  CreateManagementRole,
} from 'hooks/Network/ManagementRoles';
import { getApiErrorMessage } from 'utils/apiErrorMessage';
type Props = {
  userId: string;
  isReadOnly?: boolean;
};

export const ManagementRolesTable = ({ userId, isReadOnly = false }: Props) => {
  const { t } = useTranslation();
  const toast = useToast();
  const { user } = useAuth();
  const isRoot = user?.userRole === 'root';
  const panelBg = useColorModeValue('white', 'gray.700');
  const subtleBg = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const mutedText = useColorModeValue('gray.600', 'gray.300');
  const tableText = useColorModeValue('gray.700', 'gray.100');
  const noAccessText = useColorModeValue('gray.400', 'gray.500');
  const accentText = useColorModeValue('blue.600', 'blue.200');
  const { isOpen: isInfoOpen, onOpen: onOpenInfo, onClose: onCloseInfo } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onOpenDelete, onClose: onCloseDelete } = useDisclosure();

  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedVenueIds, setSelectedVenueIds] = useState<string[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<{ id: string; entity: string; venue: string; policy: string } | null>(null);
  const [roleToEdit, setRoleToEdit] = useState<ManagementRole | null>(null);
  const [editPolicyId, setEditPolicyId] = useState('');

  const { data: roles, isLoading: rolesLoading, error: rolesError } = useGetManagementRoles(userId);
  const { data: entities, isLoading: entitiesLoading, error: entitiesError } = useGetEntities();
  const { data: venues, isLoading: venuesLoading, error: venuesError } = useGetVenues();
  const { data: policies, isLoading: policiesLoading, error: policiesError } = useGetManagementPolicies();

  const createRoleMutation = useCreateManagementRole();
  const updateRoleMutation = useUpdateManagementRole();
  const deleteRoleMutation = useDeleteManagementRole();

  const userRoles = roles ?? [];
  const currentPolicy = policies?.find(p => p.id === selectedPolicy);

  const getPolicyPermissions = (policy: any) => {
    if (!policy || !Array.isArray(policy.entries)) return [];
    const map: Record<string, string[]> = {};
    const resources: string[] = [];

    policy.entries.forEach((entry: any) => {
      const accesses = Array.isArray(entry.access) ? entry.access : (entry.access ? [entry.access] : ['NOACCESS']);
      if (Array.isArray(entry.resources)) {
        entry.resources.forEach((res: string) => {
          const displayResource = res === 'device' ? 'inventory' : res;
          if (!resources.includes(displayResource)) {
            resources.push(displayResource);
          }
          if (!map[displayResource]) {
            map[displayResource] = [];
          }
          accesses.forEach((acc: string) => {
            if (!map[displayResource].includes(acc)) {
              map[displayResource].push(acc);
            }
          });
        });
      }
    });

    return resources.map(res => ({
      resource: res,
      access: map[res] && map[res].length > 0 ? map[res].join(', ') : 'NOACCESS'
    }));
  };

  useEffect(() => {
    if (policies && policies.length > 0 && !selectedPolicy) {
      setSelectedPolicy(policies[0].id);
    }
  }, [policies]);

  const [hasInitializedForm, setHasInitializedForm] = useState(false);

  useEffect(() => {
    setHasInitializedForm(false);
  }, [userId]);

  useEffect(() => {
    if (roles && !rolesLoading && !hasInitializedForm) {
      const rolesForUser = roles.filter(role => Array.isArray(role.users) && role.users.includes(userId));
      if (rolesForUser.length === 0) {
        setShowAddForm(true);
      } else {
        setShowAddForm(false);
      }
      setHasInitializedForm(true);
    }
  }, [roles, rolesLoading, userId, hasInitializedForm]);

  const handleCreate = async () => {
    if (!selectedEntity) {
      toast({
        title: 'Error',
        description: 'Please select an entity.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!selectedPolicy) {
      toast({
        title: 'Error',
        description: 'Please select a policy.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const newRole: CreateManagementRole = {
      name: `Policy-${uuid().substring(0, 8)}`,
      description: `User role assignment`,
      managementPolicy: selectedPolicy,
      users: [userId],
      entity: selectedEntity,
      venueIds: selectedVenueIds,
    };

    createRoleMutation.mutate(newRole, {
      onSuccess: () => {
        toast({
          title: 'Success',
          description: 'Policy scope assigned successfully.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        setSelectedEntity('');
        setSelectedVenueIds([]);
        setShowAddForm(false);
      },
      onError: (e: any) => {
        toast({
          title: 'Error',
          description: getApiErrorMessage(e, 'We could not assign this access policy.'),
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      },
    });
  };

  const confirmDelete = (role: { id: string; entity: string; venue: string; policy: string }) => {
    setRoleToDelete(role);
    onOpenDelete();
  };

  const openEdit = (role: ManagementRole) => {
    setRoleToEdit(role);
    setEditPolicyId(role.managementPolicy);
  };

  const cancelEdit = () => {
    setRoleToEdit(null);
    setEditPolicyId('');
  };

  const handleDelete = () => {
    if (!roleToDelete) return;

    deleteRoleMutation.mutate(roleToDelete.id, {
      onSuccess: () => {
        setRoleToDelete(null);
        onCloseDelete();
        toast({
          title: 'Success',
          description: 'Policy scope revoked.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      },
      onError: (e: any) => {
        onCloseDelete();
        toast({
          title: 'Error',
          description: getApiErrorMessage(e, 'We could not remove this access policy.'),
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      },
    });
  };

  const handleEdit = () => {
    if (!roleToEdit) return;
    if (!editPolicyId) {
      toast({
        title: 'Error',
        description: 'Please select a policy.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    updateRoleMutation.mutate(
      {
        ...roleToEdit,
        managementPolicy: editPolicyId,
      },
      {
        onSuccess: () => {
          cancelEdit();
          toast({
            title: 'Success',
            description: 'Access policy updated successfully.',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        },
        onError: (e: any) => {
          toast({
            title: 'Error',
            description: getApiErrorMessage(e, 'We could not update this access policy.'),
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        },
      }
    );
  };

  const getEntityName = (id: string) => {
    const found = entities?.find(e => e.id === id);
    return found ? found.name : id;
  };

  // AI-NOTE: The owprov backend returns individual role objects per venue scope.
  // Empty venue string '' represents Entity-wide scope, which is rendered as 'Entity-wide'.
  const getVenueName = (id: string) => {
    if (!id) return 'Entity-wide';
    const found = venues?.find(v => v.id === id);
    return found ? found.name : id;
  };

  const getPolicyName = (id: string) => {
    const found = policies?.find(p => p.id === id);
    return found ? found.name : id;
  };

  const filteredVenues = venues ? venues.filter(v => v.entity === selectedEntity) : [];

  const venueSelectionLabel = () => {
    if (selectedVenueIds.length === 0) return 'Entity-wide';
    if (selectedVenueIds.length === 1) {
      return getVenueName(selectedVenueIds[0]);
    }
    return `${selectedVenueIds.length} venues selected`;
  };

  const setEntityWide = () => setSelectedVenueIds([]);
  
  // AI-NOTE: Selecting all venues intentionally collapses the selection to an empty array [],
  // which is submitted and rendered as Entity-wide scope per API v2.1 specifications.
  const toggleVenueSelection = (venueId: string) => {
    setSelectedVenueIds((current) => {
      const next = current.includes(venueId)
        ? current.filter((id) => id !== venueId)
        : [...current, venueId];
      if (filteredVenues.length > 0 && filteredVenues.every((v) => next.includes(v.id))) {
        return [];
      }
      return next;
    });
  };

  if (rolesLoading || entitiesLoading || venuesLoading || policiesLoading) {
    return (
      <Flex justify="center" align="center" py={4}>
        <Spinner size="md" />
      </Flex>
    );
  }

  const fetchError = rolesError || entitiesError || venuesError || policiesError;
  if (fetchError) {
    return (
      <Alert status="error" my={4}>
        <AlertIcon />
        Failed to load management roles or policy assignment data.
      </Alert>
    );
  }

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" borderColor={borderColor} bg={panelBg} w="100%">
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Heading size="sm">Scoped Management Policy Assignments</Heading>
        {!isReadOnly && !showAddForm && (
          <Button
            colorScheme="blue"
            size="xs"
            leftIcon={<Plus size={16} />}
            onClick={() => setShowAddForm(true)}
          >
            Assign Scope & Policy
          </Button>
        )}
      </Flex>
      
      {userRoles.length === 0 ? (
        <Alert status="info" mb={4}>
          <AlertIcon />
          No entities or venues assigned to this user.
        </Alert>
      ) : (
        <Table variant="simple" size="sm" mb={6}>
          <Thead>
            <Tr>
              <Th>Entity</Th>
              <Th>Venue</Th>
              <Th>Assigned Policy</Th>
              {!isReadOnly && <Th w="190px" />}
            </Tr>
          </Thead>
          <Tbody>
            {userRoles.map((role) => (
              <Tr key={role.id}>
                <Td>{getEntityName(role.entity)}</Td>
                <Td>{getVenueName(role.venue)}</Td>
                <Td>
                  {roleToEdit?.id === role.id ? (
                    <Select
                      size="sm"
                      value={editPolicyId}
                      onChange={(e) => setEditPolicyId(e.target.value)}
                      bg={panelBg}
                    >
                      {policies?.map((policy) => (
                        <option key={policy.id} value={policy.id}>
                          {policy.name}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    getPolicyName(role.managementPolicy)
                  )}
                </Td>
                {!isReadOnly && (
                  <Td>
                    <Flex gap={2} justify="flex-end">
                      {roleToEdit?.id === role.id ? (
                        <>
                          <Button
                            colorScheme="blue"
                            size="sm"
                            onClick={handleEdit}
                            isLoading={updateRoleMutation.isLoading}
                          >
                            Save
                          </Button>
                          <Button variant="ghost" size="sm" onClick={cancelEdit}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <IconButton
                          aria-label="Edit policy"
                          colorScheme="blue"
                          variant="ghost"
                          size="sm"
                          icon={<PencilSimple size={18} />}
                          onClick={() => openEdit(role)}
                        />
                      )}
                      <IconButton
                        aria-label="Remove policy"
                        colorScheme="red"
                        size="sm"
                        icon={<Trash size={18} />}
                        onClick={() => confirmDelete({
                          id: role.id,
                          entity: getEntityName(role.entity),
                          venue: getVenueName(role.venue),
                          policy: getPolicyName(role.managementPolicy),
                        })}
                        isLoading={deleteRoleMutation.isLoading}
                      />
                    </Flex>
                  </Td>
                )}
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {!isReadOnly && showAddForm && (
        <>
          <Divider my={4} />

          <Heading size="xs" mb={3}>Assign New Entity or Venue Scope</Heading>
          <Flex gap={4} wrap="wrap" align="flex-end">
            <FormControl maxW="200px" isRequired>
              <FormLabel fontSize="xs">Entity</FormLabel>
              <Select
                placeholder="Select Entity"
                size="sm"
                value={selectedEntity}
                onChange={(e) => {
                  setSelectedEntity(e.target.value);
                  setSelectedVenueIds([]);
                }}
              >
                {entities?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl maxW="260px">
              <FormLabel fontSize="xs">Venues</FormLabel>
              <Menu closeOnSelect={false}>
                <MenuButton
                  as={Button}
                  size="sm"
                  variant="outline"
                  rightIcon={<CaretDown size={16} />}
                  isDisabled={!selectedEntity}
                  w="100%"
                  textAlign="left"
                  justifyContent="space-between"
                  fontWeight="normal"
                >
                  {venueSelectionLabel()}
                </MenuButton>
                <MenuList minW="260px" maxH="280px" overflowY="auto" p={2} bg={panelBg} borderColor={borderColor}>
                  <MenuItem closeOnSelect={false} onClick={setEntityWide}>
                    <Checkbox isChecked={selectedVenueIds.length === 0} pointerEvents="none" mr={2}>
                      Entity-wide
                    </Checkbox>
                  </MenuItem>
                  <MenuDivider />
                  {filteredVenues.map((venue) => (
                    <MenuItem
                      key={venue.id}
                      closeOnSelect={false}
                      onClick={() => toggleVenueSelection(venue.id)}
                    >
                      <Checkbox
                        isChecked={selectedVenueIds.includes(venue.id)}
                        pointerEvents="none"
                        mr={2}
                      >
                        {venue.name}
                      </Checkbox>
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>
            </FormControl>

            <FormControl maxW="240px" isRequired>
              <FormLabel fontSize="xs">Policy</FormLabel>
              <Flex align="center" gap={1}>
                <Select
                  size="sm"
                  value={selectedPolicy}
                  onChange={(e) => setSelectedPolicy(e.target.value)}
                  bg={panelBg}
                >
                  {policies?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <IconButton
                  aria-label="View policy details"
                  icon={<Info size={18} />}
                  size="sm"
                  variant="ghost"
                  onClick={onOpenInfo}
                  isDisabled={!selectedPolicy}
                />
              </Flex>
            </FormControl>

            <Button
              colorScheme="blue"
              size="sm"
              onClick={handleCreate}
              isLoading={createRoleMutation.isLoading}
            >
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </Button>
          </Flex>
        </>
      )}

      <Modal isOpen={isInfoOpen} onClose={onCloseInfo} size="sm">
        <ModalOverlay />
        <ModalContent bg={panelBg}>
          <ModalHeader>Policy Details: {currentPolicy?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {currentPolicy?.description && (
              <Text fontSize="sm" color={mutedText} mb={4}>
                {currentPolicy.description}
              </Text>
            )}
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Resource</Th>
                  <Th>Access Level</Th>
                </Tr>
              </Thead>
              <Tbody>
                {getPolicyPermissions(currentPolicy).map((p) => (
                  <Tr key={p.resource}>
                    <Td textTransform="capitalize" fontSize="xs" color={tableText}>
                      {p.resource === 'managementRole'
                        ? 'Management Role'
                        : p.resource === 'deviceCommand'
                        ? 'Device Commands'
                        : p.resource}
                    </Td>
                    <Td fontWeight="bold" fontSize="xs" color={p.access === 'NOACCESS' ? noAccessText : accentText}>
                      {p.access}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={onCloseDelete} isCentered size="sm">
        <ModalOverlay />
        <ModalContent bg={panelBg}>
          <ModalHeader>Remove Access Policy</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text fontSize="sm" mb={3}>
              Are you sure you want to remove this access policy from the user?
            </Text>
            {roleToDelete && (
              <Box fontSize="sm" color={tableText}>
                <Text><b>Entity:</b> {roleToDelete.entity}</Text>
                <Text><b>Venue:</b> {roleToDelete.venue}</Text>
                <Text><b>Policy:</b> {roleToDelete.policy}</Text>
              </Box>
            )}
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onCloseDelete}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={handleDelete} isLoading={deleteRoleMutation.isLoading}>
              Remove
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </Box>
  );
};
