import React, { useCallback, useMemo, useState } from 'react';
import { Box, Flex, Heading, Spacer } from '@chakra-ui/react';
import { UseQueryResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import Actions from './Actions';
import RefreshButton from 'components/Buttons/RefreshButton';
import Card from 'components/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import ColumnPicker from 'components/ColumnPicker';
import DataTable from 'components/DataTable';
import FormattedDate from 'components/FormattedDate';
import CreateOperatorModal from 'components/Modals/Operator/CreateOperatorModal';
import { OperatorApiResponse, useGetOperatorCount, useGetOperators } from 'hooks/Network/Operators';
import useControlledTable from 'hooks/useControlledTable';
import { Column } from 'models/Table';

const OperatorsTable = () => {
  const { t } = useTranslation();
  const {
    count,
    data: operators,
    isFetching,
    setPageInfo,
    refetchCount,
    refetchData,
  } = useControlledTable({
    useCount: useGetOperatorCount as (props: unknown) => UseQueryResult,
    useGet: useGetOperators as (props: unknown) => UseQueryResult,
  });
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const navigate = useNavigate();

  const handleGoToClick = (operator: { id: string }) => navigate(`/operators/${operator.id}`);

  const memoizedActions = useCallback(
    (cell) => <Actions cell={cell.row} refreshTable={() => { refetchCount(); refetchData(); }} key={uuid()} />,
    [refetchCount, refetchData],
  );
  const memoizedDate = useCallback((cell, key) => <FormattedDate date={cell.row.values[key]} key={uuid()} />, []);

  const columns: Column<OperatorApiResponse>[] = useMemo(
    (): Column<OperatorApiResponse>[] => [
      {
        id: 'name',
        Header: t('common.name'),
        Footer: '',
        accessor: 'name',
        customMaxWidth: '200px',
        customWidth: 'calc(15vh)',
        customMinWidth: '150px',
      },
      {
        id: 'description',
        Header: t('common.description'),
        Footer: '',
        accessor: 'description',
        disableSortBy: true,
      },
      {
        id: 'modified',
        Header: t('common.modified'),
        Footer: '',
        accessor: 'modified',
        Cell: ({ cell }) => memoizedDate(cell, 'modified'),
        customMinWidth: '150px',
        customWidth: '150px',
      },
      {
        id: 'actions',
        Header: t('common.actions'),
        Footer: '',
        accessor: 'Id',
        customWidth: '80px',
        Cell: ({ cell }) => memoizedActions(cell),
        disableSortBy: true,
        alwaysShow: true,
      },
    ],
    [t],
  );

  return (
    <Card>
      <CardHeader>
        <Heading size="md" mt={1}>{`${count ?? 0} ${t('operator.operator', { count: count ?? 0 })}`}</Heading>
        {/* <Spacer /> */}
        <Flex flexDirection="row" alignItems="center" ml='auto' flexWrap={{base: 'wrap', md: 'nowrap'}}>
          <Box ms="auto" display="flex">
            <ColumnPicker
              columns={columns}
              hiddenColumns={hiddenColumns}
              setHiddenColumns={setHiddenColumns}
              preference="provisioning.operatorTable.hiddenColumns"
            />
            <CreateOperatorModal refresh={() => { refetchCount(); refetchData(); }} />
            <RefreshButton onClick={() => { refetchCount(); refetchData(); }} isFetching={isFetching} ml={2} />
          </Box>
        </Flex>
      </CardHeader>
      <CardBody>
        <Box overflowX="auto" w="100%">
          <DataTable<OperatorApiResponse>
            columns={
              columns as {
                id: string;
                Header: string;
                Footer: string;
                accessor: string;
              }[]
            }
            data={(operators as unknown as OperatorApiResponse[]) ?? []}
            sortBy={[
              {
                id: 'name',
                desc: false,
              },
            ]}
            isLoading={isFetching}
            isManual
            hiddenColumns={hiddenColumns}
            obj={t('operator.other')}
            count={count || 0}
            // @ts-ignore
            setPageInfo={setPageInfo}
            fullScreen
            saveSettingsId="operators.table"
            onRowClick={handleGoToClick}
            isRowClickable={() => true}
          />
        </Box>
      </CardBody>
    </Card>
  );
};

export default OperatorsTable;
