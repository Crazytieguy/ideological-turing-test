import { signIn, useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { Game } from '../shared/game';
import { trpc } from '../utils/trpc';
import avatar1 from '../images/avatar1-motion.svg';
import number1 from '../images/numbers/Untitled-34-18.png';
import number2 from '../images/numbers/Untitled-34-19.png';
import number3 from '../images/numbers/Untitled-34-20.png';
import number4 from '../images/numbers/Untitled-34-21.png';
import number5 from '../images/numbers/Untitled-34-22.png';

const AVATARS = [avatar1];
const numbers = [number1, number2, number3, number4, number5];

const useTimer = (timeout: number) => {
  const [time, setTime] = useState(timeout);
  useEffect(() => {
    if (time > 0) {
      const timer = setTimeout(() => setTime(time - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [time, timeout]);
  return [time, setTime] as const;
};

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
      className="game container mx-auto flex flex-col max-w-2xl p-8 2xl:px-0 prose"
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
  const joinAnotherGame = () => setGame(undefined);
  if (!game) return <p>מצטרף למשחק...</p>;
  return <Play {...{ game, playerId, joinAnotherGame }} />;
};

const Play = ({
  game: InitialGame,
  playerId,
  joinAnotherGame,
}: {
  game: Game;
  playerId: string;
  joinAnotherGame: () => void;
}) => {
  const [game, setGame] = useState<Game>(InitialGame);
  trpc.game.subscribeToGame.useSubscription(
    { playerId, gameId: game.id },
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
        <Score game={game} joinAnotherGame={joinAnotherGame} />
      ) : null}
    </>
  );
};

const Lobby = ({ game }: { game: Game & { phase: 'LOBBY' } }) => {
  const startGame = trpc.game.startGame.useMutation();
  return (
    <>
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
  const [time] = useTimer(60);
  const { playingAs } = game.assignments[playerId];
  const playingAsSelf = playingAs === playerId;
  const alreadyAnswered = game.playerAnswers[playerId];
  const waitingFor = Object.values(game.players).filter(
    ({ id }) => !game.playerAnswers[id],
  );
  useEffect(() => {
    if (time === 0 && answerQuestion.status === 'idle') {
      answerQuestion.mutateAsync({
        gameId: game.id,
        playerId,
        answer,
      });
    }
  }, [time, answer, game.id, playerId, answerQuestion]);
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
          <h1 className="text-center">
            {playingAsSelf ? 'בתפקיד עצמך' : 'מתחזה ל' + playingAs}
          </h1>
          <img src={AVATARS[0].src} alt="avatar" className="mx-auto w-2/6" />
          <div className="text-center text-lg">
            {game.players[playingAs].politics}
          </div>
          <h1 className="text-center">השאלה</h1>
          <div className="text-center text-xl">{game.question}</div>
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
              />
            </div>
            <p>{time}</p>
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
  const [rating, setRating] = useState(0);
  const [time, setTime] = useTimer(30);
  const answersToRate = Object.entries(game.playerAnswers).filter(
    ([id]) => id !== playerId,
  );
  let lastAnswerWasImpostor: boolean | undefined;
  if (index > 0) {
    const [id, { playingAs }] = answersToRate[index - 1];
    lastAnswerWasImpostor = id !== playingAs;
  }
  const answerToRate = answersToRate[index] && answersToRate[index][1];
  const imposingSelf = answerToRate?.playingAs === playerId;
  const submitAnswer = useCallback(() => {
    if (
      ['idle', 'success'].includes(rateAnswer.status) &&
      answersToRate[index]
    ) {
      rateAnswer.mutateAsync({
        gameId: game.id,
        rating: {
          rating,
          rater: playerId,
          playerBeingRated: answersToRate[index][0],
        },
      });
      setIndex(index + 1);
      setTime(30);
    }
  }, [game.id, rating, playerId, answersToRate, index, rateAnswer, setTime]);
  useEffect(() => {
    if (time === 0) {
      submitAnswer();
    }
  }, [time, submitAnswer]);
  if (!answersToRate[index])
    return (
      <>
        <p>סיימת לדרג</p>
        {lastAnswerWasImpostor !== undefined && (
          <p>
            התשובה הקודמת הייתה {lastAnswerWasImpostor ? 'מתחזת' : 'מקורית'}!
          </p>
        )}
      </>
    );
  return (
    <>
      <h2>דרג.י את התשובה!</h2>
      {imposingSelf ? (
        <p>השחקן התחזה אלייך!</p>
      ) : (
        <p>השחקן ענה בתור {answerToRate.playingAs}</p>
      )}
      {!imposingSelf && (
        <>
          <p>ל{answerToRate.playingAs} יש את התיאור הבא:</p>
          <blockquote>
            {game.players[answerToRate.playingAs].politics}
          </blockquote>
        </>
      )}
      <p>הוא ענה:</p>
      <blockquote>{answerToRate.answer}</blockquote>
      {imposingSelf ? <p>עד כמה טוב התחזו אלייך?</p> : <p>האם הם מחתזים???</p>}
      <form className="form-control max-w-xl">
        <label className="flex gap-2 content-between">
          {imposingSelf ? <span>גרוע</span> : <span>!מתחזה</span>}
          <input
            type="range"
            min="-2"
            max="2"
            value={rating}
            className="range"
            onChange={(e) => setRating(Number(e.target.value))}
          />
          {imposingSelf ? <span>מצוין</span> : <span>מקורי</span>}
        </label>
        <div className="pt-2">
          <button
            className="btn"
            onClick={(e) => {
              e.preventDefault();
              submitAnswer();
            }}
          >
            שלח.י דירוג
          </button>
        </div>
        <p>{time}</p>
      </form>
      {lastAnswerWasImpostor !== undefined && (
        <p>התשובה הקודמת הייתה {lastAnswerWasImpostor ? 'מתחזת' : 'מקורית'}!</p>
      )}
    </>
  );
};

const Score = ({
  game,
  joinAnotherGame,
}: {
  game: Game & { phase: 'SCORE' };
  joinAnotherGame: () => void;
}) => {
  const [time] = useTimer(10);
  const [showDetails, setShowDetails] = useState(false);
  useEffect(() => {
    if (time === 0) {
      joinAnotherGame();
    }
  }, [time, joinAnotherGame]);
  return (
    <>
      <div className="right-firework" />
      <div className="left-firework" />
      <h1 className="text-center">תוצאות!</h1>
      {!showDetails ? (
        <>
          <h2 className="text-center my-2">פרס המתחזה</h2>
          <ul className="list-none">
            {Object.entries(game.scores.atImposing)
              .sort(([, a], [, b]) => b - a)
              .map(([player, score], i) => (
                <li className="text-center text-lg px-10" key={i}>
                  <img
                    src={numbers[i].src}
                    className="inline w-6 h-6 mx-2 my-0"
                  />
                  {player} התחזה ל{game.playerAnswers[player].playingAs} ו
                  {score >= 0 ? 'קיבל' : 'הפסיד'} {Math.abs(score)} נקודות
                </li>
              ))}
          </ul>
          <h2 className="text-center my-2">פרס הבלש</h2>
          <ul className="list-none">
            {Object.entries(game.scores.atGuessing)
              .sort(([, a], [, b]) => b - a)
              .map(([player, score], i) => (
                <li className="text-center text-lg" key={i}>
                  <img
                    src={numbers[i].src}
                    className="inline w-6 h-6 mx-2 my-0"
                  />
                  {player} {score >= 0 ? 'קיבל' : 'הפסיד'} {Math.abs(score)}{' '}
                  נקודות
                </li>
              ))}
          </ul>
        </>
      ) : (
        <ul className="mx-auto list-none">
          {Object.entries(game.playerAnswers).map(
            ([id, { playingAs, ratings }]) => {
              const wasImpostor = id !== playingAs;
              return (
                <li key={id}>
                  <h2 className="text-center">
                    {id} {wasImpostor ? `התחזה ל${playingAs}` : 'שיחק את עצמו'}
                  </h2>
                  <ul className="list-none flex">
                    {ratings
                      .sort((a, b) => b.rating - a.rating)
                      .map(({ rater, rating }) => (
                        <li
                          key={rater}
                          className={`px-4 ${
                            rater === playingAs ? 'font-bold' : ''
                          }`}
                        >
                          {rater} דירג {rating}
                        </li>
                      ))}
                  </ul>
                </li>
              );
            },
          )}
        </ul>
      )}
      <button
        className="mx-auto"
        onClick={() => setShowDetails(!showDetails)}
      ></button>
      <p className="text-center">המשחק הבא יתחיל בעוד: {time}</p>
    </>
  );
};

export default HomePage;
