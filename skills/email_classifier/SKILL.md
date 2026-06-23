# Skill: Email Classifier

## Purpose
Classify recruiter responses into distinct application tracking states.

## When to Use
Triggered when an incoming email is determined to be job-related.

## Input
- Email body text
- Subject line

## Output
- Category: `OFFER` | `INTERVIEW` | `ASSESSMENT` | `REJECTED` | `PENDING` | `GENERAL UPDATE`
- Confidence Score: `0.0 - 1.0`

## Rules
1. Match "assessment", "hackerrank", "codility", "test", "quiz" to `ASSESSMENT`.
2. Match "interview", "call", "schedule", "google meet", "zoom" to `INTERVIEW`.
3. Match "offer", "congratulations", "pleased to invite" (with package details) to `OFFER`.
4. Match "not moving forward", "unfortunate", "thank you for interest but" to `REJECTED`.
5. Fallback to `PENDING` if it's confirmation of submission, or `GENERAL UPDATE` for status questions.
