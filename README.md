# Nano Banana Workspace Extractor (工作區檔案提取器)

An image and prompt extractor for Workspace files exported from Nano Banana Ultra lite.  
一個專門為 Nano Banana Ultra Lite 匯出的工作區檔案設計的圖片與提示詞提取工具。

---

## Features (功能特點)

*   **Image Extraction (自動圖片提取)**: Restores and exports both final generated images and intermediate thinking process images from the workspace JSON.  
    從工作區 JSON 檔案中還原並匯出成品圖與思考過程的思考圖。
*   **Prompt TXT Generation (同名提示詞 TXT)**: Saves the prompt, model parameters, style, and thinking process into a `.txt` file with the matching name.  
    將生成時使用的提示詞、模型參數、風格與思考過程保存為同名的 `.txt` 檔案，方便對照。
*   **Smart Saving Rules (智慧儲存判定)**:
    *   **Save only if images exist (有圖才存)**: The prompt `.txt` file is created ONLY if at least one image (product or thought image) is successfully exported.  
        僅當該歷史項目成功匯出至少一張圖片（成品圖或思考圖）時，才建立提示詞 `.txt` 檔。
    *   **Skip completely failed runs (完全無圖不存)**: If a run failed and produced no images (and no thinking images), it is skipped entirely. No junk `.txt` files are created.  
        若項目生成失敗、無成品圖且無思考圖，則直接略過，保持輸出資料夾乾淨。
    *   **Thought image exception (思考圖例外)**: If a run has no final image but contains a thinking image (`thought-image`), it still exports the thinking image and creates the prompt `.txt` file.  
        若項目無最終成品圖，但有成功產出思考圖，依然會保留該思考圖並為其建立同名提示詞 `.txt` 檔。
*   **Zero Dependencies (零依賴)**: Built using standard Node.js native APIs. No complex setup or installation required.  
    基於 Node.js 原生 API，免去複雜的安裝程序。
*   **Drag-and-Drop (一拖即用)**: Includes a Windows batch script to run the extractor simply by dragging and dropping your file.  
    內附 Windows 批次檔，只需將檔案拖曳至其上即可完成匯出。

---

## Quick Start (快速開始)

### Option A: Drag & Drop (方式 A：拖放批次檔 - Windows)
1.  Drag and drop your exported `.json` workspace file onto [drag_and_drop_extract.bat](drag_and_drop_extract.bat).  
    直接將 Lite 版匯出的 `.json` 工作區檔案，拖曳到 [drag_and_drop_extract.bat](drag_and_drop_extract.bat) 上。
2.  The script runs the extraction automatically and opens the `output` directory upon completion.  
    程式會自動執行提取，並在完成後自動為您開啟產生的 `output` 資料夾。

### Option B: CLI command (方式 B：命令列執行)
Run the following command in your terminal using Node.js:  
在終端機中執行以下 Node.js 指令：
```bash
node extractor.js <workspace_file.json> [output_directory]
```
*   `workspace_file.json`: Path to the workspace JSON file. (工作區檔案的實體路徑)
*   `output_directory` *(Optional)*: Target export path. Defaults to `./output` in the current folder. (選填，匯出目標路徑，預設會建立在當前目錄的 `output` 資料夾)

---

## Export Directory Structure (匯出目錄結構範例)

Extracted files will be saved in the `output` folder with their complete original filenames:  
執行後，`output` 目錄將會以下列結構儲存個別檔案（使用完整原始檔名）：

```text
output/
├── image_1717462000000.png              # Product image (成品圖)
├── image_1717462000000.txt              # Prompt and parameters for the image (成品圖對應的提示詞與參數)
├── image_1717462000000-thought-0.png    # Thinking process image (思考過程的思考圖)
└── image_1717462000000-thought-0.txt    # Prompt text file matched to the thought image (若無成品圖但有思考圖時，以此名稱儲存提示詞)
```
