# Nano Banana 工作區檔案提取與中繼資料工具 `v1.0.0`

[English](README.md) | 繁體中文 | [更新日誌 (Changelog)](CHANGELOG.md)

這是一個專門為 **Nano Banana Ultra *lite*** 匯出的 `.json` 工作區檔案設計的純原生成品圖提取與 PNG 中繼資料管理工具。

---

## 核心特點

*   **純淨圖片匯出（極致無雜訊）**：
    *   預設**直接將提示詞與生成參數完整內嵌至 PNG 圖片的 `iTXt` 區塊**。
    *   輸出目錄只保留清晰純粹的 `.png` 圖片，**不再產生大量雜亂的 `.txt` 檔案**。
*   **與 Nano Banana Ultra 100% 相容**：
    *   完整擷取成品圖、變體圖（Variant）與思考過程圖（Thought Image）。
    *   智慧過濾：自動排除所有縮圖（Thumbnail）與舞台參考素材（Staged Assets），只保留實際生成的內容。
*   **專屬中繼資料讀取方案（想看提示詞超方便）**：
    *   **終端機拖曳讀取**：內附 [`drag_and_drop_read_metadata.bat`](drag_and_drop_read_metadata.bat)，圖片一拖立即在終端機列印出完整提示詞與參數。
    *   **離線網頁視覺化檢視器**：內附 [`viewer.html`](viewer.html)，雙擊用瀏覽器開啟即可拖入圖片，左側看圖、右側對照參數，並支援**一鍵複製提示詞**！
    *   **業界相容性**：內嵌參數採用標準 `parameters` 關鍵字，相容 WebUI / ComfyUI / Civitai 等 AI 圖片檢視工具。
*   **零依賴 (Zero Dependencies)**：
    *   純原生 Node.js API 實作（含純原生 CRC-32 與 PNG Chunk 注入），免去複雜的 `npm install`。
    *   配備自訂高效串流 Buffer 解析器，支援數 GB 大型工作區快照而不受 V8 記憶體長度限制。

---

## 快速上手

### 1. 提取工作區圖片 (Extract)

#### 方式 A：拖曳批次檔（推薦，Windows 使用者）
1. 直接將一個或多個 Lite 版匯出的 `.json` 工作區檔案，拖曳到 [drag_and_drop_extract.bat](drag_and_drop_extract.bat) 上。
2. 程式會自動批次提取，完成後會提示成果統計，並可一鍵開啟 `output` 資料夾。

#### 方式 B：命令列執行 (CLI)
```bash
# 基礎執行（預設輸出至 ./output，純 PNG 內嵌）
node extractor.js <workspace_file.json>

# 支援一次傳入多個工作區檔案，並自訂輸出目錄
node extractor.js workspace1.json workspace2.json -o D:\MyImages

# 若仍希望額外輸出傳統 .txt 提示詞檔，可加上 --txt
node extractor.js workspace.json --txt
```

---

### 2. 檢視圖片提示詞與參數 (Read Metadata)

#### 方式 A：拖曳至讀取批次檔
* 直接將任何一張提取出來的 `.png` 圖片，拖曳到 [drag_and_drop_read_metadata.bat](drag_and_drop_read_metadata.bat) 上，視窗將立即列印該圖的提示詞、模型、風格、尺寸與思考過程。

#### 方式 B：使用離線網頁檢視器 [viewer.html](viewer.html)
1. 雙擊打開本機的 `viewer.html`（任何瀏覽器皆可，100% 離線運行）。
2. 將一張或多張 `.png` 圖片拖入網頁中。
3. 即可享受高品質大圖預覽、底片切換條、結構化參數清單與**一鍵複製提示詞**功能！

#### 方式 C：CLI 指令
```bash
node reader.js <image1.png> [image2.png ...]
```

---

## 匯出目錄結構範例

```text
output/
├── image_1717462000000.png              # 成品圖（提示詞已完整內嵌於檔案中）
├── image_1717462000000-variant-1.png    # 變體圖（提示詞已完整內嵌）
└── image_1717462000000-thought-0.png    # 思考過程圖（內嵌思考與提示詞）
```
*(目錄極致整潔，無任何 txt 冗餘檔案！)*
