import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Center, Heading, Spacer, Spinner, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
import PropTypes from 'prop-types';
import isEqual from 'react-fast-compare';
import { useTranslation } from 'react-i18next';
import AddSubsectionModal from '../AddSubsectionModal';
import ExpertModeButton from '../ExpertModeButton';
import GlobalsSection from './sections/Globals';
import { GLOBALS_SCHEMA } from './sections/Globals/globalsConstants';
import ImportConfigurationButton from '../ImportConfigurationButton';
import InterfacesSection from './sections/Interfaces';
import { INTERFACES_SCHEMA } from './sections/Interfaces/interfacesConstants';
import MetricsSection from './sections/Metrics';
import { METRICS_SCHEMA } from './sections/Metrics/metricsConstants';
import EthernetSection from './sections/Ethernet';
import { ETHERNET_SCHEMA } from './sections/Ethernet/ethernetConstants';
import ServicesSection from './sections/Services';
import { SERVICES_SCHEMA } from './sections/Services/servicesConstants';
import ThirdPartySection from './sections/ThirdParty';
import { THIRD_PARTY_SCHEMA } from './sections/ThirdParty/thirdPartyConstants';
import UnitSection from './sections/Units';
import { UNIT_SCHEMA } from './sections/Units/unitConstants';
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

