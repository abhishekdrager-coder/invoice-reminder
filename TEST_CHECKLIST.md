# Manual Test Checklist

1. Landing page loads with hero, features, pricing, and CTA sections.
2. Signup with email/password succeeds.
3. Login with email/password succeeds.
4. Google OAuth redirects correctly.
5. Unauthenticated user visiting `/dashboard` is redirected to `/login`.
6. Dashboard stat cards render with invoice data.
7. Creating a new client from the invoice form succeeds.
8. Creating an invoice with an existing client succeeds.
9. Default reminder sequence is attached to a new invoice.
10. Invoice list filter switches between all/unpaid/paid/disputed.
11. Marking an invoice as paid updates status and skips pending reminders.
12. Editing an invoice updates amount, due date, and description.
13. Deleting an invoice removes it from the invoice list.
14. CSV import parses valid rows and creates invoices.
15. Reminder settings save updated templates and tone.
16. AI rewrite API returns rewritten subject/body in selected tone.
17. Cron endpoint sends eligible reminders and updates `sent_at`.
18. Stripe checkout creates a subscription session.
19. Stripe webhook updates the subscription row.
20. Inbound email webhook stores replies and marks invoices paid when intent is detected.
