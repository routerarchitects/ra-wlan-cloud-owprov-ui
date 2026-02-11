/* eslint-disable @typescript-eslint/no-loop-func */
/* eslint-disable no-await-in-loop */
import React, { useEffect, useState } from 'react';
import { useToast, Tabs, TabList, TabPanels, TabPanel, Tab, SimpleGrid, Textarea } from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { Formik, Field, Form } from 'formik';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';
import SpecialConfigurationManager from '../../../CustomFields/SpecialConfigurationManager';
import ComputedConfigurationDisplay from './ComputedConfigurationDisplay';
import ConfigurationOverrides from 'components/ConfigurationOverrides';
import DeviceRulesField from 'components/CustomFields/DeviceRulesField';
import NotesTable from 'components/CustomFields/NotesTable';
import DeviceTypeFields from 'components/Tables/InventoryTable/DeviceTypeFields';
import SelectField from 'components/FormFields/SelectField';
import SelectWithSearchField from 'components/FormFields/SelectWithSearchField';
import StringField from 'components/FormFields/StringField';
import ToggleField from 'components/FormFields/ToggleField';
import { UpdateTagSchema } from 'constants/formSchemas';
import { TagShape } from 'constants/propShapes';
import { useUpdateSourceOverrides } from 'hooks/Network/ConfigurationOverride';
import { useUpdateConfiguration } from 'hooks/Network/Configurations';
import { useGetEntities } from 'hooks/Network/Entity';
import { useGetVenues } from 'hooks/Network/Venues';
import { canEditConfiguration, isDeviceSelectionComplete } from 'utils/deviceGroup';

const propTypes = {
  editing: PropTypes.bool.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  updateTag: PropTypes.instanceOf(Object).isRequired,
  refresh: PropTypes.func.isRequired,
  tag: PropTypes.shape(TagShape).isRequired,
  formRef: PropTypes.instanceOf(Object).isRequired,
  deviceTypesList: PropTypes.arrayOf(PropTypes.string).isRequired,
  deviceClasses: PropTypes.arrayOf(PropTypes.string).isRequired,
  deviceTypesByClass: PropTypes.instanceOf(Object).isRequired,
  onConfigurationChange: PropTypes.func.isRequired,
  configuration: PropTypes.instanceOf(Object),
};

const defaultProps = {
  configuration: null,
};

