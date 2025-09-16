Fork of the original (abandoned) repository, so i can make use of features like https://github.com/jpoles1/obsidian-litegal/pull/12
If you want to use it too:
- Add this plugin to obsidian: https://github.com/TfTHacker/obsidian42-brat
- Remove your existing litegal plugin installation from the Obsidian plugin settings
- Go to the BRAT plugin options and add this fork to the "beta plugin list" https://github.com/MaxWolf-01/obsidian-litegal/
- Enjoy

Thanks to HenriBech who implemented the feature and jpoles1 for the original plugin!

<details>
	<summary>For future reference: Merge a PR form abandoned Obsidian plugin repo and create release</summary>

```bash
#!/usr/bin/env bash
# usage: edit VERSION / PR / NOTES, then run from repo root.

set -euo pipefail

# --- edit these for each release ---
VERSION="X.X.X"                 # new version
PR=""                           # upstream PR number to merge (or leave blank to skip)
NOTES=""
UPSTREAM_REPO=""
# optionally: a contributor fork+branch instead of PR number:
CONTRIB_REMOTE_URL=""
CONTRIB_BRANCH=""
# ----------------------------------

# figure out default branch of *your* fork
BRANCH=$(git remote show origin | awk '/HEAD branch/ {print $NF}')

echo "→ Ensuring clean & up to date on $BRANCH"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only

# OPTION A: merge an upstream PR by number
if [[ -n "${PR:-}" ]]; then
  echo "→ Fetching upstream PR #$PR"
  git remote add upstream "$UPSTREAM_REPO" 2>/dev/null || true
  git fetch upstream "pull/$PR/head:pr-$PR"
  git merge --no-ff "pr-$PR" -m "Merge upstream PR #$PR"
fi

# OPTION B: or merge a contributor branch directly
if [[ -n "${CONTRIB_REMOTE_URL:-}" && -n "${CONTRIB_BRANCH:-}" ]]; then
  echo "→ Fetching $CONTRIB_BRANCH from contributor remote"
  git remote add contrib "$CONTRIB_REMOTE_URL" 2>/dev/null || true
  git fetch contrib "$CONTRIB_BRANCH:pr-custom"
  git merge --no-ff pr-custom -m "Merge $CONTRIB_REMOTE_URL:$CONTRIB_BRANCH"
fi

echo "→ Install deps & build"
npm ci
npm run build

echo "→ Bump manifest.json version to $VERSION"
if command -v jq >/dev/null 2>&1; then
  jq --arg v "$VERSION" '.version=$v' manifest.json > manifest.tmp && mv manifest.tmp manifest.json
else
  # macOS BSD sed: `sed -i ''`; GNU sed: `sed -i`
  sed -i.bak "s/\"version\": *\"[^\"]*\"/\"version\": \"$VERSION\"/" manifest.json && rm -f manifest.json.bak
fi
git add manifest.json
git commit -m "chore: bump manifest to v$VERSION"
git push

echo "→ Tag & push"
git tag "v$VERSION" -m "Litegal v$VERSION"
git push origin "v$VERSION"

echo "→ Create GitHub release with built artifacts (for BRAT)"
printf '%s\n' "$NOTES" > .release-notes.txt
# only include styles.css if it exists
FILES=(manifest.json main.js)
[[ -f styles.css ]] && FILES+=(styles.css)

gh release create "v$VERSION" "${FILES[@]}" \
  --title "v$VERSION" \
  --notes-file .release-notes.txt

echo "✓ Release v$VERSION published."
echo "→ In Obsidian BRAT: Add Beta plugin → your-username/obsidian-litegal"
```

</details>

# Obsidian Lite Gallery

The Lite Gallery plugin for [Obsidian](https://obsidian.md) makes it easy to create carousel image galleries in your notes. This allows you to neatly organize mutiple images into your notes while improving readability and usability. 

## How to use

1) [Install the plugin](https://help.obsidian.md/Extending+Obsidian/Community+plugins)
2) Create a new gallery in your note using the following "codeblock" format:
```
 ```litegal
[[image1.jpg]]
this_also_works.png
path/to/image3.jpg
 ```
```
  - Note that you can use the obsidian file search by entering `[[` in the codeblock; this will not include an absolute path to the file, but as long as the file is in the image directory.

  - If the filename is not unique across the vault, the gallery will choose the best fit. For specifying a file, give the filepath in the link.

### Demonstration:

![Lite Gallery Demo](https://raw.githubusercontent.com/jpoles1/obsidian-litegal/955cd5f6f50048b9f8593bf46aa5c477a30976d5/litegaldemo.gif)
