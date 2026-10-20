# Changelog

## v1.2.0 - 2026-10-20

- Release title: Nano Banana Workspace Extractor 1.2.0 - Robust JPEG COM Boundary Defense, Test Isolation & Ultra v4.11.0 Grounding Suite
- Release summary:
    - **Safe Test Isolation (`test_extraction.js`)**: Fixed a critical test defect where running integration tests recursively deleted the user's real `./output` extraction folder. All test inputs, intermediate snapshots, and generated images are now safely isolated in dedicated system temporary directories (`os.tmpdir()`), completely protecting user output assets.
    - **Robust JPEG COM 64KB Truncation Defense (`extractor.js`)**: Resolved JSON corruption caused by hard-slicing payloads exceeding 65,533 bytes. Introduced `truncateUtf8BufferSafely` to prevent slicing mid-character on multi-byte UTF-8 boundaries, and `serializeMetaForJpegCom` with byte-budget calculations to progressively and safely trim `thoughts` and `text` while guaranteeing 100% valid, parseable JSON for all JPEG COM segments without over-trimming Traditional Chinese and emoji content.
    - **APP0 / APP1 Marker Sequence Defense (`extractor.js`)**: Hardened JPEG metadata injection with strict bounds checking for leading `APP0` (`0xFFE0`) and `APP1` (`0xFFE1`, Exif) markers, preventing corrupt segment placement or out-of-bounds buffer reads.
    - **Nano Banana Ultra v4.11.0 Metadata Alignment (`extractor.js`, `reader.js`, `viewer.html`)**: Added end-to-end support for modern metadata fields introduced in Ultra v4.9.1–v4.11.0: `groundingSources`, `groundingMode`, `outputFormat`, `actualOutput`, `lineageAction`, and fallback `size`. Correctly omitted temperature for `gemini-nano-banana-2.1` in compliance with official Gemini specifications (`supportsTemperature: false`).
    - **Structured Actual Output & Dimension Normalization (`extractor.js`)**: Automatically normalizes Ultra's structured `{ width, height, mimeType }` object into human-readable resolution strings (e.g. `2048x2048 (image/png)`), completely eliminating `[object Object]` formatting across console logs, sidecar files, and the web viewer.
    - **Duplicate Filename Guard (`extractor.js`)**: Integrated an in-memory export set (`exportedFilenames`) to ensure each generated file is processed only once, preventing duplicate disk writes and skewed extraction statistics across complex session histories and `resultParts`.
    - **Web Viewer DOM XSS Hardening & Safe Grounding Links (`viewer.html`)**: Refactored metadata item rendering to use strict DOM manipulation (`createElement` + `textContent`), eliminating inline HTML string interpolation vulnerabilities. Added an interactive Grounding Sources card that safely opens external URLs (`http://`, `https://`) in new tabs with `rel="noopener noreferrer"`.
    - **Blob Object URL Memory Management (`viewer.html`)**: Implemented `revokeLoadedImageUrls` to automatically release Blob Object URLs upon reloading images or page unmount, preventing memory accumulation when inspecting large batches of high-resolution images.
    - **Filmstrip Keyboard Navigation (`viewer.html`)**: Added keyboard shortcuts (`ArrowLeft` / `ArrowRight`) to conveniently cycle through images in the viewer filmstrip.

## v1.1.2 - 2026-10-12

- Release title: Nano Banana Workspace Extractor 1.1.2 - Nested Metadata Fallback Resilience & Gemini Nano Banana 2.1 Compatibility Verification
- Release summary:
    - **Nested Metadata Fallback Resilience (`extractor.js`)**: Enhanced parameter extraction for `temperature`, `thinkingLevel`, and `executionMode` to seamlessly fall back to nested `item.metadata` properties (`item.metadata?.temperature`, `item.metadata?.thinkingLevel`, `item.metadata?.executionMode`). Guarantees 100% parameter extraction fidelity across all generations of Nano Banana Ultra (including v4.9.0) even when workspace history entries store settings within nested metadata objects.
    - **CWD-Independent CLI Integration Testing (`test_extraction.js`)**: Updated child process execution in integration tests with explicit script path resolution (`EXTRACTOR_SCRIPT`) and working directory context (`cwd: __dirname`), allowing tests to execute reliably from any directory.
    - **Gemini Nano Banana 2.1 & Medium Thinking Level Test Coverage (`test_extraction.js`)**: Added test cases verifying lossless extraction and PNG/JPEG metadata embedding for `gemini-nano-banana-2.1` with `thinkingLevel: 'medium'`, nested metadata fields, and structured parameters validation.
    - **Documentation & Version Update (`README.md`, `README.zh-TW.md`)**: Upgraded suite version to `v1.1.2` and updated model compatibility notes for Gemini Nano Banana 2.1 and expanded thinking levels.

