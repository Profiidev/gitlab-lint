import { run } from "../utils/action";
import commandExists from "../utils/command-exists";
import { initLintResult } from "../utils/lint-result";
import { CommandOutput, LintResult } from "../types";

/**
 * https://www.typescriptlang.org/docs/handbook/compiler-options.html
 */
export default class TSC {
  static get linterName(): string {
    return "tsc";
  }

  /**
   * Verifies that all required programs are installed. Throws an error if programs are missing
   * @param dir - Directory to run the linting program in
   * @param prefix - Prefix to the lint command
   */
  static async verifySetup(dir: string, prefix = ""): Promise<void> {
    if (!(await commandExists("npm"))) {
      throw new Error("npm is not installed");
    }

    try {
      const commandPrefix = prefix || "npx --no-install";
      run(`${commandPrefix} tsc -v`, { dir });
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
    // --noEmit is standard for linting without building
    // --pretty false makes parsing easier
    return run(`${commandPrefix} tsc --noEmit --pretty false ${args}`, {
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

    // TSC outputs to stdout usually
    // Format: relative/path/to/file.ts(1,23): error TS2304: Cannot find name 'x'.

    if (output.status === 0 && !output.stdout) {
      return lintResult;
    }

    const lines = output.stdout.split(/\r?\n/);

    // Regex to match: path(line,col): error code: message
    const regex =
      /^([^(]+)\((\d+),(\d+)\): (error|warning|info) (TS\d+): (.*)$/;

    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        const [_, path, lineNo, colNo, level, code, message] = match;
        const issue = {
          path,
          firstLine: parseInt(lineNo, 10),
          lastLine: parseInt(lineNo, 10),
          message: `${code}: ${message}`,
        };

        if (level === "error") {
          lintResult.error.push(issue);
        } else if (level === "warning") {
          lintResult.warning.push(issue);
        }
      }
    }

    // Determine success based on error count or status code.
    // TSC exit code is non-zero if errors found.
    lintResult.isSuccess = output.status === 0;

    return lintResult;
  }
}
