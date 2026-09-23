# Changelog

## v1.0.1 - 2026-09-23

- Release title: Nano Banana Workspace Extractor 1.0.1 - Windows Batch Script Encoding Resilience & Zero-Config Streamlining
- Release summary:
    - **Windows Batch Script Codepage Resilience (`drag_and_drop_extract.bat`, `drag_and_drop_read_metadata.bat`)**: Resolved an issue in Windows Command Prompt (CMD) where `chcp 65001` combined with multi-byte UTF-8 Chinese characters caused CMD's internal byte-seek pointer to drift across Traditional Chinese Windows environments (CP950), resulting in command parsing failures (`'直接將一個或多個' is not recognized`). Refactored batch script wrappers to use clean ASCII headers with `goto` branching and removed parenthesis blocks, completely preventing syntax and character offset collisions across all localized Windows code pages while delegating full UTF-8 Traditional Chinese output directly to Node.js.
    - **Pure Zero-Dependency Streamlining**: Formally pruned redundant npm package manifests (`package.json`, `package-lock.json`) from the repository, reinforcing the 100% zero-dependency, zero-configuration green portable tool philosophy.

## v1.0.0 - 2026-09-23

- Release title: Nano Banana Workspace Extractor 1.0.0 - Pure PNG Metadata Embedding, Metadata Readers Suite & Batch Processing Upgrade
- Release summary:
    - **Pure PNG Metadata Injection (`extractor.js`)**: Implemented zero-dependency PNG `iTXt` chunk injection using native Node.js and a custom CRC-32 checksum algorithm. Generation prompts, model parameters, styles, aspect ratios, image sizes, modes, execution modes, temperatures, thinking levels, model responses, and thinking processes are embedded directly inside the output PNG files. Default extraction mode outputs clean, pure `.png` files without generating hundreds of redundant `.txt` sidecars.
    - **Dual Metadata Reader Suite (`reader.js`, `drag_and_drop_read_metadata.bat`, `viewer.html`)**:
        - **Terminal Drag & Drop Reader (`reader.js`, `drag_and_drop_read_metadata.bat`)**: Introduced a dedicated CLI reader and Windows drag-and-drop batch script to instantly inspect and print all embedded prompt metadata from one or multiple PNG images directly in the console.
        - **Offline Visual HTML Viewer (`viewer.html`)**: Created a standalone, 100% offline single-file HTML viewer. Drag and drop any extracted PNG image to view high-resolution image previews, filmstrip navigation, categorized parameter cards, and a one-click "Copy Prompt" button.
    - **Batch Drag & Drop Processing Upgrade (`drag_and_drop_extract.bat`)**: Upgraded the Windows batch extraction script to support looping over multiple dragged `.json` workspace files simultaneously (`for %%f in (%*)`). Added Node.js runtime readiness checks with user-friendly installation guidance, progress logging, and an interactive completion prompt allowing users to open the `output` folder with a single keypress.
    - **Full Nano Banana Ultra Compatibility & Strict Filtering (`extractor.js`)**:
        - Resolved a bug where thumbnails (`.jpg`) were misclassified and leaked into the output folder due to extension mismatches with original PNG images.
        - Strictly isolated extraction to generated content (`item.savedFilename`, variant `output-image`, and `thought-image`), completely suppressing thumbnails and staged reference assets (`snapshot.stagedAssets`).
        - Enforced filename sanitization with `path.basename` to prevent path traversal attacks.

## v0.4.1 - 2026-09-23

- Release title: Nano Banana Workspace Extractor 0.4.1 - Environment Configuration Cleanup
- Release summary:
    - **Workspace Configuration Maintenance**: Cleaned up legacy VS Code environment artifacts and workspace configuration files (`de-vscode`) for improved repository consistency.

## v0.4.0 - 2026-06-29

- Release title: Nano Banana Workspace Extractor 0.4.0 - Buffer JSON Streaming Engine for Large Workspaces
- Release summary:
    - **Buffer-Level Recursive Descent JSON Parser (`extractor.js`)**: Introduced `parseWorkspaceJsonBuffer`, a custom lightweight JSON parser that operates directly on Node.js `Buffer` slices. By recording byte offsets `{ start, end }` for base64 image data URLs without converting entire gigabyte-scale JSON payloads into V8 strings, the extractor prevents V8 string length limit crashes (`ERR_STRING_TOO_LONG`) when processing large workspaces containing multiple 2K/4K images.

## v0.3.0 - 2026-06-11

- Release title: Nano Banana Workspace Extractor 0.3.0 - Application Branding Assets
- Release summary:
    - **Application Icons (`app_icon.ico`, `app_icon.png`)**: Added official visual application icon assets in high-resolution PNG and Windows ICO formats for desktop shortcuts and batch tool branding.

## v0.2.2 - 2026-06-05

- Release title: Nano Banana Workspace Extractor 0.2.2 - Workspace Consistency & Recommended Extensions
- Release summary:
    - **Project Consistency Configuration**: Added recommended editor extensions and workspace settings for development standardization.

## v0.2.1 - 2026-06-05

- Release title: Nano Banana Workspace Extractor 0.2.1 - Batch Script UX Refinement
- Release summary:
    - **Batch Script Exit Behavior (`drag_and_drop_extract.bat`, `README.md`, `README.zh-TW.md`)**: Configured the drag-and-drop batch script to auto-close upon successful extraction, removing automatic Windows Explorer folder popups for streamlined background processing.

## v0.2.0 - 2026-06-05

- Release title: Nano Banana Workspace Extractor 0.2.0 - Bilingual Documentation & Lite Edition Branding
- Release summary:
    - **Bilingual Documentation (`README.md`, `README.zh-TW.md`)**: Split single README into switchable English and Traditional Chinese documentation pages.
    - **Brand Standardization**: Standardized product nomenclature to "Nano Banana Ultra *lite*" across documentation and CLI usage headers.

## v0.1.0 - 2026-06-05

- Release title: Nano Banana Workspace Extractor 0.1.0 - Initial Release
- Release summary:
    - **Initial CLI Workspace Extractor (`extractor.js`)**: Baseline zero-dependency Node.js CLI tool to restore images and paired prompt `.txt` files from Nano Banana Ultra lite workspace snapshot JSON files (`nbu-workspace-snapshot`).
    - **Windows Drag-and-Drop Batch Runner (`drag_and_drop_extract.bat`)**: Added a convenient Windows batch wrapper enabling one-click drag-and-drop execution.
    - **Integration Test Suite (`test_extraction.js`)**: Established automated integration tests validating conditional prompt file generation and failed run suppression.
