import React from 'react';
import { Box, Center, Flex, Heading, Spacer, Spinner, useBoolean } from '@chakra-ui/react';
import Actions from './Actions';
import DeleteVenuePopover from './DeletePopover';
import EditSubscriberForm from './Form';
import SuspendedNotification from './SuspendedNotification';
import WaitingForVerification from './WaitingForVerification';
import RefreshButton from 'components/Buttons/RefreshButton';
import SaveButton from 'components/Buttons/SaveButton';
import ToggleEditButton from 'components/Buttons/ToggleEditButton';
import Card from 'components/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import LoadingOverlay from 'components/LoadingOverlay';
import { useGetOperator } from 'hooks/Network/Operators';
import { useGetSubscriber } from 'hooks/Network/Subscribers';
import useFormRef from 'hooks/useFormRef';

interface Props {
  id: string;
}

const SubscriberCard: React.FC<Props> = ({ id }) => {
  const [editing, setEditing] = useBoolean();
  const { data: subscriber, refetch, isFetching } = useGetSubscriber({ id });
  const isWaitingForEmailVerification = !!subscriber?.waitingForEmailCheck;
  const { data: operator } = useGetOperator({
    enabled: isWaitingForEmailVerification && !!subscriber?.owner,
    id: subscriber?.owner ?? '',
  });
  const { form, formRef } = useFormRef();

  return (
    <Card mb={4}>
      <CardHeader>
        <Heading size="md">{subscriber?.name}</Heading>
        <SuspendedNotification id={id} refresh={refetch} isSuspended={subscriber?.suspended} isDisabled={editing} />
        <WaitingForVerification
          subscriber={subscriber}
          refresh={refetch}
          isWaitingForEmailVerification={isWaitingForEmailVerification}
          isDisabled={editing}
          registrationId={operator?.registrationId}
        />
        <Spacer />
        <Box>
          <DeleteVenuePopover isDisabled={editing || isFetching} subscriber={subscriber} />
          <SaveButton
            onClick={form.submitForm}
            isLoading={form.isSubmitting}
            isDisabled={!editing || !form.isValid || !form.dirty}
            hidden={!editing}
            ml={2}
          />
          <ToggleEditButton
            toggleEdit={setEditing.toggle}
            isEditing={editing}
            isDisabled={isFetching}
            isDirty={form.dirty}
            ml={2}
          />
          <Actions subscriber={subscriber} refresh={refetch} isDisabled={editing} />
          <RefreshButton onClick={refetch} isFetching={isFetching} isDisabled={editing} ml={2} />
        </Box>
      </CardHeader>
      <CardBody>
        {!subscriber ? (
          <Center w="100%">
            <Spinner size="xl" />
          </Center>
        ) : (
          <LoadingOverlay isLoading={isFetching}>
            <EditSubscriberForm
              editing={editing}
              subscriber={subscriber}
              stopEditing={setEditing.off}
              formRef={formRef}
            />
          </LoadingOverlay>
        )}
      </CardBody>
    </Card>
  );
};

export default React.memo(SubscriberCard);
