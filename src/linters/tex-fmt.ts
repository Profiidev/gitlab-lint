import { run } from "../utils/action";
import commandExists from "../utils/command-exists";
import { initLintResult } from "../utils/lint-result";
import { CommandOutput, LintResult } from "../types";

export default class TexFmt {
  static get linterName(): string {
    return "tex-fmt";
  }

  /**
   * Verifies that all required programs are installed. Throws an error if programs are missing
   * @param dir - Directory to run the linting program in
   * @param prefix - Prefix to the lint command
   */
  static async verifySetup(dir: string, prefix = ""): Promise<void> {
    if (!(await commandExists("tex-fmt"))) {
      throw new Error("tex-fmt is not installed");
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
    const auto_fix = fix ? "-r" : "-cr";
    return run(`tex-fmt ${auto_fix} ${args}`, {
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

    // Format: ERROR: tex-fmt ./relative/path/to/file.tex: Line 1 (2). Incorrect formatting
    // The "Line <number> " part is optional as well as the "(<old_line>). " part.

    if (output.status === 0 && !output.stdout) {
      return lintResult;
    }

    const lines = output.stdout.split(/\r?\n/);

    const regex =
      /^(ERROR|WARN): tex-fmt (.+?):(?: Line (\d+))?(?: \((\d+)\))?\. (.*)/;

    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        const [, level, path, lineNo, , message] = match;

        const issue = {
          path,
          firstLine: parseInt(lineNo, 10),
          lastLine: parseInt(lineNo, 10),
          message,
        };

        if (level === "ERROR") {
          lintResult.error.push(issue);
        } else if (level === "WARN") {
          lintResult.warning.push(issue);
        }
      }
    }

    lintResult.isSuccess = output.status === 0;

    return lintResult;
  }
}