## v1.1.1 - 2026-10-01

- Release title: Nano Banana Workspace Extractor 1.1.1 - Windows Native Drag-and-Drop Visual Viewer Integration (Zero Node.js Required)
- Release summary:
    - **Windows Native Drag-and-Drop Web Viewer Integration (`drag_and_drop_read_metadata.bat`, `launch_viewer.ps1`)**: Re-engineered the metadata drag-and-drop workflow using pure Windows native PowerShell. Dragging images onto `drag_and_drop_read_metadata.bat` now instantly launches `viewer.html` in the user's default browser with full high-resolution image preview, thumbnails, generation parameters, and one-click prompt copying—**completely eliminating the need for Node.js installation**.
    - **Folder & Multi-Image Drag-and-Drop Support**: Users can now drag single images, multiple images, or entire output directories (e.g. `output/`) directly onto the batch file; the script automatically scans and loads all `.png`, `.jpg`, and `.jpeg` images.
    - **Client-Side Session Auto-Loading (`viewer.html`, `session_data.js`)**: Added intelligent session detection via `session_data.js` and URL hash `#drop`. Image data URLs are seamlessly restored into in-memory Blob Object URLs, ensuring the web viewer remains fully functional even after the launcher terminal exits.
    - **Terminal Streamlining & Codepage Safety**: Batch launcher terminates cleanly within ~0.3s without lingering background processes or firewall warnings. Direct double-clicking of `viewer.html` or the batch file safely preserves the clean interactive dropzone.

## v1.1.0 - 2026-09-23

- Release title: Nano Banana Workspace Extractor 1.1.0 - Full PNG & JPEG Dual-Format Lossless Metadata Embedding & Reading
- Release summary:
    - **Native JPEG Lossless Metadata Injection (`extractor.js`)**: Accommodating native Gemini model outputs (`data:image/jpeg;base64` from `gemini-3.1-flash-image`), implemented zero-dependency JPEG COM (`0xFF 0xFE`, Comment) segment injection. Prompts, model parameters, aspect ratios, execution modes, styles, and full thinking logs are embedded directly after SOI/APP0 markers without re-encoding or compressing image pixels, ensuring 100% lossless image fidelity.
    - **Intelligent Dual-Format Auto-Routing (`extractor.js`)**: Automatically detects binary image signatures (`0x89 0x50 0x4E 0x47` for PNG vs `0xFF 0xD8` for JPEG) and transparently routes to either PNG `iTXt` or JPEG COM embedding.
    - **Universal CLI & Drag-and-Drop Metadata Reader (`reader.js`, `drag_and_drop_read_metadata.bat`)**: Upgraded to seamlessly read and inspect both `.png` and `.jpg` / `.jpeg` files. Parses JPEG COM markers for `nano_banana_meta` and standard `parameters` blocks, displaying full generation prompts and parameters in the console.
    - **Dual-Format Offline Web Viewer (`viewer.html`)**: Expanded file dropzone and native `ArrayBuffer` parsing to support both PNG and JPEG images. Users can drag and drop `.png`, `.jpg`, and `.jpeg` images into the viewer for instant preview, parameter inspection, and one-click prompt copying.
    - **Comprehensive Test Suite & Real 283MB Snapshot Verification (`test_extraction.js`)**: Added test cases for mock JPEG generation and integration verification against real 283MB Gemini workspace snapshots containing 50 native JPEG images.

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
