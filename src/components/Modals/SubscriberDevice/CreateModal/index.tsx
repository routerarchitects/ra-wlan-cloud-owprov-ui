import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ModalOverlay, ModalContent, ModalBody, Center, Spinner, IconButton, Tooltip } from '@chakra-ui/react';
import { ArrowLeft } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import CreateSubscriberDeviceStep0 from './MultiStepForm/Step0';
import CreateSubscriberDeviceStep1 from './MultiStepForm/Step1';
import CreateSubscriberDeviceStep2 from './MultiStepForm/Step2';
import CreateSubscriberDeviceStep3 from './MultiStepForm/Step3';
import CloseButton from 'components/Buttons/CloseButton';
import CreateButton from 'components/Buttons/CreateButton';
import StepButton from 'components/Buttons/StepButton';
import ConfirmCloseAlert from 'components/Modals/Actions/ConfirmCloseAlert';
import ModalHeader from 'components/Modals/ModalHeader';
import { useAuth } from 'contexts/AuthProvider';
import { useCreateSubscriberDevice } from 'hooks/Network/SubscriberDevices';
import useFormModal from 'hooks/useFormModal';
import useFormRef from 'hooks/useFormRef';
import useMutationResult from 'hooks/useMutationResult';
import useNestedConfigurationForm from 'hooks/useNestedConfigurationForm';
import useOperatorChildren from 'hooks/useOperatorChildren';
import { Configuration } from 'models/Configuration';
import { Device, EditDevice } from 'models/Device';

const defaultConfiguration: Configuration[] = [];
const LAST_STEP = 3;
const getStepFromError = (errorDescription: string): number | undefined => {
  const msg = errorDescription.toLowerCase();

  if (
    msg.includes('devicegroup') ||
    msg.includes('device group') ||
    msg.includes('device type') ||
    msg.includes('serial')
  ) {
    return 1;
  }
  if (msg.includes('location') || msg.includes('address') || msg.includes('country') || msg.includes('postal')) {
    return 2;
  }
  if (msg.includes('contact') || msg.includes('email') || msg.includes('phone')) {
    return 3;
  }
  if (msg.includes('subscriber') || msg.includes('billing') || msg.includes('service class')) {
    return 0;
  }

  return undefined;
};

interface Props {
  refresh: () => void;
  operatorId: string;
  subscriberId?: string;
  devices: Device[];
}
const defaultProps = {
  subscriberId: '',
};

