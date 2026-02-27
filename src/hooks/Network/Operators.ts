import { useToast } from '@chakra-ui/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import useDefaultPage from 'hooks/useDefaultPage';
import { DeviceRules } from 'models/Basic';
import { Note } from 'models/Note';
import { PageInfo } from 'models/Table';
import { axiosProv } from 'utils/axiosInstances';

export type CreateOperatorRequest = {
  deviceRules: DeviceRules;
  sourceIP: string[];
  registrationId: string;
  description?: string;
  firmwareRCOnly?: boolean;
  name: string;
  notes?: Note[];
};

export type UpdateOperatorRequest = {
  defaultOperator?: boolean;
  deviceRules?: DeviceRules;
  description?: string;
  firmwareRCOnly?: boolean;
  name?: string;
  notes?: Note[];
  registrationId?: string;
  sourceIP?: string[];
};

export type OperatorApiResponse = {
  created: number;
  defaultOperator: boolean;
  description?: string;
  deviceRules: DeviceRules;
  entityId?: string;
  extendedInfo?: Record<string, unknown>;
  firmwareRCOnly?: boolean;
  id: string;
  modified: number;
  name: string;
  notes: Note[];
  registrationId: string;
  sourceIP?: string[];
};

export const useGetOperatorCount = ({ enabled }: { enabled: boolean }) => {
  const { t } = useTranslation();
  const toast = useToast();

  return useQuery(
    ['get-operator-count'],
    () => axiosProv.get(`operator?countOnly=true`).then(({ data }) => data.count as number),
    {
      enabled,
      onError: (e: AxiosError) => {
        if (!toast.isActive('operator-fetching-error'))
          toast({
            id: 'operator-fetching-error',
            title: t('common.error'),
            description: t('crud.error_fetching_obj', {
              obj: t('operator.other'),
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

export const useGetAllOperators = () => {
  const { t } = useTranslation();
  const toast = useToast();

  return useQuery(
    ['get-all-operators'],
    () =>
      axiosProv
        .get(`operator?withExtendedInfo=true`)
        .then(({ data }: { data: { operators: OperatorApiResponse[] } }) => data.operators),
    {
      staleTime: 30000,
      keepPreviousData: true,
      onError: (e: AxiosError) => {
        if (!toast.isActive('get-operator-fetching-error'))
          toast({
            id: 'get-operator-fetching-error',
            title: t('common.error'),
            description: t('crud.error_fetching_obj', {
              obj: t('operator.other'),
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

export const useGetOperators = ({
  pageInfo,
  select,
  enabled,
  count,
}: {
  pageInfo?: PageInfo;
  select?: string[];
  enabled: boolean;
  count?: number;
}) => {
  const { t } = useTranslation();
  const toast = useToast();

  if (select !== undefined && select !== null) {
    return useQuery(
      ['get-operators-with-select', select],
      () =>
        select.length > 0
          ? axiosProv
              .get(`operator?withExtendedInfo=true&select=${select}`)
              .then(({ data }: { data: { operators: OperatorApiResponse[] } }) => data.operators)
          : ([] as OperatorApiResponse[]),
      {
        enabled,
        staleTime: 30000,
        keepPreviousData: true,
        onError: (e: AxiosError) => {
          if (!toast.isActive('get-operator-fetching-error'))
            toast({
              id: 'get-operator-fetching-error',
              title: t('common.error'),
              description: t('crud.error_fetching_obj', {
                obj: t('operator.other'),
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
  }

  return useQuery(
    ['get-operators-with-pagination', pageInfo, count],
    () =>
      axiosProv
        .get(
          `operator?withExtendedInfo=true&limit=${pageInfo?.limit ?? 10}&offset=${
            (pageInfo?.limit ?? 10) * (pageInfo?.index ?? 1)
          }`,
        )
        .then(({ data }: { data: { operators: OperatorApiResponse[] } }) => data.operators),
    {
      keepPreviousData: true,
      enabled,
      staleTime: 30000,
      onError: (e: AxiosError) => {
        if (!toast.isActive('get-operators-fetching-error'))
          toast({
            id: 'get-operators-fetching-error',
            title: t('common.error'),
            description: t('crud.error_fetching_obj', {
              obj: t('operator.other'),
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

export const useGetOperator = ({ enabled, id }: { enabled: boolean; id: string }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const goToDefaultPage = useDefaultPage();
  return useQuery(
    ['get-operator', id],
    () => axiosProv.get(`operator/${id}`).then(({ data }: { data: OperatorApiResponse }) => data),
    {
      enabled,
      onError: (e: AxiosError) => {
        if (!toast.isActive('opeator-fetching-error'))
          toast({
            id: 'operator-fetching-error',
            title: t('common.error'),
            description: t('crud.error_fetching_obj', {
              obj: t('operator.one'),
              e: e?.response?.data?.ErrorDescription,
            }),
            status: 'error',
            duration: 5000,
            isClosable: true,
            position: 'top-right',
          });
        goToDefaultPage();
      },
    },
  );
};

export const useCreateOperator = () =>
  useMutation((newOperator: CreateOperatorRequest) => axiosProv.post(`operator/1`, newOperator));

export const useUpdateOperator = ({ id }: { id: string }) =>
  useMutation((newOperator: UpdateOperatorRequest) => axiosProv.put(`operator/${id}`, newOperator));

export const useDeleteOperator = ({ id }: { id: string }) => useMutation(() => axiosProv.delete(`operator/${id}`));
