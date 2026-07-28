import * as React from 'react';
import { Box, Heading, Icon, Text, Tooltip, useColorModeValue, useDisclosure } from '@chakra-ui/react';
import { Wrapper } from '@googlemaps/react-wrapper';
import { Globe } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { GoogleMap } from 'components/GoogleMap';
import { GoogleMapMarker } from 'components/GoogleMap/Marker';
import { Modal } from 'components/Modals/Modal';
import TIMEZONE_LIST from 'constants/timezoneList';
import { useGetLocation } from 'hooks/Network/Locations';
import { useGetSystemSecret } from 'hooks/Network/Secrets';

type Props = {
  locationId: string;
};

const LocationDisplayButton = ({ locationId }: Props) => {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const getGoogleApiKey = useGetSystemSecret({ secret: 'google.maps.apikey' });
  const iconColor = useColorModeValue('blue.500', 'blue.200');
  const getLocation = useGetLocation({ id: locationId, enabled: locationId !== '' });

  const parsedLocation: google.maps.LatLngLiteral | undefined = React.useMemo(() => {
    if (!getLocation.data?.geoCode || getLocation.data.geoCode.length === 0) return undefined;
    try {
      const obj: { lat: number; lng: number } = JSON.parse(getLocation.data.geoCode);

      return {
        lat: obj.lat,
        lng: obj.lng,
      };
    } catch (e) {
      return undefined;
    }
  }, [getLocation.data?.geoCode]);

  const timezoneLabel = React.useMemo(() => {
    if (!getLocation.data?.timezone) return undefined;
    const match = TIMEZONE_LIST.find((tz) => tz.value === getLocation.data?.timezone);
    return match ? match.label : getLocation.data.timezone;
  }, [getLocation.data?.timezone]);

  if (!getLocation.data) {
    return null;
  }

  const addressString = [
    ...getLocation.data.addressLines.filter((address) => address.length > 0),
    getLocation.data.city,
    getLocation.data.state,
    getLocation.data.postal,
    getLocation.data.country,
  ]
    .filter((part) => part && part.trim() !== '')
    .join(', ');

  return (
    <>
      <Tooltip label={`${t('common.view')} ${t('locations.one')}`}>
        <Icon as={Globe} mt={1} boxSize={8} onClick={onOpen} color={iconColor} cursor="pointer" />
      </Tooltip>
      <Modal isOpen={isOpen} onClose={onClose} title={getLocation.data?.name ?? t('locations.one')}>
        <Box w="100%" h="100%">
          {addressString.length > 0 ? <Heading size="sm">{addressString}</Heading> : null}
          {timezoneLabel ? (
            <Text mt={addressString.length > 0 ? 2 : 0} fontSize="sm">
              <Text as="span" fontWeight="bold">{t('locations.timezone')}:</Text> {timezoneLabel}
            </Text>
          ) : null}
          {parsedLocation && getGoogleApiKey.data ? (
            <Box h="500px" my={4}>
              <Wrapper apiKey={getGoogleApiKey.data.value}>
                <GoogleMap center={parsedLocation} style={{ flexGrow: '1', height: '100%' }} zoom={10}>
                  <GoogleMapMarker position={parsedLocation} />
                </GoogleMap>
              </Wrapper>
            </Box>
          ) : null}
        </Box>
      </Modal>
    </>
  );
};

export default LocationDisplayButton;
