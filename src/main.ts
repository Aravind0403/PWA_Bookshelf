import './styles.css';
import { App } from './app';
import { initStorage } from './storage';

async function init() {
  await initStorage();
  const app = new App();
  app.init();
}

init();

