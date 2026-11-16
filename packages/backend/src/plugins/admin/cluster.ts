import { Config } from '@backstage/config';
import { readFile } from 'fs/promises';
import https from 'https';

const IN_CLUSTER_DIR = '/var/run/secrets/kubernetes.io/serviceaccount';

/**
 * Read-only access to the cluster, with the same identity as the Kubernetes
 * plugin: the portal's `backstage-reader` ServiceAccount. In the cluster,
 * the pod's own token (re-read on every request, Kubernetes rotates it);
 * with `yarn start`, the cluster's URL and token from the Kubernetes
 * plugin's config.
 */
export class ClusterReader {
  constructor(
    private readonly url: string,
    private readonly token: () => Promise<string>,
    private readonly tls: { ca?: Buffer; insecure: boolean },
  ) {}

  static async fromConfig(config: Config): Promise<ClusterReader> {
    const cluster = config
      .getOptionalConfigArray('kubernetes.clusterLocatorMethods')?.[0]
      ?.getOptionalConfigArray('clusters')?.[0];
    if (!cluster) {
      throw new Error('No cluster in kubernetes.clusterLocatorMethods');
    }
    const url = cluster.getString('url');
    // A token in the config (`yarn start`), or else the pod's own.
    const token = cluster.getOptionalString('serviceAccountToken');
    if (token) {
      return new ClusterReader(url, async () => token, {
        insecure: cluster.getOptionalBoolean('skipTLSVerify') ?? false,
      });
    }
    const caFile =
      cluster.getOptionalString('caFile') ?? `${IN_CLUSTER_DIR}/ca.crt`;
    return new ClusterReader(
      url,
      async () => (await readFile(`${IN_CLUSTER_DIR}/token`, 'utf8')).trim(),
      { ca: await readFile(caFile).catch(() => undefined), insecure: false },
    );
  }

  async get<T>(path: string): Promise<T> {
    const token = await this.token();
    return new Promise((resolve, reject) => {
      const req = https.request(
        new URL(path, this.url),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          ca: this.tls.ca,
          rejectUnauthorized: !this.tls.insecure,
          timeout: 10_000,
        },
        res => {
          const chunks: Buffer[] = [];
          res.on('data', chunk => chunks.push(chunk));
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');
            if (res.statusCode !== 200) {
              reject(
                new Error(
                  `GET ${path}: ${res.statusCode} ${body.slice(0, 200)}`,
                ),
              );
              return;
            }
            resolve(JSON.parse(body));
          });
        },
      );
      req.on('timeout', () => req.destroy(new Error(`GET ${path}: timeout`)));
      req.on('error', reject);
      req.end();
    });
  }
}
