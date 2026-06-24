# Branch protection (manual setup)

After pushing this repository to GitHub, enable branch protection on `main`:

1. Go to **Settings → Branches → Add branch protection rule**
2. Branch name pattern: `main`
3. Enable **Require status checks to pass before merging**
4. Select the **quality** job from the **CI** workflow
5. Enable **Require branches to be up to date before merging** (recommended)

GitHub Actions cannot configure branch protection automatically without admin API tokens.
