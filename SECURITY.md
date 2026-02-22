# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | Yes                |

## Reporting a Vulnerability

If you discover a security vulnerability in React-Finity, please report it responsibly. **Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email the maintainer directly at the address listed on the [GitHub profile](https://github.com/tyevco) or use [GitHub's private vulnerability reporting](https://github.com/tyevco/react-finity/security/advisories/new) feature.

When reporting, please include:

- A description of the vulnerability
- Steps to reproduce the issue
- The potential impact
- Any suggested fixes, if applicable

You can expect an initial response within 72 hours. Once the vulnerability is confirmed, a fix will be prioritized and released as soon as practical. You will be credited in the release notes unless you prefer to remain anonymous.

## Scope

React-Finity is a client-side browser application. It does not have a backend server, user authentication, or database. The primary security concerns are:

- **Supply chain** -- third-party npm dependencies that could introduce vulnerabilities
- **Client-side injection** -- any vectors where untrusted input could lead to code execution (e.g., loading malicious project files)
- **Export integrity** -- ensuring exported STL/3MF files are not vectors for downstream exploitation

## Best Practices

If you are running React-Finity locally or deploying it:

- Keep dependencies up to date (`npm audit` regularly)
- Only load project files from trusted sources
- Use a modern, up-to-date browser
