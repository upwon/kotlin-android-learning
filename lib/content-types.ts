import type { Chapter } from "./course-data";

export type CompleteChapterContent = {
  sections: NonNullable<Chapter["sections"]>;
  exercise: NonNullable<Chapter["exercise"]>;
};
