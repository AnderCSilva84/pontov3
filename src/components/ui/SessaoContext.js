import {createContext} from 'react';

// Perfil já carregado pelo observador de autenticação; não consulta o banco.
export const SessaoContext = createContext(null);
