import { handle } from '@astrojs/cloudflare/handler';
import { createScheduledHandler, PluginBridge } from '@emdash-cms/cloudflare/worker';
import { isApiPath } from './lib/apiRouting';

export { PluginBridge };

type Env = Parameters<typeof handle>[1] & {
  ENTRYWISE_API: Fetcher;
};

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    if (isApiPath(new URL(request.url).pathname)) {
      return env.ENTRYWISE_API.fetch(request);
    }
    return handle(request, env, ctx);
  },
  scheduled: createScheduledHandler(),
} satisfies ExportedHandler<Env>;
