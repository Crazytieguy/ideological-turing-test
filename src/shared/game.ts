export interface Player {
  id: string;
  politics: string;
}

interface Assignment {
  playingAs: string;
}

interface PlayerAnswer extends Assignment {
  answer: string;
  ratings: { rater: string; rating: number }[];
}

export type Game = {
  id: string;
  players: Record<string, Player>;
  question: string;
  // log: Logger;
} & (
  | {
      phase: 'LOBBY';
    }
  | {
      phase: 'ANSWER_QUESTION';
      assignments: Record<string, Assignment>;
      playerAnswers: Record<string, PlayerAnswer>;
      // timeRemaining: number;
      // timer: NodeJS.Timeout;
    }
  | {
      phase: 'RATE_ANSWERS';
      playerAnswers: Record<string, PlayerAnswer>;
      // timeRemaining: number;
      // timer: NodeJS.Timeout;
    }
  | {
      phase: 'SCORE';
      playerAnswers: Record<string, PlayerAnswer>;
      scores: Record<string, number>;
    }
);
