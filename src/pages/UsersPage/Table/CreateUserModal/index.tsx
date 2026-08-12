import * as React from 'react';
import { useDisclosure, useToast } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../../components/Modals/Modal';
import AssignAccessForm from './AssignAccessForm';
import CreateUserForm, { CreatedUserResult, CreateUserFormValues } from './Form';
import CreateButton from 'components/Buttons/CreateButton';
import SaveButton from 'components/Buttons/SaveButton';
import ConfirmCloseAlert from 'components/Modals/Actions/ConfirmCloseAlert';
import { useAuth } from 'contexts/AuthProvider';
import useFormRef from 'hooks/useFormRef';

const CreateUserModal = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const { user } = useAuth();
  const canManageAccess = user?.userRole === 'root' || user?.userRole === 'admin';
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: showConfirm, onOpen: openConfirm, onClose: closeConfirm } = useDisclosure();
  const { form, formRef } = useFormRef<CreateUserFormValues>();
  const [createdUser, setCreatedUser] = React.useState<CreatedUserResult | null>(null);
  const [step, setStep] = React.useState<'create' | 'assign'>('create');

  const resetFlow = React.useCallback(() => {
    setStep('create');
    setCreatedUser(null);
  }, []);

  const closeModal = () => {
    if (step === 'assign') {
      openConfirm();
      return;
    }
    if (form.dirty) openConfirm();
    else onClose();
  };

  const closeCancelAndForm = () => {
    closeConfirm();
    resetFlow();
    onClose();
  };

  const onCreated = (userResult: CreatedUserResult) => {
    if (!canManageAccess) {
      toast({
        id: 'user-created-success',
        title: t('common.success'),
        description: t('crud.success_create_obj', { obj: t('user.title') }),
        status: 'success',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
      closeCancelAndForm();
      return;
    }
    setCreatedUser(userResult);
    setStep('assign');
  };

  const onAssigned = () => {
    toast({
      id: 'user-access-assigned-success',
      title: t('common.success'),
      description: 'User created and access assigned',
      status: 'success',
      duration: 5000,
      isClosable: true,
      position: 'top-right',
    });
    closeCancelAndForm();
  };

  const renderStep = () => {
    if (step === 'create') {
      return <CreateUserForm isOpen={isOpen} onCreated={onCreated} formRef={formRef} />;
    }

    if (!createdUser) return null;

    return (
      <AssignAccessForm
        onBack={() => setStep('create')}
        onComplete={onAssigned}
        initialEntityId={createdUser.accessEntityId}
        user={createdUser}
        context={{
          heading: 'User created',
          description: 'Configure the management policy for {{email}} before closing this flow.',
          pendingTitle: 'User created, access pending',
          backLabel: 'Back',
          submitLabel: 'Assign Access',
          retryLabel: 'Retry Assignment',
        }}
      />
    );
  };

  return (
    <>
      {user?.userRole === 'CSR' ? null : <CreateButton onClick={onOpen} ml={2} />}
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title={step === 'create' ? t('crud.create_object', { obj: t('user.title') }) : t('login.access_policy')}
        topRightButtons={
          step === 'create' ? (
            <SaveButton onClick={form.submitForm} isLoading={form.isSubmitting} isDisabled={!form.isValid || !form.dirty} />
          ) : null
        }
      >
        {renderStep()}
      </Modal>
      <ConfirmCloseAlert isOpen={showConfirm} confirm={closeCancelAndForm} cancel={closeConfirm} />
    </>
  );
};

export default CreateUserModal;
