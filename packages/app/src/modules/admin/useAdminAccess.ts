import {
  discoveryApiRef,
  fetchApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import useAsync from 'react-use/esm/useAsync';

/** Whether the signed-in user may see the admin page (platform-admins). */
export function useAdminAccess(): boolean {
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  const { value } = useAsync(async () => {
    const base = await discoveryApi.getBaseUrl('idpk-admin');
    const res = await fetchApi.fetch(`${base}/access`);
    if (!res.ok) return false;
    return ((await res.json()) as { admin: boolean }).admin;
  }, [discoveryApi, fetchApi]);
  return value ?? false;
}
