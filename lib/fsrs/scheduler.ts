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

export { fsrs, Rating, State, createEmptyCard };
export type { Card, RecordLogItem, FSRSParameters, IPreview, Grade };
