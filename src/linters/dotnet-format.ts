import { CommandOutput, LintResult } from "../types";
import { run } from "../utils/action";
import commandExists from "../utils/command-exists";
import { initLintResult } from "../utils/lint-result";

const PARSE_REGEX = /^(.*)\(([0-9]+),([0-9]+)\): (warning|error) (.*) \[.*$/gm;

/**
 * https://github.com/dotnet/format
 */
export default class DotnetFormat {
  static get linterName() {
    return "dotnet_format";
  }

  /**
   * Verifies that all required programs are installed. Throws an error if programs are missing
   * @param dir - Directory to run the linting program in
   * @param prefix - Prefix to the lint command
   */
  static async verifySetup(dir: string, prefix = ""): Promise<void> {
    // Verify that dotnet is installed (required to execute dotnet format)
    if (!(await commandExists("dotnet"))) {
      throw new Error(".NET SDK is not installed");
    }

    // Verify that dotnet-format is installed
    try {
      run(`${prefix} dotnet format --version`, { dir });
    } catch (err) {
      throw new Error(`${this.name} is not installed`);
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
    const fixArg = fix ? "" : "--verify-no-changes";
    return run(`${prefix} dotnet format ${fixArg} ${args}`, {
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
    lintResult.isSuccess = output.status === 0;

    const matches = output.stderr.matchAll(PARSE_REGEX);
    for (const match of matches) {
      const [_line, pathFull, line, _column, level, message] = match;
      const path = pathFull.substring(dir.length + 1);
      const lineNr = parseInt(line, 10);
      lintResult[level as "error" | "warning"].push({
        path,
        firstLine: lineNr,
        lastLine: lineNr,
        message: `${message}`,
      });
    }

    return lintResult;
  }
}
