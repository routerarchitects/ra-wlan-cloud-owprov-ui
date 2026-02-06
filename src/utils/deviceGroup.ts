export const isSupportedDeviceGroup = (deviceGroup?: string): boolean => deviceGroup === 'ap';

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
