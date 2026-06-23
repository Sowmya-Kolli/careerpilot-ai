# Skill: Deadline Extractor

## Purpose
Identify date constraints, deadlines, scheduled times, or calendar requests in emails.

## When to Use
Run during details extraction to highlight key actionable dates on the dashboard tracking list.

## Input
- Email body text

## Output
- Extracted Date/Time String (or "Not available")

## Rules
1. Scan for terms like "by date", "before date", "schedule by", "due on", "interview on".
2. If exact date/time is found, extract it and format as `YYYY-MM-DD` or a readable schedule string (e.g. `2026-06-25`).
3. If no specific action timeline is given, default to `"Not available"`. Do not hallucinate or assume.
4. Convert relative terms like "by next Friday" relative to email date if known, or write "Next Friday".
