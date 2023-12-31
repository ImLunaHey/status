import { Axiom } from '@axiomhq/js';
import { renderToStaticMarkup } from 'react-dom/server';
import { App } from './components/app';
import { health } from 'well-known-health';

const axiom = new Axiom({
  token: process.env.AXIOM_TOKEN!,
});

const urls = [
  'https://fish.lgbt',
  'https://blog.fish.lgbt',
  'https://clicker.fish.lgbt',
  'https://status.fish.lgbt',
  'https://minify.fish.lgbt',
  'https://multiplayer.fish.lgbt',
  'https://scanner.fish.lgbt',
  'https://v.fish.lgbt',
  'https://xirelta.com',
  'https://rusty-ip-production.up.railway.app',
];

const check = async (url: string) => {
  const response = await fetch(`${url}/.well-known/health`);
  const json = (await response.json()) as { status: string };
  return json.status === 'pass' && response.status === 200;
};

const run = async () => {
  for (const url of urls) {
    try {
      const status = await check(url);
      axiom.ingest(process.env.AXIOM_DATASET!, {
        event: {
          status: status ? 'pass' : 'fail',
          url,
        },
      });
      console.info(`[${status ? 'PASS' : 'FAIL'}] ${url}`);
    } catch (error) {
      axiom.ingest(process.env.AXIOM_DATASET!, {
        event: {
          status: 'fail',
          url,
        },
      });
      console.info(`[FAIL] ${url}`);
    }
  }

  await axiom.flush();
};

// Run once on startup
run();

// Run once per minute
setInterval(run, 1000 * 60);

const getStatus = async () => {
  const result = await axiom.query(`
    ['status']
    | where ['event.status'] != "true" and ['event.status'] != "false"
    | project URL=['event.url'], status=['event.status'], _time
    | sort by _time desc  
  `);
  return result.matches
    ?.map((match) => ({
      time: match._time,
      ...(match.data as {
        URL: string;
        status: string;
      }),
    }))
    .reduce(
      (acc, curr) => {
        if (acc[curr.URL]) {
          return acc;
        }

        acc[curr.URL] = curr;
        return acc;
      },
      {} as Record<
        string,
        {
          time: string;
          URL: string;
          status: string;
        }
      >,
    );
};

Bun.serve({
  port: process.env.PORT ?? 3000,
  async fetch(request) {
    // Handle health checks
    const response = health(request);
    if (response) return response;

    const appStatuses = await getStatus();
    return new Response(
      '<!doctype html>' +
        renderToStaticMarkup(
          <App>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
              {urls.map((url) => {
                const appStatus = appStatuses?.[url];
                const statusColor = appStatus?.status === 'pass' ? 'bg-green-500' : 'bg-red-500';
                return (
                  <a
                    href={url}
                    key={url}
                    className={`flex flex-col space p-4 h-24 rounded-md shadow-md ${statusColor} justify-between block`}
                  >
                    <div className="text-white font-bold truncate">{url.split('://')[1].split('/')[0]}</div>
                    <div className="text-white text-xs" title={appStatus?.time ?? 'unknown'}>
                      {appStatus?.time ? new Date(appStatus.time).toLocaleString() : 'unknown'}
                    </div>
                  </a>
                );
              })}
            </div>
          </App>,
        ),
      {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      },
    );
  },
});
