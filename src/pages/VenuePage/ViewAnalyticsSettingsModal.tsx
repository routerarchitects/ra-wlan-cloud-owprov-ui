import * as React from 'react';
import { Box, IconButton, Tooltip, VStack, useBoolean, useDisclosure, useToast } from '@chakra-ui/react';
import { Gauge } from '@phosphor-icons/react';
import { Form, Formik } from 'formik';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';
import * as Yup from 'yup';
import StopMonitoringButton from './StopMonitoringButton';
import SaveButton from 'components/Buttons/SaveButton';
import ToggleEditButton from 'components/Buttons/ToggleEditButton';
import NumberField from 'components/FormFields/NumberField';
import StringField from 'components/FormFields/StringField';
import ToggleField from 'components/FormFields/ToggleField';
import ConfirmCloseAlert from 'components/Modals/Actions/ConfirmCloseAlert';
import { Modal } from 'components/Modals/Modal';
import { useGetAnalyticsBoard, useUpdateAnalyticsBoard } from 'hooks/Network/Analytics';
import useFormRef from 'hooks/useFormRef';
import { AxiosError } from 'models/Axios';

type Props = {
  boardId: string;
  venueId: string;
};

const ViewAnalyticsSettingsModal = ({ boardId, venueId }: Props) => {
  const { t } = useTranslation();
  const toast = useToast();
  const getBoard = useGetAnalyticsBoard({
    id: boardId,
  });
  const modalProps = useDisclosure();
  const updateAnalytics = useUpdateAnalyticsBoard({ id: boardId });
  const [formKey, setFormKey] = React.useState(uuid());
  const { isOpen: isConfirmOpen, onOpen: openConfirm, onClose: closeConfirm } = useDisclosure();
  const [editing, { toggle, off }] = useBoolean();
  const { form, formRef } = useFormRef<{
    name: string;
    interval: number;
    retention: number;
    monitorSubVenues: boolean;
  }>();
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

  const data = getBoard.data?.venueList[0];

  React.useEffect(() => {
    setFormKey(uuid());
  }, [editing, getBoard.data]);

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
        title={t('analytics.monitoring')}
        isOpen={modalProps.isOpen}
        onClose={closeModal}
        topRightButtons={
          <>
            <StopMonitoringButton boardId={boardId} venueId={venueId} />
            <SaveButton
              onClick={form.submitForm}
              isLoading={form.isSubmitting}
              isDisabled={!form.isValid || !form.dirty}
              hidden={!editing}
              isCompact
            />
            <ToggleEditButton
              isDirty={form.dirty}
              toggleEdit={toggle}
              isEditing={editing}
              isDisabled={form.isSubmitting}
              isCompact
            />
          </>
        }
        options={{
          modalSize: 'sm',
        }}
      >
        <Box>
          {data ? (
            <Formik
              innerRef={formRef}
              enableReinitialize
              key={formKey}
              initialValues={{
                name: data.name,
                interval: data.interval,
                retention: data.retention,
                monitorSubVenues: data.monitorSubVenues,
              }}
              validationSchema={Schema}
              onSubmit={({ name, interval, retention, monitorSubVenues }, { setSubmitting, resetForm }) => {
                updateAnalytics.mutateAsync(
                  {
                    name,
                    venueList: [
                      {
                        id: venueId,
                        name,
                        retention,
                        interval,
                        monitorSubVenues,
                      },
                    ],
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
                      off();
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
              }}
            >
              <Form>
                <VStack spacing={2} alignItems="left">
                  <StringField name="name" label={t('common.name')} isRequired isDisabled={!editing} />
                  <Box maxW="200px">
                    <NumberField
                      name="interval"
                      label={t('analytics.interval')}
                      isRequired
                      unit={t('common.seconds')}
                      isDisabled={!editing}
                    />
                  </Box>
                  <Box maxW="200px">
                    <NumberField
                      name="retention"
                      label={t('analytics.retention')}
                      isRequired
                      unit={t('common.days')}
                      conversionFactor={3600 * 24}
                      isDisabled={!editing}
                    />
                  </Box>
                  <ToggleField
                    name="monitorSubVenues"
                    label={t('analytics.analyze_sub_venues')}
                    isDisabled={!editing}
                  />
                </VStack>
              </Form>
            </Formik>
          ) : null}
        </Box>
      </Modal>
      <ConfirmCloseAlert
        isOpen={isConfirmOpen}
        confirm={() => {
          modalProps.onClose();
          closeConfirm();
        }}
        cancel={closeConfirm}
      />
    </>
  );
};

export default ViewAnalyticsSettingsModal;
