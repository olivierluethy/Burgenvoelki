import colyseus from 'colyseus';
import { BurgenRoom } from './BurgenRoom';

const { Server } = colyseus;
const PORT = Number(process.env.PORT ?? 2567);

const gameServer = new Server();
gameServer.define('burgen', BurgenRoom);

gameServer
  .listen(PORT)
  .then(() => console.log(`⚽ Burgenvölki server listening on ws://localhost:${PORT}`))
  .catch((err: unknown) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
