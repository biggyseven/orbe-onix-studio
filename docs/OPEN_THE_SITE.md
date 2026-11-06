# Open ORBE & ONIX in your browser

You do **not** need to download the repository to view the website.

## 1. Enable GitHub Pages once

1. Open the repository: https://github.com/biggyseven/orbe-onix-studio
2. Open **Settings** → **Pages**.
3. In **Build and deployment**, set **Source** to **GitHub Actions**.
4. Save if GitHub presents a Save button.

The repository already contains `.github/workflows/pages.yml`, so do not create another deployment workflow.

## 2. Start the first deployment

1. Open **Actions**: https://github.com/biggyseven/orbe-onix-studio/actions
2. Select **Deploy static site to GitHub Pages**.
3. Click **Run workflow**, select `main`, then click **Run workflow** again.
4. Wait until the run shows a green check and the `deploy` job is successful.

After the first successful deployment, open:

https://biggyseven.github.io/orbe-onix-studio/

Bookmark that address. It is the visitor-facing website, not the source-code repository.

## 3. Open it after future changes

Every new commit pushed to `main` automatically starts the deployment workflow. You can keep using the same website address; refresh the page after the deployment finishes.

## Important distinction

- Repository URL: source code, folders and commits.
- GitHub Pages URL: the actual website rendered in the browser.
- Download ZIP / Download source: only for obtaining a local copy of the code. It is not required to view the website.

If the Pages URL shows a 404, check the latest run in Actions and confirm that **Settings → Pages → Source** is set to **GitHub Actions**.
