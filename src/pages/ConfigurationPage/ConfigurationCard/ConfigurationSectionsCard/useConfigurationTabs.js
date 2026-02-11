import { useMemo, useState } from 'react';

const orderedConfigurations = [
  'globals',
  'unit',
  'metrics',
  'services',
  'radios',
  'ethernet',
  'interfaces',
  'third-party',
];

const useConfigurationTabs = () => {
  const [tabIndex, setTabIndex] = useState(0);

  const tabsWithNewConfiguration = (newConfiguration, allConfigurations) => {
    const indexInOrder = orderedConfigurations.findIndex((conf) => conf === newConfiguration);
    let index = -1;
    for (let i = indexInOrder; i >= 0; i -= 1) {
      if (allConfigurations.includes(orderedConfigurations[i])) index += 1;
    }
    setTabIndex(Math.max(0, index));
  };
  const tabsRemovedConfiguration = () => {
    setTabIndex(0);
  };

  const onTabChange = (v) => setTabIndex(v);

  const toReturn = useMemo(
    () => ({
      tabIndex,
      tabsWithNewConfiguration,
      tabsRemovedConfiguration,
      onTabChange,
    }),
    [tabIndex],
  );

  return toReturn;
};

export default useConfigurationTabs;
