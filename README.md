# Bai Xueyi — personal website

This repository publishes [baixy1212.github.io](https://baixy1212.github.io/) through GitHub Pages.

## Where to edit

| What you want to change | File or folder |
|---|---|
| Homepage copy and featured work | `_pages/about.md` |
| Current focus | `_pages/now.md` |
| Research and project pages | `_portfolio/` |
| Top navigation | `_data/navigation.yml` |
| Site name, description and profile links | `_config.yml` |
| Visual style | `_sass/_custom.scss` |
| Life Dashboard | `tracker.html` |

## Publishing

The public site is built from the `master` branch. Once a pull request is reviewed and merged into `master`, GitHub Pages rebuilds the site automatically.

## Adding a project

Create a Markdown file in `_portfolio/` with this front matter:

```yaml
---
layout: single
title: "Project title"
permalink: /portfolio/project-slug/
collection: portfolio
project_type: "Research"
status: "In progress"
order: 5
summary: "A short, honest description of the work."
author_profile: false
---
```

Write the project content below the closing `---`. The portfolio index will include it automatically.

## Life Dashboard privacy

Dashboard entries remain in the browser storage of the device being used. The page does not request a GitHub token or automatically upload records. Use **数据与隐私 → 导出备份** regularly and store the exported JSON somewhere private.

## Editing principles

- Keep work-in-progress labelled as work-in-progress.
- Do not add placeholder publications, institutions or qualifications.
- Update the short `Now` page more often than the permanent homepage.
- Prefer a small number of current projects over a long, outdated archive.
