# Releasing a version

A version names the software and the source snapshot it is built on (see
[CHANGELOG.md](../CHANGELOG.md)). Releases are listed on the repository's
[Releases page](https://github.com/Malcom-IO/oregon-uhp-explainer/releases), each with:

- `oregon-uhp.js`, `oregon-uhp.css` and `oregon-uhp.d.ts`: the calculator as a module;
- the explainer as a PDF;
- the whole site as a ZIP, built with relative paths so it works at any address;
- `SHA256SUMS`, a checksum for each file.

## Steps

1. Pick the number. A change of source snapshot (new Board documents, new numbers) is
   a minor version before 1.0 (0.1.0 to 0.2.0); a fix that changes no figure is a
   patch (0.1.0 to 0.1.1).
2. Set it in `package.json` and in `CITATION.cff` (`version` and `date-released`), and
   add a `## <version> · <snapshot>` entry at the top of `CHANGELOG.md`.
   `npm test` fails until the three agree.
3. Check the files locally:

   ```sh
   BASE_PATH=./ npm run build
   PUBLIC_URL=https://malcom-io.github.io/oregon-uhp-explainer npm run pdf
   npm run release:assets
   ```

   `release/` then holds exactly what the release will publish, with `notes.md`, the
   text of the release notes.
4. Optionally, run the Release workflow by hand from the Actions tab on `main`. It
   builds the same files on GitHub and keeps them as a download, without publishing.
5. Merge to `main`, then tag and push: `git tag v<version> && git push origin v<version>`.
   The Release workflow builds the files again from the tag and publishes the release.
   It refuses a tag that does not match the version in the files.

A release cannot be quietly changed afterward: fix a mistake with a new patch version.
