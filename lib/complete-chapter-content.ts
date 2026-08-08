import { androidEngineeringContent } from "./content-android-engineering";
import { composeContent } from "./content-compose";
import { coroutinesFlowContent } from "./content-coroutines-flow";
import { jetpackContent } from "./content-jetpack";
import { languageContent } from "./content-language";
import { productionAndroidContent } from "./content-production-android";
import type { CompleteChapterContent } from "./content-types";

export const completeChapterContent: Record<string, CompleteChapterContent> = {
  ...languageContent,
  ...coroutinesFlowContent,
  ...androidEngineeringContent,
  ...jetpackContent,
  ...composeContent,
  ...productionAndroidContent,
};
