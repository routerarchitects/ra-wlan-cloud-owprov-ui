import * as React from 'react';
import { useEffect } from 'react';
import { Spinner, Center, useDisclosure, useBoolean, Tag } from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../../components/Modals/Modal';
import ActionsDropdown from '../ActionsDropdown';
import UpdateUserForm from './Form';
import SaveButton from 'components/Buttons/SaveButton';
import ToggleEditButton from 'components/Buttons/ToggleEditButton';
import ConfirmCloseAlert from 'components/Modals/Actions/ConfirmCloseAlert';
import { useAuth } from 'contexts/AuthProvider';
import { useGetOperator } from 'hooks/Network/Operators';
import { useGetUser, User } from 'hooks/Network/Users';
import useFormRef from 'hooks/useFormRef';

type Props = {
  userId?: string;
  isOpen: boolean;
  onClose: () => void;
};

const EditUserModal = ({ isOpen, onClose, userId }: Props) => {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const [editing, setEditing] = useBoolean();
  const [activeTab, setActiveTab] = React.useState(0);
  const queryClient = useQueryClient();
  const { isOpen: showConfirm, onOpen: openConfirm, onClose: closeConfirm } = useDisclosure();
  const { form, formRef } = useFormRef<User>();
  const canFetchUser = userId !== '' && isOpen;
  const { data: user, isFetching, refetch } = useGetUser({ id: userId ?? '', enabled: canFetchUser });
  const canManageAccess = authUser?.userRole === 'root' || authUser?.userRole === 'admin';
  const ownerOperatorId = user?.owner?.startsWith('operator:') ? user.owner.split(':')[1] : '';
  const { data: ownerOperator, isFetching: isFetchingOwnerOperator } = useGetOperator({
    enabled: canManageAccess && ownerOperatorId.length > 0,
    id: ownerOperatorId,
  });
  const initialAccessEntityId = ownerOperatorId.length > 0 ? ownerOperator?.entityId : user?.owner;

  const closeModal = () => (form.dirty ? openConfirm() : onClose());

  const closeCancelAndForm = () => {
    closeConfirm();
    onClose();
  };

  const refresh = () => {
    refetch();
    queryClient.invalidateQueries(['users']);
  };

  useEffect(() => {
    if (isOpen) setEditing.off();
    if (isOpen) setActiveTab(0);
  }, [isOpen]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title={user?.name ?? t('crud.edit_obj', { obj: t('user.title') })}
        tags={
          <>
            {user?.suspended ? (
              <Tag colorScheme="yellow" size="lg">
                {t('user.suspended')}
              </Tag>
            ) : null}
            {user?.waitingForEmailCheck ? (
              <Tag colorScheme="blue" size="lg">
                {t('user.email_not_validated')}
              </Tag>
            ) : null}
          </>
        }
        topRightButtons={
          <>
            <SaveButton
              onClick={form.submitForm}
              isLoading={form.isSubmitting}
              isDisabled={!editing || !form.isValid || !form.dirty}
              hidden={!editing}
            />
            <ToggleEditButton ml={2} isEditing={editing} toggleEdit={setEditing.toggle} isDirty={form.dirty} />
            {user ? (
              <ActionsDropdown
                id={user?.id}
                isSuspended={user?.suspended}
                isWaitingForCheck={user?.waitingForEmailCheck}
                refresh={refresh}
                size="md"
                isDisabled={editing}
              />
            ) : null}
          </>
        }
      >
        {!isFetching && !isFetchingOwnerOperator && user ? (
          <UpdateUserForm
            editing={editing}
            canManageAccess={canManageAccess}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedUser={user}
            initialAccessEntityId={initialAccessEntityId}
            isOpen={isOpen}
            onClose={onClose}
            formRef={formRef}
          />
        ) : (
          <Center>
            <Spinner />
          </Center>
        )}
      </Modal>
      <ConfirmCloseAlert isOpen={showConfirm} confirm={closeCancelAndForm} cancel={closeConfirm} />
    </>
  );
};

export default EditUserModal;
