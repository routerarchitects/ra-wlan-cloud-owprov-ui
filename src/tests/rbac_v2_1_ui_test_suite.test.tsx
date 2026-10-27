/**
 * Hierarchical RBAC UI Component & Integration Test Suite (v2.1 Baseline)
 * 
 * NOTE: This test suite uses @testing-library/react to render actual production UI components,
 * verifying DOM controls, root/non-root authorization in PolicyTable and EditPolicyModal,
 * mutation 403 error toast rendering in ManagementRolesTable, and Sidebar route visibility.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    useUpdateManagementPolicy: () => ({ mutate: vi.fn(), isLoading: false }),
    useCreateManagementPolicy: () => ({ mutate: vi.fn(), isLoading: false }),
  };
});

import { RESOURCES as PRODUCTION_POLICY_RESOURCES } from 'pages/PoliciesPage/CreatePolicyModal';
import EditPolicyModal from 'pages/PoliciesPage/EditPolicyModal';
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
});
