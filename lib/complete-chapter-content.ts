import { androidEngineeringContent } from "./content-android-engineering";
import { coroutinesFlowContent } from "./content-coroutines-flow";
import { languageContent } from "./content-language";
import type { CompleteChapterContent } from "./content-types";

export const completeChapterContent: Record<string, CompleteChapterContent> = {
  ...languageContent,
  ...coroutinesFlowContent,
  ...androidEngineeringContent,
};
