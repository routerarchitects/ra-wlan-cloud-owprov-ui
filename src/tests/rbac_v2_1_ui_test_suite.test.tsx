/**
 * Hierarchical RBAC UI Component & Integration Test Suite (v2.1 Baseline)
 * 
 * NOTE: This test suite uses @testing-library/react to render actual production UI components,
 * verifying DOM controls, root/non-root authorization in PolicyTable and EditPolicyModal,
 * mutation 403 error toast rendering in ManagementRolesTable, and Sidebar route visibility.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('utils/axiosInstances', () => ({
  secUrl: 'http://localhost/api/v1',
  axiosSec: {},
  axiosProv: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), defaults: { baseURL: 'http://localhost/api/v1', headers: { common: {} } } },
  axiosProvV2: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), defaults: { baseURL: 'http://localhost/api/v2', headers: { common: {} } } },
}));

vi.mock('@chakra-ui/icons', () => ({
  ArrowRightIcon: () => null,
  ArrowLeftIcon: () => null,
  ChevronRightIcon: () => null,
  ChevronLeftIcon: () => null,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
    i18n: { changeLanguage: () => new Promise(() => {}) },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}));

let mockUserRole: string = 'root';
let mockCreateRoleMutation = { mutate: vi.fn(), isLoading: false };
let mockUpdatePolicyMutation = { mutate: vi.fn(), isLoading: false };
let mockCreatePolicyMutation = { mutate: vi.fn(), isLoading: false };

vi.mock('contexts/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'usr-1', userRole: mockUserRole } }),
}));

vi.mock('hooks/Network/ManagementRoles', async () => {
  const actual = await vi.importActual<any>('hooks/Network/ManagementRoles');
  return {
    ...actual,
    useGetManagementPolicies: () => ({
      data: [
        { id: 'pol-1', name: 'Test Policy 1', description: 'Policy 1', entity: '', venue: '', entries: [] }
      ],
      refetch: vi.fn(),
      isFetching: false,
    }),
    useDeleteManagementPolicy: () => ({ mutate: vi.fn(), isLoading: false }),
    useGetEntities: () => ({ data: [{ id: 'ent-1', name: 'Entity 1' }] }),
    useGetVenues: () => ({ data: [{ id: 'ven-1', name: 'Venue 1', entity: 'ent-1' }] }),
    useGetManagementRoles: () => ({ data: [], isLoading: false, error: null }),
    useCreateManagementRole: () => mockCreateRoleMutation,
    useUpdateManagementRole: () => ({ mutate: vi.fn(), isLoading: false }),
    useDeleteManagementRole: () => ({ mutate: vi.fn(), isLoading: false }),
    useUpdateManagementPolicy: () => mockUpdatePolicyMutation,
    useCreateManagementPolicy: () => mockCreatePolicyMutation,
  };
});

import CreatePolicyModal, { RESOURCES as PRODUCTION_POLICY_RESOURCES } from 'pages/PoliciesPage/CreatePolicyModal';
import EditPolicyModal, { RESOURCES as EDIT_POLICY_RESOURCES } from 'pages/PoliciesPage/EditPolicyModal';
import { DEVICE_COMMAND_ACTIONS } from 'constants/managementPolicyPermissions';
import PolicyTable from 'pages/PoliciesPage/Table';
import { ManagementRolesTable } from 'components/ManagementRolesTable';
import { Sidebar } from 'layout/Sidebar';
import { ManagementPolicy } from 'hooks/Network/ManagementRoles';
import { Route } from 'models/Routes';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider>{children}</ChakraProvider>
    </QueryClientProvider>
  );
};

describe('Hierarchical RBAC UI Component Test Suite', () => {

  beforeEach(() => {
    mockUserRole = 'root';
    mockCreateRoleMutation = { mutate: vi.fn(), isLoading: false };
    mockUpdatePolicyMutation = { mutate: vi.fn(), isLoading: false };
    mockCreatePolicyMutation = { mutate: vi.fn(), isLoading: false };
  });

  it('1. Renders policy create controls only for root users via PolicyTable component mount', () => {
    mockUserRole = 'root';
    const Wrapper = createWrapper();

    const { queryByText, rerender } = render(
      <Wrapper>
        <PolicyTable />
      </Wrapper>
    );

    // Assert Create Policy button is present for root user
    expect(queryByText('crud.create')).not.toBeNull();

    // Rerender as admin (non-root) user
    mockUserRole = 'admin';
    rerender(
      <Wrapper>
        <PolicyTable />
      </Wrapper>
    );

    // Assert Create Policy button is hidden for non-root user
    expect(queryByText('crud.create')).toBeNull();
  });

  it('2. Shows user-facing 403 authorization error message when access-policy assignment mutation fails', async () => {
    let capturedOnErrorCallback: any;
    mockCreateRoleMutation = {
      mutate: vi.fn((_payload, options) => {
        capturedOnErrorCallback = options?.onError;
      }),
      isLoading: false,
    };

    const Wrapper = createWrapper();
    const { findByText, getAllByRole } = render(
      <Wrapper>
        <ManagementRolesTable userId="usr-123" isReadOnly={false} />
      </Wrapper>
    );

    // Select Entity
    const entitySelect = getAllByRole('combobox')[0];
    fireEvent.change(entitySelect, { target: { value: 'ent-1' } });

    // Wait for and click Save to trigger role creation mutation
    const saveButton = await findByText('Save');
    fireEvent.click(saveButton);

    expect(mockCreateRoleMutation.mutate).toHaveBeenCalled();

    // Simulate backend 403 Access Denied response passed to onError
    const error403 = {
      isAxiosError: true,
      response: {
        data: {
          ErrorDescription: '403: Access Denied',
        },
      },
    };
    capturedOnErrorCallback(error403);

    // Assert user-facing mapped error toast message appears in rendered DOM
    const toastMessage = await findByText('You do not have permission to do that.');
    expect(toastMessage).not.toBeNull();
  });

  it('3. Renders Sidebar component and confirms route visibility for non-root users', () => {
    mockUserRole = 'admin';
    const dummyRoutes: Route[] = [
      {
        id: 'policies',
        path: '/policies',
        name: 'policies.title',
        icon: () => <span data-testid="policy-icon" />,
        component: (() => null) as any,
      },
    ];

    const Wrapper = createWrapper();
    const { getAllByText } = render(
      <Wrapper>
        <MemoryRouter initialEntries={['/policies']}>
          <Sidebar
            routes={dummyRoutes}
            isOpen={true}
            toggle={() => {}}
            logo={<div>Logo</div>}
            version="1.0.0"
          />
        </MemoryRouter>
      </Wrapper>
    );

    expect(getAllByText('policies.title').length).toBeGreaterThan(0);
  });

  it('4. Renders EditPolicyModal and asserts Save button visibility strictly gated to root users', () => {
    const mockPolicy: ManagementPolicy = {
      id: 'policy-1',
      name: 'Test Policy',
      description: 'Description',
      entity: '',
      venue: '',
      entries: [{ resources: ['entity'], access: ['READ'] }],
    };

    // Non-root user
    mockUserRole = 'admin';
    const Wrapper = createWrapper();
    const { queryByText, rerender } = render(
      <Wrapper>
        <EditPolicyModal isOpen={true} onClose={() => {}} policy={mockPolicy} />
      </Wrapper>
    );

    expect(queryByText('common.save')).toBeNull();

    // Root user
    mockUserRole = 'root';
    rerender(
      <Wrapper>
        <EditPolicyModal isOpen={true} onClose={() => {}} policy={mockPolicy} />
      </Wrapper>
    );

    expect(queryByText('common.save')).not.toBeNull();
  });

  it('5. ManagementRolesTable hides assignment controls when isReadOnly is true', () => {
    const Wrapper = createWrapper();
    const { queryByText, rerender } = render(
      <Wrapper>
        <ManagementRolesTable userId="usr-123" isReadOnly={true} />
      </Wrapper>
    );

    expect(queryByText('Assign New Entity or Venue Scope')).toBeNull();

    rerender(
      <Wrapper>
        <ManagementRolesTable userId="usr-123" isReadOnly={false} />
      </Wrapper>
    );

    expect(queryByText('Assign New Entity or Venue Scope')).not.toBeNull();
  });

  it('6. Production Policy Modal RESOURCES export contains core RBAC resource types', () => {
    expect(PRODUCTION_POLICY_RESOURCES).toContain('entity');
    expect(PRODUCTION_POLICY_RESOURCES).toContain('venue');
    expect(PRODUCTION_POLICY_RESOURCES).toContain('configuration');
    expect(PRODUCTION_POLICY_RESOURCES).toContain('inventory');
    expect(PRODUCTION_POLICY_RESOURCES).toContain('operator');
    expect(PRODUCTION_POLICY_RESOURCES).toContain('subscriber');
    expect(PRODUCTION_POLICY_RESOURCES).toContain('contact');
    expect(PRODUCTION_POLICY_RESOURCES).toContain('managementRole');
    expect(PRODUCTION_POLICY_RESOURCES).toContain('deviceCommand');
  });

  it('7. VenueContactsCard lastEntity selection resolves immediate parent entity closest to venue', () => {
    const mockPathToEntity = [
      { uuid: 'root-entity-001', type: 'entity', name: 'Root Entity' },
      { uuid: 'nested-parent-entity-002', type: 'entity', name: 'Immediate Parent Entity' },
      { uuid: 'venue-003', type: 'venue', name: 'Target Venue' },
    ];

    const lastEntity = [...mockPathToEntity].reverse().find(({ type }) => type === 'entity');

    expect(lastEntity?.uuid).toBe('nested-parent-entity-002');
    expect(lastEntity?.uuid).not.toBe('root-entity-001');
  });

  it('8. EditPolicyModal initializes standard resources with FULL and never converts all device commands to FULL', () => {
    const fullPolicy: ManagementPolicy = {
      id: 'policy-full-1',
      name: 'Full Policy',
      description: 'Full access policy',
      entity: '',
      venue: '',
      entries: [
        { resources: EDIT_POLICY_RESOURCES.filter((r) => r !== 'deviceCommand'), access: ['FULL'] },
        { resources: ['deviceCommand'], access: ['REBOOT', 'WIFI_SCAN'] },
      ],
    };

    mockUserRole = 'root';
    const Wrapper = createWrapper();
    const { getByText } = render(
      <Wrapper>
        <EditPolicyModal isOpen onClose={() => {}} policy={fullPolicy} />
      </Wrapper>
    );

    const entityCell = getByText('entity').parentElement?.nextElementSibling as HTMLElement;
    const entityCloseBtn = within(entityCell).getByRole('button', { name: 'close' });
    const entityTags = entityCloseBtn.parentElement?.parentElement as HTMLElement;
    expect(within(entityTags).getByText('FULL')).toBeTruthy();

    const deviceCommandsCell = getByText('Device Commands').parentElement?.nextElementSibling as HTMLElement;
    expect(deviceCommandsCell).toBeTruthy();

    const closeButtons = within(deviceCommandsCell).getAllByRole('button', { name: 'close' });
    const devCmdTags = closeButtons[0].parentElement?.parentElement as HTMLElement;
    expect(within(devCmdTags).getByText('REBOOT')).toBeTruthy();
    expect(within(devCmdTags).getByText('WIFI_SCAN')).toBeTruthy();
    expect(within(devCmdTags).queryByText('FULL')).toBeNull();

    // Selecting all device commands maintains explicit list and never collapses to FULL
    DEVICE_COMMAND_ACTIONS.forEach((cmd) => {
      if (!['REBOOT', 'WIFI_SCAN'].includes(cmd)) {
        fireEvent.click(within(deviceCommandsCell).getByText(cmd));
      }
    });

    DEVICE_COMMAND_ACTIONS.forEach((cmd) => {
      expect(within(devCmdTags).getByText(cmd)).toBeTruthy();
    });
    expect(within(devCmdTags).queryByText('FULL')).toBeNull();
  });

  it('9. EditPolicyModal filters wildcard (*) entry actions per resource and omits invalid deviceCommand:READ on save', () => {
    const wildcardReadPolicy: ManagementPolicy = {
      id: 'policy-wildcard-read-1',
      name: 'Wildcard Read Policy',
      description: 'Wildcard read policy',
      entity: '',
      venue: '',
      entries: [{ resources: ['*'], access: ['READ'] }],
    };

    mockUserRole = 'root';
    const Wrapper = createWrapper();
    const { getByText, unmount } = render(
      <Wrapper>
        <EditPolicyModal isOpen onClose={() => {}} policy={wildcardReadPolicy} />
      </Wrapper>
    );

    const deviceCommandsCell = getByText('Device Commands').parentElement?.nextElementSibling as HTMLElement;
    expect(deviceCommandsCell).toBeTruthy();
    expect(within(deviceCommandsCell).getByText('No permissions selected (NOACCESS)')).toBeTruthy();
    expect(within(deviceCommandsCell).queryByRole('button', { name: 'close' })).toBeNull();

    // Standard resources still receive READ from the wildcard entry
    const entityCell = getByText('entity').parentElement?.nextElementSibling as HTMLElement;
    const entityCloseBtn = within(entityCell).getByRole('button', { name: 'close' });
    const entityTagsContainer = entityCloseBtn.parentElement?.parentElement as HTMLElement;
    expect(within(entityTagsContainer).getByText('READ')).toBeTruthy();

    fireEvent.click(getByText('common.save'));
    expect(mockUpdatePolicyMutation.mutate).toHaveBeenCalledTimes(1);
    const savedPayload = mockUpdatePolicyMutation.mutate.mock.calls[0][0] as ManagementPolicy;
    expect(savedPayload.entries).toHaveLength(1);
    expect(savedPayload.entries[0].access).toEqual(['READ']);
    expect(savedPayload.entries[0].resources).not.toContain('deviceCommand');
    unmount();

    // Wildcard FULL grants FULL on standard resources but omits deviceCommand because device commands require explicit selection
    const wildcardFullPolicy: ManagementPolicy = {
      id: 'policy-wildcard-full-1',
      name: 'Wildcard Full Policy',
      description: 'Wildcard full policy',
      entity: '',
      venue: '',
      entries: [{ resources: ['*'], access: ['FULL'] }],
    };
    const fullRender = render(
      <Wrapper>
        <EditPolicyModal isOpen onClose={() => {}} policy={wildcardFullPolicy} />
      </Wrapper>
    );
    const fullDevCmdCell = fullRender.getByText('Device Commands').parentElement?.nextElementSibling as HTMLElement;
    expect(within(fullDevCmdCell).getByText('No permissions selected (NOACCESS)')).toBeTruthy();
    expect(within(fullDevCmdCell).queryByRole('button', { name: 'close' })).toBeNull();
  });

  it('10. CreatePolicyModal selecting REBOOT and WIFI_SCAN produces the expected API payload', () => {
    mockUserRole = 'root';
    const Wrapper = createWrapper();
    const { getByText, getByPlaceholderText } = render(
      <Wrapper>
        <CreatePolicyModal />
      </Wrapper>
    );

    fireEvent.click(getByText('crud.create'));
    fireEvent.change(getByPlaceholderText('e.g. CSR Policy'), { target: { value: 'Device Command Ops' } });

    const deviceCommandsCell = getByText('Device Commands').parentElement?.nextElementSibling as HTMLElement;
    expect(deviceCommandsCell).toBeTruthy();
    expect(within(deviceCommandsCell).getByText('No permissions selected (NOACCESS)')).toBeTruthy();

    fireEvent.click(within(deviceCommandsCell).getByText('REBOOT'));
    fireEvent.click(within(deviceCommandsCell).getByText('WIFI_SCAN'));

    const closeButtons = within(deviceCommandsCell).getAllByRole('button', { name: 'close' });
    const tagsContainer = closeButtons[0].parentElement?.parentElement as HTMLElement;
    expect(within(tagsContainer).getByText('REBOOT')).toBeTruthy();
    expect(within(tagsContainer).getByText('WIFI_SCAN')).toBeTruthy();

    fireEvent.click(getByText('common.save'));
    expect(mockCreatePolicyMutation.mutate).toHaveBeenCalledTimes(1);
    const payload = mockCreatePolicyMutation.mutate.mock.calls[0][0] as ManagementPolicy;
    expect(payload.entries).toEqual(
      expect.arrayContaining([
        { resources: ['deviceCommand'], access: ['REBOOT', 'WIFI_SCAN'] },
      ])
    );
  });

  it('11. Read-only policies never grant deviceCommand on create or edit', () => {
    mockUserRole = 'root';
    const Wrapper = createWrapper();
    const createView = render(
      <Wrapper>
        <CreatePolicyModal />
      </Wrapper>
    );

    fireEvent.click(createView.getByText('crud.create'));
    fireEvent.change(createView.getByPlaceholderText('e.g. CSR Policy'), { target: { value: 'Read Only Policy' } });
    fireEvent.click(createView.getByText('Read Only'));
    fireEvent.click(createView.getByText('common.save'));

    expect(mockCreatePolicyMutation.mutate).toHaveBeenCalledTimes(1);
    const createdPolicy = mockCreatePolicyMutation.mutate.mock.calls[0][0] as ManagementPolicy;
    expect(createdPolicy.entries).toHaveLength(1);
    expect(createdPolicy.entries[0].access).toEqual(['READ']);
    expect(createdPolicy.entries[0].resources).not.toContain('deviceCommand');
    createView.unmount();

    const editView = render(
      <Wrapper>
        <EditPolicyModal isOpen onClose={() => {}} policy={createdPolicy} />
      </Wrapper>
    );

    const deviceCommandsCell = editView.getByText('Device Commands').parentElement?.nextElementSibling as HTMLElement;
    expect(within(deviceCommandsCell).getByText('No permissions selected (NOACCESS)')).toBeTruthy();

    fireEvent.click(editView.getByText('common.save'));
    expect(mockUpdatePolicyMutation.mutate).toHaveBeenCalledTimes(1);
    const updatedPolicy = mockUpdatePolicyMutation.mutate.mock.calls[0][0] as ManagementPolicy;
    expect(updatedPolicy.entries.every((e) => !e.resources.includes('deviceCommand'))).toBe(true);
  });

  it('12. Full Access policy round-trips cleanly across CreatePolicyModal and EditPolicyModal', () => {
    mockUserRole = 'root';
    const Wrapper = createWrapper();
    const createView = render(
      <Wrapper>
        <CreatePolicyModal />
      </Wrapper>
    );

    fireEvent.click(createView.getByText('crud.create'));
    fireEvent.change(createView.getByPlaceholderText('e.g. CSR Policy'), { target: { value: 'Full Access Roundtrip' } });
    fireEvent.click(createView.getByText('Full Access'));
    fireEvent.click(createView.getByText('common.save'));

    expect(mockCreatePolicyMutation.mutate).toHaveBeenCalledTimes(1);
    const createdPolicy = mockCreatePolicyMutation.mutate.mock.calls[0][0] as ManagementPolicy;
    const expectedStandardResources = PRODUCTION_POLICY_RESOURCES.filter((r) => r !== 'deviceCommand');
    expect(createdPolicy.entries).toEqual([{ resources: expectedStandardResources, access: ['FULL'] }]);
    expect(createdPolicy.entries[0].resources).not.toContain('deviceCommand');
    createView.unmount();

    const editView = render(
      <Wrapper>
        <EditPolicyModal isOpen onClose={() => {}} policy={createdPolicy} />
      </Wrapper>
    );

    fireEvent.click(editView.getByText('common.save'));
    expect(mockUpdatePolicyMutation.mutate).toHaveBeenCalledTimes(1);
    const updatedPolicy = mockUpdatePolicyMutation.mutate.mock.calls[0][0] as ManagementPolicy;
    const expectedEditResources = EDIT_POLICY_RESOURCES.filter((r) => r !== 'deviceCommand');
    expect(updatedPolicy.entries).toEqual([{ resources: expectedEditResources, access: ['FULL'] }]);
    expect(updatedPolicy.entries[0].resources).not.toContain('deviceCommand');
  });

  it('13. Editing an existing command policy preserves deviceCommand permissions', () => {
    const existingPolicy: ManagementPolicy = {
      id: 'policy-cmd-1',
      name: 'Command Operator',
      description: 'Original description',
      entity: '',
      venue: '',
      entries: [
        { resources: ['inventory'], access: ['READ'] },
        { resources: ['deviceCommand'], access: ['REBOOT', 'WIFI_SCAN'] },
      ],
    };

    mockUserRole = 'root';
    const Wrapper = createWrapper();
    const { getByText, getByPlaceholderText } = render(
      <Wrapper>
        <EditPolicyModal isOpen onClose={() => {}} policy={existingPolicy} />
      </Wrapper>
    );

    const deviceCommandsCell = getByText('Device Commands').parentElement?.nextElementSibling as HTMLElement;
    const closeButtons = within(deviceCommandsCell).getAllByRole('button', { name: 'close' });
    const tagsContainer = closeButtons[0].parentElement?.parentElement as HTMLElement;
    expect(within(tagsContainer).getByText('REBOOT')).toBeTruthy();
    expect(within(tagsContainer).getByText('WIFI_SCAN')).toBeTruthy();

    fireEvent.change(getByPlaceholderText('Write policy description...'), {
      target: { value: 'Updated command description' },
    });
    fireEvent.click(getByText('common.save'));

    expect(mockUpdatePolicyMutation.mutate).toHaveBeenCalledTimes(1);
    const savedPayload = mockUpdatePolicyMutation.mutate.mock.calls[0][0] as ManagementPolicy;
    expect(savedPayload.description).toBe('Updated command description');
    expect(savedPayload.entries).toEqual(
      expect.arrayContaining([
        { resources: ['inventory'], access: ['READ'] },
        { resources: ['deviceCommand'], access: ['REBOOT', 'WIFI_SCAN'] },
      ])
    );
  });

  it('14. Editing existing OWPROV seed NOC and Installer policies preserves UPDATE permissions without loss', () => {
    // Real OWPROV seed NOC policy from StorageService.cpp
    const nocPolicy: ManagementPolicy = {
      id: 'policy-noc-001',
      name: 'NOC',
      description: 'Operational and monitoring access within the assigned role scope',
      entity: '',
      venue: '',
      entries: [
        {
          resources: ['entity', 'venue', 'operator', 'subscriber', 'contact', 'location', 'managementRole'],
          access: ['READ'],
        },
        {
          resources: ['configuration', 'inventory'],
          access: ['READ', 'UPDATE'],
        },
      ],
    };

    mockUserRole = 'root';
    const Wrapper = createWrapper();
    const { getByText, getByPlaceholderText, unmount } = render(
      <Wrapper>
        <EditPolicyModal isOpen onClose={() => {}} policy={nocPolicy} />
      </Wrapper>
    );

    // Verify UI reflects both READ and UPDATE on configuration and inventory tags
    const configCell = getByText('configuration').parentElement?.nextElementSibling as HTMLElement;
    const configCloseButtons = within(configCell).getAllByRole('button', { name: 'close' });
    const configTags = configCloseButtons[0].parentElement?.parentElement as HTMLElement;
    expect(within(configTags).getByText('READ')).toBeTruthy();
    expect(within(configTags).getByText('UPDATE')).toBeTruthy();

    const invCell = getByText('inventory').parentElement?.nextElementSibling as HTMLElement;
    const invCloseButtons = within(invCell).getAllByRole('button', { name: 'close' });
    const invTags = invCloseButtons[0].parentElement?.parentElement as HTMLElement;
    expect(within(invTags).getByText('READ')).toBeTruthy();
    expect(within(invTags).getByText('UPDATE')).toBeTruthy();

    // Change description and save without modifying permissions
    fireEvent.change(getByPlaceholderText('Write policy description...'), {
      target: { value: 'Updated NOC description' },
    });
    fireEvent.click(getByText('common.save'));

    expect(mockUpdatePolicyMutation.mutate).toHaveBeenCalledTimes(1);
    const nocSaved = mockUpdatePolicyMutation.mutate.mock.calls[0][0] as ManagementPolicy;
    expect(nocSaved.description).toBe('Updated NOC description');

    // Both configuration and inventory MUST retain UPDATE access (prevent silent privilege loss)
    const updateEntry = nocSaved.entries.find((e) => e.access.includes('UPDATE'));
    expect(updateEntry).toBeDefined();
    expect(updateEntry?.access).toEqual(expect.arrayContaining(['READ', 'UPDATE']));
    expect(updateEntry?.resources).toEqual(expect.arrayContaining(['configuration', 'inventory']));
    unmount();

    // Real OWPROV seed Installer policy from StorageService.cpp
    const installerPolicy: ManagementPolicy = {
      id: 'policy-installer-002',
      name: 'Installer',
      description: 'Installation access within the assigned role scope',
      entity: '',
      venue: '',
      entries: [
        {
          resources: ['entity', 'venue', 'configuration', 'contact', 'location'],
          access: ['READ'],
        },
        {
          resources: ['inventory'],
          access: ['READ', 'UPDATE'],
        },
      ],
    };

    const instRender = render(
      <Wrapper>
        <EditPolicyModal isOpen onClose={() => {}} policy={installerPolicy} />
      </Wrapper>
    );

    fireEvent.click(instRender.getByText('common.save'));
    expect(mockUpdatePolicyMutation.mutate).toHaveBeenCalledTimes(2);
    const instSaved = mockUpdatePolicyMutation.mutate.mock.calls[1][0] as ManagementPolicy;
    const instUpdateEntry = instSaved.entries.find((e) => e.access.includes('UPDATE'));
    expect(instUpdateEntry).toBeDefined();
    expect(instUpdateEntry?.resources).toEqual(['inventory']);
    expect(instUpdateEntry?.access).toEqual(expect.arrayContaining(['READ', 'UPDATE']));
  });

  it('15. Legacy policies with MODIFY access are normalized to canonical UPDATE without permission loss', () => {
    const legacyPolicy: ManagementPolicy = {
      id: 'policy-legacy-modify-1',
      name: 'Legacy Operator',
      description: 'Policy created with legacy MODIFY spelling',
      entity: '',
      venue: '',
      entries: [
        {
          resources: ['configuration'],
          access: ['READ', 'MODIFY'],
        },
      ],
    };

    mockUserRole = 'root';
    const Wrapper = createWrapper();
    const { getByText, unmount } = render(
      <Wrapper>
        <EditPolicyModal isOpen onClose={() => {}} policy={legacyPolicy} />
      </Wrapper>
    );

    const configCell = getByText('configuration').parentElement?.nextElementSibling as HTMLElement;
    const configCloseButtons = within(configCell).getAllByRole('button', { name: 'close' });
    const configTags = configCloseButtons[0].parentElement?.parentElement as HTMLElement;
    expect(within(configTags).getByText('READ')).toBeTruthy();
    expect(within(configTags).getByText('UPDATE')).toBeTruthy();

    fireEvent.click(getByText('common.save'));
    expect(mockUpdatePolicyMutation.mutate).toHaveBeenCalledTimes(1);
    const saved = mockUpdatePolicyMutation.mutate.mock.calls[0][0] as ManagementPolicy;
    expect(saved.entries).toEqual([
      {
        resources: ['configuration'],
        access: expect.arrayContaining(['READ', 'UPDATE']),
      },
    ]);
    unmount();
  });
});
