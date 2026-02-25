import * as React from 'react';
import { Box, IconButton, Tooltip, VStack, useDisclosure, useToast } from '@chakra-ui/react';
import { Gauge } from '@phosphor-icons/react';
import { Form, Formik } from 'formik';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';
import * as Yup from 'yup';
import SaveButton from 'components/Buttons/SaveButton';
import NumberField from 'components/FormFields/NumberField';
import StringField from 'components/FormFields/StringField';
import ToggleField from 'components/FormFields/ToggleField';
import ConfirmCloseAlert from 'components/Modals/Actions/ConfirmCloseAlert';
import { Modal } from 'components/Modals/Modal';
import { useCreateAnalyticsBoard } from 'hooks/Network/Analytics';
import { useGetVenue, useUpdateVenue } from 'hooks/Network/Venues';
import useFormRef from 'hooks/useFormRef';
import { AxiosError } from 'models/Axios';

type FormValues = {
  name: string;
  interval: number;
  retention: number;
  monitorSubVenues: boolean;
};

type Props = {
  id: string;
};

const StartAnalyticsModal = ({ id }: Props) => {
  const { t } = useTranslation();
  const toast = useToast();
  const getVenue = useGetVenue({ id });
  const createAnalytics = useCreateAnalyticsBoard();
  const updateVenue = useUpdateVenue({ id });
  const [formKey, setFormKey] = React.useState(uuid());
  const modalProps = useDisclosure();
  const { isOpen: isConfirmOpen, onOpen: openConfirm, onClose: closeConfirm } = useDisclosure();
  const { form, formRef } = useFormRef<FormValues>();
  const closeModal = () => (form.dirty ? openConfirm() : modalProps.onClose());
  const testMonitoringName = (str?: string) => (str ? str.length <= 254 : false);

  const Schema = Yup.object()
    .shape({
      name: Yup.string().required(t('form.required')).test('len', t('analytics.monitoring_name_error'), testMonitoringName),
      interval: Yup.number().required(t('form.required')).moreThan(0).integer(),
      retention: Yup.number().required(t('form.required')).moreThan(0).integer(),
    })
    .nullable()
    .default(undefined);

  React.useEffect(() => {
    setFormKey(uuid());
  }, [modalProps.isOpen]);

  return (
    <>
      <Tooltip label={t('analytics.monitoring')}>
        <IconButton
          colorScheme="teal"
          onClick={modalProps.onOpen}
          aria-label={t('analytics.monitoring')}
          icon={<Gauge size={20} />}
        />
      </Tooltip>
      <Modal
        title={t('analytics.create_board')}
        isOpen={modalProps.isOpen}
        onClose={closeModal}
        topRightButtons={
          <SaveButton onClick={form.submitForm} isLoading={form.isSubmitting} isDisabled={!form.isValid} />
        }
        options={{
          modalSize: 'sm',
        }}
      >
        <Box>
          <Formik
            innerRef={formRef}
            enableReinitialize
            key={formKey}
            initialValues={
              {
                name: getVenue.data?.name ?? '',
                interval: 60,
                retention: 3600 * 24 * 7,
                monitorSubVenues: true,
              } as FormValues
            }
            validationSchema={Schema}
            onSubmit={({ name, interval, retention, monitorSubVenues }, { setSubmitting, resetForm }) => {
              createAnalytics.mutateAsync(
                {
                  name,
                  venueList: [
                    {
                      id,
                      name,
                      retention,
                      interval,
                      monitorSubVenues,
                    },
                  ],
                },
                {
                  onSuccess: ({ data: boardData }) => {
                    updateVenue.mutateAsync(
                      {
                        params: {
                          boards: [boardData.id],
                        },
                      },
                      {
                        onSuccess: () => {
                          setSubmitting(false);
                          toast({
                            id: 'venue-update-success',
                            title: t('common.success'),
                            description: t('crud.success_update_obj', {
                              obj: t('venues.one'),
                            }),
                            status: 'success',
                            duration: 5000,
                            isClosable: true,
                            position: 'top-right',
                          });
                          resetForm();
                          modalProps.onClose();
                        },
                        onError: (e) => {
                          toast({
                            id: uuid(),
                            title: t('common.error'),
                            description: t('crud.error_update_obj', {
                              obj: t('venues.one'),
                              e: (e as AxiosError)?.response?.data?.ErrorDescription,
                            }),
                            status: 'error',
                            duration: 5000,
                            isClosable: true,
                            position: 'top-right',
                          });
                          setSubmitting(false);
                        },
                      },
                    );
                  },
                  onError: (e) => {
                    toast({
                      id: uuid(),
                      title: t('common.error'),
                      description: t('crud.error_create_obj', {
                        obj: t('analytics.board'),
                        e: (e as AxiosError)?.response?.data?.ErrorDescription,
                      }),
                      status: 'error',
                      duration: 5000,
                      isClosable: true,
                      position: 'top-right',
                    });
                    setSubmitting(false);
                  },
                },
              );
            }}
          >
            <Form>
              <VStack spacing={2} alignItems="left">
                <StringField name="name" label={t('common.name')} isRequired />
                <Box maxW="200px">
                  <NumberField name="interval" label={t('analytics.interval')} isRequired unit={t('common.seconds')} />
                </Box>
                <Box maxW="200px">
                  <NumberField
                    name="retention"
                    label={t('analytics.retention')}
                    isRequired
                    unit={t('common.days')}
                    conversionFactor={3600 * 24}
                  />
                </Box>
                <ToggleField name="monitorSubVenues" label={t('analytics.analyze_sub_venues')} />
              </VStack>
            </Form>
          </Formik>
        </Box>
      </Modal>
      <ConfirmCloseAlert isOpen={isConfirmOpen} confirm={modalProps.onClose} cancel={closeConfirm} />
    </>
  );
};

export default StartAnalyticsModal;
