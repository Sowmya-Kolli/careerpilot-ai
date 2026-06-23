# Skill: Security Guard

## Purpose
Apply security rules against proposed agent outputs or operations to prevent unintended actions and hallucination.

## When to Use
Run before completing any email ingestion step to verify that rules in `security_rules.md` are not violated.

## Input
- Full agent response payload
- Proposed actions list

## Output
- Verification status (Passed / Failed)
- Guardrail audit log listing checks

## Rules
1. Verify that `nextAction` does not propose automatic outgoing email sending without user approval.
2. Confirm there are no instructions to delete, move, or archive mails.
3. Validate that details are either grounded in the email text or strictly labeled `"Not available"`.
