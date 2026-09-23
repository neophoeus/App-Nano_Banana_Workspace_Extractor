# Nano Banana Workspace Extractor & Metadata Suite `v1.0.0`

English | [繁體中文](README.zh-TW.md) | [Changelog](CHANGELOG.md)

A zero-dependency workspace extractor and PNG metadata management suite designed for workspace snapshot JSON files exported from **Nano Banana Ultra *lite***.

---

## Key Features

*   **Pure PNG Image Export (Zero Clutter)**:
    *   Directly injects prompts, models, styles, aspect ratios, modes, and thoughts into standard PNG `iTXt` metadata chunks.
    *   Keeps the output directory clean and free of hundreds of redundant `.txt` files.
*   **100% Compatible with Nano Banana Ultra**:
    *   Fully restores product images, variant images, and intermediate thinking process images (`thought-image`).
    *   Smart Filtering: Automatically filters out thumbnails (`.jpg`) and staged reference assets, exporting only pure generated content.
*   **Dual Metadata Inspection Tools**:
    *   **Terminal Drag & Drop**: Includes [`drag_and_drop_read_metadata.bat`](drag_and_drop_read_metadata.bat). Drop any PNG to instantly print its full prompt and parameters in the console.
    *   **Offline Web Viewer**: Includes [`viewer.html`](viewer.html). Double-click to open in any browser (100% offline). Drop images to view high-res previews alongside parameters with a **1-click Copy Prompt** button!
    *   **Industry Standard**: Compatible with WebUI, ComfyUI, Civitai, and standard image viewers supporting the PNG `parameters` chunk.
*   **Zero Dependencies**:
    *   Built purely with native Node.js APIs (including pure JS CRC-32 and PNG chunk injector). No `npm install` needed.
    *   Features a custom Buffer JSON parser to safely parse multi-gigabyte workspace exports without hitting V8 string length limits.

---

## Quick Start

### 1. Extract Images from Workspace JSON

#### Option A: Drag & Drop (Recommended for Windows)
1. Drag and drop one or more `.json` workspace files onto [drag_and_drop_extract.bat](drag_and_drop_extract.bat).
2. The script processes all files, displays summary statistics, and allows you to open the `output` folder with a single keypress.

#### Option B: CLI command
```bash
# Basic run (extracts to ./output with embedded PNG metadata)
node extractor.js <workspace_file.json>

# Multi-file support and custom output directory
node extractor.js workspace1.json workspace2.json -o D:\MyImages

# Optional: Also output traditional .txt sidecars if needed
node extractor.js workspace.json --txt
```

---

### 2. View Prompt & Metadata

#### Option A: Drag to Batch Reader
* Drag any extracted `.png` image onto [drag_and_drop_read_metadata.bat](drag_and_drop_read_metadata.bat) to view the prompt, model, style, size, and thinking process.

#### Option B: Use the Offline Web Viewer [viewer.html](viewer.html)
1. Double-click `viewer.html` to open it in your browser.
2. Drag and drop one or multiple `.png` images onto the page.
3. Enjoy image preview, filmstrip navigation, structured parameters, and the **Copy Prompt** button!

#### Option C: CLI
```bash
node reader.js <image1.png> [image2.png ...]
```

---

## Export Directory Structure

```text
output/
├── image_1717462000000.png              # Product image (with embedded prompt & parameters)
├── image_1717462000000-variant-1.png    # Variant image (with embedded parameters)
└── image_1717462000000-thought-0.png    # Thinking process image (with embedded thoughts)
```
*(Clean and neat directory with zero `.txt` clutter!)*
