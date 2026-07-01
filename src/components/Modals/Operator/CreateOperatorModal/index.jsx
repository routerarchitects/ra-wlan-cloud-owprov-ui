import React from 'react';
import { Box, Modal, ModalOverlay, ModalContent, ModalBody, Text } from '@chakra-ui/react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import CreateOperatorForm from './Form';
import CloseButton from 'components/Buttons/CloseButton';
import CreateButton from 'components/Buttons/CreateButton';
import SaveButton from 'components/Buttons/SaveButton';
import ConfirmCloseAlert from 'components/Modals/Actions/ConfirmCloseAlert';
import ModalHeader from 'components/Modals/ModalHeader';
import { useAuth } from 'contexts/AuthProvider';
import { useGetOperatorEntities } from 'hooks/Network/Operators';
import useFormModal from 'hooks/useFormModal';
import useFormRef from 'hooks/useFormRef';

const propTypes = {
  refresh: PropTypes.func.isRequired,
};

const CreateOperatorModal = ({ refresh }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { form, formRef } = useFormRef();
  const { isOpen, isConfirmOpen, onOpen, closeConfirm, closeModal, closeCancelAndForm } = useFormModal({
    isDirty: form?.dirty,
  });
  const isRootUser = user?.userRole === 'root';
  const operatorEntitiesQuery = useGetOperatorEntities({ enabled: !isRootUser });
  const operatorEntities = operatorEntitiesQuery.data ?? [];
  const hasOperatorCreateScope = isRootUser || operatorEntities.length > 0;
  const shouldDisableCreate =
    !isRootUser && operatorEntitiesQuery.isFetched && !operatorEntitiesQuery.isError && operatorEntities.length === 0;

  return (
    <>
      <Box display="inline-block" ml={2}>
        <CreateButton
          onClick={onOpen}
          isDisabled={shouldDisableCreate}
          label={shouldDisableCreate ? 'No operator-create scope' : undefined}
        />
      </Box>
      {shouldDisableCreate && (
        <Text color="orange.400" fontSize="xs" mt={1} ml={2}>
          No operator-create scope
        </Text>
      )}
      <Modal onClose={closeModal} isOpen={isOpen} size="xl">
        <ModalOverlay />
        <ModalContent maxWidth={{ sm: '600px', md: '700px', lg: '800px', xl: '50%' }}>
          <ModalHeader
            title={t('crud.create_object', { obj: t('operator.operator', { count: 1 }) })}
            right={
              <>
                <SaveButton
                  onClick={form.submitForm}
                  isLoading={form.isSubmitting}
                  isDisabled={!form.isValid || !form.dirty || (!hasOperatorCreateScope && !isRootUser)}
                />
                <CloseButton ml={2} onClick={closeModal} />
              </>
            }
          />
          <ModalBody>
            <CreateOperatorForm
              isOpen={isOpen}
              onClose={closeCancelAndForm}
              refresh={refresh}
              formRef={formRef}
              isRootUser={isRootUser}
              operatorEntities={operatorEntities}
              hasOperatorCreateScope={hasOperatorCreateScope}
              isOperatorEntitiesLoading={operatorEntitiesQuery.isFetching}
              isOperatorEntitiesError={operatorEntitiesQuery.isError}
            />
          </ModalBody>
        </ModalContent>
        <ConfirmCloseAlert isOpen={isConfirmOpen} confirm={closeCancelAndForm} cancel={closeConfirm} />
      </Modal>
    </>
  );
};

CreateOperatorModal.propTypes = propTypes;

export default CreateOperatorModal;
