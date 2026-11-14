// Compatibility entry point: keep existing commands from regenerating the retired artwork.
import {spawnSync} from 'node:child_process';
const shell=process.platform==='win32'?'powershell.exe':'pwsh';
const result=spawnSync(shell,['-NoProfile','-File','scripts/gerar-marca-ta-no-ponto.ps1'],{stdio:'inherit'});
if(result.error)throw result.error;
process.exit(result.status??1);
