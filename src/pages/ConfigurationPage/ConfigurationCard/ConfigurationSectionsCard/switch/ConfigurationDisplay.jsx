import React from 'react';
import GlobalsSection from './sections/Globals';
import { GLOBALS_SCHEMA } from './sections/Globals/globalsConstants';
import UnitSection from './sections/Units';
import { UNIT_SCHEMA } from './sections/Units/unitConstants';
import MetricsSection from './sections/Metrics';
import { METRICS_SCHEMA } from './sections/Metrics/metricsConstants';
import ServicesSection from './sections/Services';
import { SERVICES_SCHEMA } from './sections/Services/servicesConstants';
import EthernetSection from './sections/Ethernet';
import { ETHERNET_SCHEMA } from './sections/Ethernet/ethernetConstants';
import InterfaceSection from './sections/Interfaces';
import { INTERFACES_SCHEMA } from './sections/Interfaces/interfacesConstants';
import ThirdPartySection from './sections/ThirdParty';
import { THIRD_PARTY_SCHEMA } from './sections/ThirdParty/thirdPartyConstants';
import ConfigurationDisplayBase from '../common/ConfigurationDisplayBase';
import { ConfigurationDisplayProps, SectionDef } from '../common/types';

const sections= [
  { key: 'globals', tabLabel, name, schema'unit', tabLabel, name, schema'metrics', tabLabel, name, schema'services', tabLabel, name, schema'ethernet', tabLabel, name, schema'interfaces', tabLabel, name, schema'third-party', tabLabel, name, schema;

const ConfigurationDisplay = (props) => (
  <ConfigurationDisplayBase {...props} sections={sections} />
);

export default React.memo(ConfigurationDisplay);
