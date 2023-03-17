import { useRouter } from 'next/router';
import { useState } from 'react';
import { Game } from 'shared/game';
import { trpc } from 'utils/trpc';

const Play = () => {
  const router = useRouter();
  const { gameId, playerId } = router.query as {
    gameId: string;
    playerId: string;
  };
  const [game, setGame] = useState<Game | undefined>();
  const joinGame = trpc.game.joinGame.useMutation();
  trpc.game.subscribeToGame.useSubscription(
    { gameId },
    {
      onStarted: async () => {
        console.log('Subscription started');
        try {
          await joinGame.mutateAsync({ gameId, playerId });
        } catch {}
      },
      onData(state) {
        console.log('Subscription data:', state);
        setGame(state);
      },
      onError(err) {
        console.error('Subscription error:', err);
        setGame(undefined);
      },
    },
  );
  if (!game) return <p>no game</p>;
  return (
    <main className="container mx-auto max-w-6xl p-8 2xl:px-0 prose">
      <h1>Play</h1>
      <article>
        <p>gameId: {gameId}</p>
        <p>playerId: {playerId}</p>
        <p>game: {JSON.stringify(game)}</p>
      </article>
      {game.phase === 'LOBBY' ? (
        <Lobby game={game} />
      ) : game.phase === 'ANSWER_QUESTION' ? (
        <AnswerQuestion game={game} playerId={playerId} />
      ) : game.phase === 'RATE_ANSWERS' ? (
        <RateAnswers game={game} playerId={playerId} />
      ) : (
        <p>Unknown phase: {game.phase}</p>
      )}
    </main>
  );
};

const Lobby = ({ game }: { game: Game & { phase: 'LOBBY' } }) => {
  const startGame = trpc.game.startGame.useMutation();
  return (
    <button
      className="btn"
      onClick={() => {
        console.log('startGame', { gameId: game.id });
        startGame.mutate({ gameId: game.id });
      }}
    >
      Start Game
    </button>
  );
};

const AnswerQuestion = ({
  game,
  playerId,
}: {
  game: Game & { phase: 'ANSWER_QUESTION' };
  playerId: string;
}) => {
  const answerQuestion = trpc.game.answerQuestion.useMutation();
  const [answer, setAnswer] = useState('');
  const { characterId } =
    game.characterAssignments.find(
      (assignment) => assignment.playerId === playerId,
    ) || {};
  const alreadyAnswered = game.playerAnswers.some(
    (playerAnswer) => playerAnswer.playerId === playerId,
  );
  const waitingFor = game.playerIds.filter(
    (playerId) =>
      !game.playerAnswers.some(
        (playerAnswer) => playerAnswer.playerId === playerId,
      ),
  );
  return (
    <form className="form-control">
      {alreadyAnswered ? (
        <>
          <p>Waiting for</p>
          <ul>
            {waitingFor.map((playerId) => (
              <li key={playerId}>{playerId}</li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p>You are playing as {characterId}</p>
          <p>{game.question}</p>
          <form className="form-control max-w-xl">
            <input type="text" onChange={(e) => setAnswer(e.target.value)} />
            <button
              className="btn"
              onClick={async (e) => {
                e.preventDefault();
                answerQuestion.mutateAsync({
                  gameId: game.id,
                  playerId,
                  answer,
                });
              }}
            >
              Answer Question
            </button>
          </form>
        </>
      )}
    </form>
  );
};

const RateAnswers = ({
  game,
  playerId,
}: {
  game: Game & { phase: 'RATE_ANSWERS' };
  playerId: string;
}) => {
  const rateAnswer = trpc.game.rateAnswer.useMutation();
  return <p>Rating answers</p>;
};

export default Play;
