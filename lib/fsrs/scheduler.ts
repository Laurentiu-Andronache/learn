import type {
  Card,
  FSRSParameters,
  Grade,
  IPreview,
  RecordLogItem,
} from "ts-fsrs";
import {
  createEmptyCard,
  FSRS,
  generatorParameters,
  Rating,
  State,
} from "ts-fsrs";

// Initialize FSRS with default parameters
const params = generatorParameters({ enable_fuzz: true });
const fsrs = new FSRS(params);

// Create a per-user FSRS scheduler with custom retention/interval settings
export function createUserScheduler(settings: {
  desired_retention: number;
  max_review_interval: number;
}): FSRS {
  return new FSRS(
    generatorParameters({
      enable_fuzz: true,
      request_retention: settings.desired_retention,
      maximum_interval: settings.max_review_interval,
    }),
  );
}

export { fsrs, Rating, State, createEmptyCard };
export type { Card, RecordLogItem, FSRSParameters, IPreview, Grade };
