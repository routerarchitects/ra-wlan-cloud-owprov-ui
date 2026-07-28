import { useToast } from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';
import useDefaultPage from '../useDefaultPage';
import { AxiosError } from 'models/Axios';
import { VenueApiResponse } from 'models/Venue';
import { axiosProv } from 'utils/axiosInstances';

const getVenuesBatch = async (limit: number, offset: number) =>
  axiosProv
    .get(`venue?withExtendedInfo=true&offset=${offset}&limit=${limit}`)
    .then(({ data }) => data.venues as VenueApiResponse[]);

const getAllVenues = async () => {
  const limit = 500;
  let offset = 0;
  let data: VenueApiResponse[] = [];
  let lastResponse: VenueApiResponse[] = [];
  do {
    // eslint-disable-next-line no-await-in-loop
    lastResponse = await getVenuesBatch(limit, offset);
    data = data.concat(lastResponse);
    offset += limit;
  } while (lastResponse.length === limit);
  return data;
};

export const useGetVenues = () => {
  const { t } = useTranslation();
  const toast = useToast();

  return useQuery(['get-venues'], () => getAllVenues(), {
    staleTime: 30000,
    onError: (e: AxiosError) => {
      if (!toast.isActive('venues-fetching-error'))
        toast({
          id: 'venues-fetching-error',
          title: t('common.error'),
          description: t('crud.error_fetching_obj', {
            obj: t('venues.title'),
            e: e?.response?.data?.ErrorDescription,
          }),
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top-right',
        });
    },
  });
};

export const useGetSelectVenues = ({ select }: { select: string[] }) => {
  const { t } = useTranslation();
  const toast = useToast();

  return useQuery(
    ['get-venues', select],
    () =>
      select.length === 0
        ? []
        : axiosProv.get(`venue?withExtendedInfo=true&select=${select}`).then(({ data }) => data.venues),
    {
      staleTime: 100 * 1000,
      onError: (e: AxiosError) => {
        if (!toast.isActive('venues-fetching-error'))
          toast({
            id: 'venues-fetching-error',
            title: t('common.error'),
            description: t('crud.error_fetching_obj', {
              obj: t('venues.title'),
              e: e?.response?.data?.ErrorDescription,
            }),
            status: 'error',
            duration: 5000,
            isClosable: true,
            position: 'top-right',
          });
      },
    },
  );
};

export const useGetVenue = ({ id }: { id?: string }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const goToDefaultPage = useDefaultPage();

  return useQuery(
    ['get-venue', id],
    () => axiosProv.get(`venue/${id}?withExtendedInfo=true`).then(({ data }: { data: VenueApiResponse }) => data),
    {
      enabled: id !== undefined && id !== '',
      keepPreviousData: true,
      staleTime: 1000 * 5,
      onError: (e: AxiosError) => {
        if (!toast.isActive('venue-fetching-error'))
          toast({
            id: 'venue-fetching-error',
            title: t('common.error'),
            description: t('crud.error_fetching_obj', {
              obj: t('venues.one'),
              e: e?.response?.data?.ErrorDescription,
            }),
            status: 'error',
            duration: 5000,
            isClosable: true,
            position: 'top-right',
          });
        if (e.response?.data?.ErrorCode === 404) goToDefaultPage();
      },
    },
  );
};

export const useCreateVenue = () =>
  useMutation(({ params, createObjects }: { params: unknown; createObjects: unknown }) =>
    axiosProv.post('venue/0', createObjects ? { ...(params as Record<string, unknown>), createObjects } : params),
  );

export const useUpdateVenue = ({ id }: { id: string }) => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ params, createObjects }: { params: Partial<VenueApiResponse>; createObjects?: unknown }) =>
      axiosProv
        .put(`venue/${id}`, createObjects ? { ...params, createObjects } : params)
        .then((res: { data: VenueApiResponse }) => res),
    {
      onSuccess: ({ data }) => {
        queryClient.invalidateQueries(['get-entity-tree']);
        queryClient.invalidateQueries(['get-venues']);
        queryClient.invalidateQueries(['get-all-locations', id]);
        queryClient.setQueryData(['get-venue', id], data);
      },
    },
  );
};

