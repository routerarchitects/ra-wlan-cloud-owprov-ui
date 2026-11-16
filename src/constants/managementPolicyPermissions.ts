export const RESOURCES = [
  'entity',
  'venue',
  'configuration',
  'inventory',
  'operator',
  'subscriber',
  'contact',
  'location',
  'managementRole',
  'deviceCommand',
];

export const ACTIONS = ['READ', 'CREATE', 'MODIFY', 'DELETE', 'FULL'];

export const DEVICE_COMMAND_ACTIONS = [
  'REBOOT',
  'CONFIGURE',
  'BLINK',
  'WIFI_SCAN',
  'TELEMETRY',
  'UPGRADE',
  'FACTORY_RESET',
  'TRACE',
  'RTTY',
  'SCRIPT',
  'RE_ENROLL',
  'FULL',
];

export const RESOURCE_ACTIONS: Record<string, string[]> = {
  entity: ACTIONS,
  venue: ACTIONS,
  configuration: ACTIONS,
  inventory: ACTIONS,
  operator: ACTIONS,
  subscriber: ACTIONS,
  contact: ACTIONS,
  location: ACTIONS,
  managementRole: ACTIONS,
  deviceCommand: DEVICE_COMMAND_ACTIONS,
};

export const getValidActionsForResource = (resource: string): string[] =>
  RESOURCE_ACTIONS[resource] || ACTIONS;

export const filterValidActionsForResource = (
  resource: string,
  actions: string[] = []
): string[] => {
  const allowed = getValidActionsForResource(resource);
  const filtered = actions.filter((action) => allowed.includes(action));
  return filtered.includes('FULL') ? ['FULL'] : Array.from(new Set(filtered));
};
