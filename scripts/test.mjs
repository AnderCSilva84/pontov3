import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const arquivos=readdirSync('tests').filter(n=>/\.test\.(?:js|cjs|mjs)$/.test(n)).map(n=>'tests/'+n);
const r=spawnSync(process.execPath,['--test',...arquivos],{stdio:'inherit'});
if(r.error)throw r.error;
process.exit(r.status??1);
