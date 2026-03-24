import { run } from "./utils/action";

/**
 * Fetches and checks out the remote Git branch
 * @param repoUrl - The repository URL
 * @param branch - The branch to checkout
 * @param actor - The username for authentication
 * @param token - The token for authentication
 */
export function checkOutRemoteBranch(
  repoUrl: string,
  branch: string,
  actor: string,
  token: string,
): void {
  // Update remote URL to include auth information (so auto-fixes can be pushed)
  console.info(`Adding auth information to Git remote URL`);

  try {
    const cloneUrl = new URL(repoUrl);
    cloneUrl.username = actor;
    cloneUrl.password = token;
    run(`git remote set-url origin ${cloneUrl.toString()}`);
  } catch (error) {
    console.error("Failed to construct authenticated URL", error);
    throw error;
  }

  // Fetch remote branch
  console.info(`Fetching remote branch "${branch}"`);
  run(`git fetch --no-tags --depth=1 origin ${branch}`);

  // Switch to remote branch
  console.info(`Switching to the "${branch}" branch`);
  run(`git branch --force ${branch} --track origin/${branch}`);
  run(`git checkout ${branch}`);
}

/**
 * Stages and commits all changes using Git
 * @param message - Git commit message
 * @param skipVerification - Skip Git verification
 */
export function commitChanges(
  message: string,
  skipVerification: boolean,
): void {
  console.info(`Committing changes`);
  run(`git commit -am "${message}"${skipVerification ? " --no-verify" : ""}`);
}

/**
 * Returns the SHA of the head commit
 * @returns - Head SHA
 */
export function getHeadSha(): string {
  const { stdout } = run("git rev-parse HEAD");
  console.info(`SHA of last commit is "${stdout}"`);
  return stdout;
}

/**
 * Checks whether there are differences from HEAD
 * @returns - Boolean indicating whether changes exist
 */
export function hasChanges(): boolean {
  const output = run("git diff-index --name-status --exit-code HEAD --", {
    ignoreErrors: true,
  });
  const hasChangedFiles = output.status === 1;
  console.info(`${hasChangedFiles ? "Changes" : "No changes"} found with Git`);
  return hasChangedFiles;
}

/**
 * Pushes all changes to the remote repository
 * @param skipVerification - Skip Git verification
 */
export function pushChanges(skipVerification: boolean): void {
  console.info("Pushing changes with Git");
  run(`git push${skipVerification ? " --no-verify" : ""}`);
}

/**
 * Updates the global Git configuration with the provided information
 * @param name - Git username
 * @param email - Git email address
 */
export function setUserInfo(
  name = "GitLab CI",
  email = "gitlab-ci@gitlab.com",
): void {
  console.info(`Setting Git user information`);
  run(`git config --global user.name "${name}"`);
  run(`git config --global user.email "${email}"`);
}
