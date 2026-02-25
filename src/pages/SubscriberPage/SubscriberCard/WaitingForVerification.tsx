import React from 'react';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  useDisclosure,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import WarningButton from 'components/Buttons/WarningButton';
import { useSendSubscriberEmailValidation } from 'hooks/Network/Subscribers';
import { Subscriber } from 'models/Subscriber';

interface Props {
  subscriber?: Subscriber;
  isWaitingForEmailVerification?: boolean;
  isDisabled?: boolean;
  refresh: () => void;
  registrationId?: string;
}

const defaultProps = {
  subscriber: undefined,
  isWaitingForEmailVerification: false,
  isDisabled: false,
  registrationId: undefined,
};

const WaitingForVerificationNotification = (
  {
    subscriber,
    isWaitingForEmailVerification,
    isDisabled,
    refresh,
    registrationId,
  }: Props
) => {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const onSuccess = () => {
    refresh();
    onClose();
  };
  const { mutateAsync: sendValidation, isLoading } = useSendSubscriberEmailValidation({ refresh: onSuccess });
  const canSendValidation = !!subscriber?.email && !!registrationId;

  const handleValidationClick = () =>
    sendValidation({
      email: subscriber?.email ?? '',
      registrationId: registrationId ?? '',
    });

  if (!isWaitingForEmailVerification) return null;

  return (
    <>
      <WarningButton
        label={t('users.waitiing_for_email_verification')}
        ml={2}
        isDisabled={isDisabled}
        onClick={onOpen}
      />
      <AlertDialog isOpen={isOpen} onClose={onClose} isCentered leastDestructiveRef={undefined}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>{t('users.send_validation')}</AlertDialogHeader>
            <AlertDialogBody>{t('users.send_validation_explanation')}</AlertDialogBody>
            <AlertDialogFooter>
              <Button onClick={onClose} mr={4}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleValidationClick}
                isLoading={isLoading}
                colorScheme="red"
                isDisabled={!canSendValidation}
              >
                {t('common.confirm')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

WaitingForVerificationNotification.defaultProps = defaultProps;
export default React.memo(WaitingForVerificationNotification);
