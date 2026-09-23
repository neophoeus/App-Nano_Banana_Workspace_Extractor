/**
 * extractor.js
 * CLI Workspace Extractor for Nano Banana Ultra lite
 * 
 * Features:
 *  - 100% Zero Dependencies (native Node.js fs, path, crypto)
 *  - Custom Buffer JSON parser for handling multi-gigabyte workspaces
 *  - Pure PNG Metadata (iTXt) injection: prompt & parameters embedded directly inside PNGs
 *  - Clean output: outputs images only by default (no txt clutter)
 *  - Strict filtering: excludes thumbnails and staged assets, saving only generated results
 *  - Path traversal protection (path.basename sanitization)
 */

const fs = require('fs');
const path = require('path');

// CRC-32 Lookup Table for PNG Chunk generation
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    CRC_TABLE[i] = c >>> 0;
}

/**
 * Calculate CRC-32 checksum.
 */
function crc32(buf, offset = 0, length = buf.length) {
    let c = 0xFFFFFFFF;
    const end = offset + length;
    for (let i = offset; i < end; i++) {
        c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Create an uncompressed iTXt chunk for PNG.
 * @param {string} keyword - ASCII/UTF-8 keyword (1-79 bytes)
 * @param {string} text - UTF-8 text string
 * @returns {Buffer}
 */
function createITXtChunk(keyword, text) {
    const keywordBuf = Buffer.from(keyword, 'utf8');
    const textBuf = Buffer.from(text, 'utf8');

    // iTXt data structure:
    // keyword (null-terminated)
    // compFlag (1 byte, 0 = uncompressed)
    // compMethod (1 byte, 0)
    // langTag (null-terminated -> 1 null byte)
    // transKeyword (null-terminated -> 1 null byte)
    // text (utf8)
    const dataLen = keywordBuf.length + 1 + 1 + 1 + 1 + 1 + textBuf.length;
    const data = Buffer.alloc(dataLen);

    let offset = 0;
    keywordBuf.copy(data, offset);
    offset += keywordBuf.length;
    data[offset++] = 0; // null separator
    data[offset++] = 0; // uncompressed
    data[offset++] = 0; // compression method 0
    data[offset++] = 0; // empty language tag (null)
    data[offset++] = 0; // empty translated keyword (null)
    textBuf.copy(data, offset);

    // Chunk = 4 bytes length + 4 bytes type ('iTXt') + data + 4 bytes CRC
    const chunkType = Buffer.from('iTXt', 'ascii');
    const chunkHeader = Buffer.alloc(8);
    chunkHeader.writeUInt32BE(data.length, 0);
    chunkType.copy(chunkHeader, 4);

    const typeAndData = Buffer.concat([chunkType, data]);
    const crcVal = crc32(typeAndData);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal, 0);

    return Buffer.concat([chunkHeader, data, crcBuf]);
}

/**
 * Format generation metadata into standard AI parameters text.
 */
function formatParametersText(meta) {
    let text = `${meta.prompt || ''}\n`;
    const details = [];
    if (meta.model) details.push(`Model: ${meta.model}`);
    if (meta.style) details.push(`Style: ${meta.style}`);
    if (meta.aspectRatio) details.push(`Aspect Ratio: ${meta.aspectRatio}`);
    if (meta.size) details.push(`Size: ${meta.size}`);
    if (meta.mode) details.push(`Mode: ${meta.mode}`);
    if (meta.executionMode) details.push(`Execution Mode: ${meta.executionMode}`);
    if (meta.temperature !== undefined) details.push(`Temperature: ${meta.temperature}`);
    if (meta.thinkingLevel) details.push(`Thinking Level: ${meta.thinkingLevel}`);
    if (meta.createdAt) details.push(`Created At: ${new Date(meta.createdAt).toISOString()}`);
    if (details.length > 0) {
        text += details.join(', ') + '\n';
    }
    if (meta.thoughts && meta.thoughts.trim()) {
        text += `\n[Thoughts]:\n${meta.thoughts.trim()}\n`;
    }
    if (meta.text && meta.text.trim()) {
        text += `\n[Response]:\n${meta.text.trim()}\n`;
    }
    return text.trim();
}

/**
 * Inject iTXt metadata chunks into a PNG buffer.
 * Injects both standard 'parameters' and structured 'nano_banana_meta'.
 * @param {Buffer} pngBuffer
 * @param {object} meta
 * @returns {Buffer}
 */
function embedPngMetadata(pngBuffer, meta) {
    // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (!pngBuffer || pngBuffer.length < 8) return pngBuffer;
    if (pngBuffer[0] !== 0x89 || pngBuffer[1] !== 0x50 || pngBuffer[2] !== 0x4E || pngBuffer[3] !== 0x47) {
        return pngBuffer; // Not a PNG
    }

    // Prepare chunks
    const paramsText = formatParametersText(meta);
    const jsonText = JSON.stringify(meta);

    const chunkParams = createITXtChunk('parameters', paramsText);
    const chunkJson = createITXtChunk('nano_banana_meta', jsonText);
    const combinedChunks = Buffer.concat([chunkParams, chunkJson]);

    // Find IEND chunk
    const iendMarker = Buffer.from('IEND', 'ascii');
    const iendTypePos = pngBuffer.lastIndexOf(iendMarker);
    if (iendTypePos < 4) {
        return pngBuffer; // Corrupted PNG, return untouched
    }
    const iendPos = iendTypePos - 4; // Start of IEND chunk (length field)

    return Buffer.concat([
        pngBuffer.subarray(0, iendPos),
        combinedChunks,
        pngBuffer.subarray(iendPos)
    ]);
}

/**
 * Create a standard JPEG COM (Comment, marker 0xFF 0xFE) segment.
 * @param {string} prefix - Identification prefix (e.g. 'parameters' or 'nano_banana_meta')
 * @param {string} text - UTF-8 text payload
 * @returns {Buffer}
 */
function createJpegComSegment(prefix, text) {
    const payload = Buffer.from(prefix + '\n' + text, 'utf8');
    const maxDataLen = 65533; // 65535 - 2 bytes length field
    const slice = payload.length > maxDataLen ? payload.subarray(0, maxDataLen) : payload;
    const segLen = slice.length + 2;

    const segBuf = Buffer.alloc(4 + slice.length);
    segBuf[0] = 0xFF;
    segBuf[1] = 0xFE; // COM marker
    segBuf.writeUInt16BE(segLen, 2);
    slice.copy(segBuf, 4);
    return segBuf;
}

/**
 * Inject JPEG COM segments into a JPEG buffer (lossless, no re-encoding).
 * @param {Buffer} jpegBuffer
 * @param {object} meta
 * @returns {Buffer}
 */
function embedJpegMetadata(jpegBuffer, meta) {
    if (!jpegBuffer || jpegBuffer.length < 4) return jpegBuffer;
    if (jpegBuffer[0] !== 0xFF || jpegBuffer[1] !== 0xD8) return jpegBuffer; // Not a JPEG

    const paramsText = formatParametersText(meta);
    const jsonText = JSON.stringify(meta);

    const comParams = createJpegComSegment('parameters', paramsText);
    const comJson = createJpegComSegment('nano_banana_meta', jsonText);
    const combined = Buffer.concat([comParams, comJson]);

    // Insert after APP0 (JFIF) if present, otherwise immediately after SOI (0xFF 0xD8)
    let insertPos = 2;
    if (jpegBuffer[2] === 0xFF && jpegBuffer[3] === 0xE0) {
        const app0Len = jpegBuffer.readUInt16BE(4);
        insertPos = 4 + app0Len;
    }

    return Buffer.concat([
        jpegBuffer.subarray(0, insertPos),
        combined,
        jpegBuffer.subarray(insertPos)
    ]);
}

/**
 * Dispatcher to embed metadata into either PNG or JPEG.
 * @param {Buffer} imageBuffer
 * @param {object} meta
 * @returns {Buffer}
 */
function embedImageMetadata(imageBuffer, meta) {
    if (!imageBuffer || imageBuffer.length < 4) return imageBuffer;

    // Check PNG signature: 89 50 4E 47
    if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 && imageBuffer[2] === 0x4E && imageBuffer[3] === 0x47) {
        return embedPngMetadata(imageBuffer, meta);
    }

    // Check JPEG signature: FF D8
    if (imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8) {
        return embedJpegMetadata(imageBuffer, meta);
    }

    return imageBuffer;
}

