import React, { useEffect } from 'react';
import { useToast } from '@chakra-ui/react';
import { useField } from 'formik';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Form from './Form';
import LocationPickerCreatorModal from './Modal';
import SelectField from 'components/FormFields/SelectField';
import { useGetEntity } from 'hooks/Network/Entity';
import { useGetAllLocations, useGetSelectLocations } from 'hooks/Network/Locations';

const propTypes = {
  locationName: PropTypes.string.isRequired,
  createLocationName: PropTypes.string.isRequired,
  editing: PropTypes.bool.isRequired,
  isModal: PropTypes.bool,
  venueId: PropTypes.string,
  entityId: PropTypes.string,
  hideLabel: PropTypes.bool,
};

const defaultProps = {
  isModal: false,
  entityId: null,
  venueId: null,
  hideLabel: false,
};

const LocationPickerCreator = ({
  locationName,
  createLocationName,
  editing,
  isModal,
  entityId,
  venueId,
  hideLabel,
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [{ value: location }, , { setValue: setLocation }] = useField(locationName);
  const [{ value: newLocation }, , { setValue: setNewLocation }] = useField(createLocationName);
  const { data: locations } = useGetAllLocations({ t, toast, venueId });
  const { data: entity } = useGetEntity({ id: entityId });
  const { data: locationsFromEntity } = useGetSelectLocations({
    t,
    toast,
    select: entity?.locations,
    enabled: entity !== undefined,
  });

  const cancelLocationCreation = () => {
    setLocation('');
  };

  const getCreateLabel = () => {
    if (!newLocation) return 'New Location';
    return newLocation?.name;
  };

  const getOptions = () => {
    if (locationsFromEntity) {
      return locationsFromEntity.map((loc) => ({
        value: loc.id ?? loc.uuid,
        label: `${loc.name}${loc.description ? `: ${loc.description}` : ''}`,
      }));
    }
    if (locations) {
      return locations.map((loc) => ({
        value: loc.id ?? loc.uuid,
        label: `${loc.name}${loc.description ? `: ${loc.description}` : ''}`,
      }));
    }
    return [];
  };

  useEffect(() => {
    if (location === 'CREATE_NEW') {
      if (!isModal) {
        setNewLocation({
          name: '',
          description: '',
          type: 'SERVICE',
          timezone: '',
          addressLineOne: '',
          addressLineTwo: '',
          city: '',
          state: '',
          postal: '',
          country: '',
          buildingName: '',
          mobiles: [],
          phones: [],
          geoCode: '',
          note: '',
        });
      }
    } else {
      setNewLocation(undefined);
    }
  }, [location]);

  return (
    <>
      <SelectField
        name={locationName}
        label={t('locations.one')}
        isDisabled={!editing}
        options={[
          { value: '', label: t('common.none') },
          { value: 'CREATE_NEW', label: getCreateLabel() },
          { value: 'none', label: '──────────────────', isDisabled: true },
          ...getOptions(),
        ]}
        w="unset"
        isLabelHidden={hideLabel}
      />
      {location === 'CREATE_NEW' && newLocation && !isModal && <Form name={createLocationName} />}
      {location === 'CREATE_NEW' && isModal && (
        <LocationPickerCreatorModal setLocation={setNewLocation} reset={cancelLocationCreation} />
      )}
    </>
  );
};

LocationPickerCreator.propTypes = propTypes;
LocationPickerCreator.defaultProps = defaultProps;

export default React.memo(LocationPickerCreator);
