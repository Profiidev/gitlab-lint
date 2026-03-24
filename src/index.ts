import { existsSync, writeFileSync } from "fs";
import { join } from "path";
import * as git from "./git";
import linters from "./linters";
import { getSummary } from "./utils/lint-result";
import { getEnv } from "./utils/action";
import { generateCodeQualityReport } from "./gitlab/code-quality";
import { LintResult } from "./types";

async function run() {
  const workspace = getEnv("CI_PROJECT_DIR") || process.cwd();
  const autoFix = getEnv("AUTO_FIX") === "true";
  const commit = getEnv("COMMIT") === "true";
  const skipVerification = getEnv("GIT_NO_VERIFY") === "true";
  const continueOnError = getEnv("CONTINUE_ON_ERROR") === "true";
  const commitMessage =
    getEnv("COMMIT_MESSAGE") || "style: fix linting issues for ${linter}";
  const reportPath = getEnv("REPORT_PATH") || "gl-code-quality-report.json";

  // Git auth for auto-fix
  const gitUser = getEnv("GIT_USER") || "GitLab CI";
  const gitEmail = getEnv("GIT_EMAIL") || "gitlab-ci@gitlab.com";
  const gitToken = getEnv("ACCESS_TOKEN"); // Token with write access

  if (autoFix) {
    if (!gitToken) {
      console.warn(
        "AUTO_FIX is enabled but ACCESS_TOKEN is not set. Pushing changes might fail.",
      );
    }

    git.setUserInfo(gitUser, gitEmail);

    // Determine branch and repo
    const branch =
      getEnv("CI_COMMIT_BRANCH") ||
      getEnv("CI_MERGE_REQUEST_SOURCE_BRANCH_NAME");
    const repoUrl = getEnv("CI_REPOSITORY_URL");

    if (branch && repoUrl && gitToken) {
      // We need to checkout the actual branch to push to it, as CI usually runs on detached HEAD
      const actor = getEnv("GITLAB_USER_LOGIN") || "gitlab-ci-token";
      git.checkOutRemoteBranch(repoUrl, branch, actor, gitToken);
    }
  }

  let hasFailures = false;
  const results: Array<{ linter: string; result: LintResult }> = [];

  for (const [linterId, linter] of Object.entries(linters)) {
    const isEnabled = getEnv(linterId.toUpperCase()) === "true";

    if (isEnabled) {
      console.group(`Run ${linter.linterName}`);

      const extensionsVar = `${linterId.toUpperCase()}_EXTENSIONS`;
      const fileExtensions = getEnv(extensionsVar);
      if (!fileExtensions) {
        throw new Error(
          `${extensionsVar} is required for ${linter.linterName}`,
        );
      }

      const args = getEnv(`${linterId.toUpperCase()}_ARGS`) || "";
      const lintDirRel = getEnv(`${linterId.toUpperCase()}_DIR`) || ".";
      const prefix = getEnv(`${linterId.toUpperCase()}_COMMAND_PREFIX`);
      const lintDirAbs = join(workspace, lintDirRel);
      const linterAutoFix =
        autoFix || getEnv(`${linterId.toUpperCase()}_AUTO_FIX`) === "true";

      if (!existsSync(lintDirAbs)) {
        throw new Error(
          `Directory ${lintDirAbs} for ${linter.linterName} doesn't exist`,
        );
      }

      console.info(`Verifying setup for ${linter.linterName}...`);
      await linter.verifySetup(lintDirAbs, prefix || undefined);
      console.info(`Verified ${linter.linterName} setup`);

      const fileExtList = fileExtensions.split(",");
      console.info(
        `Will use ${linter.linterName} to check files with extensions: ${fileExtList.join(", ")}`,
      );

      console.info(
        `Linting ${linterAutoFix ? "and auto-fixing " : ""}files in ${lintDirAbs}...`,
      );

      const output = linter.lint(
        lintDirAbs,
        fileExtList,
        args,
        linterAutoFix,
        prefix || undefined,
      );
      const lintResult = linter.parseOutput(workspace, output);
      const summary = getSummary(lintResult);

      console.info(
        `${linter.linterName} found ${summary} (${lintResult.isSuccess ? "success" : "failure"})`,
      );

      if (!lintResult.isSuccess) {
        hasFailures = true;
      }

      results.push({ linter: linter.linterName, result: lintResult });

      if (linterAutoFix && commit) {
        if (git.hasChanges()) {
          const msg = commitMessage.replace(/\${linter}/g, linter.linterName);
          git.commitChanges(msg, skipVerification);
          git.pushChanges(skipVerification);
        }
      }

      console.groupEnd();
    }
  }

  // Generate Code Quality Report
  console.info(`Generating Code Quality report at ${reportPath}`);
  const codeQualityReport = generateCodeQualityReport(results);
  writeFileSync(reportPath, JSON.stringify(codeQualityReport, null, 2));

  if (hasFailures && !continueOnError) {
    console.error(
      "Linting failures detected. Check the Code Quality report artifact.",
    );
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
