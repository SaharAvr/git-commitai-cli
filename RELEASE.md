# Release Process

This document describes the step-by-step process for releasing a new version of `git-commitai-cli`.

The release pipeline is fully automated via GitHub Actions when pushing to the `main` branch.

## Step-by-Step Flow

### 1. Commit and Push Feature/Fix Changes
First, make your source code changes, stage them, and commit them to the main branch:
```bash
git add .
git commit -m "feat(ai): update models"
git push origin main
```

### 2. Verify CI Passes
Check your GitHub repository to ensure the CI build and test suite pass successfully on the `main` branch.

### 3. Update Changelog & Version
* Open [CHANGELOG.md](file:///Users/sahar/Documents/Dev/git-commitai/CHANGELOG.md) and add a new release entry at the top, following the existing format:
  ```markdown
  ## [X.Y.Z] - YYYY-MM-DD

  ### Added / Changed / Fixed
  - Description of changes
  ```
* Open [package.json](file:///Users/sahar/Documents/Dev/git-commitai/package.json) and bump the version field:
  ```json
  "version": "X.Y.Z"
  ```

### 4. Commit the Release Preparation
Create a commit containing only the changelog and version bump. By convention, the commit message should be the new version number:
```bash
git add package.json CHANGELOG.md
git commit -m "X.Y.Z"
```

### 5. Push to Trigger Auto-Publishing
Push the release commit to GitHub:
```bash
git push origin main
```
This push will trigger the [.github/workflows/ci.yml](file:///Users/sahar/Documents/Dev/git-commitai/.github/workflows/ci.yml) workflow which will:
* Run lint, tests, and build checks.
* Automatically create and push the Git tag `vX.Y.Z`.
* Automatically publish the new package version to npm using OIDC Trusted Publishing and provenance.
