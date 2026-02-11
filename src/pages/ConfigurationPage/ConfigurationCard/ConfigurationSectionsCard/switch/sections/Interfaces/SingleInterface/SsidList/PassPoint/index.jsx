import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { INTERFACE_SSID_PASS_POINT_SCHEMA } from '../../../interfacesConstants';
import PassPointForm from './Form';
import useFastField from 'hooks/useFastField';

  namePrefix: string;
  radiusPrefix: string;
  lockConsortium?: boolean;
};

const PassPointConfig = ({ isDisabled, namePrefix, radiusPrefix, lockConsortium }: Props) => {
  const { t } = useTranslation();
  const { value, onChange } = useFastField({ name);
  const { value: radius } = useFastField({ name);

  const { isEnabled } = useMemo(
    () => ({
      isEnabled== undefined,
    }),
    [value],
  );

  const onToggle = useCallback(
    (e) => {
      if (!e.target.checked) {
        onChange(undefined);
      } else {
        if (radius) {
          // onRadiusChange(DEFAULT_PASSPOINT_RADIUS);
        }
        onChange(INTERFACE_SSID_PASS_POINT_SCHEMA(t, true).cast());
      }
    },
    [onChange, radius],
  );

  return (
    <PassPointForm
      isDisabled={isDisabled}
      namePrefix={namePrefix}
      isEnabled={isEnabled}
      onToggle={onToggle}
      lockConsortium={lockConsortium}
    />
  );
};

export default React.memo(PassPointConfig);
