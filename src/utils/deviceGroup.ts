const normalize = (deviceGroup?: string): string => (deviceGroup ?? '').trim().toLowerCase();

export const isSupportedDeviceGroup = (deviceGroup?: string): boolean => {
  const group = normalize(deviceGroup);
  return group === 'ap' || group === 'switch' || group === 'olg';
};

export const resolveDeviceGroup = (
  deviceGroup?: string,
  deviceTypes?: string[],
  deviceTypesByClass?: Record<string, string[]>,
): string | null => {
  const normalized = normalize(deviceGroup);
  if (normalized === 'ap' || normalized === 'switch' || normalized === 'olg') return normalized;

  if (!Array.isArray(deviceTypes) || !deviceTypesByClass) return null;
  const typeSet = new Set(deviceTypes);
  for (const [group, types] of Object.entries(deviceTypesByClass)) {
    const normalizedGroup = normalize(group);
    if (normalizedGroup !== 'ap' && normalizedGroup !== 'switch' && normalizedGroup !== 'olg') continue;
    if ((types ?? []).some((type) => typeSet.has(type))) return normalizedGroup;
  }
  return null;
};

export const isDeviceSelectionComplete = (
  deviceGroup?: string,
  deviceType?: string,
  deviceTypes?: string[],
): boolean => Boolean(deviceGroup && (deviceType || (deviceTypes && deviceTypes.length > 0)));

export const canEditConfiguration = (
  deviceGroup?: string,
  deviceType?: string,
  deviceTypes?: string[],
): boolean => isSupportedDeviceGroup(deviceGroup) && isDeviceSelectionComplete(deviceGroup, deviceType, deviceTypes);
