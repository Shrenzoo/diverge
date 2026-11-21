import { manage } from './manage.mjs';

manage('install').catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
