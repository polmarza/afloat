import { App } from './game/App';

const app = new App(document.getElementById('game')!);

if (import.meta.env.DEV) (window as unknown as { app: App }).app = app;
