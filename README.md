# Kontak

This project is a web application that connects WhatsApp to a REST API. The application consists of four main parts:
1. A WhatsApp client that is used to send and receive messages.
2. A REST API built using Go that is used to send and receive messages.
3. A web interface built using Next.js 14 with shadcn/ui that is used to manage the messages.
4. A website that is used to manage the WhatsApp account.

## Technology Stack

This project utilizes the following technologies:

- **Backend**: The backend is built using **Golang**. It leverages the **Echo** web framework for handling HTTP requests and routing.
- **WhatsApp WebSocket Library**: The project uses **Whatsmeow** as the WebSocket library to connect and interact with WhatsApp.
- **Web Interface**: The web interface is built using **Next.js 14** with **shadcn/ui** for managing messages.
- **Website**: The website for managing the WhatsApp account is also built using **Next.js 14** with **shadcn/ui**.

## Release Process

This project uses [semantic-release](https://github.com/semantic-release/semantic-release) for automated versioning and CHANGELOG generation. The release process is triggered automatically when commits are pushed to the main branch.

### Commit Message Format

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification. Commit messages should be structured as follows:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

#### Types
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to our CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files

#### Examples

```
feat(api): add endpoint for sending messages
```

```
fix(web): resolve issue with message display
```

```
docs: update README with setup instructions
```

The commit type (feat, fix, etc.) determines how the version will be incremented:
- `feat`: Minor version bump (1.0.0 -> 1.1.0)
- `fix`, `perf`, `refactor`: Patch version bump (1.0.0 -> 1.0.1)
- `BREAKING CHANGE` in commit body: Major version bump (1.0.0 -> 2.0.0)
