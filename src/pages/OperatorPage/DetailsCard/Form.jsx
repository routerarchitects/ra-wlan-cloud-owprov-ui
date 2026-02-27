import React, { useEffect, useState } from 'react';
import { Tabs, TabList, TabPanels, TabPanel, Tab, SimpleGrid, Box, Heading, Button } from '@chakra-ui/react';
import { Formik, Form } from 'formik';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import DeviceRulesField from 'components/CustomFields/DeviceRulesField';
import IpDetectionModalField from 'components/CustomFields/IpDetectionModalField';
import NotesTable from 'components/CustomFields/NotesTable';
import FormattedDate from 'components/FormattedDate';
import StringField from 'components/FormFields/StringField';
import { EditOperatorSchema } from 'constants/formSchemas';
import { EntityShape } from 'constants/propShapes';
import { useGetEntity } from 'hooks/Network/Entity';
import { useUpdateOperator } from 'hooks/Network/Operators';
import useMutationResult from 'hooks/useMutationResult';

const propTypes = {
  editing: PropTypes.bool.isRequired,
  operator: PropTypes.shape(EntityShape).isRequired,
  formRef: PropTypes.instanceOf(Object).isRequired,
  stopEditing: PropTypes.func.isRequired,
};

const EditOperatorForm = ({ editing, operator, formRef, stopEditing }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formKey, setFormKey] = useState(uuid());
  const { data: entity } = useGetEntity({ id: operator.entityId });
  const updateOperator = useUpdateOperator({ id: operator.id });
  const { onSuccess, onError } = useMutationResult({
    objName: t('operator.one'),
    operationType: 'update',
    onClose: stopEditing,
    queryToInvalidate: ['get-operator', operator.id],
  });

  useEffect(() => {
    setFormKey(uuid());
  }, [editing]);

  return (
    <Formik
      innerRef={formRef}
      enableReinitialize
      key={formKey}
      initialValues={operator}
      validationSchema={EditOperatorSchema(t)}
      onSubmit={(
        { name, description, deviceRules, sourceIP, firmwareRCOnly, registrationId, notes },
        { setSubmitting, resetForm },
      ) =>
        updateOperator.mutateAsync(
          {
            name,
            description,
            deviceRules,
            sourceIP,
            firmwareRCOnly,
            registrationId,
            notes: notes.filter((note) => note.isNew),
          },
          {
            onSuccess: () => {
              onSuccess({ setSubmitting, resetForm });
            },
            onError: (e) => {
              onError(e, { resetForm });
            },
          },
        )
      }
    >
      {({ setFieldValue }) => (
        <Tabs variant="enclosed" w="100%">
          <TabList>
            <Tab>{t('common.main')}</Tab>
            <Tab>{t('common.notes')}</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <Form>
                <SimpleGrid minChildWidth="300px" spacing="20px">
                  <StringField name="name" label={t('common.name')} isDisabled={!editing} isRequired />
                  <StringField name="description" label={t('common.description')} isDisabled={!editing} />
                  <StringField
                    name="entityId"
                    label={t('operator.associate_entity')}
                    element={
                      entity?.name ? (
                        <Button variant="link" mt={2} onClick={() => navigate(`/entity/${operator.entityId}`)}>
                          {entity.name}
                        </Button>
                      ) : (
                        <Heading size="md" pl={1} pt={2}>
                          -
                        </Heading>
                      )
                    }
                  />
                  <DeviceRulesField isDisabled={!editing} />
                  <IpDetectionModalField name="sourceIP" setFieldValue={setFieldValue} isDisabled={!editing} />
                  <StringField
                    name="registrationId"
                    label={t('operator.registration_id')}
                    element={
                      <Heading size="md" pl={1} pt={2}>
                        {operator.registrationId}
                      </Heading>
                    }
                  />
                  <StringField
                    name="modified"
                    label={t('common.modified')}
                    element={
                      <Box pl={1} pt={2}>
                        <FormattedDate date={operator.modified} />
                      </Box>
                    }
                  />
                </SimpleGrid>
              </Form>
            </TabPanel>
            <TabPanel>
              <NotesTable isDisabled={!editing} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      )}
    </Formik>
  );
};

EditOperatorForm.propTypes = propTypes;

export default EditOperatorForm;
