import * as React from 'react';
import useFastField from 'hooks/useFastField';
import TunnelForm from 'pages/ConfigurationPage/ConfigurationCard/ConfigurationSectionsCard/ap/sections/InterfaceSection/SingleInterface/Tunnel/Tunnel';

const TunnelResourceForm = ({ isDisabled }: { isDisabled?: boolean }) => {
  const { value, onChange } = useFastField({ name: `editing` });

  const onProtoChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (e.target.value === 'mesh') onChange({ proto: 'mesh' });
      else if (e.target.value === 'vxlan') {
        onChange({
          proto: 'vxlan',
          'peer-address': '192.168.0.1',
          'peer-port': 4700,
        });
      } else if (e.target.value === 'l2tp') {
        onChange({
          proto: 'l2tp',
          server: '192.168.0.1',
          password: 'YOUR_PASSWORD',
        });
      } else {
        onChange({
          proto: 'gre',
          'peer-address': '192.168.0.1',
          'dhcp-healthcheck': true,
        });
      }
    },
    [onChange],
  );

  return (
    <TunnelForm
      isDisabled={isDisabled}
      namePrefix="editing"
      value={value}
      onProtoChange={onProtoChange}
      protoValue={value?.proto}
    />
  );
};

export default TunnelResourceForm;
