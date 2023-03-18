import { signIn, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Game } from '../shared/game';
import { trpc } from '../utils/trpc';

const HomePage = () => {
  const updateUser = trpc.user.updateUser.useMutation();
  const { data: sessionData, status } = useSession();
  const [joined, setJoined] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('');
  const [politics, setPolitics] = useState<string>('');
  useEffect(() => {
    if (status !== 'loading' && !sessionData?.user.id) {
      signIn('credentials', { redirect: false });
    }
  }, [status, sessionData]);
  useEffect(() => {
    if (sessionData?.user.id) {
      if (!userName && sessionData.user.name) {
        setUserName(sessionData.user.name);
      }
      if (!politics && sessionData.user.politics) {
        setPolitics(sessionData.user.politics);
      }
    }
  }, [sessionData, userName, politics]);

  return (
    <main
      dir="rtl"
      className="game container mx-auto flex flex-col justify-center max-w-2xl p-8 2xl:px-0 prose"
    >
      {!joined || !sessionData || !userName || !politics ? (
        <>
          <h1 className="text-center">משחק חדש</h1>
          <form className="join-form form-control gap-2">
            <input
              id="playerId"
              className="input input-bordered !outline-none mx-auto"
              type="text"
              placeholder="שם \ כינוי"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
            <textarea
              id="politics"
              className="input input-bordered !outline-none mx-auto"
              value={politics}
              placeholder="אני מאמין ב... אני בדרך כלל מצביע.ה.."
              onChange={(e) => setPolitics(e.target.value)}
            />
            <button
              className="btn mx-auto"
              disabled={!sessionData?.user.id || !userName || !politics}
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
                  await updateUser.mutateAsync({
                    id: sessionData.user.id,
                    politics,
                    name: userName,
                  });
                }
                setJoined(true);
              }}
            />
          </form>
        </>
      ) : (
        <JoinGame {...{ politics, playerId: userName }} />
      )}
    </main>
  );
};

const JoinGame = ({
  gameId,
  playerId,
  politics,
}: {
  gameId?: string;
  playerId: string;
  politics: string;
}) => {
  const [game, setGame] = useState<Game | undefined>();
  const joinGame = trpc.game.joinGame.useMutation();
  useEffect(() => {
    if (!game) {
      joinGame.mutateAsync({ gameId, playerId, politics }).then(setGame);
    }
  }, [game, gameId, playerId, politics, joinGame]);
  if (!game) return <p>מצתרף למשחק...</p>;
  return <Play {...{ game, playerId, politics }} />;
};

const Play = ({
  game: InitialGame,
  playerId,
}: {
  game: Game;
  playerId: string;
}) => {
  const [game, setGame] = useState<Game>(InitialGame);
  trpc.game.subscribeToGame.useSubscription(
    { gameId: game.id },
    {
      onData(state) {
        console.log('Subscription data:', state);
        setGame(state);
      },
      onError(err) {
        console.error('Subscription error:', err);
      },
    },
  );
  return (
    <>
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
      <h1 className="mx-auto">
        מזהה משחק: <span className="text-red-400">{game.id}</span>
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
          <p>מחכים ל</p>
          <ul>
            {waitingFor.map(({ id }) => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p>
            את.ה משחק.ת בתור: <em>{playingAsSelf ? 'עצמך!' : playingAs}</em>
          </p>
          {!playingAsSelf && (
            <>
              <p>התיאור של {playingAs} הוא:</p>
              <blockquote>{game.players[playingAs].politics}</blockquote>
            </>
          )}
          <p>השאלה:</p>
          <blockquote>{game.question}</blockquote>
          <form className="form-control max-w-xl">
            <label htmlFor="answer" className="label">
              תשובתך:
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
                שלח.י תשובה
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
  if (!answersToRate[index]) return <p>סיימת לדרג</p>;
  const answerToRate = answersToRate[index][1];
  return (
    <>
      <h2>דרג.י את התשובה!</h2>
      <p>השחקן ענה בתור {answerToRate.playingAs}</p>
      <p>ל{answerToRate.playingAs} יש את התיאור הבא:</p>
      <blockquote>{game.players[answerToRate.playingAs].politics}</blockquote>
      <p>הוא ענה:</p>
      <blockquote>{answerToRate.answer}</blockquote>
      <p>האם הם מחתזים???</p>
      <form className="form-control max-w-xl">
        <label className="flex gap-2 content-between">
          <span>מתחזה!</span>
          <input
            type="range"
            min="-2"
            max="2"
            value={rating}
            className="range"
            onChange={(e) => setRating(Number(e.target.value))}
          />
          <span>מקורי</span>
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
            שלח.י דירוג
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
