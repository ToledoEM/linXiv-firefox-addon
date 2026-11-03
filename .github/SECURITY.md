# Security Policy

## Supported versions

The addon is under active development. Security fixes go to `main` and the latest release only.

Vulnerabilities in linXiv itself belong upstream at [linxiv-dev/linXiv](https://github.com/linxiv-dev/linXiv). If you are unsure which side a problem is on, report it here and it will be forwarded.

## Reporting a vulnerability

Do **not** open a public issue, pull request or discussion.

Use GitHub private vulnerability reporting: the repository's **Security** tab, then **Report a vulnerability**. Include the addon version, Firefox version, which backend you use, and steps to reproduce.

Reports are acknowledged within 7 days. Disclosure is coordinated within 90 days of acknowledgement, on a date agreed with the reporter.

## Scope notes

Most relevant: what the addon reads from pages, the server token kept in the Firefox profile, requests to the configured server and to metadata registries, and handling of PDF links, including signed ones.
