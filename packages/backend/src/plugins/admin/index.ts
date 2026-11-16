import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { NotAllowedError } from '@backstage/errors';
import Router from 'express-promise-router';
import { ClusterReader } from './cluster';

/*
 * The platform admins' page (/admin in the portal): the tools behind the
 * platform, the Argo CD Applications' status and the installation's
 * details. Only for members of the installation's `platform-admins` team,
 * checked here on every request: the page itself only hides what this
 * plugin refuses.
 */

type ArgoSource = {
  repoURL?: string;
  chart?: string;
  targetRevision?: string;
  path?: string;
};

type ArgoApplication = {
  metadata: { name: string };
  spec?: { source?: ArgoSource; sources?: ArgoSource[] };
  status?: {
    sync?: { status?: string; revision?: string };
    health?: { status?: string; message?: string };
    operationState?: { phase?: string; finishedAt?: string };
  };
};

export default createBackendPlugin({
  pluginId: 'idpk-admin',
  register(env) {
    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        httpRouter: coreServices.httpRouter,
        httpAuth: coreServices.httpAuth,
        userInfo: coreServices.userInfo,
        logger: coreServices.logger,
      },
      async init({ config, httpRouter, httpAuth, userInfo, logger }) {
        const adminGroup =
          config.getOptionalString('idpk.admin.group') ??
          'group:default/platform-admins';
        const argocdNamespace =
          config.getOptionalString('idpk.admin.argocdNamespace') ?? 'argocd';
        const cluster = await ClusterReader.fromConfig(config);

        const isAdmin = async (
          req: Parameters<typeof httpAuth.credentials>[0],
        ) => {
          const credentials = await httpAuth.credentials(req, {
            allow: ['user'],
          });
          const { ownershipEntityRefs } = await userInfo.getUserInfo(
            credentials,
          );
          return ownershipEntityRefs.includes(adminGroup);
        };

        const router = Router();

        // Lets the portal decide whether to show the Admin entry.
        router.get('/access', async (req, res) => {
          res.json({ admin: await isAdmin(req) });
        });

        router.get('/overview', async (req, res) => {
          if (!(await isAdmin(req))) {
            throw new NotAllowedError(`Only for members of ${adminGroup}`);
          }

          const org = config.getString('idpk.github.org');
          const instancesRepo = config.getString('idpk.github.instancesRepo');
          const tools = (
            config.getOptionalConfigArray('idpk.admin.tools') ?? []
          ).map(tool => ({
            title: tool.getString('title'),
            url: tool.getOptionalString('url'),
            signIn: tool.getString('signIn'),
          }));

          let applications;
          let applicationsError: string | undefined;
          try {
            const list = await cluster.get<{ items: ArgoApplication[] }>(
              `/apis/argoproj.io/v1alpha1/namespaces/${argocdNamespace}/applications`,
            );
            applications = list.items
              .map(app => {
                // A Helm chart with values from Git has several sources:
                // show the chart.
                const sources = app.spec?.sources ?? [];
                const source =
                  sources.find(src => src.chart) ??
                  sources[0] ??
                  app.spec?.source ??
                  {};
                return {
                  name: app.metadata.name,
                  source:
                    source.chart ??
                    (source.path && source.path !== '.'
                      ? source.path
                      : source.repoURL?.replace(
                          /^https:\/\/github\.com\/|\.git$/g,
                          '',
                        )) ??
                    '',
                  revision: source.targetRevision ?? '',
                  sync: app.status?.sync?.status ?? 'Unknown',
                  health: app.status?.health?.status ?? 'Unknown',
                  message: app.status?.health?.message,
                  lastSync: app.status?.operationState?.finishedAt,
                };
              })
              .sort((a, b) => a.name.localeCompare(b.name));
          } catch (e) {
            logger.warn(`Could not list Argo CD Applications: ${e}`);
            applicationsError = String(e);
          }

          res.json({
            installation: {
              org,
              orgUrl: `https://github.com/${org}`,
              instancesRepo: `${org}/${instancesRepo}`,
              instancesUrl: `https://github.com/${org}/${instancesRepo}`,
              portalImage:
                config.getOptionalString('idpk.portal.image') ?? 'development',
            },
            tools,
            applications: applications ?? [],
            applicationsError,
          });
        });

        httpRouter.use(router);
      },
    });
  },
});
