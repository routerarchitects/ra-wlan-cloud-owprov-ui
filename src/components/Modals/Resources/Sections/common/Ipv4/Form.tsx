import * as React from 'react';
import { useTranslation } from 'react-i18next';
import useFastField from 'hooks/useFastField';
import { INTERFACE_IPV4_SCHEMA } from 'pages/ConfigurationPage/ConfigurationCard/ConfigurationSectionsCard/ap/sections/InterfaceSection/interfacesConstants';
import Ipv4Form from 'pages/ConfigurationPage/ConfigurationCard/ConfigurationSectionsCard/ap/sections/InterfaceSection/SingleInterface/IpV4/Ipv4';

const TunnelIpv4Form = ({ isDisabled }: { isDisabled?: boolean }) => {
  const { t } = useTranslation();
  const { value, onChange } = useFastField({ name: 'editing' });
  const { value: role } = useFastField({ name: `editing.role` });

  const { ipv4 } = React.useMemo(
    () => ({
      ipv4: value?.addressing ?? '',
    }),
    [value],
  );

  const onIpv4Change = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (e.target.value === '') {
        onChange(undefined);
      } else if (e.target.value === 'dynamic') onChange({ addressing: 'dynamic' });
      else {
        onChange({
          ...INTERFACE_IPV4_SCHEMA(t, true).cast(),
          'port-forward': undefined,
          addressing: 'static',
        });
      }
    },
    [role],
  );

  return <Ipv4Form ipv4={ipv4} role={role} isDisabled={isDisabled} namePrefix="editing" onChange={onIpv4Change} />;
};

export default TunnelIpv4Form;
