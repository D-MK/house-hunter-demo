/**
 * Single source of truth for links back to this project's own GitHub repo.
 * Update GITHUB_REPO if the repo is ever renamed or moved.
 */
export const GITHUB_REPO = "https://github.com/D-MK/house-hunter-demo";
const GITHUB_BRANCH = "main";

/** Link to a file in this repo at its current branch, e.g. "src/lib/parse.ts". */
export function githubFile(path: string): string {
  return `${GITHUB_REPO}/blob/${GITHUB_BRANCH}/${path}`;
}
