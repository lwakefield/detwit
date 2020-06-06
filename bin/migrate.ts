import { init, migrate } from '../db.ts';

await init();
await migrate();
