import { run } from "../utils/action";
import commandExists from "../utils/command-exists";
import { initLintResult } from "../utils/lint-result";
import { CommandOutput, LintResult } from "../types";

/**
 * https://github.com/sveltejs/language-tools/tree/master/packages/svelte-check
 */
export default class Svelte {
  static get linterName(): string {
    return "svelte";
  }

  /**
   * Verifies that all required programs are installed. Throws an error if programs are missing
   * @param dir - Directory to run the linting program in
   * @param prefix - Prefix to the lint command
   */
  static async verifySetup(dir: string, prefix = ""): Promise<void> {
    // Verify that NPM is installed (required to execute svelte-check)
    if (!(await commandExists("npm"))) {
      throw new Error("npm is not installed");
    }

    // Verify that svelte-check is installed
    const commandPrefix = prefix || "npx --no-install";
    try {
      run(`${commandPrefix} svelte-check --version`, { dir });
    } catch (err) {
      throw new Error(`${this.linterName} is not installed`);
    }
  }

  /**
   * Runs the linting program and returns the command output
   * @param dir - Directory to run the linter in
   * @param extensions - File extensions which should be linted
   * @param args - Additional arguments to pass to the linter
   * @param fix - Whether the linter should attempt to fix code style issues automatically
   * @param prefix - Prefix to the lint command
   * @returns - Output of the lint command
   */
  static lint(
    dir: string,
    extensions: string[],
    args = "",
    fix = false,
    prefix = "",
  ): CommandOutput {
    if (fix) {
      console.warn(`${this.linterName} does not support auto-fixing`);
    }

    const commandPrefix = prefix || "npx --no-install";
    return run(`${commandPrefix} svelte-check --output machine ${args}`, {
      dir,
      ignoreErrors: true,
    });
  }

  /**
   * Parses the output of the lint command. Determines the success of the lint process and the
   * severity of the identified code style violations
   * @param dir - Directory in which the linter has been run
   * @param output - Output of the lint command
   * @returns - Parsed lint result
   */
  static parseOutput(dir: string, output: CommandOutput): LintResult {
    const lintResult = initLintResult();

    if (!output.stdout) {
      lintResult.isSuccess = output.status === 0;
      return lintResult;
    }

    const lines = output.stdout.split(/\r?\n/);

    // Regex for: "filename" line col "message" (level)
    const regex = /^"([^"]+)"\s+(\d+)\s+(\d+)\s+"([^"]+)"\s+\(([^)]+)\)$/;

    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        const [_, path, lineNo, colNo, message, level] = match;
        const issue = {
          path,
          firstLine: parseInt(lineNo, 10),
          lastLine: parseInt(lineNo, 10),
          message,
        };

        if (level === "error") {
          lintResult.error.push(issue);
        } else if (level === "warning") {
          lintResult.warning.push(issue);
        }
      }
    }

    // Explicitly check for errors to determine success
    lintResult.isSuccess = output.status === 0 || lintResult.error.length === 0;

    return lintResult;
  }
}
