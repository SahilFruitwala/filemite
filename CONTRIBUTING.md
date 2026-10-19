# Contributing to Filemite

Thank you for your interest in contributing to Filemite! We welcome contributions from everyone.

## 🚀 Getting Started

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally:
    ```bash
    git clone https://github.com/your-username/filemite.git
    cd filemite
    ```
3.  **Install dependencies**:
    ```bash
    pnpm install
    ```
4.  **Create a new branch** for your feature or bugfix:
    ```bash
    git checkout -b feature/my-new-feature
    ```
5.  **Make your changes** and ensure the project still builds:
    ```bash
    pnpm build
    ```
6.  **Run the checks** (CI runs the same ones):
    ```bash
    pnpm typecheck   # needs a prior pnpm build for the generated route tree
    pnpm lint
    pnpm test
    pnpm test:e2e    # after pnpm build; needs `pnpm exec playwright install chromium` once
    ```

## 🛠️ Development Guidelines

### Code Style
- We use **TypeScript** for all logic.
- We use **Tailwind CSS** for styling.
- Follow the existing code structure and naming conventions.
- Keep components small, focused, and reusable.

### Pull Request Process
1.  Ensure your code follows the project's style and passes linting.
2.  Provide a clear and descriptive PR title and description.
3.  Include screenshots or videos for UI changes if applicable.
4.  Once submitted, wait for a maintainer to review your PR.

## 🐛 Reporting Issues
If you find a bug or have a feature request, please [open an issue](https://github.com/SahilFruitwala/filemite/issues) on GitHub. Provide as much detail as possible, including steps to reproduce the bug.

## 📄 Code of Conduct
Please be respectful and professional in your interactions within the project.

---

Happy coding! 🚀
