import React, { useEffect, useState } from 'react';
import { SimpleGrid } from '@chakra-ui/react';
import { Formik, Form } from 'formik';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';
import DeviceRulesField from 'components/CustomFields/DeviceRulesField';
import IpDetectionModalField from 'components/CustomFields/IpDetectionModalField';
import StringField from 'components/FormFields/StringField';
import { CreateOperatorSchema } from 'constants/formSchemas';
import { useCreateOperator } from 'hooks/Network/Operators';
import useMutationResult from 'hooks/useMutationResult';

const propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  refresh: PropTypes.func.isRequired,
  formRef: PropTypes.instanceOf(Object).isRequired,
};

const CreateOperatorForm = ({ isOpen, onClose, refresh, formRef }) => {
  const { t } = useTranslation();
  const [formKey, setFormKey] = useState(uuid());
  const { onSuccess, onError } = useMutationResult({
    objName: t('operator.one'),
    operationType: 'create',
    refresh,
    onClose,
  });
  const create = useCreateOperator();

  const createParameters = ({ name, description, note, sourceIP, deviceRules, firmwareRCOnly, registrationId }) => ({
    name,
    deviceRules,
    sourceIP,
    registrationId,
    description,
    firmwareRCOnly,
    notes: note.length > 0 ? [{ note }] : undefined,
  });

  useEffect(() => {
    setFormKey(uuid());
  }, [isOpen]);

  return (
    <Formik
      innerRef={formRef}
      key={formKey}
      initialValues={{
        name: '',
        description: '',
        deviceRules: {
          rrm: 'inherit',
          rcOnly: 'inherit',
          firmwareUpgrade: 'inherit',
        },
        registrationId: '',
        firmwareRCOnly: false,
        sourceIP: [],
        note: '',
      }}
      validationSchema={CreateOperatorSchema(t)}
      onSubmit={(formData, { setSubmitting, resetForm }) =>
        create.mutateAsync(createParameters(formData), {
          onSuccess: () => {
            onSuccess({ setSubmitting, resetForm });
          },
          onError: (e) => {
            onError(e, { resetForm });
          },
        })
      }
    >
      <Form>
        <SimpleGrid minChildWidth="300px" spacing="20px" mb={6}>
          <StringField name="name" label={t('common.name')} isRequired />
          <StringField name="description" label={t('common.description')} />
          <StringField name="registrationId" label={t('operator.registration_id')} isRequired />
          <DeviceRulesField />
          <IpDetectionModalField name="sourceIP" />
          <StringField name="note" label={t('common.note')} />
        </SimpleGrid>
      </Form>
    </Formik>
  );
};

CreateOperatorForm.propTypes = propTypes;

export default CreateOperatorForm;
