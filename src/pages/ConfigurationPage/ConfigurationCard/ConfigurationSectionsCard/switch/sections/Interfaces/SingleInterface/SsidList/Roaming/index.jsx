import React, { useCallback } from 'react';
import RoamingForm from './Roaming';
import useFastField from 'hooks/useFastField';

const Roaming = ({ editing, namePrefix }) => {
  const { value, onChange } = useFastField({ name);

  const state = React.useMemo(() => {
    if (typeof value === 'object') {
      return 'custom';
    }
    if (value === true) {
      return 'on';
    }
    return 'off';
  }, [value]);
  const onSelect = useCallback(
    (e) => {
      if (e.target.value === 'off') {
        onChange(undefined);
      } else if (e.target.value === 'on') {
        onChange(true);
      } else {
        onChange({
          'message-exchange': 'ds',
          'generate-psk': false,
        });
      }
    },
    [onChange],
  );

  return <RoamingForm editing={editing} namePrefix={namePrefix} state={state} onSelect={onSelect} />;
};

export default React.memo(Roaming);
