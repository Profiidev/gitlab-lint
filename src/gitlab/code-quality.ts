import { createHash } from "crypto";
import { LintResult, LintIssue } from "../types";

export interface CodeQualityIssue {
  description: string;
  check_name: string;
  fingerprint: string;
  severity: "info" | "minor" | "major" | "critical" | "blocker";
  location: {
    path: string;
    lines: {
      begin: number;
      end: number;
    };
  };
}

function generateFingerprint(issue: LintIssue, linterName: string): string {
  const data = `${linterName}:${issue.path}:${issue.firstLine}:${issue.lastLine}:${issue.message}`;
  return createHash("md5").update(data).digest("hex");
}

function mapIssueToCodeQuality(
  issue: LintIssue,
  severity: "minor" | "major",
  linterName: string,
): CodeQualityIssue {
  return {
    description: issue.message,
    check_name: linterName,
    fingerprint: generateFingerprint(issue, linterName),
    severity,
    location: {
      path: issue.path,
      lines: {
        begin: issue.firstLine,
        end: issue.lastLine,
      },
    },
  };
}

export function generateCodeQualityReport(
  results: Array<{ linter: string; result: LintResult }>,
): CodeQualityIssue[] {
  const report: CodeQualityIssue[] = [];

  for (const { linter, result } of results) {
    for (const issue of result.error) {
      report.push(mapIssueToCodeQuality(issue, "major", linter));
    }
    for (const issue of result.warning) {
      report.push(mapIssueToCodeQuality(issue, "minor", linter));
    }
  }

  return report;
}
