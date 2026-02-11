import { useMemo } from 'react';
import useGetDeviceTypes, { useGetDeviceTypeInfo } from './Network/DeviceTypes';
import { useGetServiceClasses } from './Network/ServiceClasses';
import { useGetSubscribers } from './Network/Subscribers';

const useOperatorChildren = ({ operatorId }: { operatorId: string }) => {
  const { data: deviceTypes, isFetching: isFetchingDeviceTypes } = useGetDeviceTypes();
  const { data: deviceTypeInfo, isFetching: isFetchingDeviceTypeInfo } = useGetDeviceTypeInfo();
  const { data: serviceClasses, isFetching: isFetchingServices } = useGetServiceClasses({ operatorId });
  const { data: subscribers, isFetching: isFetchingSubscribers } = useGetSubscribers({ operatorId });

  const isFetching = useMemo(
    () => isFetchingDeviceTypes || isFetchingDeviceTypeInfo || isFetchingServices || isFetchingSubscribers,
    [isFetchingDeviceTypes, isFetchingDeviceTypeInfo, isFetchingServices, isFetchingSubscribers],
  );

  const isLoaded = useMemo(
    () => deviceTypes && deviceTypeInfo && serviceClasses && subscribers,
    [deviceTypes, deviceTypeInfo, serviceClasses, subscribers],
  );

  const toResult = useMemo(
    () => ({
      deviceTypes,
      deviceTypeInfo,
      deviceClasses: deviceTypeInfo?.deviceClasses ?? [],
      deviceTypesByClass: deviceTypeInfo?.deviceTypesByClass ?? {},
      serviceClasses,
      subscribers,
      isFetching,
      isLoaded,
    }),
    [isFetching, isLoaded, deviceTypeInfo],
  );

  return toResult;
};

export default useOperatorChildren;
