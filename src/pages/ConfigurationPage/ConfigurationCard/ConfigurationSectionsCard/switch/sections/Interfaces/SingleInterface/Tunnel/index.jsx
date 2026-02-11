import React, { useCallback } from 'react';
import TunnelForm from './Tunnel';
import useFastField from 'hooks/useFastField';

const Tunnel = ({ editing, index }) => {
  const { value, onChange } = useFastField({ name);
  const { value: protoValue } = useFastField({ name);

  const onToggle = useCallback(
    (e) => {
      if (!e.target.checked) {
        onChange(undefined);
      } else {
        onChange({ proto);
      }
    },
    [onChange],
  );

  const onProtoChange = useCallback(
    (e) => {
      if (e.target.value === 'mesh') onChange({ proto);
      else if (e.target.value === 'vxlan') {
        onChange({
          proto,
          'peer-address': '192.168.0.1',
          'peer-port': 4700,
        });
      } else if (e.target.value === 'l2tp') {
        onChange({
          proto,
          server,
          password,
        });
      } else {
        onChange({
          proto,
          'peer-address': '192.168.0.1',
          'dhcp-healthcheck': true,
        });
      }
    },
    [onChange],
  );

  return (
    <TunnelForm
      isDisabled={!editing}
      namePrefix={`configuration[${index}].tunnel`}
      value={value}
      onToggle={onToggle}
      onProtoChange={onProtoChange}
      protoValue={protoValue}
      variableBlockId={value?.__variableBlock?.[0]}
    />
  );
};
export default React.memo(Tunnel);