export const useUpdateVenueDevices = ({ id }: { id: string }) => {
  const { t } = useTranslation();
  const toast = useToast();

  return useMutation(() => axiosProv.put(`venue/${id}?updateAllDevices=true`, {}), {
    onSuccess: ({ data }) => {
      toast({
        id: 'venue-update-devices-success',
        title: t('common.success'),
        description: t('venues.successfully_update_devices', { num: data.serialNumbers.length }),
        status: 'success',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    },
    onError: (e: AxiosError) => {
      toast({
        id: uuid(),
        title: t('common.error'),
        description: t('crud.error_create_obj', {
          obj: t('venues.error_update_devices'),
          e: e?.response?.data?.ErrorDescription,
        }),
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    },
  });
};

export const useRebootVenueDevices = ({ id }: { id: string }) => {
  const { t } = useTranslation();
  const toast = useToast();

  return useMutation(() => axiosProv.put(`venue/${id}?rebootAllDevices=true`, {}), {
    onSuccess: ({ data }) => {
      toast({
        id: 'venue-reboot-devices-success',
        title: t('common.success'),
        description: t('venues.successfully_reboot_devices', { num: data.serialNumbers.length }),
        status: 'success',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    },
    onError: (e: AxiosError) => {
      toast({
        id: uuid(),
        title: t('common.error'),
        description: t('crud.error_create_obj', {
          obj: t('venues.error_update_devices'),
          e: e?.response?.data?.ErrorDescription,
        }),
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    },
  });
};

export const useUpgradeVenueDevices = () => {
  const { t } = useTranslation();
  const toast = useToast();

  return useMutation(
    (data: { id: string; revision: string }) =>
      axiosProv.put(`venue/${data.id}?upgradeAllDevices=true&revision=${encodeURIComponent(data.revision) || ''}`, {}),
    {
      onSuccess: () => {
        toast({
          id: 'venue-upgrade-devices-success',
          title: t('common.success'),
          description: t('venues.upgrade_all_devices_success'),
          status: 'success',
          duration: 5000,
          isClosable: true,
          position: 'top-right',
        });
      },
      onError: (e: AxiosError) => {
        toast({
          id: uuid(),
          title: t('common.error'),
          description: e?.response?.data?.ErrorDescription,
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top-right',
        });
      },
    },
  );
};

export const useDeleteVenue = () => useMutation((id) => axiosProv.delete(`venue/${id}`));

export const useAddVenueContact = ({ id, originalContacts = [] }: { id: string; originalContacts?: string[] }) => {
  const queryClient = useQueryClient();
  return useMutation(
    (newContact: string) =>
      axiosProv.put(`venue/${id}`, {
        contacts: [...originalContacts, newContact],
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['get-venue', id]);
      },
    },
  );
};
export const useRemoveVenueContact = ({ id, originalContacts = [] }: { id: string; originalContacts?: string[] }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation(
    (contactToRemove: string) =>
      axiosProv.put(`venue/${id}`, {
        contacts: originalContacts.filter((contact) => contact !== contactToRemove),
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['get-venue', id]);
        toast({
          id: `contact-remove-success`,
          title: t('common.success'),
          description: t('venues.successfully_removed_contact'),
          status: 'success',
          duration: 5000,
          isClosable: true,
          position: 'top-right',
        });
      },
      onError: (e: AxiosError) => {
        toast({
          id: 'contact-remove-error',
          title: t('common.error'),
          description: t('venues.error_remove_contact', {
            e: e?.response?.data?.ErrorDescription,
          }),
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top-right',
        });
      },
    },
  );
};

type Release = {
  date: number;
  revision: string;
};
const getVenueUpgradeAvailableFirmware = (id: string) =>
  axiosProv.put(`venue/${id}?upgradeAllDevices=true&revisionsAvailable=true`, {}).then(
    (res: {
      data: {
        releases: Release[];
        releasesCandidates: Release[];
        developmentReleases: Release[];
      };
    }) => res.data,
  );

export const useGetVenueUpgradeAvailableFirmware = ({ id, enabled }: { id: string; enabled?: boolean }) =>
  useQuery(['venue', id, 'availableFirmware'], () => getVenueUpgradeAvailableFirmware(id), {
    enabled,
  });
