import { useQuery } from '@tanstack/react-query';
import { axiosFms } from 'utils/axiosInstances';

const useGetDeviceTypes = () =>
  useQuery(
    ['get-device-types'],
    () => axiosFms.get('/firmwares?deviceSet=true').then(({ data }) => data.deviceTypes ?? data),
    {
      staleTime: Infinity,
    },
  );

export const useGetDeviceTypeInfo = () =>
  useQuery(['get-device-type-info'], () => axiosFms.get('/firmwares?deviceSet=true').then(({ data }) => data), {
    staleTime: Infinity,
  });

export default useGetDeviceTypes;