const EditTagForm = ({
  editing,
  isOpen,
  onClose,
  updateTag,
  refresh,
  tag,
  formRef,
  deviceTypesList,
  deviceClasses,
  deviceTypesByClass,
  onConfigurationChange,
  configuration,
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [formKey, setFormKey] = useState(uuid());
  const { data: entities } = useGetEntities({ t, toast });
  const { data: venues } = useGetVenues({ t, toast });
  const updateConfiguration = useUpdateConfiguration({ id: tag.deviceConfiguration });
  const [isDeleted, setIsDeleted] = useState(false);
  const queryClient = useQueryClient();
  const updateOverrides = useUpdateSourceOverrides({ serialNumber: tag?.serialNumber });

  const getEntityFromData = (data) => {
    if (data.entity !== '') return `ent:${data.entity}`;
    if (data.venue !== '') return `ven:${data.venue}`;
    return '';
  };

  const deviceListWithType = React.useMemo(() => {
    const { deviceType } = tag;
    if (deviceTypesList.includes(deviceType)) return deviceTypesList;

    const newList = [...deviceTypesList, deviceType];

    return newList.sort((a, b) => a.localeCompare(b));
  }, [deviceTypesList]);

  const getDeviceGroupFromType = React.useCallback(
    (deviceType) => {
      if (!deviceType) return '';
      const entries = Object.entries(deviceTypesByClass ?? {});
      const match = entries.find(([, types]) => types?.includes(deviceType));
      return match ? match[0] : '';
    },
    [deviceTypesByClass],
  );


  useEffect(() => {
    setFormKey(uuid());
    setIsDeleted(false);
  }, [isOpen]);

  return (
    <Formik
      innerRef={formRef}
      enableReinitialize
      key={formKey}
      initialValues={{
        ...tag,
        entity: getEntityFromData(tag),
        devClass: tag.devClass !== '' ? tag.devClass : 'any',
        deviceGroup: getDeviceGroupFromType(tag.deviceType) || '',
      }}
      validationSchema={UpdateTagSchema(t)}
      onSubmit={async (
        {
          name,
          description,
          notes,
          entity,
          deviceType,
          deviceGroup,
          deviceRules,
          devClass,
          state,
          overrides,
          doNotAllowOverrides,
        },
        { setSubmitting, resetForm },
      ) => {
        const params = {
          name,
          description,
          notes: notes.filter((note) => note.isNew),
          deviceType,
          deviceGroup,
          deviceRules,
          devClass,
          doNotAllowOverrides,
          entity: entity === '' || entity.split(':')[0] !== 'ent' ? '' : entity.split(':')[1],
          venue: entity === '' || entity.split(':')[0] !== 'ven' ? '' : entity.split(':')[1],
          state,
        };

        let configUpdateSuccess = true;
        let overrideUpdateError;
        if (overrides !== undefined) {
          const overridesPerSource = overrides.reduce((acc, override) => {
            if (!acc[override.source]) acc[override.source] = [];
            acc[override.source].push(override);
            return acc;
          }, {});

          for (const [source, overridesToUpdate] of Object.entries(overridesPerSource)) {
            if (overridesPerSource[source]) {
              await updateOverrides.mutateAsync(
                { source, data: { serialNumber: tag?.serialNumber, overrides: overridesToUpdate } },
                {
                  onError: (e) => {
                    overrideUpdateError = e;
                  },
                },
              );
              if (overrideUpdateError) {
                toast({
                  id: `override-update-error`,
                  title: t('common.error'),
                  description: overrideUpdateError?.response?.data?.ErrorDescription,
                  status: 'error',
                  duration: 5000,
                  isClosable: true,
                  position: 'top-right',
                });
                break;
              }
            }
          }

          // Now verify if any of the original sources were deleted
          if (!overrideUpdateError) {
            const sourcesToDelete = tag.overrides.map((o) => o.source).filter((source) => !overridesPerSource[source]);
            const uniqueSourcesToDelete = [...new Set(sourcesToDelete)];
            for (const source of uniqueSourcesToDelete) {
              await updateOverrides.mutateAsync(
                { source, data: { serialNumber: tag?.serialNumber, overrides: [] } },
                {
                  onError: (e) => {
                    overrideUpdateError = e;
                  },
                },
              );
              if (overrideUpdateError) {
                toast({
                  id: `override-update-error`,
                  title: t('common.error'),
                  description: overrideUpdateError?.response?.data?.ErrorDescription,
                  status: 'error',
                  duration: 5000,
                  isClosable: true,
                  position: 'top-right',
                });
                break;
              }
            }
          }
        }

        // We need to attach configuration to update so it gets created
        if (configuration !== null && overrideUpdateError === undefined) {
          const configToPush = {
            ...configuration.data,
            name: `device:${tag.serialNumber}`,
            description: 'Created from the Edit Tag menu',
            deviceTypes: [deviceType],
            deviceGroup,
          };

          if (tag.deviceConfiguration === '') params.__newConfig = configToPush;
          else
            await updateConfiguration.mutateAsync(configToPush, {
              onSuccess: ({ data }) => {
                toast({
                  id: 'configuration-update-success',
                  title: t('common.success'),
                  description: t('crud.success_update_obj', {
                    obj: t('configurations.one'),
                  }),
                  status: 'success',
                  duration: 5000,
                  isClosable: true,
                  position: 'top-right',
                });
                queryClient.setQueryData(['get-configuration', configuration.id], data);
                queryClient.invalidateQueries(['get-configurations']);
              },
              onError: (e) => {
                toast({
                  id: uuid(),
                  title: t('common.error'),
                  description: t('crud.error_update_obj', {
                    obj: t('configurations.one'),
                    e: e?.response?.data?.ErrorDescription,
                  }),
                  status: 'error',
                  duration: 5000,
                  isClosable: true,
                  position: 'top-right',
                });
                configUpdateSuccess = false;
                setSubmitting(false);
                resetForm();
              },
            });
        } else params.deviceConfiguration = '';

        if (configUpdateSuccess && overrideUpdateError === undefined) {
          updateTag.mutateAsync(params, {
            onSuccess: async () => {
              toast({
                id: 'tag-update-success',
                title: t('common.success'),
                description: t('crud.success_update_obj', {
                  obj: t('inventory.tag_one'),
                }),
                status: 'success',
                duration: 5000,
                isClosable: true,
                position: 'top-right',
              });
              if (tag.entity.length > 0) {
                queryClient.invalidateQueries(['get-entity', tag.entity]);
              }
              if (tag.venue.length > 0) {
                queryClient.invalidateQueries(['get-venue', tag.venue]);
              }
              if (params.entity.length > 0) {
                queryClient.invalidateQueries(['get-entity', params.entity]);
              }
              if (params.venue.length > 0) {
                queryClient.invalidateQueries(['get-venue', params.venue]);
              }

              queryClient.invalidateQueries(['get-inventory-tag', tag.serialNumber]);
              queryClient.invalidateQueries(['get-configuration']);
              queryClient.invalidateQueries(['configurationOverrides', tag.serialNumber]);
              queryClient.invalidateQueries(['get-tag-computed-configuration', tag.serialNumber]);
              setTimeout(() => {
                setSubmitting(false);
                resetForm();
                refresh();
                onClose();
              }, 200);
            },
            onError: (e) => {
              toast({
                id: uuid(),
                title: t('common.error'),
                description: t('crud.error_update_obj', {
                  obj: t('inventory.tag_one'),
                  e: e?.response?.data?.ErrorDescription,
                }),
                status: 'error',
                duration: 5000,
                isClosable: true,
                position: 'top-right',
              });
              setSubmitting(false);
            },
          });
        }
      }}
    >
      {({ values, setFieldValue }) => {
        const hasDeviceSelection = isDeviceSelectionComplete(values.deviceGroup, values.deviceType);
        return (
        <Tabs variant="enclosed">
          <TabList flexWrap={{base:'wrap', md: 'nowrap'}}>
            <Tab>{t('common.main')}</Tab>
            <Tab isDisabled={!hasDeviceSelection}>{t('configurations.special_configuration')}</Tab>
            <Tab>{t('inventory.computed_configuration')}</Tab>
            <Tab>{t('overrides.other')}</Tab>
            <Tab>{t('common.notes')}</Tab>
            <Tab>{t('common.state')}</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <Form>
                <SimpleGrid minChildWidth="300px" spacing="20px">
                  <StringField name="serialNumber" label={t('inventory.serial_number')} isDisabled isRequired />
                  <StringField name="name" label={t('common.name')} isDisabled={!editing} isRequired />
                  <StringField name="description" label={t('common.description')} isDisabled={!editing} />
                  <DeviceTypeFields
                    isEditing={editing}
                    deviceClasses={deviceClasses}
                    deviceTypesByClass={deviceTypesByClass}
                  />
                  <SelectWithSearchField
                    name="entity"
                    label={t('inventory.parent')}
                    isDisabled={!editing}
                    options={[
                      { label: t('common.none'), value: '' },
                      {
                        label: t('entities.title'),
                        options:
                          entities
                            ?.map((ent) => ({
                              value: `ent:${ent.id}`,
                              label: `${ent.name}${ent.description ? `: ${ent.description}` : ''}`,
                            }))
                            .sort((a, b) => a.label.localeCompare(b.label)) ?? [],
                      },
                      {
                        label: t('venues.title'),
                        options:
                          venues
                            ?.map((ven) => ({
                              value: `ven:${ven.id}`,
                              label: `${ven.name}${ven.description ? `: ${ven.description}` : ''}`,
                            }))
                            .sort((a, b) => a.label.localeCompare(b.label)) ?? [],
                      },
                    ]}
                  />
                  <DeviceRulesField isDisabled={!editing} />
                  <SelectField
                    name="devClass"
                    label={t('inventory.dev_class')}
                    options={[
                      { value: 'any', label: 'any' },
                      { value: 'entity', label: 'entity' },
                      { value: 'venue', label: 'venue' },
                      { value: 'subscriber', label: 'subscriber' },
                    ]}
                    isRequired
                    isDisabled={!editing}
                  />
                  <ToggleField
                    name="doNotAllowOverrides"
                    label={t('overrides.ignore_overrides')}
                    isDisabled={!editing}
                    isRequired
                  />
                </SimpleGrid>
              </Form>
            </TabPanel>
            <TabPanel p={{base: 0, md: 4}}>
              <SpecialConfigurationManager
                configId={isDeleted ? '' : tag.deviceConfiguration}
                editing={editing && canEditConfiguration(values.deviceGroup, values.deviceType)}
                onChange={onConfigurationChange}
                onDelete={() => setIsDeleted(true)}
                deviceGroup={values.deviceGroup}
              />
            </TabPanel>
            <TabPanel>
              <ComputedConfigurationDisplay serialNumber={tag.serialNumber} />
            </TabPanel>
            <TabPanel>
              <ConfigurationOverrides serialNumber={tag.serialNumber} isDisabled={!editing} />
            </TabPanel>
            <TabPanel>
              <Field name="notes">
                {({ field }) => <NotesTable notes={field.value} setNotes={setFieldValue} isDisabled={!editing} />}
              </Field>
            </TabPanel>
            <TabPanel>
              <Field name="state">{({ field }) => <Textarea {...field} isDisabled={!editing} />}</Field>
            </TabPanel>
          </TabPanels>
        </Tabs>
        );
      }}
    </Formik>
  );
};

EditTagForm.propTypes = propTypes;
EditTagForm.defaultProps = defaultProps;

export default EditTagForm;
