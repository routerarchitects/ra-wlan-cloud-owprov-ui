import { useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosFms } from 'utils/axiosInstances';

export const useGetDeviceTypeInfo = () =>
  useQuery(['get-device-type-info'], () => axiosFms.get('/firmwares?deviceSet=true').then(({ data }) => data), {
    staleTime: Infinity,
  });

const useGetDeviceTypes = () => {
  const queryClient = useQueryClient();
  return useQuery(
    ['get-device-type-info'],
    () => axiosFms.get('/firmwares?deviceSet=true').then(({ data }) => data),
    {
      staleTime: Infinity,
      select: (data) => data?.deviceTypes ?? data,
      initialData: () => queryClient.getQueryData(['get-device-type-info']),
    },
  );
};

export default useGetDeviceTypes;
