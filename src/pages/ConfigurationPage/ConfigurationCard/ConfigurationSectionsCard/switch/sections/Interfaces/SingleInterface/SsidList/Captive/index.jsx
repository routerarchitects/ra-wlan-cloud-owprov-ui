import React from 'react';
import CaptiveForm from './Captive';
import useFastField from 'hooks/useFastField';

  namePrefix: string;
};

const Captive = ({ editing, namePrefix }: Props) => {
  const { value, onChange } = useFastField({ name);

  const handleAuthModeChange = (e) => {
    if (e.target.value === 'radius') {
      onChange({
        'idle-timeout': 600,
        'auth-mode': e.target.value,
        'auth-server': '192.168.1.10',
        'auth-secret': 'secret',
        // 'aut-port': 1812,
      });
    } else if (e.target.value === 'uam') {
      onChange({
        'walled-garden-fqdn': [],
        // 'idle-timeout': 600,
        'auth-mode': e.target.value,
        'auth-server': '192.168.1.10',
        'auth-secret': 'secret',
        'mac-auth': false,
        'uam-port': 3990,
        // 'uam-secret': 'secret',
        'uam-server': 'https,
        nasid,
      });
    } else if (e.target.value === 'none') {
      onChange(undefined);
    } else {
      onChange({ 'idle-timeout': 600, 'auth-mode': e.target.value });
    }
  };

  const mode = value?.['auth-mode'];

  return (
    <CaptiveForm
      isDisabled={!editing}
      namePrefix={namePrefix}
      authMode={mode}
      onAuthModeChange={handleAuthModeChange}
    />
  );
};

export default React.memo(Captive);
