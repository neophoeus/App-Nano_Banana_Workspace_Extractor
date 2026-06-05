# Nano Banana 工作區檔案提取器

[English](README.md) | 繁體中文

這是一個專門為 **Nano Banana Ultra *lite*** 匯出的 `.json` 工作區檔案設計的圖片與提示詞提取工具。

---

## 功能特點

*   **自動圖片提取**：從工作區 JSON 檔案中還原並匯出成品圖與思考過程的思考圖。
*   **同名提示詞 TXT**：將生成時使用的提示詞、模型參數、風格與思考過程保存為同名的 `.txt` 檔案，方便對照。
*   **智慧儲存判定**：
    *   **有圖才存**：僅當該歷史項目成功匯出至少一張圖片（成品圖或思考圖）時，才建立提示詞 `.txt` 檔。
    *   **完全無圖不存**：若項目生成失敗、無成品圖且無思考圖，則直接略過該項目，保持輸出資料夾乾淨。
    *   **思考圖例外**：若項目無最終成品圖，但有成功產出思考圖，依然會保留該思考圖並為其建立同名提示詞 `.txt` 檔。
*   **零依賴 (Zero Dependencies)**：基於 Node.js 原生 API，免去複雜的安裝與設定程序。
*   **一拖即用**：內附 Windows 批次檔，只需將檔案拖曳至其上即可完成匯出。

---

## 快速開始

### 方式 A：拖放批次檔（推薦，Windows 用戶）
1.  直接將 Lite 版匯出的 `.json` 工作區檔案，拖曳到 [drag_and_drop_extract.bat](drag_and_drop_extract.bat) 上。
2.  程式會自動執行提取，並在完成後自動為您開啟產生的 `output` 資料夾。

### 方式 B：命令列執行 (CLI)
在終端機中執行以下 Node.js 指令：
```bash
node extractor.js <workspace_file.json> [output_directory]
```
*   `workspace_file.json`：工作區檔案的實體路徑。
*   `output_directory`（選填）：匯出目標路徑，預設會建立在當前目錄的 `output` 資料夾。

---

## 匯出目錄結構範例

執行後，`output` 目錄將會以下列結構儲存個別檔案（使用完整原始檔名）：

```text
output/
├── image_1717462000000.png              # 成品圖
├── image_1717462000000.txt              # 成品圖對應的提示詞與參數
├── image_1717462000000-thought-0.png    # 思考過程的思考圖
└── image_1717462000000-thought-0.txt    # (若無成品圖但有思考圖時，以此名稱儲存提示詞)
```
