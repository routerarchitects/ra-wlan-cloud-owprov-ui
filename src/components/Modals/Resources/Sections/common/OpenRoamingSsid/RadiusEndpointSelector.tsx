import * as React from 'react';
import SelectField from 'components/FormFields/SelectField';
import { useGetRadiusEndpoints } from 'hooks/Network/RadiusEndpoints';
import useFastField from 'hooks/useFastField';

const CONSORTIUMS = {
  orion: ['F4F5E8F5F4'],
  globalreach: ['5A03BA0000'],
  generic: [],
  radsec: [],
} as const;

type Props = {
  name: string;
  isDisabled?: boolean;
};

const RadiusEndpointSelector = ({ name, isDisabled }: Props) => {
  const getEndpoints = useGetRadiusEndpoints();
  const field = useFastField<string>({ name });
  const consortiumField = useFastField({ name: 'editing.pass-point.roaming-consortium' });

  const options =
    getEndpoints.data?.map((endpoint) => ({
      value: endpoint.id,
      label: endpoint.name,
    })) ?? [];

  React.useEffect(() => {
    const found = getEndpoints.data?.find(({ id }) => id === field.value);

    if (found) {
      const newValue = CONSORTIUMS[found.Type];

      consortiumField.onChange(newValue);
    }
  }, [field.value]);

  return (
    <SelectField
      name={name}
      label="Radius Endpoint"
      options={options}
      isDisabled={isDisabled || options.length === 0}
      isRequired
      w="max-content"
    />
  );
};

export default RadiusEndpointSelector;
