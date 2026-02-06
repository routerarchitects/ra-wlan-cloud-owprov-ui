import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useFormikContext } from 'formik';
import { useTranslation } from 'react-i18next';
import SelectField from 'components/FormFields/SelectField';

const propTypes = {
  deviceClasses: PropTypes.arrayOf(PropTypes.string).isRequired,
  deviceTypesByClass: PropTypes.instanceOf(Object).isRequired,
  isEditing: PropTypes.bool,
};

const defaultProps = {
  isEditing: true,
};

const DeviceTypeFields = ({ deviceClasses, deviceTypesByClass, isEditing }) => {
  const { t } = useTranslation();
  const { values, setFieldValue } = useFormikContext();
  const selectedGroup = values.deviceGroup;
  const typesForGroup = useMemo(
    () => (selectedGroup ? deviceTypesByClass[selectedGroup] ?? [] : []),
    [selectedGroup, deviceTypesByClass],
  );

  const deviceTypeOptions = useMemo(
    () =>
      typesForGroup.map((deviceType) => ({
        value: deviceType,
        label: deviceType,
      })),
    [typesForGroup],
  );

  useEffect(() => {
    if (!selectedGroup) {
      setFieldValue('deviceType', '');
      return;
    }
    if (!typesForGroup.includes(values.deviceType)) {
      setFieldValue('deviceType', typesForGroup[0] ?? '');
    }
  }, [selectedGroup, typesForGroup, values.deviceType, setFieldValue]);

  return (
    <>
      <SelectField
        name="deviceGroup"
        label="Device Group"
        options={deviceClasses.map((deviceGroup) => ({
          value: deviceGroup,
          label: deviceGroup,
        }))}
        isRequired
        isDisabled={!isEditing}
      />
      <SelectField
        name="deviceType"
        label={t('inventory.device_type')}
        options={deviceTypeOptions}
        isRequired
        isDisabled={!isEditing || !selectedGroup}
      />
    </>
  );
};

DeviceTypeFields.propTypes = propTypes;
DeviceTypeFields.defaultProps = defaultProps;

export default DeviceTypeFields;
