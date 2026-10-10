# Money Buddies

Live app: https://fwmaicon.github.io/money-buddies/

A personal finance phone app (installable PWA). Plain HTML, CSS and JS, no build step. All data stays on the phone (localStorage), with backup and restore in Settings.

## Tabs
- **Bills** (Billy): monthly and one-time bills, paid or not paid per month, reminders 0, 1, 3 or 7 days before.
- **Savings** (Sprout): goal jars, deposits and withdrawals.
- **Debit** (Swipe): everyday card purchases against a weekly budget.
- **Summary** (Wally): month income from your pay schedule plus extra income, split Monday to Sunday by week, with each week's bills and what is left.

## Reminders
- In-app alert on the Bills tab and a phone notification when the app is opened on a reminder day.
- Android (installed app): a background check about twice a day via Periodic Background Sync.
- Most reliable on any phone: Settings > Add bills to my calendar exports an .ics file with a 9am alarm on each reminder day.

## Run locally
`python3 -m http.server` in this folder, then open http://localhost:8000. It must be served over HTTPS (or localhost) to install and to send notifications.
