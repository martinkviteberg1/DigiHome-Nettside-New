// Node-loader som løser opp Next-stil, endelsesløse relative imports ('./mongodb' → './mongodb.js')
// slik at lib/*.js kan enhetstestes direkte med node. Bruk: node --import ./_perf/loader.mjs <test>
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register(new URL('./resolver-hooks.mjs', import.meta.url), pathToFileURL('./'));
