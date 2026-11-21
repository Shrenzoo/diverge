import { manage } from './manage.mjs';

manage('uninstall').catch((error) => {
  console.error(error.message);
