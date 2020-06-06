import { init, client } from '../db.ts';

if (Deno.args.includes('i know what i am doing') === false) {
    console.log("Do you know what you are doing?")
    Deno.exit(1);
}

await init();
await client.query('drop schema public cascade; create schema public;');
