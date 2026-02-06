import React, { useEffect, useState } from 'react';
import { Heading, Tab, TabList, TabPanel, TabPanels, Tabs, useToast } from '@chakra-ui/react';
import { Formik, FormikProps } from 'formik';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';
import { object, string } from 'yup';
import InterfaceSsidForm from './Form';
import RadiusEndpointSelector from './RadiusEndpointSelector';
import NotesTable from 'components/CustomFields/NotesTable';
import StringField from 'components/FormFields/StringField';
import { RadiusEndpoint } from 'hooks/Network/RadiusEndpoints';
import { useCreateResource, useUpdateResource } from 'hooks/Network/Resources';
import { AxiosError } from 'models/Axios';
import { Note } from 'models/Note';
import { Resource } from 'models/Resource';
import { INTERFACE_SSID_SCHEMA } from 'pages/ConfigurationPage/ConfigurationCard/ConfigurationSectionsCard/ap/sections/InterfaceSection/interfacesConstants';

const CONSORTIUMS = {
  orion: ['F4F5E8F5F4'],
  globalreach: ['5A03BA0000'],
  generic: [],
  radsec: [],
} as const;
const DEFAULT_VALUE = (defaultEndpoint?: RadiusEndpoint) => ({
  'bss-mode': 'ap',
  'dtim-period': 2,
  encryption: {
    ieee80211w: 'disabled',
    proto: 'wpa-mixed',
  },
  radius: {
    __radiusEndpoint: defaultEndpoint?.id ?? '',
    'chargeable-user-id': true,
  },
  'pass-point': {
    'venue-group': 1,
    'venue-type': 1,
    'auth-type': {
      type: 'terms-and-conditions',
    },
    'anqp-domain': 8888,
    'access-network-type': 0,
    internet: true,
    'wan-metrics': {
      type: 'up',
      downlink: 20000,
      uplink: 20000,
    },
    'roaming-consortium': CONSORTIUMS[defaultEndpoint?.Type ?? 'generic'],
    'domain-name': ['main.example.com'],
    'friendly-name': ['eng:ExampleWifi', 'fra:ExempleWifi'],
    'venue-name': ['eng:Example Inc 1', 'fra:Exemple Inc 1'],
    'venue-url': ['http://www.example.com/info-fra', 'http://www.example.com/info-eng'],
  },
  'fils-discovery-interval': 20,
  'hidden-ssid': false,
  'isolate-clients': false,
  'maximum-clients': 64,
  name: 'OpenRoaming',
  services: ['radius-gw-proxy', 'wifi-steering'],
  'tip-information-element': true,
  'wifi-bands': ['2G', '5G'],
});

export const EDIT_SCHEMA = (t: (str: string) => string) =>
  object().shape({
    _unused_name: string().required(t('form.required')).default(''),
    _unused_description: string().default(''),
    editing: INTERFACE_SSID_SCHEMA(t),
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
  radiusEndpoints: RadiusEndpoint[];
}

const OpenRoamingSSID = ({
  isOpen,
  onClose,
  refresh,
  formRef,
  resource,
  isDisabled = false,
  parent,
  radiusEndpoints,
}: Props) => {
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
              editing: DEFAULT_VALUE(radiusEndpoints[0] as RadiusEndpoint),
              _unused_name: 'OpenRoaming SSID',
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
                    prefix: 'interface.ssid.openroaming',
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
                    prefix: 'interface.ssid.openroaming',
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
            <Heading size="md" mb={2} textDecoration="underline">
              Resource Details
            </Heading>
            <RadiusEndpointSelector name="editing.radius.__radiusEndpoint" isDisabled={isDisabled} />
            <StringField name="_unused_name" label={t('common.name')} isRequired isDisabled={isDisabled} w="300px" />
            <StringField
              name="_unused_description"
              label={t('common.description')}
              isDisabled={isDisabled}
              isArea
              h="40px"
            />
            <InterfaceSsidForm radiusEndpoints={radiusEndpoints} isDisabled={isDisabled} />
          </TabPanel>
          <TabPanel>
            <NotesTable name="_unused_notes" isDisabled={isDisabled} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Formik>
  );
};

export default OpenRoamingSSID;
