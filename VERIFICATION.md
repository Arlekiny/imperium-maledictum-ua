> Historical browser report for the 2026-10-27 edition. The HTML files were rebuilt on 2026-10-28 after removing source filters and calculator modes and expanding the layout. The browser observations and screenshots below have not been repeated for that build.

# Verification — Classic multipage v2

Date: 2026-10-27. This report applies to the ten HTML SHA-256 values in `evidence/build-manifest.json`, also embedded in `evidence/browser-checks.json`. The screenshots were captured from those files after the final HTML build. Documentation and packaging do not change the HTML.

## Passed

- **105 automated tests:** exact source hashes, schema and field preservation, normalized rows, search, book aliases, numeric/range/availability sorting, URL round trips, restricted markup rendering, original XP calculations and the new multipage contract. Full output is in `evidence/test-results.txt`.
- **36 upstream JSON files:** match the pinned source hashes. **34 tables / 766 rows / 14 profiles**, with zero audit errors or warnings. `evidence/data-audit.json` gives the per-table fields and counts.
- **10 distinct HTML documents:** every main section is a real page with its own payload and scripts. No redirect, iframe, external runtime script, stylesheet, font, CDN, local JSON fetch or ES-module import. Each file's identity remains fixed even if given another section's hash.
- **100/100 main-menu links:** actually followed every source/destination pair in the browser; each loaded the correct filename and section. Separate static tests resolve all 100 links against a file URL containing spaces.
- **34/34 rendered tables:** every table opened and its DOM row count matched its total; 766 rows overall. Powers initially order by Discipline; services and roll tables retain the source order.
- **14/14 profiles:** opened through the detail index, displayed profile rows, closed with Escape and restored focus. Glossary disclosure and inline condition links also worked with keyboard and click. Repeated opening/closing passed.
- **20 additional browser checks:** XP, Character search and mobile keyboard sorting, source filtering across pages (including through Character), zero-book states, untagged rows, special-character query/reload, numeric weapon-cost order, Back/Forward, card/table toggle, light theme and Inquisitor alias handling. Exact observations are in `evidence/browser-checks.json`.
- **Character:** 139 talents and 20 skills; original scripts and translation unchanged. Actual browser calculations: characteristics 40→50 = **700 XP**; skill 0→4 = **500 XP**; three talents = **300 XP**; blank value produces an error and hides the result. Automated tests additionally cover 14 characteristic tier boundaries and invalid/fractional/reversed/out-of-range inputs for all calculator modes.
- **Original preserved:** 86,786 bytes, SHA-256 `61702b39f2342c7c164d299b447be535f1dfe4c13354e453f1ead428f54e30a5`. Removing the marked additions from `character.html` restores the original byte-for-byte.
- **Mobile and desktop:** visually inspected at 390×844 and 1440×1000. All ten mobile pages had no whole-document horizontal overflow. Wide tabular views scroll within their table region. The supplied original was visually compared at both sizes. Five saved screenshots show the reference, original-style Character, mobile XP and mobile light-theme profile.
- **Browser console:** no captured warnings or errors during the completed browser QA session, including direct Character. The former iframe architecture is absent.
- **Isolation:** yesterday's package and ZIP are checked against the pre-work hash baseline. See `evidence/previous-delivery-check.json` for the final result.

## Explicit limits

1. **Actual file-protocol execution is not verified.** The browser tool's URL policy denied `file://` in the previous task. That action was not retried or bypassed. Actual interaction/visual QA used a temporary server bound only to loopback and serving the generated files. The distribution itself contains no server requirement. Static tests establish embedded dependencies and valid relative file links, not a substitute claim of browser execution from disk.
2. **One browser engine, simulated viewport sizes.** No physical touchscreen, Safari/Firefox run or full assistive-technology audit was available. Clickable native controls, keyboard interaction, ARIA state and focus return were exercised. Cross-file theme storage can vary under `file://`.
3. **Data consistency, not official rules certification.** The source is a fan repository at commit `3eb35603a7e7372c83ea3d366f233d763c4ab52c`. No new rulebook extraction or official rule-by-rule verification was done. All source columns and values are retained; source-label aliases are interpreted only for filtering. The CC license does not establish rights in third-party game text. See `NOTICE.md`.
4. **No hosting or publication.** The preview server is temporary QA infrastructure and is stopped at completion. Source/license links are voluntary navigation; no remote assets, telemetry or background requests are part of the pages.

## Evidence

- `evidence/build-manifest.json`: final page hashes, sizes and embedded dataset list.
- `evidence/data-audit.json`, `source-manifest.json`: source parity, fields and counts.
- `evidence/test-results.txt`: automated test output.
- `evidence/browser-checks.json`: actual navigation, table, profile and interaction observations, browser limitations and captured console status.
- `evidence/character-desktop.jpg`, `reference-desktop.jpg`, `reference-mobile.jpg`, `character-mobile-xp.jpg`, `profile-mobile-light.jpg`: final screenshots (five files).
- `evidence/previous-delivery-check.json`: read-only isolation check against yesterday's package and ZIP.

During QA, test-driver locators were narrowed after matching hidden or duplicate elements. One draft assertion incorrectly assumed that service rows lacked a Source; the pinned rows explicitly identify Core Rulebook and correctly disappear with no selected books. Untagged Names retained all 25 rows. A native select's keyboard value was checked after committing with Enter. These were corrected verification assumptions, not product defects or changes to source data.
