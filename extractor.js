/**
 * extractor.js
 * CLI Workspace Extractor for Nano Banana Ultra Lite
 * Usage: node extractor.js <workspace-json-path> [output-dir]
 */

const fs = require('fs');
const path = require('path');

// Print usage information
function printUsage() {
    console.log('\n================================================================');
    console.log('  Nano Banana Ultra Lite - 工作區檔案專用匯出器 (CLI)');
    console.log('================================================================');
    console.log('使用方法:');
    console.log('  node extractor.js <workspace_file.json> [output_directory]');
    console.log('\n參數說明:');
    console.log('  workspace_file.json : Lite 版匯出的 .json 工作區檔案路徑 (必填)');
    console.log('  output_directory    : 匯出目標資料夾，預設為 ./output (選填)');
    console.log('================================================================\n');
}

// Main execution function
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        printUsage();
        process.exit(0);
    }

    const jsonPath = path.resolve(args[0]);
    const outputDir = path.resolve(args[1] || path.join(__dirname, 'output'));

    if (!fs.existsSync(jsonPath)) {
        console.error(`錯誤: 找不到指定的 JSON 檔案 "${jsonPath}"`);
        process.exit(1);
    }

    let workspaceData;
    try {
        const fileContent = fs.readFileSync(jsonPath, 'utf8');
        workspaceData = JSON.parse(fileContent);
    } catch (error) {
        console.error(`錯誤: 無法解析 JSON 檔案. 原因: ${error.message}`);
        process.exit(1);
    }

    // Verify workspace format
    if (workspaceData.format !== 'nbu-workspace-snapshot') {
        console.warn('警告: 此檔案的格式欄位不是 "nbu-workspace-snapshot"，可能不是標準的 Nano Banana 工作區檔案。');
    }

    const snapshot = workspaceData.snapshot;
    if (!snapshot || !Array.isArray(snapshot.history)) {
        console.error('錯誤: 工作區檔案中沒有找到有效的歷史紀錄 (snapshot.history)。');
        process.exit(1);
    }

    const savedImages = (workspaceData.assets && workspaceData.assets.savedImages) || {};
    const history = snapshot.history;

    console.log(`開始解析工作區檔案...`);
    console.log(`讀取到歷史紀錄項目: ${history.length} 個`);
    console.log(`讀取到內嵌圖片資料: ${Object.keys(savedImages).length} 個`);
    console.log(`匯出目標資料夾: "${outputDir}"`);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    let extractedImagesCount = 0;
    let extractedTextsCount = 0;
    let skippedThumbnailsCount = 0;

    // Helper to decode and save a base64 image
    function saveImage(filename) {
        const imageRecord = savedImages[filename];
        if (!imageRecord || !imageRecord.dataUrl) {
            return false;
        }

        const dataUrl = imageRecord.dataUrl;
        const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (!matches) {
            return false;
        }

        const base64Data = matches[2];
        const imageBuffer = Buffer.from(base64Data, 'base64');

        const targetPath = path.join(outputDir, filename);
        fs.writeFileSync(targetPath, imageBuffer);
        extractedImagesCount++;
        return true;
    }

    // Helper to save prompt text files
    function savePromptTxt(filename, item) {
        const txtFilename = filename.substring(0, filename.lastIndexOf('.')) + '.txt';
        const txtPath = path.join(outputDir, txtFilename);

        const createdAtStr = item.createdAt ? new Date(item.createdAt).toLocaleString('zh-TW') : '未知';
        
        let txtContent = '';
        txtContent += `==================================================\n`;
        txtContent += `  Nano Banana Ultra Lite - 圖片生成參數\n`;
        txtContent += `==================================================\n`;
        txtContent += `圖片檔名: ${filename}\n`;
        txtContent += `提示詞 (Prompt):\n${item.prompt || ''}\n\n`;
        txtContent += `模型 (Model): ${item.model || ''}\n`;
        txtContent += `風格 (Style): ${item.style || ''}\n`;
        txtContent += `比例 (Aspect Ratio): ${item.aspectRatio || ''}\n`;
        txtContent += `尺寸 (Size): ${item.size || ''}\n`;
        txtContent += `生成時間: ${createdAtStr}\n`;
        
        if (item.thoughts && item.thoughts.trim()) {
            txtContent += `\n==================================================\n`;
            txtContent += `  思考過程 (Thinking Process)\n`;
            txtContent += `==================================================\n`;
            txtContent += `${item.thoughts.trim()}\n`;
        }

        fs.writeFileSync(txtPath, txtContent, 'utf8');
        extractedTextsCount++;
    }

    // Process each history item
    history.forEach((item, index) => {
        const shortId = item.id ? item.id.substring(0, 8) : `item_${index}`;
        const savedFilenames = [];

        // 1. Process Final Product Image (成品圖)
        if (item.savedFilename) {
            const success = saveImage(item.savedFilename);
            if (success) {
                console.log(`[成品圖] [${shortId}] 成功匯出圖片: "${item.savedFilename}"`);
                savedFilenames.push(item.savedFilename);
            } else {
                console.log(`[成品圖] [${shortId}] 提示: 找不到圖片資料或寫入失敗 "${item.savedFilename}"`);
            }
        }

        // 2. Process Thinking Process Images (思考圖) and Variant Images from resultParts
        if (Array.isArray(item.resultParts)) {
            item.resultParts.forEach((part) => {
                if (part.kind === 'thought-image' && part.savedFilename) {
                    const success = saveImage(part.savedFilename);
                    if (success) {
                        console.log(`[思考圖] [${shortId}] 成功匯出思考圖: "${part.savedFilename}"`);
                        savedFilenames.push(part.savedFilename);
                    }
                } else if (part.kind === 'output-image' && part.savedFilename && part.savedFilename !== item.savedFilename) {
                    const success = saveImage(part.savedFilename);
                    if (success) {
                        console.log(`[成品圖-變體] [${shortId}] 成功匯出變體圖片: "${part.savedFilename}"`);
                        savedFilenames.push(part.savedFilename);
                    }
                }
            });
        }

        // 3. Save prompt txt if we saved at least one image (either final product image or thought image)
        if (savedFilenames.length > 0) {
            // Determine primary filename reference for the txt file
            const primaryFilename = savedFilenames.includes(item.savedFilename) ? item.savedFilename : savedFilenames[0];
            savePromptTxt(primaryFilename, item);
            console.log(`[提示詞] [${shortId}] 已建立提示詞文字檔 (基於圖片 "${primaryFilename}")`);
        } else {
            console.log(`[提示詞] [${shortId}] 略過: 完全沒有任何圖片成功匯出，不保存提示詞文字檔。`);
        }
    });

    // Also look at remaining assets to make sure we didn't miss any full-resolution images.
    // We skip files ending with "-thumbnail.png" unless their corresponding full image is missing.
    Object.keys(savedImages).forEach((filename) => {
        const isThumbnail = filename.includes('-thumbnail');
        
        if (isThumbnail) {
            const baseName = filename.replace('-thumbnail', '');
            // Check if base image exists in savedImages, if not, we can extract thumbnail as fallback
            const hasFullImage = savedImages[baseName] !== undefined;
            if (hasFullImage) {
                skippedThumbnailsCount++;
                return; // Skip thumbnail since full image exists
            }
        }

        // Check if this file was already written (exists on disk)
        const targetPath = path.join(outputDir, filename);
        if (!fs.existsSync(targetPath)) {
            // Save it! It might be a stray image or stage asset
            const success = saveImage(filename);
            if (success) {
                console.log(`[其他資源] 成功匯出未分類圖片: "${filename}"`);
            }
        }
    });

    console.log(`\n==================================================`);
    console.log(`  匯出完成！`);
    console.log(`==================================================`);
    console.log(`  共匯出圖片檔案: ${extractedImagesCount} 個`);
    console.log(`  共匯出提示詞檔案: ${extractedTextsCount} 個`);
    console.log(`  過濾略過縮圖檔案: ${skippedThumbnailsCount} 個`);
    console.log(`  輸出目錄: "${outputDir}"`);
    console.log(`==================================================\n`);
}

main();
