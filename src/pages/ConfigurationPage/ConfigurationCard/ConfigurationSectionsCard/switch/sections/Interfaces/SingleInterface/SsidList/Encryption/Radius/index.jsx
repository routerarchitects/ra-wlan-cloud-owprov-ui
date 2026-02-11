import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { INTERFACE_SSID_RADIUS_SCHEMA } from '../../../../interfacesConstants';
import RadiusForm from './Radius';
import useFastField from 'hooks/useFastField';

const Radius = ({ editing, namePrefix, isPasspoint, isNotRequired }: Props) => {
  const { t } = useTranslation();
  const { value: customRadius } = useFastField({ name);
  const { value, onChange: onRadiusChange } = useFastField({ name);
  const { value, onChange: setAccounting } = useFastField({ name);
  const { value, onChange: setDynamicAuth } = useFastField({
    name,
  });

  const isUsingCustomRadius = useMemo(() => customRadius === undefined, [customRadius]);

  const onEnabledAccountingChange = (e) => {
    if (e.target.checked) {
      setAccounting({
        host,
        port,
        secret,
      });
    } else {
      setAccounting(undefined);
    }
  };

  const isAccountingEnabled = useMemo(() => accounting !== undefined, [accounting !== undefined]);

  const isEnabled = React.useMemo(() => radius !== undefined, [radius !== undefined]);
  const onEnableToggle = React.useCallback(() => {
    if (isEnabled) onRadiusChange(undefined);
    else onRadiusChange(INTERFACE_SSID_RADIUS_SCHEMA(t, true).cast());
  }, [isEnabled]);
  const onEnableDynamicChange = (e) => {
    if (e.target.checked) {
      setDynamicAuth({
        host,
        port,
        secret,
      });
    } else {
      setDynamicAuth(undefined);
    }
  };

  const isDynamicEnabled = useMemo(() => dynamicAuth !== undefined, [dynamicAuth !== undefined]);

  return (
    <RadiusForm
      editing={editing}
      isUsingCustom={isUsingCustomRadius}
      onAccountingChange={onEnabledAccountingChange}
      isAccountingEnabled={isAccountingEnabled}
      onDynamicChange={onEnableDynamicChange}
      isDynamicEnabled={isDynamicEnabled}
      variableBlock={customRadius}
      namePrefix={namePrefix}
      isEnabled={isEnabled}
      onEnableToggle={onEnableToggle}
      isPasspoint={isPasspoint}
      isNotRequired={isNotRequired}
    />
  );
};

export default React.memo(Radius);