// Print usage information
function printUsage() {
    console.log('\n================================================================');
    console.log('  Nano Banana Ultra lite - 工作區檔案專用匯出器 (CLI)');
    console.log('================================================================');
    console.log('使用方法:');
    console.log('  node extractor.js <workspace_file.json...> [-o <output_dir>] [--txt]');
    console.log('\n參數說明:');
    console.log('  workspace_file.json : Lite 版匯出的 .json 工作區檔案路徑 (支援傳入多個)');
    console.log('  -o, --output <dir>  : 匯出目標資料夾，預設為 ./output');
    console.log('  --txt               : (選填) 同時額外輸出 .txt 提示詞檔 (預設已直接內嵌至 PNG)');
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
                    return JSON.parse(buf.slice(start - 1, end + 1).toString('utf8'));
                } else {
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

/**
 * Process a single workspace JSON file and extract its images.
 */
function extractWorkspaceFile(jsonPath, outputDir, options = {}) {
    console.log(`\n==================================================`);
    console.log(`正在讀取工作區檔案: ${path.basename(jsonPath)}`);
    console.log(`==================================================`);

    let workspaceData;
    let fileBuffer;
    try {
        fileBuffer = fs.readFileSync(jsonPath);
        workspaceData = parseWorkspaceJsonBuffer(fileBuffer);
    } catch (error) {
        console.error(`❌ 錯誤: 無法解析 JSON 檔案. 原因: ${error.message}`);
        return { success: false, images: 0, texts: 0 };
    }

    if (workspaceData.format !== 'nbu-workspace-snapshot') {
        console.warn('⚠️ 警告: 此檔案格式欄位不是 "nbu-workspace-snapshot"，可能非標準 Nano Banana 工作區快照。');
    }

    const snapshot = workspaceData.snapshot;
    if (!snapshot || !Array.isArray(snapshot.history)) {
        console.error('❌ 錯誤: 工作區檔案中沒有找到有效的歷史紀錄 (snapshot.history)。');
        return { success: false, images: 0, texts: 0 };
    }

    const savedImages = (workspaceData.assets && workspaceData.assets.savedImages) || {};
    const history = snapshot.history;

    console.log(`歷史紀錄項目: ${history.length} 個 | 內嵌圖片資料: ${Object.keys(savedImages).length} 個`);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    let extractedImagesCount = 0;
    let extractedTextsCount = 0;

    // Helper to decode, embed metadata, and save an image
    function saveImage(filename, meta) {
        const imageRecord = savedImages[filename];
        if (!imageRecord || !imageRecord.dataUrl) {
            return false;
        }

        const dataUrlInfo = imageRecord.dataUrl;
        let base64Data;

        // Handle slice object { start, end }
        if (dataUrlInfo && typeof dataUrlInfo === 'object' && 'start' in dataUrlInfo && 'end' in dataUrlInfo) {
            let commaPos = -1;
            for (let i = dataUrlInfo.start; i < dataUrlInfo.end; i++) {
                if (fileBuffer[i] === 0x2C) { // ','
                    commaPos = i;
                    break;
                }
            }
            if (commaPos === -1) return false;

            const prefix = fileBuffer.slice(dataUrlInfo.start, commaPos).toString('ascii');
            if (!prefix.startsWith('data:') || !prefix.includes(';base64')) return false;

            base64Data = fileBuffer.slice(commaPos + 1, dataUrlInfo.end).toString('ascii');
        } else {
            const matches = dataUrlInfo.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
            if (!matches) return false;
            base64Data = matches[2];
        }

        let imageBuffer = Buffer.from(base64Data, 'base64');

        // Embed metadata into PNG iTXt or JPEG COM segments
        if (meta) {
            imageBuffer = embedImageMetadata(imageBuffer, meta);
        }

        // Path traversal sanitization
        const safeFilename = path.basename(filename);
        const targetPath = path.join(outputDir, safeFilename);

        fs.writeFileSync(targetPath, imageBuffer);
        extractedImagesCount++;
        return true;
    }

    // Helper to save optional prompt txt file
    function savePromptTxt(filename, meta) {
        const safeFilename = path.basename(filename);
        const txtFilename = safeFilename.substring(0, safeFilename.lastIndexOf('.')) + '.txt';
        const txtPath = path.join(outputDir, txtFilename);

        const createdAtStr = meta.createdAt ? new Date(meta.createdAt).toLocaleString('zh-TW') : '未知';
        
        let txtContent = '';
        txtContent += `==================================================\n`;
        txtContent += `  Nano Banana Ultra lite - 圖片生成參數\n`;
        txtContent += `==================================================\n`;
        txtContent += `圖片檔名: ${safeFilename}\n`;
        txtContent += `提示詞 (Prompt):\n${meta.prompt || ''}\n\n`;
        txtContent += `模型 (Model): ${meta.model || ''}\n`;
        txtContent += `風格 (Style): ${meta.style || ''}\n`;
        txtContent += `比例 (Aspect Ratio): ${meta.aspectRatio || ''}\n`;
        txtContent += `尺寸 (Size): ${meta.size || ''}\n`;
        if (meta.mode) txtContent += `生成模式 (Mode): ${meta.mode}\n`;
        if (meta.executionMode) txtContent += `執行方式 (Execution Mode): ${meta.executionMode}\n`;
        if (meta.temperature !== undefined) txtContent += `溫度 (Temperature): ${meta.temperature}\n`;
        if (meta.thinkingLevel) txtContent += `思考層級 (Thinking Level): ${meta.thinkingLevel}\n`;
        txtContent += `生成時間: ${createdAtStr}\n`;
        
        if (meta.text && meta.text.trim()) {
            txtContent += `\n==================================================\n`;
            txtContent += `  模型文字回覆說明 (Model Response)\n`;
            txtContent += `==================================================\n`;
            txtContent += `${meta.text.trim()}\n`;
        }

        if (meta.thoughts && meta.thoughts.trim()) {
            txtContent += `\n==================================================\n`;
            txtContent += `  思考過程 (Thinking Process)\n`;
            txtContent += `==================================================\n`;
            txtContent += `${meta.thoughts.trim()}\n`;
        }

        fs.writeFileSync(txtPath, txtContent, 'utf8');
        extractedTextsCount++;
    }

    // Process each history item (Strict filtering: ONLY generated product, variant, and thought images)
    history.forEach((item, index) => {
        const shortId = item.id ? item.id.substring(0, 8) : `item_${index}`;

        const baseMeta = {
            id: item.id,
            prompt: item.prompt || '',
            model: item.model || '',
            style: item.style || '',
            aspectRatio: item.aspectRatio || '',
            size: item.size || '',
            mode: item.mode || '',
            executionMode: item.executionMode || '',
            temperature: item.temperature,
            thinkingLevel: item.thinkingLevel,
            createdAt: item.createdAt || null,
            text: item.text || '',
            thoughts: item.thoughts || '',
        };

        // 1. Process Final Product Image (成品圖)
        if (item.savedFilename) {
            const success = saveImage(item.savedFilename, baseMeta);
            if (success) {
                console.log(`  ✓ [成品圖] [${shortId}] 成功匯出並內嵌參數: "${item.savedFilename}"`);
                if (options.saveTxt) {
                    savePromptTxt(item.savedFilename, baseMeta);
                }
            }
        }

        // 2. Process Thinking Process Images and Variant Images from resultParts
        if (Array.isArray(item.resultParts)) {
            item.resultParts.forEach((part) => {
                if (part.kind === 'thought-image' && part.savedFilename) {
                    const thoughtMeta = {
                        ...baseMeta,
                        kind: 'thought-image',
                        sequence: part.sequence,
                        thoughts: item.thoughts || 'Thinking Process Image'
                    };
                    const success = saveImage(part.savedFilename, thoughtMeta);
                    if (success) {
                        console.log(`  ✓ [思考圖] [${shortId}] 成功匯出並內嵌參數: "${part.savedFilename}"`);
                        if (options.saveTxt) {
                            savePromptTxt(part.savedFilename, thoughtMeta);
                        }
                    }
                } else if (part.kind === 'output-image' && part.savedFilename && part.savedFilename !== item.savedFilename) {
                    const variantMeta = {
                        ...baseMeta,
                        kind: 'variant-image',
                        sequence: part.sequence
                    };
                    const success = saveImage(part.savedFilename, variantMeta);
                    if (success) {
                        console.log(`  ✓ [變體圖] [${shortId}] 成功匯出並內嵌參數: "${part.savedFilename}"`);
                        if (options.saveTxt) {
                            savePromptTxt(part.savedFilename, variantMeta);
                        }
                    }
                }
            });
        }
    });

    console.log(`此工作區提取完畢: 成功提取 ${extractedImagesCount} 張圖片 (已全數內嵌中繼資料)。`);
    return { success: true, images: extractedImagesCount, texts: extractedTextsCount };
}

// Main execution function
function main() {
    const rawArgs = process.argv.slice(2);
    
    if (rawArgs.length === 0 || rawArgs.includes('--help') || rawArgs.includes('-h')) {
        printUsage();
        process.exit(0);
    }

    // Parse options and input files
    const inputFiles = [];
    let outputDir = path.join(__dirname, 'output');
    let saveTxt = false;

    for (let i = 0; i < rawArgs.length; i++) {
        const arg = rawArgs[i];
        if (arg === '-o' || arg === '--output') {
            if (i + 1 < rawArgs.length) {
                outputDir = path.resolve(rawArgs[++i]);
            }
        } else if (arg === '--txt') {
            saveTxt = true;
        } else if (!arg.startsWith('-')) {
            inputFiles.push(path.resolve(arg));
        }
    }

    if (inputFiles.length === 0) {
        console.error('❌ 錯誤: 請至少指定一個 .json 工作區檔案路徑。');
        printUsage();
        process.exit(1);
    }

    console.log('\n================================================================');
    console.log('  Nano Banana Ultra lite - 工作區檔案提取開始');
    console.log('================================================================');
    console.log(`匯出目標目錄: "${outputDir}"`);
    console.log(`模式        : 純 PNG 內嵌 Metadata${saveTxt ? ' (+ 額外輸出 TXT 檔)' : ' (極致純淨，不輸出 TXT 檔)'}`);

    let totalImages = 0;
    let totalTexts = 0;
    let processedFiles = 0;

    inputFiles.forEach(file => {
        if (!fs.existsSync(file)) {
            console.error(`\n❌ [錯誤] 找不到檔案: "${file}"，跳過此檔案。`);
            return;
        }
        const res = extractWorkspaceFile(file, outputDir, { saveTxt });
        if (res.success) {
            totalImages += res.images;
            totalTexts += res.texts;
            processedFiles++;
        }
    });

    console.log(`\n================================================================`);
    console.log(`  🎉 全數匯出完成！`);
    console.log(`================================================================`);
    console.log(`  成功處理工作區: ${processedFiles} 個檔案`);
    console.log(`  共提取生成圖片: ${totalImages} 張 (提示詞已完整內嵌於 PNG/JPEG 圖片中)`);
    if (saveTxt) {
        console.log(`  共輸出提示詞檔: ${totalTexts} 個 (.txt)`);
    } else {
        console.log(`  提示詞狀態    : 已全數內嵌進 PNG/JPEG 檔案中，保持輸出目錄整潔無雜訊。`);
        console.log(`  讀取中繼資料  : 可將圖片拖曳至 drag_and_drop_read_metadata.bat 或以 viewer.html 開啟。`);
    }
    console.log(`  輸出目錄      : "${outputDir}"`);
    console.log(`================================================================\n`);
}

if (require.main === module) {
    main();
}

module.exports = {
    embedPngMetadata,
    embedJpegMetadata,
    embedImageMetadata,
    formatParametersText,
    extractWorkspaceFile,
    parseWorkspaceJsonBuffer,
    crc32,
};