const normalizeConfigurations = (configurations) =>
  (Array.isArray(configurations) ? configurations : [])
    .map((config) => {
      try {
        const parsed = JSON.parse(config.configuration);
        const key = Object.keys(parsed)[0];
        if (!key) return null;
        return { key, parsed, config };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

const getActiveConfigurations = (normalizedConfigurations) => normalizedConfigurations.map(({ key }) => key);

const getConfigurationData = (normalizedConfigurations, section) => {
  const data = normalizedConfigurations.find((conf) => conf.key === section);
  if (!data) return undefined;

  if (section === 'interfaces') {
    return { ...data.config, configuration: data.parsed.interfaces };
  }

  return { ...data.config, configuration: data.parsed[section] };
};

const getNormalizedConfigurationSnapshotFromRaw = (configurations) =>
  normalizeConfigurations(configurations).map(({ key, config, parsed }) => ({
    key,
    name: config?.name ?? '',
    description: config?.description ?? '',
    weight: Number.isFinite(config?.weight) ? config.weight : 1,
    configuration: key === 'interfaces' ? parsed.interfaces : parsed[key],
  }));

const getNormalizedConfigurationSnapshotFromState = (activeConfigurations, sectionsByKey) =>
  activeConfigurations.map((key) => {
    const sectionData = sectionsByKey[key]?.data;
    return {
      key,
      name: sectionData?.name ?? '',
      description: sectionData?.description ?? '',
      weight: Number.isFinite(sectionData?.weight) ? sectionData.weight : 1,
      configuration: sectionData?.configuration,
    };
  });

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
  const [ethernet, setEthernet] = useState({
    data: ETHERNET_SCHEMA(t).cast(),
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
    const normalizedConfigs = normalizeConfigurations(arr);
    const newActiveConfigs = getActiveConfigurations(normalizedConfigs);

    if (newActiveConfigs.includes('globals')) {
      setGlobals({
        data: getConfigurationData(normalizedConfigs, 'globals'),
        isDirty: false,
        invalidValues: [],
        shouldValidate,
      });
    }
    if (newActiveConfigs.includes('unit')) {
      setUnit({
        data: getConfigurationData(normalizedConfigs, 'unit'),
        isDirty: false,
        invalidValues: [],
        shouldValidate,
      });
    }
    if (newActiveConfigs.includes('metrics')) {
      setMetrics({
        data: getConfigurationData(normalizedConfigs, 'metrics'),
        isDirty: false,
        invalidValues: [],
        shouldValidate,
      });
    }
    if (newActiveConfigs.includes('services')) {
      setServices({
        data: getConfigurationData(normalizedConfigs, 'services'),
        isDirty: false,
        invalidValues: [],
        shouldValidate,
      });
    }
    if (newActiveConfigs.includes('ethernet')) {
      setEthernet({
        data: getConfigurationData(normalizedConfigs, 'ethernet'),
        isDirty: false,
        invalidValues: [],
        shouldValidate,
      });
    }
    if (newActiveConfigs.includes('interfaces')) {
      setInterfaces({
        data: getConfigurationData(normalizedConfigs, 'interfaces'),
        isDirty: false,
        invalidValues: [],
        shouldValidate,
      });
    }
    if (newActiveConfigs.includes('third-party')) {
      setThirdParty({
        data: getConfigurationData(normalizedConfigs, 'third-party'),
        isDirty: false,
        invalidValues: [],
        shouldValidate,
      });
    }

    setActiveConfigurations([...newActiveConfigs]);
  };
  const { data: configuration, isFetching } = useGetConfiguration({
    id: configId,
    onSuccess: (data) => {
      setConfigSectionsFromArray(data.configuration);
    },
  });
  const persistedNormalizedConfigurations = useMemo(
    () => getNormalizedConfigurationSnapshotFromRaw(configuration?.configuration),
    [configuration?.configuration],
  );
  const currentNormalizedConfigurations = useMemo(
    () =>
      getNormalizedConfigurationSnapshotFromState(activeConfigurations, {
        globals,
        unit,
        metrics,
        services,
        ethernet,
        interfaces,
        'third-party': thirdParty,
      }),
    [activeConfigurations, globals, unit, metrics, services, ethernet, interfaces, thirdParty],
  );
  const isConfigurationStructureDirty = useMemo(
    () => !isEqual(currentNormalizedConfigurations, persistedNormalizedConfigurations),
    [currentNormalizedConfigurations, persistedNormalizedConfigurations],
  );

  const addSubsection = useCallback(
    (sub) => {
      setActiveConfigurations((prev) => {
        const newSubs = [...prev, sub];
        tabsWithNewConfiguration(sub, newSubs);
        return newSubs;
      });
    },
    [setActiveConfigurations, tabsWithNewConfiguration],
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
      if (sub === 'ethernet')
        setEthernet({
          ...{
            data: ETHERNET_SCHEMA(t).cast(),
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
    if (!editing && configuration) setConfigSectionsFromArray(configuration.configuration);
  }, [editing]);

  useEffect(() => {
    const finalDirty =
      globals.isDirty ||
      unit.isDirty ||
      metrics.isDirty ||
      services.isDirty ||
      ethernet.isDirty ||
      interfaces.isDirty ||
      thirdParty.isDirty ||
      isConfigurationStructureDirty;

    setSections({
      isLoaded: true,
      isDirty: finalDirty,
      invalidValues: [
        ...globals.invalidValues,
        ...unit.invalidValues,
        ...metrics.invalidValues,
        ...services.invalidValues,
        ...ethernet.invalidValues,
        ...interfaces.invalidValues,
        ...thirdParty.invalidValues,
      ],
      warnings: {
        ethernet: ethernet.warnings ?? [],
        interfaces: interfaces.warnings ?? [],
      },
      activeConfigurations,
      data: {
        globals,
        unit,
        metrics,
        services,
        ethernet,
        interfaces,
        'third-party': thirdParty,
      },
    });
  }, [globals, unit, metrics, services, ethernet, interfaces, thirdParty, activeConfigurations, isConfigurationStructureDirty]);

  useEffect(() => {
    if (defaultConfig !== null) setConfigSectionsFromArray(defaultConfig);
  }, [defaultConfig]);

  const subsectionOptions = [
    { key: 'globals', label: t('configurations.globals') },
    { key: 'unit', label: t('configurations.unit') },
    { key: 'metrics', label: t('configurations.metrics') },
    { key: 'services', label: t('configurations.services') },
    { key: 'ethernet', label: t('configurations.ethernet', 'Ethernet') },
    { key: 'interfaces', label: t('configurations.interfaces') },
    { key: 'third-party', label: t('configurations.third_party') },
  ];

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
              ethernet: ethernet.warnings ?? [],
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
              ethernet: ethernet.invalidValues,
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
              ethernet: ethernet.data,
              interfaces: interfaces.data,
              'third-party': thirdParty.data,
            }}
            activeConfigurations={activeConfigurations}
            isDisabled={!editing}
            setConfig={importConfig}
          />
          <ImportConfigurationButton isDisabled={!editing} setConfig={importConfig} />
          <AddSubsectionModal
            editing={editing}
            activeSubs={activeConfigurations}
            addSub={addSubsection}
            subsections={subsectionOptions}
          />
          <ViewJsonConfigModal
            configurations={{
              globals: globals.data,
              unit: unit.data,
              metrics: metrics.data,
              services: services.data,
              ethernet: ethernet.data,
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
                  {activeConfigurations.includes('ethernet') && (
                    <Tab>{t('configurations.ethernet', 'Ethernet')}</Tab>
                  )}
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
                  {activeConfigurations.includes('ethernet') && (
                    <TabPanel px={{base:1, md: 12}}>
                      <EthernetSection
                        editing={editing}
                        setSection={setEthernet}
                        sectionInformation={ethernet}
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
