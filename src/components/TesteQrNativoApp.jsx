import TesteQrNativo from './TesteQrNativo';
import { iniciarTesteQrNativo } from '../services/scannerQrNativo';
export default function TesteQrNativoApp(props) {
  return <TesteQrNativo {...props} iniciar={iniciarTesteQrNativo} />;
}
