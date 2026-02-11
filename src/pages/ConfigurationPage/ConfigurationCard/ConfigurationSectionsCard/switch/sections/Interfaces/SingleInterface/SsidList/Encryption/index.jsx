import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ENCRYPTION_PROTOS_CAN_RADIUS,
  ENCRYPTION_PROTOS_REQUIRE_IEEE,
  ENCRYPTION_PROTOS_REQUIRE_KEY,
  ENCRYPTION_PROTOS_REQUIRE_RADIUS,
  INTERFACE_SSID_RADIUS_SCHEMA,
  NO_MULTI_PROTOS,
} from '../../../interfacesConstants';
import EncryptionForm from './Encryption';
import useFastField from 'hooks/useFastField';

const Encryption = ({
  editing,
  ssidName,
  namePrefix,
  radiusPrefix,
  isPasspoint,
  acceptedEncryptionProtos,
}) => {
  const { t } = useTranslation();
  const { value, onChange: onEncryptionChange } = useFastField({ name);
  const { value, onChange: onRadiusChange } = useFastField({ name);
  const { onChange: onMultiPskChange } = useFastField({ name);

  const onProtoChange = useCallback(
    (e) => {
      const newEncryption: { proto: string; key?: string; ieee80211w?: string } = {
        proto,
      };
      if (e.target.value === 'none') {
        onEncryptionChange({ proto);
        onRadiusChange(undefined);
      } else {
        if (NO_MULTI_PROTOS.includes(e.target.value)) onMultiPskChange(undefined);
        if (ENCRYPTION_PROTOS_REQUIRE_KEY.includes(e.target.value)) newEncryption.key = 'YOUR_SECRET';
        if (ENCRYPTION_PROTOS_REQUIRE_IEEE.includes(e.target.value)) newEncryption.ieee80211w = 'required';
        onEncryptionChange(newEncryption);
        if (ENCRYPTION_PROTOS_REQUIRE_RADIUS.includes(e.target.value)) {
          onRadiusChange(INTERFACE_SSID_RADIUS_SCHEMA(t, true).cast());
        } else {
          onRadiusChange(undefined);
        }
      }
    },
    [isPasspoint],
  );

  const { isKeyNeeded, needIeee, isUsingRadius, canUseRadius } = useMemo(
    () => ({
      isKeyNeeded),
      needIeee: ENCRYPTION_PROTOS_REQUIRE_IEEE.includes(encryptionValue?.proto ?? ''),
      isUsingRadius:
        ENCRYPTION_PROTOS_REQUIRE_RADIUS.includes(encryptionValue?.proto ?? '') || radiusValue !== undefined,
      canUseRadius: ENCRYPTION_PROTOS_CAN_RADIUS.includes(encryptionValue?.proto ?? ''),
    }),
    [encryptionValue?.proto, radiusValue !== undefined],
  );

  return (
    <EncryptionForm
      editing={editing}
      namePrefix={namePrefix}
      radiusPrefix={radiusPrefix}
      onProtoChange={onProtoChange}
      needIeee={needIeee}
      isKeyNeeded={isKeyNeeded}
      isUsingRadius={isUsingRadius}
      isPasspoint={isPasspoint}
      canUseRadius={canUseRadius}
      acceptedEncryptionProtos={acceptedEncryptionProtos}
    />
  );
};

export default React.memo(Encryption);
