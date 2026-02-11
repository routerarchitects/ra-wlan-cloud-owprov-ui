import { useCallback, useEffect, useMemo, useState } from 'react';
import isEqual from 'react-fast-compare';
import { Configuration, ConfigurationNestedProps } from 'models/Configuration';

const useNestedConfigurationForm = ({
  defaultConfiguration,
}: {
  defaultConfiguration: Configuration[] | undefined;
}) => {
  const [configuration, setConfiguration] = useState<ConfigurationNestedProps | undefined>(undefined);

  const onConfigurationChange = useCallback((newConfiguration) => setConfiguration(newConfiguration), []);
  const reset = () => setConfiguration(undefined);

  const data = useMemo(() => {
    if (!configuration)
      return {
        isDirty: false,
        isValid: true,
        configuration: null,
      };

    const isDirty = configuration.__form?.isDirty === undefined ? false : configuration.__form.isDirty;
    const isValid = configuration.__form?.isValid === undefined ? true : configuration.__form.isValid;

    return {
      isDirty,
      isValid,
      configuration: configuration.data ?? null,
    };
  }, [configuration]);

  const toReturn = useMemo(
    () => ({
      data,
      onChange: onConfigurationChange,
      reset,
    }),
    [data],
    // @ts-ignore
    isEqual,
  );

  useEffect(
    () => {
      if (defaultConfiguration) {
        onConfigurationChange({
          __form: {
            isDirty: false,
            isValid: true,
          },
          data: defaultConfiguration,
        });
      }
    },
    [defaultConfiguration],
    // @ts-ignore
    isEqual,
  );

  return toReturn;
};

export default useNestedConfigurationForm;
