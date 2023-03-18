import { observable } from '@trpc/server/observable';
import { EventEmitter } from 'events';
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import type { Game } from '../../shared/game';
import * as crypto from 'crypto';
import { prisma } from '../../server/prisma';
import { Prisma } from '@prisma/client';

const questions: readonly string[] = [
  'האם הכנסת רשאית לחוקק כל חוק?',
  'מה דעתך על התנהגות היועמ"שית סביב הרפורמה המשפטית וההפגנות?',
  "האם עדיף פוליטיקאי מושחת שמקדם את על הדברים לפי האג'נדה העדיפה עליי או להפך?",
  'מה גבולות חובת השירות בצה"ל כצבא העם?',
  'האם יש להגביל השתתפות במשחק הפוליטי של יחידים אנטי-דמוקרטיים "בלי נאמנות אין אזרחות"',
  'מתי לגיטימי למפגינים לחסום כביש?',
  'מה דעתך על התנהלות המשטרה מול ההפגנות?',
  'תנו דוגמה לפעולה ממשלתית שהייתם רוצים שבג"צ יוכל לפסול ופעולה ממשלתית שלא',
  'מה דעתך על מערכת היחסים בין בן גביר למפכ"ל?',
  'האם לדעתך וועדת בחירת שופטים שמורכבת מ3 נציגי קואליציה 1 נציג אופוזיציה 3 נציגי שופטים ומינוי שופט ברוב של 5/7 זה טוב למדינה ולמה?',
];

const newGame = (id: string) => {
  const game: Game = {
    id,
    players: Object.create(null),
    question: questions[Math.floor(Math.random() * questions.length)],
    phase: 'LOBBY',
  };
  games[id] = game;
  return game;
};

const finishedRatingAnswers = async (gameId: string) => {
  const game = games[gameId];
  if (game.phase !== 'RATE_ANSWERS') {
    throw new Error('Game not in RATE_ANSWERS phase');
  }
  const scores = {
    atImposing: Object.create(null),
    atGuessing: Object.create(null),
    total: Object.create(null),
  };
  for (const [id, { playingAs, ratings }] of Object.entries(
    game.playerAnswers,
  )) {
    const wasImpostor = id !== playingAs;
    scores.atImposing[id] = 0;
    scores.total[id] = scores.total[id] || 0;
    for (const { rater, rating } of ratings) {
      scores.atImposing[id] += rating;
      scores.total[id] += rating;
      scores.atGuessing[rater] = scores.atGuessing[rater] || 0;
      scores.total[rater] = scores.total[rater] || 0;
      if (wasImpostor) {
        scores.atGuessing[rater] -= rating;
        scores.total[rater] -= rating;
      } else {
        scores.atGuessing[rater] += rating;
        scores.total[rater] += rating;
      }
    }
  }
  // clearInterval(game.timer);
  const nextGame = {
    ...game,
    phase: 'SCORE',
    scores,
  } satisfies Game;
  games[gameId] = nextGame;
  eventEmmiter.emit(gameId, nextGame);
  await prisma.gameLogSimple.create({
    data: {
      id: game.id,
      game: nextGame as unknown as Prisma.JsonObject,
    },
  });
};

function startGame(gameId: string) {
  const game = games[gameId];
  if (game.phase !== 'LOBBY') {
    throw new Error('Game already started');
  }
  if (gameId === publicLobbyId) {
    publicLobbyId = undefined;
  }
  const playerIds = Object.keys(game.players);
  const assignments = Object.create(null);
  for (const playerId of Object.keys(game.players)) {
    // select a random player id
    const playingAs = playerIds[Math.floor(Math.random() * playerIds.length)];
    assignments[playerId] = { playingAs };
  }
  const nextGame = {
    ...game,
    phase: 'ANSWER_QUESTION',
    assignments,
    playerAnswers: Object.create(null),
  } satisfies Game;
  games[gameId] = nextGame;
  console.log(games);
  eventEmmiter.emit(gameId, nextGame);
}

type GameEvents = Record<string, (game: Game) => void>;

declare interface GameEventEmmiter {
  on<TEv extends keyof GameEvents>(event: TEv, listener: GameEvents[TEv]): this;
  off<TEv extends keyof GameEvents>(
    event: TEv,
    listener: GameEvents[TEv],
  ): this;
  once<TEv extends keyof GameEvents>(
    event: TEv,
    listener: GameEvents[TEv],
  ): this;
  emit<TEv extends keyof GameEvents>(
    event: TEv,
    ...args: Parameters<GameEvents[TEv]>
  ): boolean;
}

