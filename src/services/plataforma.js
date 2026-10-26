import {Capacitor} from '@capacitor/core';

export const nativo = () => Capacitor.isNativePlatform();
export const recursosWeb = () => !nativo();
