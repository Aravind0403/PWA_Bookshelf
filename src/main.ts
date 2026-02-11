import './styles.css';
import { app } from './app';
import { initStorage } from './storage';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

async function init() {
  await initStorage();
  app.init();
}

init();
