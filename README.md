# Nano Banana Workspace Extractor

English | [繁體中文](README.zh-TW.md)

An image and prompt extractor for Workspace files exported from Nano Banana Ultra *lite*.

---

## Features

*   **Image Extraction**: Restores and exports both final generated images and intermediate thinking process images from the workspace JSON.
*   **Prompt TXT Generation**: Saves the prompt, model parameters, style, and thinking process into a `.txt` file with the matching name.
*   **Smart Saving Rules**:
    *   **Save only if images exist**: The prompt `.txt` file is created ONLY if at least one image (product or thought image) is successfully exported.
    *   **Skip completely failed runs**: If a run failed and produced no images (and no thinking images), it is skipped entirely. No junk `.txt` files are created.
    *   **Thought image exception**: If a run has no final image but contains a thinking image (`thought-image`), it still exports the thinking image and creates the prompt `.txt` file.
*   **Zero Dependencies**: Built using standard Node.js native APIs. No complex setup or installation required.
*   **Drag-and-Drop**: Includes a Windows batch script to run the extractor simply by dragging and dropping your file.

---

## Quick Start

### Option A: Drag & Drop (Windows)
1.  Drag and drop your exported `.json` workspace file onto [drag_and_drop_extract.bat](drag_and_drop_extract.bat).
2.  The script runs the extraction automatically and opens the `output` directory upon completion.

### Option B: CLI command
Run the following command in your terminal using Node.js:
```bash
node extractor.js <workspace_file.json> [output_directory]
```
*   `workspace_file.json`: Path to the workspace JSON file.
*   `output_directory` *(Optional)*: Target export path. Defaults to `./output` in the current folder.

---

## Export Directory Structure

Extracted files will be saved in the `output` folder with their complete original filenames:

```text
output/
├── image_1717462000000.png              # Product image
├── image_1717462000000.txt              # Prompt and parameters for the image
├── image_1717462000000-thought-0.png    # Thinking process image
└── image_1717462000000-thought-0.txt    # Prompt text file matched to the thought image (created if product image is missing but thought image exists)
```
