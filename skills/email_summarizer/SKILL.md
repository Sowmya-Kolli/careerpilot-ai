# Skill: Email Summarizer

## Purpose
Condense long, complex recruiter emails into a single clear sentence or short bullets.

## When to Use
Triggered on job-related emails to generate executive summaries for dashboard updates.

## Input
- Email body text

## Output
- String summary (max 150 characters)

## Rules
1. Extract who sent it and the immediate action.
2. Example: "Google recruiter requested scheduling a technical interview next week."
3. Remove signature lines, boilerplates, and disclaimer footers.
