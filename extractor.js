/**
 * extractor.js
 * CLI Workspace Extractor for Nano Banana Ultra lite
 * Usage: node extractor.js <workspace-json-path> [output-dir]
 */

const fs = require('fs');
const path = require('path');

// Print usage information
function printUsage() {
    console.log('\n================================================================');
    console.log('  Nano Banana Ultra lite - 工作區檔案專用匯出器 (CLI)');
    console.log('================================================================');
    console.log('使用方法:');
    console.log('  node extractor.js <workspace_file.json> [output_directory]');
    console.log('\n參數說明:');
    console.log('  workspace_file.json : Lite 版匯出的 .json 工作區檔案路徑 (必填)');
    console.log('  output_directory    : 匯出目標資料夾，預設為 ./output (選填)');
    console.log('================================================================\n');
}

// A fast and lightweight JSON parser directly on a Buffer to avoid V8 string limit errors
function parseWorkspaceJsonBuffer(buf) {
    let pos = 0;
    const len = buf.length;

    function skipWhitespace() {
        while (pos < len) {
            const b = buf[pos];
            if (b === 0x20 || b === 0x09 || b === 0x0A || b === 0x0D) { // space, tab, LF, CR
                pos++;
            } else {
                break;
            }
        }
    }

    function parseString(isDataUrl) {
        pos++; // skip "
        const start = pos;
        let hasEscapes = false;
        while (pos < len) {
            const b = buf[pos];
            if (b === 0x22) { // "
                const end = pos;
                pos++; // skip "
                if (isDataUrl) {
                    return { start, end };
                }
                if (hasEscapes) {
                    // Slow path: decode and parse with JSON.parse to handle escapes correctly
                    return JSON.parse(buf.slice(start - 1, end + 1).toString('utf8'));
                } else {
                    // Fast path: direct toString
                    return buf.toString('utf8', start, end);
                }
            } else if (b === 0x5C) { // \
                hasEscapes = true;
                pos += 2; // skip escape char
            } else {
                pos++;
            }
        }
        throw new Error('Unterminated string in JSON');
    }

    function parseValue(isDataUrl) {
        skipWhitespace();
        if (pos >= len) throw new Error('Unexpected end of JSON');
        const b = buf[pos];
        if (b === 0x22) { // "
            return parseString(isDataUrl);
        } else if (b === 0x7B) { // {
            return parseObject();
        } else if (b === 0x5B) { // [
            return parseArray();
        } else if (b === 0x74) { // t (true)
            if (pos + 3 < len && buf[pos+1] === 0x72 && buf[pos+2] === 0x75 && buf[pos+3] === 0x65) {
                pos += 4;
                return true;
            }
        } else if (b === 0x66) { // f (false)
            if (pos + 4 < len && buf[pos+1] === 0x61 && buf[pos+2] === 0x6C && buf[pos+3] === 0x73 && buf[pos+4] === 0x65) {
                pos += 5;
                return false;
            }
        } else if (b === 0x6E) { // n (null)
            if (pos + 3 < len && buf[pos+1] === 0x75 && buf[pos+2] === 0x6C && buf[pos+3] === 0x6C) {
                pos += 4;
                return null;
            }
        } else {
            // Number (or invalid)
            let start = pos;
            while (pos < len) {
                const b = buf[pos];
                if ((b >= 0x30 && b <= 0x39) || b === 0x2D || b === 0x2E || b === 0x2B || b === 0x65 || b === 0x45) {
                    pos++;
                } else {
                    break;
                }
            }
            if (pos === start) {
                throw new Error('Unexpected token: ' + String.fromCharCode(buf[start]));
            }
            const numStr = buf.toString('utf8', start, pos);
            const num = Number(numStr);
            if (isNaN(num)) {
                throw new Error('Invalid number or value: ' + numStr);
            }
            return num;
        }
        throw new Error('Unexpected token: ' + String.fromCharCode(b));
    }

    function parseObject() {
        pos++; // skip {
        const obj = {};
        skipWhitespace();
        if (pos < len && buf[pos] === 0x7D) { // }
            pos++; // skip }
            return obj;
        }
        while (pos < len) {
            skipWhitespace();
            if (pos >= len || buf[pos] !== 0x22) { // "
                throw new Error('Expected string key in object, got: ' + (pos >= len ? 'EOF' : String.fromCharCode(buf[pos])));
            }
            const key = parseString(false);
            skipWhitespace();
            if (pos >= len || buf[pos] !== 0x3A) { // :
                throw new Error('Expected colon after key in object, got: ' + (pos >= len ? 'EOF' : String.fromCharCode(buf[pos])));
            }
            pos++; // skip :
            const val = parseValue(key === 'dataUrl');
            obj[key] = val;
            skipWhitespace();
            if (pos < len && buf[pos] === 0x7D) { // }
                pos++;
                return obj;
            } else if (pos < len && buf[pos] === 0x2C) { // ,
                pos++;
            } else {
                throw new Error('Expected comma or closing brace in object, got: ' + (pos >= len ? 'EOF' : String.fromCharCode(buf[pos])));
            }
        }
        throw new Error('Unterminated object in JSON');
    }

    function parseArray() {
        pos++; // skip [
        const arr = [];
        skipWhitespace();
        if (pos < len && buf[pos] === 0x5D) { // ]
            pos++; // skip ]
            return arr;
        }
        while (pos < len) {
            const val = parseValue(false);
            arr.push(val);
            skipWhitespace();
            if (pos < len && buf[pos] === 0x5D) { // ]
                pos++;
                return arr;
            } else if (pos < len && buf[pos] === 0x2C) { // ,
                pos++;
            } else {
                throw new Error('Expected comma or closing bracket in array, got: ' + (pos >= len ? 'EOF' : String.fromCharCode(buf[pos])));
            }
        }
        throw new Error('Unterminated array in JSON');
    }

    const res = parseValue(false);
    skipWhitespace();
    if (pos < len) {
        throw new Error('Trailing garbage after JSON');
    }
    return res;
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
    let fileBuffer;
    try {
        fileBuffer = fs.readFileSync(jsonPath);
        workspaceData = parseWorkspaceJsonBuffer(fileBuffer);
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

        const dataUrlInfo = imageRecord.dataUrl;
        let base64Data;

        // Handle when dataUrl is parsed as a slice object { start, end }
        if (dataUrlInfo && typeof dataUrlInfo === 'object' && 'start' in dataUrlInfo && 'end' in dataUrlInfo) {
            let commaPos = -1;
            for (let i = dataUrlInfo.start; i < dataUrlInfo.end; i++) {
                if (fileBuffer[i] === 0x2C) { // ','
                    commaPos = i;
                    break;
                }
            }
            if (commaPos === -1) {
                return false;
            }
            const prefix = fileBuffer.slice(dataUrlInfo.start, commaPos).toString('ascii');
            if (!prefix.startsWith('data:') || !prefix.includes(';base64')) {
                return false;
            }
            base64Data = fileBuffer.slice(commaPos + 1, dataUrlInfo.end).toString('ascii');
        } else {
            // Fallback for regular string dataUrl
            const matches = dataUrlInfo.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
            if (!matches) {
                return false;
            }
            base64Data = matches[2];
        }

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
        txtContent += `  Nano Banana Ultra lite - 圖片生成參數\n`;
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
