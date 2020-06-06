import { serve } from 'https://deno.land/std/http/server.ts';

import * as apiRoutes from './routes/api.ts';
import * as frontendRoutes from './routes/frontend.ts';
import * as db from './db.ts';
import { getUrl } from './http.ts';

const log = (data : object) => {
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...data }));
};

const server = serve({ port: 8000 });
log({ message: 'listening on http://localhost:8000/'});

const requestHandlers = new Map();
requestHandlers.set(/^GET \/api\/v1\/ping$/,                apiRoutes.ping);
requestHandlers.set(/^POST \/api\/v1\/createuser$/,         apiRoutes.createUser);
requestHandlers.set(/^POST \/api\/v1\/createsession$/,      apiRoutes.createSession);
requestHandlers.set(/^POST \/api\/v1\/deletesession$/,      apiRoutes.deleteSession);
requestHandlers.set(/^POST \/api\/v1\/createpost$/,         apiRoutes.createPost);
requestHandlers.set(/^POST \/api\/v1\/createfollow$/,       apiRoutes.createFollow);
requestHandlers.set(/^POST \/api\/v1\/deletefollow$/,       apiRoutes.deleteFollow);
requestHandlers.set(/^POST \/api\/v1\/createpostreaction$/, apiRoutes.createPostReaction);
requestHandlers.set(/^POST \/api\/v1\/deletepostreaction$/, apiRoutes.deletePostReaction);

requestHandlers.set(/^GET \/$/,                             frontendRoutes.index);
requestHandlers.set(/^GET \/signup$/,                       frontendRoutes.signup);
requestHandlers.set(/^GET \/signin$/,                       frontendRoutes.signin);
requestHandlers.set(/^GET \/u\/\w+$/,                       frontendRoutes.user);
requestHandlers.set(/^GET \/u\/\w+\/feed$/,                 frontendRoutes.userFeed);

await db.init();

for await (const req of server) {
    const signature = req.method + ' ' + getUrl(req).pathname;

    let res = null;
    log({ message: 'Received HTTP Request', signature });


    for (const [rgx, handler] of requestHandlers.entries()) {
        if (rgx.test(signature)) {
            try {
                res = await handler(req);
            } catch (e) {
                console.error(e);
                log({ message: 'Error processing request', error: e.stack });
                res = { status: 500 };
            }
            break;
        }
    }

    if (res === null) {
        res = { status: 404, body: 'Not Found' };
    }

    await req.respond(res);
    log({ message: 'Returned HTTP Response', status: res.status });
}
