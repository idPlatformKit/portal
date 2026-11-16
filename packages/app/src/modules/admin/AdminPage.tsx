import {
  Content,
  InfoCard,
  Link,
  Progress,
  ResponseErrorPanel,
  StatusAborted,
  StatusError,
  StatusOK,
  StatusPending,
  Table,
  TableColumn,
  WarningPanel,
} from '@backstage/core-components';
import {
  discoveryApiRef,
  fetchApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { ResponseError } from '@backstage/errors';
import { Grid, Typography, makeStyles } from '@material-ui/core';
import useAsync from 'react-use/esm/useAsync';
import { fonts } from '../theme/tokens';

type Overview = {
  installation: {
    org: string;
    orgUrl: string;
    instancesRepo: string;
    instancesUrl: string;
    portalImage: string;
  };
  tools: { title: string; url?: string; signIn: string }[];
  applications: Application[];
  applicationsError?: string;
};

type Application = {
  name: string;
  source: string;
  revision: string;
  sync: string;
  health: string;
  message?: string;
  lastSync?: string;
};

const useStyles = makeStyles(theme => ({
  dl: {
    display: 'grid',
    gridTemplateColumns: 'max-content 1fr',
    columnGap: theme.spacing(3),
    rowGap: theme.spacing(1),
    margin: 0,
    '& dt': { color: theme.palette.text.secondary },
    '& dd': { margin: 0, overflowWrap: 'anywhere' },
  },
  mono: { fontFamily: fonts.mono, fontSize: '0.9em' },
  tool: {
    paddingBottom: theme.spacing(1.5),
    marginBottom: theme.spacing(1.5),
    borderBottom: `1px solid ${theme.palette.divider}`,
    '&:last-child': { border: 0, marginBottom: 0, paddingBottom: 0 },
  },
  summary: { marginBottom: theme.spacing(2) },
}));

/* Health and sync in Kubernetes' own words: green only for what is Ready. */
function HealthStatus({ value }: { value: string }) {
  switch (value) {
    case 'Healthy':
      return <StatusOK>Healthy</StatusOK>;
    case 'Progressing':
      return <StatusPending>Progressing</StatusPending>;
    case 'Degraded':
    case 'Missing':
      return <StatusError>{value}</StatusError>;
    default:
      return <StatusAborted>{value}</StatusAborted>;
  }
}

function SyncStatus({ value }: { value: string }) {
  if (value === 'Synced') return <StatusOK>Synced</StatusOK>;
  if (value === 'OutOfSync') return <StatusPending>OutOfSync</StatusPending>;
  return <StatusAborted>{value}</StatusAborted>;
}

export const AdminPage = () => {
  const classes = useStyles();
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);

  const { value, loading, error } = useAsync(async (): Promise<Overview> => {
    const base = await discoveryApi.getBaseUrl('idpk-admin');
    const res = await fetchApi.fetch(`${base}/overview`);
    if (!res.ok) throw await ResponseError.fromResponse(res);
    return res.json();
  }, [discoveryApi, fetchApi]);

  if (loading) return <Progress />;
  if (error) {
    return (
      <Content>
        {error.name === 'NotAllowedError' ||
        (error as ResponseError).response?.status === 403 ? (
          <WarningPanel
            title="This page is for platform admins"
            message="Members of the platform-admins team of the installation's GitHub org see the platform's tools and status here."
          />
        ) : (
          <ResponseErrorPanel error={error} />
        )}
      </Content>
    );
  }
  const { installation, tools, applications, applicationsError } = value!;

  const ready = applications.filter(
    a => a.sync === 'Synced' && a.health === 'Healthy',
  ).length;

  const columns: TableColumn<Application>[] = [
    { title: 'Application', field: 'name', highlight: true },
    { title: 'Health', render: a => <HealthStatus value={a.health} /> },
    { title: 'Sync', render: a => <SyncStatus value={a.sync} /> },
    {
      title: 'Source',
      render: a => <span className={classes.mono}>{a.source}</span>,
    },
    {
      title: 'Revision',
      render: a => <span className={classes.mono}>{a.revision}</span>,
    },
    {
      title: 'Last sync',
      render: a => (a.lastSync ? new Date(a.lastSync).toLocaleString() : ''),
    },
  ];

  return (
    <Content>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <InfoCard title="Installation">
            <dl className={classes.dl}>
              <dt>GitHub org</dt>
              <dd>
                <Link to={installation.orgUrl}>{installation.org}</Link>
              </dd>
              <dt>Instances repository</dt>
              <dd>
                <Link to={installation.instancesUrl}>
                  {installation.instancesRepo}
                </Link>
              </dd>
              <dt>Portal image</dt>
              <dd className={classes.mono}>{installation.portalImage}</dd>
            </dl>
          </InfoCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <InfoCard title="Tools">
            {tools.map(tool => (
              <div key={tool.title} className={classes.tool}>
                <Typography variant="h6">
                  {tool.url ? (
                    <Link to={tool.url}>{tool.title}</Link>
                  ) : (
                    tool.title
                  )}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {tool.signIn}
                </Typography>
              </div>
            ))}
          </InfoCard>
        </Grid>
        <Grid item xs={12}>
          {applicationsError ? (
            <WarningPanel
              title="Couldn't read the Argo CD Applications"
              message={applicationsError}
            />
          ) : (
            <>
              <Typography className={classes.summary}>
                {ready} of {applications.length} Argo CD Applications are Synced
                and Healthy.
              </Typography>
              <Table
                title="Argo CD Applications"
                options={{ paging: false, search: false, padding: 'dense' }}
                columns={columns}
                data={applications}
              />
            </>
          )}
        </Grid>
      </Grid>
    </Content>
  );
};
