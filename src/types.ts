export interface LintIssue {
  path: string;
  firstLine: number;
  lastLine: number;
  message: string;
}

export interface LintResult {
  isSuccess: boolean;
  warning: LintIssue[];
  error: LintIssue[];
}

export interface CommandOutput {
  status: number;
  stdout: string;
  stderr: string;
}

export interface Linter {
  linterName: string;
  verifySetup(dir: string, prefix?: string): Promise<void>;
  lint(
    dir: string,
    extensions: string[],
    args?: string,
    fix?: boolean,
    prefix?: string,
  ): CommandOutput;
  parseOutput(dir: string, output: CommandOutput): LintResult;
}
