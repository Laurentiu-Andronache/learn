import { FSRS, generatorParameters, Rating, State, createEmptyCard } from 'ts-fsrs';
import type { Card, RecordLogItem, FSRSParameters, IPreview, Grade } from 'ts-fsrs';

// Initialize FSRS with default parameters
const params = generatorParameters();
const fsrs = new FSRS(params);

export { fsrs, Rating, State, createEmptyCard };
export type { Card, RecordLogItem, FSRSParameters, IPreview, Grade };
