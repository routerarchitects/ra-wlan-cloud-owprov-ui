import { useCallback, useMemo, useState } from 'react';

const useRefreshId = () => {
  const [refreshId, setRefreshId] = useState<number>(0);

  const refresh = useCallback(() => setRefreshId((id) => id + 1), []);

  const toReturn = useMemo(
    () => ({
      refreshId,
      refresh,
    }),
    [refresh, refreshId],
  );

  return toReturn;
};

export default useRefreshId;
