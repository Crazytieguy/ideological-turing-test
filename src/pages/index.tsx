import { signIn, signOut, useSession } from 'next-auth/react';
import { useState } from 'react';
import { Game } from '../shared/game';
import { trpc } from '../utils/trpc';

const HomePage = () => {
  const [playerId, setPlayerId] = useState<string | undefined>();
  const [gameId, setGameId] = useState<string | undefined>();
  const [joined, setJoined] = useState<boolean>(false);
  const changePolitics = trpc.user.changePolitics.useMutation();
  const { data: sessionData } = useSession();
  const [politics, setPolitics] = useState<string | undefined>(
    sessionData?.user?.politics,
  );

  return (
    <main className="container mx-auto max-w-2xl p-8 2xl:px-0 prose">
      {!joined || !playerId || !gameId || !politics ? (
        <>
          {sessionData ? (
            <div className="flex justify-between">
              <button className="btn" onClick={() => signOut()}>
                Sign out
              </button>
              <p>Logged in as {sessionData.user.email}</p>
              <p>Your score is {sessionData.user.totalScore}</p>
            </div>
          ) : (
            <button className="btn" onClick={() => signIn('google')}>
              Sign in
            </button>
          )}
          <h1 className="text-center">Join Game</h1>
          <form className="form-control gap-2">
            <label htmlFor="playerId" className="label">
              Enter your name:
            </label>
            <input
              id="playerId"
              className="input input-bordered"
              type="text"
              onChange={(e) => setPlayerId(e.target.value)}
            />

            <label htmlFor="gameId" className="label">
              Enter a game id:
            </label>
            <input
              id="gameId"
              className="input input-bordered"
              type="text"
              onChange={(e) => setGameId(e.target.value)}
            />
            {!sessionData?.user?.politics && (
              <>
                <label htmlFor="politics" className="label">
                  Enter your politics:
                </label>
                <input
                  id="politics"
                  className="input input-bordered"
                  type="text"
                  onChange={(e) => setPolitics(e.target.value)}
                />
              </>
            )}
            <button
              className="btn"
              disabled={!playerId || !gameId || !politics}
              onClick={async (e) => {
                if (!politics) {
                  return;
                }
                e.preventDefault();
                if (sessionData && politics !== sessionData.user.politics) {
                  await changePolitics.mutateAsync({ politics });
                }
                setJoined(true);
              }}
            >
              Join Game!
            </button>
          </form>
        </>
      ) : (
        <Play {...{ playerId, gameId, politics }} />
      )}
    </main>
  );
};

const Play = ({
  gameId,
  playerId,
  politics,
}: {
  gameId: string;
  playerId: string;
  politics: string;
}) => {
  const [game, setGame] = useState<Game | undefined>();
  const joinGame = trpc.game.joinGame.useMutation();
  trpc.game.subscribeToGame.useSubscription(
    { gameId },
    {
      onStarted: async () => {
        console.log('Subscription started');
        try {
          await joinGame.mutateAsync({ gameId, playerId, politics });
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
    <>
      <h1>Play</h1>
      <article>
        <p>gameId: {gameId}</p>
        <p>playerId: {playerId}</p>
      </article>
      {game.phase === 'LOBBY' ? (
        <Lobby game={game} />
      ) : game.phase === 'ANSWER_QUESTION' ? (
        <AnswerQuestion game={game} playerId={playerId} />
      ) : game.phase === 'RATE_ANSWERS' ? (
        <RateAnswers game={game} playerId={playerId} />
      ) : game.phase === 'SCORE' ? (
        <Score game={game} />
      ) : null}
    </>
  );
};

const Lobby = ({ game }: { game: Game & { phase: 'LOBBY' } }) => {
  const startGame = trpc.game.startGame.useMutation();
  return (
    <>
      <p>Players: {Object.keys(game.players).length}</p>
      <button
        className="btn"
        onClick={() => {
          console.log('startGame', { gameId: game.id });
          startGame.mutate({ gameId: game.id });
        }}
      >
        Start Game
      </button>
    </>
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
  const { playingAs } = game.assignments[playerId];
  const playingAsSelf = playingAs === playerId;
  const alreadyAnswered = game.playerAnswers[playerId];
  const waitingFor = Object.values(game.players).filter(
    ({ id }) => !game.playerAnswers[id],
  );
  return (
    <form className="form-control">
      {alreadyAnswered ? (
        <>
          <p>Waiting for</p>
          <ul>
            {waitingFor.map(({ id }) => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p>
            You are playing as{' '}
            <em>{playingAsSelf ? 'Yourself!' : playingAs}</em>
          </p>
          {!playingAsSelf && (
            <>
              <p>
                {playingAs}
                {"'"}s politics are:
              </p>
              <blockquote>{game.players[playingAs].politics}</blockquote>
            </>
          )}
          <p>The question is:</p>
          <blockquote>{game.question}</blockquote>
          <form className="form-control max-w-xl">
            <label htmlFor="answer" className="label">
              Answer:
            </label>
            <input
              className="input input-bordered"
              id="answer"
              type="text"
              onChange={(e) => setAnswer(e.target.value)}
            />
            <div className="pt-2">
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
            </div>
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
  const [index, setIndex] = useState(0);
  const [rating, setRating] = useState(2);
  const answersToRate = Object.entries(game.playerAnswers).filter(
    ([id, { playingAs }]) => ![id, playingAs].includes(playerId),
  );
  if (!answersToRate[index]) return <p>Done rating</p>;
  const answerToRate = answersToRate[index][1];
  return (
    <>
      <h2>Rate the answer!</h2>
      <p>The player answered as {answerToRate.playingAs}</p>
      <p>{answerToRate.playingAs} has these politics:</p>
      <blockquote>{game.players[answerToRate.playingAs].politics}</blockquote>
      <p>They answered:</p>
      <blockquote>{answerToRate.answer}</blockquote>
      <p>Are they an impostor???</p>
      <form className="form-control max-w-xl">
        <label className="flex gap-2 content-between">
          <span>Impostor!</span>
          <input
            type="range"
            min="-2"
            max="2"
            value={rating}
            className="range"
            onChange={(e) => setRating(Number(e.target.value))}
          />
          <span>The original</span>
        </label>
        <div className="pt-2">
          <button
            className="btn"
            onClick={async (e) => {
              e.preventDefault();
              rateAnswer.mutateAsync({
                gameId: game.id,
                rating: {
                  rating,
                  rater: playerId,
                  playerBeingRated: answersToRate[index][0],
                },
              });
              setIndex(index + 1);
            }}
          >
            Submit Rating
          </button>
        </div>
      </form>
    </>
  );
};

const Score = ({ game }: { game: Game & { phase: 'SCORE' } }) => {
  const scores = Object.entries(game.scores).sort(([, a], [, b]) => b - a);
  return (
    <>
      <h2>Scores!</h2>
      <ol>
        {scores.map(([id, score]) => (
          <li key={id}>
            {id}: {score}
          </li>
        ))}
      </ol>
    </>
  );
};

export default HomePage;