class GameEventEmmiter extends EventEmitter {}

const eventEmmiter = new GameEventEmmiter();

const games: Record<string, Game> = {};

let publicLobbyId: string | undefined;

export const gameRouter = router({
  subscribeToGame: publicProcedure
    .input(z.object({ playerId: z.string(), gameId: z.string() }))
    .subscription(({ input: { playerId, gameId } }) => {
      return observable<Game>((emit) => {
        const onGameUpdate = (game: Game) => emit.next(game);
        eventEmmiter.on(gameId, onGameUpdate);
        return () => {
          eventEmmiter.off(gameId, onGameUpdate);
          const game = games[gameId];
          if (!game) {
            return;
          }
          // TODO: do we want to clean up other keys?
          delete game.players[playerId];
          if (Object.keys(game.players).length === 0) {
            delete games[gameId];
          } else {
            eventEmmiter.emit(gameId, game);
          }
        };
      });
    }),
  joinGame: publicProcedure
    .input(
      z.object({
        gameId: z.string().optional(),
        playerId: z.string(),
        politics: z.string(),
      }),
    )
    .mutation(({ input: { gameId, playerId, politics } }) => {
      if (!gameId) {
        if (!publicLobbyId) {
          publicLobbyId = crypto.randomUUID();
        }
        gameId = publicLobbyId;
        if (!games[gameId]) {
          games[gameId] = newGame(gameId);
        }
      }
      const game = games[gameId];
      if (game.phase !== 'LOBBY') {
        console.error('Game already started', game);
      }
      if (!game.players[playerId]) {
        game.players[playerId] = { id: playerId, politics };
      }
      eventEmmiter.emit(gameId, game);
      if (Object.keys(game.players).length >= 5) {
        startGame(gameId);
      }
      return game;
    }),
  leaveGame: publicProcedure
    .input(z.object({ gameId: z.string(), playerId: z.string() }))
    .mutation(() => {
      throw new Error('Not implemented');
    }),
  startGame: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(({ input: { gameId } }) => {
      startGame(gameId);
    }),
  answerQuestion: publicProcedure
    .input(
      z.object({
        gameId: z.string(),
        playerId: z.string(),
        answer: z.string(),
      }),
    )
    .mutation(({ input: { gameId, playerId, answer } }) => {
      let game = games[gameId];
      if (game.phase !== 'ANSWER_QUESTION') {
        throw new Error('Game not in ANSWER_QUESTION phase');
      }
      const playerAssignment = game.assignments[playerId];
      if (!playerAssignment) {
        throw new Error('Player not in game');
      }
      game.playerAnswers[playerId] = {
        ...playerAssignment,
        answer,
        ratings: [],
      };
      if (
        Object.keys(game.playerAnswers).length ===
        Object.keys(game.players).length
      ) {
        game = {
          ...game,
          phase: 'RATE_ANSWERS',
        } satisfies Game;
        games[gameId] = game;
        eventEmmiter.emit(gameId, game);
      }
      eventEmmiter.emit(gameId, game);
    }),
  rateAnswer: publicProcedure
    .input(
      z.object({
        gameId: z.string(),
        rating: z.object({
          rater: z.string(),
          rating: z.number(),
          playerBeingRated: z.string(),
        }),
      }),
    )
    .mutation(
      async ({
        input: {
          gameId,
          rating: { rater, rating, playerBeingRated },
        },
      }) => {
        const game = games[gameId];
        if (game.phase !== 'RATE_ANSWERS') {
          throw new Error('Game not in RATE_ANSWERS phase');
        }
        game.playerAnswers[playerBeingRated].ratings.push({
          rater,
          rating,
        });
        if (
          Object.entries(game.playerAnswers).every(([player, answer]) => {
            const isImposter = player !== answer.playingAs;
            const expectedRatings =
              Object.keys(game.players).length - 1 - (isImposter ? 1 : 0);
            return answer.ratings.length === expectedRatings;
          })
        ) {
          await finishedRatingAnswers(gameId);
          return;
        }
        eventEmmiter.emit(gameId, game);
      },
    ),
});