const CreateSubscriberDeviceModal = ({ refresh, operatorId, subscriberId, devices }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isLoaded, deviceTypes, deviceClasses, deviceTypesByClass, serviceClasses, subscribers } = useOperatorChildren({
    operatorId,
  });
  const { form, formRef } = useFormRef();
  const { isOpen, isConfirmOpen, onOpen, closeConfirm, closeModal, closeCancelAndForm } = useFormModal({
    isDirty: form?.dirty,
  });
  const {
    data: { configuration, isValid: isConfigurationValid },
    onChange: onConfigurationChange,
  } = useNestedConfigurationForm({ defaultConfiguration });
  const { onSuccess, onError } = useMutationResult({
    objName: t('devices.one'),
    operationType: 'create',
    refresh,
    onClose: closeCancelAndForm,
  });
  const create = useCreateSubscriberDevice();
  const [step, setStep] = useState<number>(0);
  const [data, setData] = useState<Record<string, unknown>>({ operatorId });
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const visibleStep = step > LAST_STEP ? LAST_STEP : step;
  const goBack = () => setStep((prevStep) => Math.max(prevStep - 1, 0));

  const submit = async (finalData: Record<string, unknown>) => {
    if (isSubmittingRequest) return;
    setIsSubmittingRequest(true);
    const selectedSubscriberId = (finalData.subscriberId as string) ?? subscriberId;
    const subscriberPrimaryEmail = (subscribers ?? []).find((sub) => sub.id === selectedSubscriberId)?.email ?? '';
    const contactData = (finalData.contact as Record<string, unknown>) ?? {};

    try {
      await create.mutateAsync({
        ...finalData,
        contact: {
          ...contactData,
          primaryEmail: subscriberPrimaryEmail,
        },
        configuration: configuration ?? [],
      } as EditDevice);
      onSuccess({});
    } catch (e) {
      const errorDescription =
        (e as { response?: { data?: { ErrorDescription?: string } } })?.response?.data?.ErrorDescription ?? '';
      const stepFromError = getStepFromError(errorDescription);
      if (stepFromError !== undefined) setStep(stepFromError);
      onError(e, {});
    } finally {
      form?.setSubmitting(false);
      setIsSubmittingRequest(false);
      create.reset();
    }
  };

  const finishStep = (newData: Record<string, unknown>) => {
    const finalData = { ...data, ...newData };
    setData(finalData);
    if (step === LAST_STEP) {
      submit(finalData);
      return;
    }
    setStep((prevStep) => Math.min(prevStep + 1, LAST_STEP));
  };

  const resetStep = () => {
    setData({ operatorId });
    setStep(0);
  };

  const contactSuggestions = useMemo(
    () => devices.map(({ serialNumber, contact }) => ({ serialNumber, contact })),
    [devices],
  );
  const locationSuggestions = useMemo(
    () => devices.map(({ serialNumber, location }) => ({ serialNumber, location })),
    [devices],
  );
  const selectedSubscriberId = ((data.subscriberId as string) ?? subscriberId) || '';
  const subscriberPrimaryEmail = useMemo(
    () => (subscribers ?? []).find((sub) => sub.id === selectedSubscriberId)?.email ?? '',
    [selectedSubscriberId, subscribers],
  );

  useEffect(() => {
    if (!isOpen) {
      resetStep();
      setIsSubmittingRequest(false);
      create.reset();
    }
  }, [isOpen]);

  const formStep = useMemo(() => {
    if (visibleStep === 0)
      return (
        <CreateSubscriberDeviceStep0
          formRef={formRef}
          finishStep={finishStep}
          serviceClasses={serviceClasses}
          subscribers={subscribers ?? []}
          subscriberId={subscriberId}
          initialData={data}
        />
      );
    if (visibleStep === 1)
      return (
        <CreateSubscriberDeviceStep1
          formRef={formRef}
          finishStep={finishStep}
          deviceTypes={deviceTypes}
          deviceClasses={deviceClasses}
          deviceTypesByClass={deviceTypesByClass}
          onConfigurationChange={onConfigurationChange}
          initialData={data}
        />
      );
    if (visibleStep === 2)
      return (
        <CreateSubscriberDeviceStep2
          formRef={formRef}
          finishStep={finishStep}
          locationSuggestions={locationSuggestions}
          initialData={data}
        />
      );
    if (visibleStep === 3)
      return (
        <CreateSubscriberDeviceStep3
          formRef={formRef}
          finishStep={finishStep}
          contactSuggestions={contactSuggestions}
          subscriberPrimaryEmail={subscriberPrimaryEmail}
          initialData={data}
        />
      );
    return null;
  }, [
    data,
    visibleStep,
    subscribers,
    serviceClasses,
    deviceTypes,
    deviceClasses,
    deviceTypesByClass,
    subscriberPrimaryEmail,
  ]);

  return (
    <>
      {user?.userRole === 'CSR' ? null : <CreateButton onClick={onOpen} ml={2} />}
      <Modal onClose={closeModal} isOpen={isOpen} size="xl">
        <ModalOverlay />
        <ModalContent maxWidth={{ sm: '90%', md: '900px', lg: '1000px', xl: '80%' }}>
          <ModalHeader
            title={t('crud.create_object', { obj: t('certificates.device') })}
            right={
              <>
                <Tooltip label={t('common.back')}>
                  <IconButton
                    colorScheme="gray"
                    aria-label={t('common.back')}
                    icon={<ArrowLeft size={20} />}
                    type="button"
                    onClick={goBack}
                    isDisabled={visibleStep === 0 || isSubmittingRequest}
                  />
                </Tooltip>
                <StepButton
                  onNext={form.submitForm}
                  currentStep={visibleStep}
                  lastStep={LAST_STEP}
                  isLoading={isSubmittingRequest}
                  isDisabled={!form.isValid || !isConfigurationValid || isSubmittingRequest}
                  isCompact={false}
                />
                <CloseButton ml={2} onClick={closeModal} />
              </>
            }
          />
          <ModalBody>
            {isLoaded ? (
              formStep
            ) : (
              <Center>
                <Spinner />
              </Center>
            )}
          </ModalBody>
        </ModalContent>
        <ConfirmCloseAlert isOpen={isConfirmOpen} confirm={closeCancelAndForm} cancel={closeConfirm} />
      </Modal>
    </>
  );
};

CreateSubscriberDeviceModal.defaultProps = defaultProps;

export default CreateSubscriberDeviceModal;
