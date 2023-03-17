import { observable } from '@trpc/server/observable';
import { EventEmitter } from 'events';
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import type { Game } from 'shared/game';
import { characters, CharacterId } from 'shared/characters';

const games: Record<string, Game> = {};

const assignCharacters = (playerIds: string[]) => {
  const questions = [];
  for (const playerId of playerIds) {
    const characterId = Object.keys(characters)[
      Math.floor(Math.random() * Object.keys(characters).length)
    ] as CharacterId;
    questions.push({ playerId, characterId });
  }
  return questions;
};

const newGame = (id: string) => {
  const game: Game = {
    id,
    playerIds: [],
    question: 'TODO: add questions',
    phase: 'LOBBY',
  };
  games[id] = game;
  return game;
};

const playerJoined = (gameId: string, playerId: string) => {
  const game = games[gameId];
  if (game.phase !== 'LOBBY') {
    console.error('Game already started', game);
  }
  if (!game.playerIds.includes(playerId)) {
    game.playerIds.push(playerId);
  }
  console.log(games);
  eventEmmiter.emit(gameId, game);
};

const playerLeft = (gameId: string, playerId: string) => {
  const game = games[gameId];
  if (game.phase !== 'LOBBY') {
    throw new Error('Game already started');
  }
  game.playerIds = game.playerIds.filter((id) => id !== playerId);
  eventEmmiter.emit(gameId, game);
};

const gameStarted = (gameId: string) => {
  const game = games[gameId];
  console.log(game);
  if (game.phase !== 'LOBBY') {
    throw new Error('Game already started');
  }
  const nextGame = {
    ...game,
    phase: 'ANSWER_QUESTION',
    characterAssignments: assignCharacters(game.playerIds),
    playerAnswers: [],
    timeRemaining: 60,
    // timer: setInterval(() => {
    //   const game = games[gameId];
    //   if (game.phase !== 'ANSWER_QUESTION') {
    //     return;
    //   }
    //   game.timeRemaining--;
    //   if (game.timeRemaining === 0) {
    //     clearInterval(game.timer);
    //     finishedAnsweringQuestions(gameId);
    //   }
    // }, 1000),
  } satisfies Game;
  games[gameId] = nextGame;
  console.log(games);
  eventEmmiter.emit(gameId, nextGame);
};

const questionAnswered = (gameId: string, playerId: string, answer: string) => {
  let game = games[gameId];
  if (game.phase !== 'ANSWER_QUESTION') {
    throw new Error('Game not in ANSWER_QUESTION phase');
  }
  const playerAssignment = game.characterAssignments.find(
    (assignment) => assignment.playerId === playerId,
  );
  if (!playerAssignment) {
    throw new Error('Player not in game');
  }
  game.playerAnswers.push({ ...playerAssignment, answer, ratings: [] });
  if (game.playerAnswers.length === game.playerIds.length) {
    game = {
      ...game,
      phase: 'RATE_ANSWERS',
      timeRemaining: 60,
      // timer: setInterval(() => {
      //   const game = games[gameId];
      //   if (game.phase !== 'RATE_ANSWERS') {
      //     return;
      //   }
      //   game.timeRemaining--;
      //   if (game.timeRemaining === 0) {
      //     clearInterval(game.timer);
      //     // finishedRatingAnswers(gameId);
      //   }
      // }, 1000),
    } satisfies Game;
    games[gameId] = game;
    eventEmmiter.emit(gameId, game);
  }
  eventEmmiter.emit(gameId, game);
};

const questionAnswerRated = (
  gameId: string,
  {
    rater,
    rating,
    questionIdx,
  }: {
    rater: string;
    rating: number;
    questionIdx: number;
  },
) => {
  const game = games[gameId];
  if (game.phase !== 'RATE_ANSWERS') {
    throw new Error('Game not in RATE_ANSWERS phase');
  }
  game.playerAnswers[questionIdx].ratings.push({
    rater,
    rating,
  });
  if (
    game.playerAnswers.every(
      (answer) => answer.ratings.length === game.playerIds.length - 1,
    )
  ) {
    finishedRatingAnswers(gameId);
    return;
  }
  eventEmmiter.emit(gameId, game);
};

const finishedRatingAnswers = (gameId: string) => {
  const game = games[gameId];
  if (game.phase !== 'RATE_ANSWERS') {
    throw new Error('Game not in RATE_ANSWERS phase');
  }
  // clearInterval(game.timer);
  const nextGame = {
    ...game,
    phase: 'SCORE',
    scores: 'TODO',
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

export const gameRouter = router({
  subscribeToGame: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .subscription(({ input: { gameId } }) => {
      if (!games[gameId]) {
        games[gameId] = newGame(gameId);
      }
      return observable<Game>((emit) => {
        const onGameUpdate = (game: Game) => emit.next(game);
        eventEmmiter.on(gameId, onGameUpdate);
        return () => {
          eventEmmiter.off(gameId, onGameUpdate);
        };
      });
    }),
  joinGame: publicProcedure
    .input(z.object({ gameId: z.string(), playerId: z.string() }))
    .mutation(({ input: { gameId, playerId } }) => {
      playerJoined(gameId, playerId);
    }),
  leaveGame: publicProcedure
    .input(z.object({ gameId: z.string(), playerId: z.string() }))
    .mutation(({ input: { gameId, playerId } }) => {
      playerLeft(gameId, playerId);
    }),
  startGame: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(({ input: { gameId } }) => {
      gameStarted(gameId);
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
      questionAnswered(gameId, playerId, answer);
    }),
  rateAnswer: publicProcedure
    .input(
      z.object({
        gameId: z.string(),
        rating: z.object({
          rater: z.string(),
          rating: z.number(),
          questionIdx: z.number(),
        }),
      }),
    )
    .mutation(
      ({
        input: {
          gameId,
          rating: { rater, rating, questionIdx },
        },
      }) => {
        questionAnswerRated(gameId, { rater, rating, questionIdx });
      },
    ),
});
