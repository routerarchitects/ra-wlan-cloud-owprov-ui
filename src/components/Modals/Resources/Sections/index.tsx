import CaptivePortalResource from './common/CaptivePortal';
import InterfaceSsidResource from './common/InterfaceSsid';
import InterfaceSsidRadiusResource from './common/InterfaceSsidRadius';
import InterfaceVlanResource from './common/InterfaceVlan';
import InterfaceIpv4Resource from './common/Ipv4';
import OpenRoamingSsidResource from './common/OpenRoamingSsid';
import SingleRadioResource from './common/SingleRadio';
import InterfaceTunnelResource from './common/Tunnel';

export type SupportedDeviceGroup = 'ap' | 'switch';

export type ResourceSectionMap = {
  CaptivePortal: React.ComponentType<any>;
  InterfaceSsid: React.ComponentType<any>;
  InterfaceSsidRadius: React.ComponentType<any>;
  InterfaceVlan: React.ComponentType<any>;
  Ipv4: React.ComponentType<any>;
  OpenRoamingSsid: React.ComponentType<any>;
  SingleRadio: React.ComponentType<any>;
  Tunnel: React.ComponentType<any>;
};

const commonSections: ResourceSectionMap = {
  CaptivePortal: CaptivePortalResource,
  InterfaceSsid: InterfaceSsidResource,
  InterfaceSsidRadius: InterfaceSsidRadiusResource,
  InterfaceVlan: InterfaceVlanResource,
  Ipv4: InterfaceIpv4Resource,
  OpenRoamingSsid: OpenRoamingSsidResource,
  SingleRadio: SingleRadioResource,
  Tunnel: InterfaceTunnelResource,
};

export const getResourceSectionsForDeviceGroup = (deviceGroup?: string): ResourceSectionMap | null => {
  if (deviceGroup === 'ap') return commonSections;
  if (deviceGroup === 'switch') return null;
  return null;
};

export {
  CaptivePortalResource,
  InterfaceSsidResource,
  InterfaceSsidRadiusResource,
  InterfaceVlanResource,
  InterfaceIpv4Resource,
  OpenRoamingSsidResource,
  SingleRadioResource,
  InterfaceTunnelResource,
};

export default commonSections;
