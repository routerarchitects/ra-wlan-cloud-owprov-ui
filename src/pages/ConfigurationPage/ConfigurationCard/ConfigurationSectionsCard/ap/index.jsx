import React, { useCallback, useEffect, useState } from 'react';
import { Box, Center, Heading, Spacer, Spinner, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
import PropTypes from 'prop-types';
import isEqual from 'react-fast-compare';
import { useTranslation } from 'react-i18next';
import AddSubsectionModal from '../AddSubsectionModal';
import ExpertModeButton from '../ExpertModeButton';
import GlobalsSection from './sections/GlobalsSection';
import { GLOBALS_SCHEMA } from './sections/GlobalsSection/globalsConstants';
import ImportConfigurationButton from '../ImportConfigurationButton';
import InterfacesSection from './sections/InterfaceSection';
import { INTERFACES_SCHEMA } from './sections/InterfaceSection/interfacesConstants';
import MetricsSection from './sections/MetricsSection';
import { METRICS_SCHEMA } from './sections/MetricsSection/metricsConstants';
import RadiosSection from './sections/RadiosSection';
import { RADIOS_SCHEMA } from './sections/RadiosSection/radiosConstants';
import ServicesSection from './sections/ServicesSection';
import { SERVICES_SCHEMA } from './sections/ServicesSection/servicesConstants';
import ThirdPartySection from './sections/ThirdPartySection';
import { THIRD_PARTY_SCHEMA } from './sections/ThirdPartySection/thirdPartyConstants';
import UnitSection from './sections/UnitSection';
import { UNIT_SCHEMA } from './sections/UnitSection/unitConstants';
import useConfigurationTabs from '../useConfigurationTabs';
import ViewConfigErrorsModal from '../ViewConfigErrorsModal';
import ViewConfigWarningsModal from '../ViewConfigWarningsModal';
import ViewJsonConfigModal from '../ViewJsonConfig';
import DeleteButton from 'components/Buttons/DeleteButton';
import Card from 'components/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import LoadingOverlay from 'components/LoadingOverlay';
import { useGetConfiguration } from 'hooks/Network/Configurations';

const propTypes = {
  configId: PropTypes.string.isRequired,
  defaultConfig: PropTypes.arrayOf(PropTypes.instanceOf(Object)),
  editing: PropTypes.bool.isRequired,
  setSections: PropTypes.func.isRequired,
  label: PropTypes.string,
  onDelete: PropTypes.func,
};

const defaultProps = {
  defaultConfig: null,
  label: null,
  onDelete: null,
};

const getActiveConfigurations = (configurations) =>
  configurations.map((config) => Object.keys(JSON.parse(config.configuration))[0]);

const getConfigurationData = (configurations, section) => {
  const data = configurations.find((conf) => Object.keys(JSON.parse(conf.configuration))[0] === section);

  if (section === 'interfaces') {
    return { ...data, configuration: JSON.parse(data.configuration).interfaces };
  }

  return { ...data, configuration: JSON.parse(data.configuration)[section] };
};

const ConfigurationSectionsCard = ({ configId, editing, setSections, label, onDelete, defaultConfig }) => {
  const { t } = useTranslation();
  const { tabIndex, onTabChange, tabsWithNewConfiguration, tabsRemovedConfiguration } = useConfigurationTabs();
  const [globals, setGlobals] = useState({
    data: GLOBALS_SCHEMA(t).cast(),
    isDirty: false,
    invalidValues: [],
  });
  const [unit, setUnit] = useState({
    data: UNIT_SCHEMA(t).cast(),
    isDirty: false,
    invalidValues: [],
  });
  const [metrics, setMetrics] = useState({
    data: METRICS_SCHEMA(t).cast(),
    isDirty: false,
    invalidValues: [],
  });
  const [services, setServices] = useState({
    data: SERVICES_SCHEMA(t).cast(),
    isDirty: false,
    invalidValues: [],
  });
  const [radios, setRadios] = useState({
    data: RADIOS_SCHEMA(t).cast(),
    isDirty: false,
    invalidValues: [],
  });
  const [interfaces, setInterfaces] = useState({
    data: INTERFACES_SCHEMA(t).cast(),
    isDirty: false,
    invalidValues: [],
  });
  const [thirdParty, setThirdParty] = useState({
    data: THIRD_PARTY_SCHEMA(t).cast(),
    isDirty: false,
    invalidValues: [],
  });
  const [activeConfigurations, setActiveConfigurations] = useState([]);

  const setConfigSectionsFromArray = (arr, shouldValidate) => {
    if (!Array.isArray(arr)) return;
    setActiveConfigurations([]);

    setTimeout(() => {
      const newActiveConfigs = getActiveConfigurations(arr);

      if (newActiveConfigs.includes('globals')) {
        setGlobals({
          data: getConfigurationData(arr, 'globals'),
          isDirty: false,
          invalidValues: [],
          shouldValidate,
        });
      }
      if (newActiveConfigs.includes('unit')) {
        setUnit({
          data: getConfigurationData(arr, 'unit'),
          isDirty: false,
          invalidValues: [],
          shouldValidate,
        });
      }
      if (newActiveConfigs.includes('metrics')) {
        setMetrics({
          data: getConfigurationData(arr, 'metrics'),
          isDirty: false,
          invalidValues: [],
          shouldValidate,
        });
      }
      if (newActiveConfigs.includes('services')) {
        setServices({
          data: getConfigurationData(arr, 'services'),
          isDirty: false,
          invalidValues: [],
          shouldValidate,
        });
      }
      if (newActiveConfigs.includes('radios')) {
        setRadios({
          data: getConfigurationData(arr, 'radios'),
          isDirty: false,
          invalidValues: [],
          shouldValidate,
        });
      }
      if (newActiveConfigs.includes('interfaces')) {
        setInterfaces({
          data: getConfigurationData(arr, 'interfaces'),
          isDirty: false,
          invalidValues: [],
          shouldValidate,
        });
      }
      if (newActiveConfigs.includes('third-party')) {
        setThirdParty({
          data: getConfigurationData(arr, 'third-party'),
          isDirty: false,
          invalidValues: [],
          shouldValidate,
        });
      }

      setActiveConfigurations([...newActiveConfigs]);
    }, 200);
  };
  const { data: configuration, isFetching } = useGetConfiguration({
    id: configId,
    onSuccess: (data) => {
      setConfigSectionsFromArray(data.configuration);
    },
  });

  const addSubsection = useCallback(
    (sub) => {
      const newSubs = activeConfigurations;
      newSubs.push(sub);
      setActiveConfigurations([...newSubs]);
      tabsWithNewConfiguration(sub, newSubs);
    },
    [activeConfigurations, setActiveConfigurations],
  );

  const removeSub = useCallback(
    (sub) => {
      if (sub === 'globals')
        setGlobals({
          ...{
            data: GLOBALS_SCHEMA(t).cast(),
            isDirty: false,
            invalidValues: [],
          },
        });
      if (sub === 'unit')
        setUnit({
          ...{
            data: UNIT_SCHEMA(t).cast(),
            isDirty: false,
            invalidValues: [],
          },
        });
      if (sub === 'metrics')
        setMetrics({
          ...{
            data: METRICS_SCHEMA(t).cast(),
            isDirty: false,
            invalidValues: [],
          },
        });
      if (sub === 'services')
        setServices({
          ...{
            data: SERVICES_SCHEMA(t).cast(),
            isDirty: false,
            invalidValues: [],
          },
        });
      if (sub === 'radios')
        setRadios({
          ...{
            data: RADIOS_SCHEMA(t).cast(),
            isDirty: false,
            invalidValues: [],
          },
        });
      if (sub === 'interfaces')
        setInterfaces({
          ...{
            data: INTERFACES_SCHEMA(t).cast(),
            isDirty: false,
            invalidValues: [],
          },
        });
      if (sub === 'third-party')
        setThirdParty({
          ...{
            data: THIRD_PARTY_SCHEMA(t).cast(),
            isDirty: false,
            invalidValues: [],
          },
        });
      const newSubs = activeConfigurations.filter((conf) => conf !== sub);
      setActiveConfigurations([...newSubs]);
      tabsRemovedConfiguration();
    },
    [activeConfigurations, setActiveConfigurations],
  );

  const importConfig = (newConf) => {
    setConfigSectionsFromArray(newConf, true);
  };

  useEffect(() => {
    if (!editing && configuration) {
      const newActiveConfigs = getActiveConfigurations(configuration.configuration);

      if (newActiveConfigs.includes('globals')) {
        setGlobals({
          data: getConfigurationData(configuration.configuration, 'globals'),
          isDirty: false,
          invalidValues: [],
        });
      }
      if (newActiveConfigs.includes('unit')) {
        setUnit({
          data: getConfigurationData(configuration.configuration, 'unit'),
          isDirty: false,
          invalidValues: [],
        });
      }
      if (newActiveConfigs.includes('metrics')) {
        setMetrics({
          data: getConfigurationData(configuration.configuration, 'metrics'),
          isDirty: false,
          invalidValues: [],
        });
      }
      if (newActiveConfigs.includes('services')) {
        setServices({
          data: getConfigurationData(configuration.configuration, 'services'),
          isDirty: false,
          invalidValues: [],
        });
      }
      if (newActiveConfigs.includes('radios')) {
        setRadios({
          data: getConfigurationData(configuration.configuration, 'radios'),
          isDirty: false,
          invalidValues: [],
        });
      }
      if (newActiveConfigs.includes('interfaces')) {
        setInterfaces({
          data: getConfigurationData(configuration.configuration, 'interfaces'),
          isDirty: false,
          invalidValues: [],
        });
      }
      if (newActiveConfigs.includes('third-party')) {
        setThirdParty({
          data: getConfigurationData(configuration.configuration, 'third-party'),
          isDirty: false,
          invalidValues: [],
        });
      }

      setActiveConfigurations(newActiveConfigs);
    }
  }, [editing]);

  useEffect(() => {
    setSections({
      isLoaded: true,
      isDirty:
        globals.isDirty ||
        unit.isDirty ||
        metrics.isDirty ||
        services.isDirty ||
        radios.isDirty ||
        interfaces.isDirty ||
        thirdParty.isDirty ||
        activeConfigurations.length !==
          (configuration ? getActiveConfigurations(configuration?.configuration).length : 0),
      invalidValues: [
        ...globals.invalidValues,
        ...unit.invalidValues,
        ...metrics.invalidValues,
        ...services.invalidValues,
        ...radios.invalidValues,
        ...interfaces.invalidValues,
        ...thirdParty.invalidValues,
      ],
      warnings: {
        interfaces: interfaces.warnings ?? [],
      },
      activeConfigurations,
      data: {
        globals,
        unit,
        metrics,
        services,
        radios,
        interfaces,
        'third-party': thirdParty,
      },
    });
  }, [globals, unit, metrics, services, radios, interfaces, thirdParty, activeConfigurations, configuration]);

  useEffect(() => {
    if (defaultConfig !== null) setConfigSectionsFromArray(defaultConfig);
  }, [defaultConfig]);

  return (
    <Card mt={3} px={label ? 0 : undefined}>
      <CardHeader p={2}>
        <Heading size="md">{label ?? configuration?.name}</Heading>
        <Box ml={{base: 0, md: 'auto'}}>
          <ViewConfigWarningsModal
            warnings={{
              globals: globals.warnings ?? [],
              unit: unit.warnings ?? [],
              metrics: metrics.warnings ?? [],
              services: services.warnings ?? [],
              radios: radios.warnings ?? [],
              interfaces: interfaces.warnings ?? [],
              'third-party': thirdParty.warnings ?? [],
            }}
            activeConfigurations={activeConfigurations}
            isDisabled={isFetching}
          />
          <ViewConfigErrorsModal
            errors={{
              globals: globals.invalidValues,
              unit: unit.invalidValues,
              metrics: metrics.invalidValues,
              services: services.invalidValues,
              radios: radios.invalidValues,
              interfaces: interfaces.invalidValues,
              'third-party': thirdParty.invalidValues,
            }}
            activeConfigurations={activeConfigurations}
            isDisabled={isFetching}
          />
          <ExpertModeButton
            defaultConfiguration={{
              globals: globals.data,
              unit: unit.data,
              metrics: metrics.data,
              services: services.data,
              radios: radios.data,
              interfaces: interfaces.data,
              'third-party': thirdParty.data,
            }}
            activeConfigurations={activeConfigurations}
            isDisabled={!editing}
            setConfig={importConfig}
          />
          <ImportConfigurationButton isDisabled={!editing} setConfig={importConfig} />
          <AddSubsectionModal editing={editing} activeSubs={activeConfigurations} addSub={addSubsection} />
          <ViewJsonConfigModal
            configurations={{
              globals: globals.data,
              unit: unit.data,
              metrics: metrics.data,
              services: services.data,
              radios: radios.data,
              interfaces: interfaces.data,
              'third-party': thirdParty.data,
            }}
            activeConfigurations={activeConfigurations}
            isDisabled={isFetching}
          />
          {onDelete && <DeleteButton isDisabled={!editing} onClick={onDelete} ml={2} />}
        </Box>
      </CardHeader>
      <CardBody px={{base: 0, md: '12px'}}>
        {!configuration && isFetching ? (
          <Center w="100%">
            <Spinner size="xl" />
          </Center>
        ) : (
          <LoadingOverlay isLoading={isFetching}>
            <Box display="unset" position="unset" w="100%">
              <Tabs variant="enclosed" w="100%" index={tabIndex} onChange={onTabChange}>
                <TabList flexWrap={{base: 'wrap', md: 'nowrap'}}>
                  {activeConfigurations.includes('globals') && <Tab>{t('configurations.globals')}</Tab>}
                  {activeConfigurations.includes('unit') && <Tab>{t('configurations.unit')}</Tab>}
                  {activeConfigurations.includes('metrics') && <Tab>{t('configurations.metrics')}</Tab>}
                  {activeConfigurations.includes('services') && <Tab>{t('configurations.services')}</Tab>}
                  {activeConfigurations.includes('radios') && <Tab>{t('configurations.radios')}</Tab>}
                  {activeConfigurations.includes('interfaces') && <Tab>{t('configurations.interfaces')}</Tab>}
                  {activeConfigurations.includes('third-party') && <Tab>{t('configurations.third_party')}</Tab>}
                </TabList>
                <TabPanels>
                  {activeConfigurations.includes('globals') && (
                    <TabPanel px={{base:1, md: 12}}>
                      <GlobalsSection
                        editing={editing}
                        setSection={setGlobals}
                        sectionInformation={globals}
                        removeSub={removeSub}
                      />
                    </TabPanel>
                  )}
                  {activeConfigurations.includes('unit') && (
                    <TabPanel px={{base:1, md: 12}}>
                      <UnitSection
                        editing={editing}
                        setSection={setUnit}
                        sectionInformation={unit}
                        removeSub={removeSub}
                      />
                    </TabPanel>
                  )}
                  {activeConfigurations.includes('metrics') && (
                    <TabPanel px={{base:1, md: 12}}>
                      <MetricsSection
                        editing={editing}
                        setSection={setMetrics}
                        sectionInformation={metrics}
                        removeSub={removeSub}
                      />
                    </TabPanel>
                  )}
                  {activeConfigurations.includes('services') && (
                    <TabPanel px={{base:1, md: 12}}>
                      <ServicesSection
                        editing={editing}
                        setSection={setServices}
                        sectionInformation={services}
                        removeSub={removeSub}
                      />
                    </TabPanel>
                  )}
                  {activeConfigurations.includes('radios') && (
                    <TabPanel px={{base:1, md: 12}}>
                      <RadiosSection
                        editing={editing}
                        setSection={setRadios}
                        sectionInformation={radios}
                        removeSub={removeSub}
                      />
                    </TabPanel>
                  )}
                  {activeConfigurations.includes('interfaces') && (
                    <TabPanel px={{base:1, md: 12}}>
                      <InterfacesSection
                        editing={editing}
                        setSection={setInterfaces}
                        sectionInformation={interfaces}
                        removeSub={removeSub}
                      />
                    </TabPanel>
                  )}
                  {activeConfigurations.includes('third-party') && (
                    <TabPanel>
                      <ThirdPartySection
                        editing={editing}
                        setSection={setThirdParty}
                        sectionInformation={thirdParty}
                        removeSub={removeSub}
                      />
                    </TabPanel>
                  )}
                </TabPanels>
              </Tabs>
            </Box>
          </LoadingOverlay>
        )}
      </CardBody>
    </Card>
  );
};

ConfigurationSectionsCard.propTypes = propTypes;
ConfigurationSectionsCard.defaultProps = defaultProps;

export default React.memo(ConfigurationSectionsCard, isEqual);
