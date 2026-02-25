import type { FileContext } from "../context"
import { createProfileDatasetTool } from "./profile-dataset"
import { createRemoveNullsTool } from "./remove-nulls"

/**
 * Build all tools bound to a specific file context.
 * Each tool's execute function has access to the file's data.
 */
export function createTools(ctx: FileContext) {
  return {
    profile_dataset: createProfileDatasetTool(ctx),
    remove_nulls: createRemoveNullsTool(ctx),
  }
}
