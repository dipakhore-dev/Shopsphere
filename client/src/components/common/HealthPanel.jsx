import { RefreshCw } from 'lucide-react';
import { useHealthCheck } from '../../hooks/useHealthCheck.js';
import { formatUptime } from '../../utils/format.js';
import { cn } from '../../utils/cn.js';
import Button from './Button.jsx';

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-ink-100 py-3 last:border-b-0">
      <dt className="text-sm text-ink-500">{label}</dt>
      <dd className="text-sm font-semibold text-ink-900">{children}</dd>
    </div>
  );
}

function Status({ ok, children }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn('size-2.5 rounded-full', ok ? 'bg-success-600' : 'bg-danger-600')}
      />
      {children}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4 py-2" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex justify-between">
          <div className="h-4 w-24 rounded bg-ink-100" />
          <div className="h-4 w-20 rounded bg-ink-100" />
        </div>
      ))}
    </div>
  );
}

/** Live proof that the React app can talk to the Express API and MongoDB. */
export default function HealthPanel() {
  const { status, data, error, retry } = useHealthCheck();
  const dbConnected = data?.database === 'connected';

  return (
    <section
      aria-labelledby="health-title"
      className="w-full rounded-2xl bg-white p-6 text-ink-900 shadow-xl shadow-ink-900/20"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="health-title" className="text-lg font-bold">
            Connection check
          </h2>
          <p className="mt-1 text-sm text-ink-500">Browser to API to database</p>
        </div>
        <Button variant="secondary" size="sm" onClick={retry} loading={status === 'loading'}>
          {status !== 'loading' && <RefreshCw className="size-4" aria-hidden="true" />}
          Check again
        </Button>
      </div>

      <div className="mt-4" aria-live="polite">
        {status === 'loading' && !data && <Skeleton />}

        {status === 'error' && (
          <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-danger-600">
            <p className="font-semibold">The API is not reachable</p>
            <p className="mt-1">{error}</p>
            <p className="mt-2 text-ink-700">
              Start it with <code className="rounded bg-white px-1.5 py-0.5">npm run dev:server</code>.
            </p>
          </div>
        )}

        {data && (
          <dl>
            <Row label="API server">
              <Status ok>Running</Status>
            </Row>
            <Row label="MongoDB">
              <Status ok={dbConnected}>{dbConnected ? 'Connected' : data.database}</Status>
            </Row>
            <Row label="Environment">{data.environment}</Row>
            <Row label="API uptime">{formatUptime(data.uptimeSeconds)}</Row>
          </dl>
        )}
      </div>
    </section>
  );
}
