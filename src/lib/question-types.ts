// P1-C: the question-type registry. Deliberately separate from
// src/lib/practice-taxonomy.ts's QuestionType union - that union is the
// existing, still-unchanged contract every current route already relies
// on (api/practice/attempts, api/practice/questions,
// question-validation.ts). Nothing here is wired into any of those routes
// yet; this registry exists for P1-E's exam runner and P1-G's admin
// import/validation tooling to use once they're built.
//
// 16 entries total: the 12 new types this phase adds, plus the 4 existing
// types re-declared as aliases whose grade() reproduces
// api/practice/attempts/route.ts's real logic exactly (see
// graders/existing-types.ts's own comment) - so any future caller of this
// registry sees one consistent interface across every type, old and new,
// without the old route needing to change at all.

import type { QuestionTypeDef } from "./question-types/types";
import { gapFillGrader } from "./question-types/graders/gap-fill";
import { trueFalseNotGivenGrader } from "./question-types/graders/true-false-not-given";
import { yesNoNotGivenGrader } from "./question-types/graders/yes-no-not-given";
import { multiSelectGrader } from "./question-types/graders/multi-select";
import { matchingGrader } from "./question-types/graders/matching";
import { labellingGrader } from "./question-types/graders/labelling";
import { orderingGrader } from "./question-types/graders/ordering";
import { highlightWordsGrader } from "./question-types/graders/highlight-words";
import { dictationGrader } from "./question-types/graders/dictation";
import { numericEntryGrader } from "./question-types/graders/numeric-entry";
import { longWritingGrader } from "./question-types/graders/long-writing";
import { timedSpeakingGrader } from "./question-types/graders/timed-speaking";
import {
  multipleChoiceGrader,
  readingComprehensionGrader,
  listeningComprehensionGrader,
  shortAnswerGrader,
} from "./question-types/graders/existing-types";

export type { GradeResult, QuestionTypeDef } from "./question-types/types";
export { wordCount } from "./question-types/graders/long-writing";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- registry deliberately holds defs of differing Answer types
export const QUESTION_TYPE_REGISTRY: Record<string, QuestionTypeDef<any>> = {
  // 12 new types (P1-C).
  GAP_FILL: gapFillGrader,
  TRUE_FALSE_NOT_GIVEN: trueFalseNotGivenGrader,
  YES_NO_NOT_GIVEN: yesNoNotGivenGrader,
  MULTI_SELECT: multiSelectGrader,
  MATCHING: matchingGrader,
  LABELLING: labellingGrader,
  ORDERING: orderingGrader,
  HIGHLIGHT_WORDS: highlightWordsGrader,
  DICTATION: dictationGrader,
  NUMERIC_ENTRY: numericEntryGrader,
  LONG_WRITING: longWritingGrader,
  TIMED_SPEAKING: timedSpeakingGrader,

  // Existing 4 types, aliased in unchanged (see graders/existing-types.ts).
  MULTIPLE_CHOICE: multipleChoiceGrader,
  READING_COMPREHENSION: readingComprehensionGrader,
  LISTENING_COMPREHENSION: listeningComprehensionGrader,
  SHORT_ANSWER: shortAnswerGrader,
};

export const QUESTION_TYPE_KEYS = Object.keys(QUESTION_TYPE_REGISTRY);

export function isValidQuestionTypeKey(key: string): boolean {
  return key in QUESTION_TYPE_REGISTRY;
}

export function getQuestionTypeDef(key: string): QuestionTypeDef | undefined {
  return QUESTION_TYPE_REGISTRY[key];
}
