import React, { useEffect, useState } from 'react';
import { SimpleGrid, Tab, TabList, TabPanel, TabPanels, Tabs, useToast } from '@chakra-ui/react';
import { AxiosError } from 'axios';
import { Formik, FormikProps } from 'formik';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';
import { object, string } from 'yup';
import NotesTable from 'components/CustomFields/NotesTable';
import StringField from 'components/FormFields/StringField';
import { useCreateResource, useUpdateResource } from 'hooks/Network/Resources';
import { Note } from 'models/Note';
import { Resource } from 'models/Resource';
import { SINGLE_RADIO_SCHEMA } from 'pages/ConfigurationPage/ConfigurationCard/ConfigurationSectionsCard/ap/sections/RadiosSection/radiosConstants';
import SingleRadio from 'pages/ConfigurationPage/ConfigurationCard/ConfigurationSectionsCard/ap/sections/RadiosSection/SingleRadio';

export const EDIT_SCHEMA = (t: (str: string) => string) =>
  object().shape({
    _unused_name: string().required(t('form.required')).default(''),
    _unused_description: string().default(''),
    editing: SINGLE_RADIO_SCHEMA(t),
  });

interface Props {
  isOpen: boolean;
  onClose: () => void;
  refresh: () => void;
  formRef: React.Ref<FormikProps<Record<string, unknown>>> | undefined;
  resource?: Resource;
  isDisabled?: boolean;
  parent?: {
    entity?: string;
    venue?: string;
    subscriber?: string;
  };
}

const SingleRadioResource = ({ isOpen, onClose, refresh, formRef, resource, isDisabled = false, parent }: Props) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [formKey, setFormKey] = useState(uuid());

  const create = useCreateResource();
  const update = useUpdateResource(resource?.id ?? '');

  useEffect(() => {
    setFormKey(uuid());
  }, [isOpen]);

  return (
    <Formik
      innerRef={formRef}
      key={formKey}
      initialValues={
        resource !== undefined && resource.variables[0]
          ? {
              editing: { ...JSON.parse(resource.variables[0].value) },
              _unused_name: resource.name,
              _unused_description: resource.description,
              entity: resource.entity !== '' ? `ent:${resource.entity}` : `ven:${resource.venue}`,
              _unused_notes: resource.notes,
            }
          : {
              editing: { ...SINGLE_RADIO_SCHEMA(t, true, '2G').cast() },
              _unused_name: 'Radio',
              _unused_description: '',
              _unused_notes: [],
            }
      }
      validationSchema={EDIT_SCHEMA(t)}
      onSubmit={async (formData, { setSubmitting, resetForm }) => {
        const after = (success: boolean) => {
          if (success) {
            setSubmitting(false);
            resetForm();
            refresh();
            onClose();
          } else {
            setSubmitting(false);
          }
        };

        return resource
          ? update.mutateAsync(
              {
                variables: [
                  {
                    type: 'json',
                    weight: 0,
                    prefix: 'radio',
                    value: {
                      // @ts-ignore
                      ...formData.editing,
                      _unused_name: undefined,
                      _unused_description: undefined,
                      _unused_notes: undefined,
                      entity: undefined,
                    },
                  },
                ],
                name: formData._unused_name,
                description: formData._unused_description,
                // @ts-ignore
                notes: formData._unused_notes.filter((note: Note) => note.isNew),
              },
              {
                onSuccess: async () => {
                  toast({
                    id: 'resource-update-success',
                    title: t('common.success'),
                    description: t('crud.success_update_obj', {
                      obj: t('resources.configuration_resource'),
                    }),
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                    position: 'top-right',
                  });
                  after(true);
                },
                // @ts-ignore
                onError: (e: AxiosError) => {
                  toast({
                    id: uuid(),
                    title: t('common.error'),
                    description: t('crud.error_update_obj', {
                      obj: t('resources.configuration_resource'),
                      e: e?.response?.data?.ErrorDescription,
                    }),
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                    position: 'top-right',
                  });
                  after(false);
                },
              },
            )
          : create.mutateAsync(
              {
                variables: [
                  {
                    type: 'json',
                    weight: 0,
                    prefix: 'radio',
                    value: {
                      // @ts-ignore
                      ...formData.editing,
                      _unused_name: undefined,
                      _unused_description: undefined,
                      _unused_notes: undefined,
                    },
                  },
                ],
                ...parent,
                name: formData._unused_name,
                description: formData._unused_description,
                // @ts-ignore
                notes: formData._unused_notes.filter((note: Note) => note.isNew),
              },
              {
                onSuccess: async () => {
                  toast({
                    id: 'user-creation-success',
                    title: t('common.success'),
                    description: t('crud.success_create_obj', {
                      obj: t('resources.configuration_resource'),
                    }),
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                    position: 'top-right',
                  });
                  after(true);
                },
                // @ts-ignore
                onError: (e: AxiosError) => {
                  toast({
                    id: uuid(),
                    title: t('common.error'),
                    description: t('crud.error_create_obj', {
                      obj: t('resources.configuration_resource'),
                      e: e?.response?.data?.ErrorDescription,
                    }),
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                    position: 'top-right',
                  });
                  after(false);
                },
              },
            );
      }}
    >
      <Tabs variant="enclosed">
        <TabList>
          <Tab>{t('common.main')}</Tab>
          <Tab>{t('common.notes')}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <SimpleGrid minChildWidth="300px" spacing="20px" mt={4}>
              <StringField name="_unused_name" label={t('common.name')} isRequired isDisabled={isDisabled} />
              <StringField name="_unused_description" label={t('common.description')} isDisabled={isDisabled} />
            </SimpleGrid>
            <SingleRadio namePrefix="editing" isDisabled={isDisabled} canEditBand={!resource} />
          </TabPanel>
          <TabPanel>
            <NotesTable name="_unused_notes" isDisabled={isDisabled} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Formik>
  );
};

export default SingleRadioResource;
