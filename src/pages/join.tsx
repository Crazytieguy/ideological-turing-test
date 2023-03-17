import Link from 'next/link';
import { useState } from 'react';

const JoinPage = () => {
  const [playerId, setPlayerId] = useState<string | undefined>();
  const [gameId, setGameId] = useState<string | undefined>();
  return (
    <main className="container mx-auto max-w-6xl p-8 2xl:px-0 prose">
      <h1>Join Game</h1>
      <form className="form-control gap-2 max-w-xl mx-auto">
        <input
          type="text"
          placeholder="playerId"
          onChange={(e) => setPlayerId(e.target.value)}
        />
        <input
          type="text"
          placeholder="gameId"
          onChange={(e) => setGameId(e.target.value)}
        />
        <Link href={`play/${gameId}/${playerId}`} className="btn">
          Join Game
        </Link>
      </form>
    </main>
  );
};

export default JoinPage;
