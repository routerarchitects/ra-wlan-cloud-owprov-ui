import React, { useEffect, useState } from 'react';
import { SimpleGrid, Tab, TabList, TabPanel, TabPanels, Tabs, useToast } from '@chakra-ui/react';
import { AxiosError } from 'axios';
import { Formik, FormikProps } from 'formik';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';
import InterfaceVlanForm from './Form';
import EDIT_SCHEMA from './schemas';
import NotesTable from 'components/CustomFields/NotesTable';
import StringField from 'components/FormFields/StringField';
import { useCreateResource, useUpdateResource } from 'hooks/Network/Resources';
import { Note } from 'models/Note';
import { Resource } from 'models/Resource';

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

const InterfaceVlanResource = ({ isOpen, onClose, refresh, formRef, resource, isDisabled = false, parent }: Props) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [formKey, setFormKey] = useState(uuid());

  const { mutateAsync: create } = useCreateResource();
  const { mutateAsync: update } = useUpdateResource(resource?.id ?? '');

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
              ...JSON.parse(resource.variables[0].value),
              name: resource.name,
              description: resource.description,
              notes: resource.notes,
            }
          : { ...EDIT_SCHEMA(t, true).cast(), name: '', description: '', notes: [] }
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
          ? update(
              {
                variables: [
                  {
                    type: 'json',
                    weight: 0,
                    prefix: 'interface.vlan',
                    value: {
                      ...formData,
                      name: undefined,
                      description: undefined,
                      notes: undefined,
                      entity: undefined,
                    },
                  },
                ],
                name: formData.name,
                description: formData.description,
                notes: formData.notes.filter((note: Note) => note.isNew),
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
          : create(
              {
                variables: [
                  {
                    type: 'json',
                    weight: 0,
                    prefix: 'interface.vlan',
                    value: {
                      ...formData,
                      name: undefined,
                      description: undefined,
                      notes: undefined,
                    },
                  },
                ],
                ...parent,
                name: formData.name,
                description: formData.description,
                notes: formData.notes.filter((note: Note) => note.isNew),
              },
              {
                onSuccess: () => {
                  toast({
                    id: 'resource-creation-success',
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
              <StringField name="name" label={t('common.name')} isRequired isDisabled={isDisabled} />
              <StringField name="description" label={t('common.description')} isDisabled={isDisabled} />
            </SimpleGrid>
            <InterfaceVlanForm isDisabled={isDisabled} />
          </TabPanel>
          <TabPanel>
            <NotesTable name="notes" isDisabled={isDisabled} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Formik>
  );
};

export default InterfaceVlanResource;
