import { signIn, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Game } from '../shared/game';
import { trpc } from '../utils/trpc';

const HomePage = () => {
  const updateUser = trpc.user.updateUser.useMutation();
  const { data: sessionData, status } = useSession();
  const [gameId, setGameId] = useState<string | undefined>();
  const [joined, setJoined] = useState<boolean>(false);
  const [userName, setUserName] = useState<string | null | undefined>(
    sessionData?.user?.name,
  );
  const [politics, setPolitics] = useState<string | null | undefined>(
    sessionData?.user?.politics,
  );
  useEffect(() => {
    if (status !== 'loading' && !sessionData?.user.id) {
      signIn('credentials', { redirect: false });
    }
  }, [status, sessionData]);

  return (
    <main
      dir="rtl"
      className="game container mx-auto flex flex-col justify-center max-w-2xl p-8 2xl:px-0 prose"
    >
      {!joined || !sessionData || !userName || !gameId || !politics ? (
        <>
          <h1 className="text-center">משחק חדש</h1>
          <form className="join-form form-control gap-2">
            <input
              id="gameId"
              className="input input-bordered !outline-none mx-auto"
              type="text"
              placeholder="מזהה משחק"
              onChange={(e) => setGameId(e.target.value)}
            />
            {!sessionData?.user?.name && (
              <input
                id="playerId"
                className="input input-bordered !outline-none mx-auto"
                type="text"
                placeholder="שם \ כינוי"
                onChange={(e) => setUserName(e.target.value)}
              />
            )}
            {!sessionData?.user?.politics && (
              <textarea
                id="politics"
                className="input input-bordered !outline-none mx-auto"
                placeholder="אני מאמין ב... אני בדרך כלל מצביע.ה.."
                onChange={(e) => setPolitics(e.target.value)}
              />
            )}
            <button
              className="btn mx-auto"
              disabled={
                !sessionData?.user.id || !userName || !gameId || !politics
              }
              onClick={async (e) => {
                if (!politics || !userName) {
                  return;
                }
                e.preventDefault();
                if (
                  sessionData?.user.id &&
                  (politics !== sessionData.user.politics ||
                    userName !== sessionData.user.name)
                ) {
                  await updateUser.mutateAsync({ politics, name: userName });
                }
                setJoined(true);
              }}
            />
          </form>
        </>
      ) : (
        <Play {...{ gameId, politics, playerId: userName }} />
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
      {game.phase === 'LOBBY' ? (
        <Lobby gameId={gameId} game={game} />
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

const Lobby = ({
  gameId,
  game,
}: {
  gameId: string;
  game: Game & { phase: 'LOBBY' };
}) => {
  const startGame = trpc.game.startGame.useMutation();
  return (
    <>
      <h1 className="mx-auto">
        מזהה משחק: <span className="text-red-400">{gameId}</span>
      </h1>
      <p className="mx-auto">
        הצטרפו {Object.keys(game.players).length} שחקנים
      </p>
      <button
        className="btn mx-auto"
        onClick={() => {
          console.log('startGame', { gameId: game.id });
          startGame.mutate({ gameId: game.id });
        }}
      />
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
              className="input input-bordered !outline-none"
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
