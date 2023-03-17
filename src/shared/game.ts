import type { CharacterId } from './characters';

interface CharacterAssignment {
  playerId: string;
  characterId: CharacterId;
}

interface PlayerAnswer extends CharacterAssignment {
  answer: string;
  ratings: { rater: string; rating: number }[];
}

export type Game = {
  id: string;
  playerIds: string[];
  question: string;
  // log: Logger;
} & (
  | {
      phase: 'LOBBY';
    }
  | {
      phase: 'ANSWER_QUESTION';
      characterAssignments: CharacterAssignment[];
      playerAnswers: PlayerAnswer[];
      timeRemaining: number;
      // timer: NodeJS.Timeout;
    }
  | {
      phase: 'RATE_ANSWERS';
      playerAnswers: PlayerAnswer[];
      timeRemaining: number;
      // timer: NodeJS.Timeout;
    }
  | {
      phase: 'SCORE';
      playerAnswers: PlayerAnswer[];
      scores: 'TODO'; // TODO
    }
);
