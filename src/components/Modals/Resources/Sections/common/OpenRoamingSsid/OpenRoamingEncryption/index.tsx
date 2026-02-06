import React, { useCallback, useMemo } from 'react';
import OpenRoamingEncryptionForm from './Encryption';
import useFastField from 'hooks/useFastField';
import {
  ENCRYPTION_PROTOS_REQUIRE_IEEE,
  ENCRYPTION_PROTOS_REQUIRE_KEY,
  NO_MULTI_PROTOS,
} from 'pages/ConfigurationPage/ConfigurationCard/ConfigurationSectionsCard/ap/sections/InterfaceSection/interfacesConstants';

const OpenRoamingEncryption = ({
  editing,
  ssidName,
  namePrefix,
  radiusPrefix,
  isPasspoint,
}: {
  editing: boolean;
  namePrefix: string;
  radiusPrefix: string;
  ssidName: string;
  isPasspoint?: boolean;
}) => {
  const { value: encryptionValue, onChange: onEncryptionChange } = useFastField({ name: namePrefix });
  const { value: radiusValue, onChange: onRadiusChange } = useFastField({ name: radiusPrefix });
  const { onChange: onMultiPskChange } = useFastField({ name: `${ssidName}.multi-psk` });

  const onProtoChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newEncryption: { proto: string; key?: string; ieee80211w?: string } = {
        proto: e.target.value,
      };
      if (e.target.value === 'none') {
        onEncryptionChange({ proto: 'none' });
        onRadiusChange(undefined);
      } else {
        if (NO_MULTI_PROTOS.includes(e.target.value)) onMultiPskChange(undefined);
        if (ENCRYPTION_PROTOS_REQUIRE_KEY.includes(e.target.value)) newEncryption.key = 'YOUR_SECRET';
        if (ENCRYPTION_PROTOS_REQUIRE_IEEE.includes(e.target.value)) newEncryption.ieee80211w = 'required';
        onEncryptionChange(newEncryption);
      }
    },
    [isPasspoint],
  );

  const { isKeyNeeded, needIeee } = useMemo(
    () => ({
      isKeyNeeded: ENCRYPTION_PROTOS_REQUIRE_KEY.includes(encryptionValue?.proto ?? ''),
      needIeee: ENCRYPTION_PROTOS_REQUIRE_IEEE.includes(encryptionValue?.proto ?? ''),
    }),
    [encryptionValue?.proto, radiusValue !== undefined],
  );

  return (
    <OpenRoamingEncryptionForm
      editing={editing}
      namePrefix={namePrefix}
      radiusPrefix={radiusPrefix}
      onProtoChange={onProtoChange}
      needIeee={needIeee}
      isKeyNeeded={isKeyNeeded}
      isPasspoint={isPasspoint}
    />
  );
};

export default React.memo(OpenRoamingEncryption);
