import './styles.css';
import { app } from './app';
import { initStorage } from './storage';

async function init() {
  await initStorage();
  app.init();
}

init();

