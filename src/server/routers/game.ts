import { observable } from '@trpc/server/observable';
import { EventEmitter } from 'events';
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import type { Game } from '../../shared/game';

const questions: readonly string[] = [
  'האם הכנסת רשאית לחוקק כל חוק?',
  'מה דעתך על התנהגות היועמ"שית סביב הרפורמה המשפטית וההפגנות?',
  "האם עדיף פוליטיקאי מושחת שמקדם את על הדברים לפי האג'נדה העדיפה עליי או להפך?",
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

const finishedRatingAnswers = (gameId: string) => {
  const game = games[gameId];
  if (game.phase !== 'RATE_ANSWERS') {
    throw new Error('Game not in RATE_ANSWERS phase');
  }
  const scores = Object.create(null);
  for (const [id, answer] of Object.entries(game.playerAnswers)) {
    const wasImpostor = id !== answer.playingAs;
    if (!scores[id]) {
      scores[id] = 0;
    }
    for (const rating of answer.ratings) {
      scores[id] += rating.rating;
      if (!scores[rating.rater]) {
        scores[rating.rater] = 0;
      }
      if (wasImpostor) {
        scores[rating.rater] -= rating.rating;
      } else {
        scores[rating.rater] += rating.rating;
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
};

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
    .input(z.object({ gameId: z.string() }))
    .subscription(({ input: { gameId } }) => {
      return observable<Game>((emit) => {
        const onGameUpdate = (game: Game) => emit.next(game);
        eventEmmiter.on(gameId, onGameUpdate);
        return () => {
          eventEmmiter.off(gameId, onGameUpdate);
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
      console.log(games);
      eventEmmiter.emit(gameId, game);
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
      const game = games[gameId];
      console.log(game);
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
        const playingAs =
          playerIds[Math.floor(Math.random() * playerIds.length)];
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
      ({
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
          finishedRatingAnswers(gameId);
          return;
        }
        eventEmmiter.emit(gameId, game);
      },
    ),
});
