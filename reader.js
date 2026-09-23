/**
 * reader.js
 * Pure Node.js PNG & JPEG Metadata Reader for Nano Banana Ultra lite images
 * Usage: node reader.js <image1.png|image1.jpg> [image2.jpg ...]
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/**
 * Extract text metadata chunks (iTXt / tEXt) from a PNG Buffer.
 * @param {Buffer} buf - Raw PNG buffer
 * @returns {Record<string, string>} Key-value map of keyword -> text
 */
function readPngMetadata(buf) {
    if (!buf || buf.length < 8) {
        throw new Error('檔案太小，不是合法的 PNG 檔案。');
    }

    // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
    const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    for (let i = 0; i < 8; i++) {
        if (buf[i] !== pngSignature[i]) {
            throw new Error('此檔案不是合法的 PNG 圖片格式（缺少 PNG 標頭簽名）。');
        }
    }

    const metadata = {};
    let pos = 8;
    const len = buf.length;

    while (pos + 8 <= len) {
        const chunkLen = buf.readUInt32BE(pos);
        const chunkType = buf.toString('ascii', pos + 4, pos + 8);
        const dataStart = pos + 8;
        const dataEnd = dataStart + chunkLen;

        if (dataEnd + 4 > len) {
            break; // Truncated chunk
        }

        if (chunkType === 'tEXt') {
            // tEXt: keyword (1-79 bytes null-terminated) + text
            const chunkData = buf.subarray(dataStart, dataEnd);
            const nullIdx = chunkData.indexOf(0x00);
            if (nullIdx > 0) {
                const keyword = chunkData.subarray(0, nullIdx).toString('ascii');
                const text = chunkData.subarray(nullIdx + 1).toString('utf8');
                metadata[keyword] = text;
            }
        } else if (chunkType === 'iTXt') {
            // iTXt: keyword (null-terminated) + compFlag(1) + compMethod(1) + lang(null-term) + transKey(null-term) + text
            const chunkData = buf.subarray(dataStart, dataEnd);
            let idx = 0;
            const null1 = chunkData.indexOf(0x00, idx);
            if (null1 > 0) {
                const keyword = chunkData.subarray(0, null1).toString('utf8');
                idx = null1 + 1;
                if (idx + 2 <= chunkData.length) {
                    const compFlag = chunkData[idx];
                    const compMethod = chunkData[idx + 1];
                    idx += 2;

                    // Skip language tag
                    const null2 = chunkData.indexOf(0x00, idx);
                    if (null2 !== -1) {
                        idx = null2 + 1;
                        // Skip translated keyword
                        const null3 = chunkData.indexOf(0x00, idx);
                        if (null3 !== -1) {
                            idx = null3 + 1;
                            const textBytes = chunkData.subarray(idx);
                            let text = '';
                            if (compFlag === 1) {
                                try {
                                    text = zlib.inflateSync(textBytes).toString('utf8');
                                } catch {
                                    text = textBytes.toString('utf8');
                                }
                            } else {
                                text = textBytes.toString('utf8');
                            }
                            metadata[keyword] = text;
                        }
                    }
                }
            }
        } else if (chunkType === 'IEND') {
            break;
        }

        // Advance to next chunk: length(4) + type(4) + data(chunkLen) + crc(4)
        pos += 12 + chunkLen;
    }

    return metadata;
}

/**
 * Extract text metadata from JPEG COM (Comment 0xFF 0xFE) segments.
 * @param {Buffer} buf - Raw JPEG buffer
 * @returns {Record<string, string>} Key-value map of keyword -> text
 */
function readJpegMetadata(buf) {
    if (!buf || buf.length < 4) {
        throw new Error('檔案太小，不是合法的 JPEG 檔案。');
    }

    // Check JPEG SOI marker: FF D8
    if (buf[0] !== 0xFF || buf[1] !== 0xD8) {
        throw new Error('此檔案不是合法的 JPEG 圖片格式（缺少 SOI 簽名 0xFFD8）。');
    }

    const metadata = {};
    let pos = 2;
    const len = buf.length;

    while (pos + 4 <= len) {
        if (buf[pos] !== 0xFF) {
            pos++;
            continue;
        }

        // Skip extra 0xFF padding bytes
        while (pos < len && buf[pos] === 0xFF) {
            pos++;
        }
        if (pos >= len) break;

        const marker = buf[pos++];

        // Markers without length
        if (marker === 0xD9) {
            break; // EOI
        }
        if (marker === 0xDA) {
            break; // SOS (Start of Scan - entropy image data begins)
        }
        if ((marker >= 0xD0 && marker <= 0xD7) || marker === 0x00) {
            continue; // RST or escaped byte
        }

        // Variable length markers
        if (pos + 2 > len) break;
        const segLen = buf.readUInt16BE(pos);
        if (segLen < 2 || pos + segLen > len) {
            break; // Invalid segment length
        }

        const payloadStart = pos + 2;
        const payloadEnd = pos + segLen;

        if (marker === 0xFE) { // COM (Comment)
            const payload = buf.subarray(payloadStart, payloadEnd).toString('utf8');
            const newlineIdx = payload.indexOf('\n');
            if (newlineIdx !== -1) {
                const prefix = payload.substring(0, newlineIdx).trim();
                const content = payload.substring(newlineIdx + 1);
                if (prefix === 'nano_banana_meta' || prefix === 'parameters') {
                    metadata[prefix] = content;
                } else {
                    metadata[prefix || 'comment'] = content;
                }
            } else {
                metadata['comment'] = payload;
            }
        }

        pos += segLen;
    }

    return metadata;
}

/**
 * Universal metadata reader that automatically identifies image format (PNG or JPEG).
 * @param {Buffer} buf
 * @returns {Record<string, string>}
 */
function readImageMetadata(buf) {
    if (!buf || buf.length < 4) {
        throw new Error('檔案太小，無法辨識圖片格式。');
    }

    // PNG signature: 89 50 4E 47
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
        return readPngMetadata(buf);
    }

    // JPEG signature: FF D8
    if (buf[0] === 0xFF && buf[1] === 0xD8) {
        return readJpegMetadata(buf);
    }

    throw new Error('不支援或未知的圖片格式（僅支援 PNG 與 JPEG / JPG 圖片）。');
}

/**
 * Display formatted metadata of an image file.
 * @param {string} imagePath
 */
function inspectImageFile(imagePath) {
    const fullPath = path.resolve(imagePath);
    if (!fs.existsSync(fullPath)) {
        console.error(`\n❌ [錯誤] 找不到檔案: "${imagePath}"\n`);
        return;
    }

    const filename = path.basename(fullPath);
    console.log('\n================================================================');
    console.log(`  Nano Banana Ultra - 圖片中繼資料檢視器 (Metadata Reader)`);
    console.log('================================================================');
    console.log(`檔案: ${filename}`);

    let buf;
    try {
        buf = fs.readFileSync(fullPath);
    } catch (err) {
        console.error(`讀取檔案失敗: ${err.message}`);
        return;
    }

    let metaMap;
    try {
        metaMap = readImageMetadata(buf);
    } catch (err) {
        console.error(`解析失敗: ${err.message}`);
        return;
    }

    let parsedMeta = null;
    if (metaMap['nano_banana_meta']) {
        try {
            parsedMeta = JSON.parse(metaMap['nano_banana_meta']);
        } catch {
            // ignore
        }
    }

    if (parsedMeta) {
        // High fidelity structured presentation
        console.log(`\n提示詞 (Prompt):`);
        console.log(`  ${parsedMeta.prompt || '(無)'}`);

        console.log(`\n模型與參數:`);
        if (parsedMeta.model) console.log(`  模型 (Model)            : ${parsedMeta.model}`);
        if (parsedMeta.style) console.log(`  風格 (Style)            : ${parsedMeta.style}`);
        if (parsedMeta.aspectRatio) console.log(`  比例 (Aspect Ratio)     : ${parsedMeta.aspectRatio}`);
        if (parsedMeta.size) console.log(`  尺寸 (Size)             : ${parsedMeta.size}`);
        if (parsedMeta.mode) console.log(`  生成模式 (Mode)         : ${parsedMeta.mode}`);
        if (parsedMeta.executionMode) console.log(`  執行方式 (Execution Mode): ${parsedMeta.executionMode}`);
        if (parsedMeta.temperature !== undefined) console.log(`  溫度 (Temperature)      : ${parsedMeta.temperature}`);
        if (parsedMeta.thinkingLevel) console.log(`  思考層級 (Thinking Level): ${parsedMeta.thinkingLevel}`);
        if (parsedMeta.createdAt) {
            const timeStr = new Date(parsedMeta.createdAt).toLocaleString('zh-TW');
            console.log(`  生成時間                : ${timeStr}`);
        }

        if (parsedMeta.text && parsedMeta.text.trim()) {
            console.log(`\n模型文字說明 (Model Text Response):`);
            console.log(`  ${parsedMeta.text.trim()}`);
        }

        if (parsedMeta.thoughts && parsedMeta.thoughts.trim()) {
            console.log(`\n思考過程 (Thinking Process):`);
            console.log(`  ${parsedMeta.thoughts.trim()}`);
        }

        if (Array.isArray(parsedMeta.groundingSources) && parsedMeta.groundingSources.length > 0) {
            console.log(`\n搜尋引用來源 (Grounding Sources):`);
            parsedMeta.groundingSources.forEach((src, idx) => {
                console.log(`  [${idx + 1}] ${src.title || ''} (${src.url || ''})`);
            });
        }
    } else if (metaMap['parameters']) {
        // Civitai / WebUI / Standard parameter text format
        console.log(`\n解析到參數內容 (parameters):`);
        console.log(metaMap['parameters']);
    } else {
        const extraKeys = Object.keys(metaMap);
        if (extraKeys.length > 0) {
            console.log(`\n發現其他中繼資料欄位:`);
            extraKeys.forEach(k => {
                console.log(`  [${k}]: ${metaMap[k]}`);
            });
        } else {
            console.log(`\n提示: 此圖片中未找到 Nano Banana 或相容的 AI 生成中繼資料。`);
        }
    }

    console.log('================================================================\n');
}

// CLI entry point
function main() {
    const args = process.argv.slice(2);
    if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
        console.log('\n使用方法:');
        console.log('  node reader.js <image1.png|image1.jpg> [image2.jpg ...]');
        console.log('  或直接將圖片拖曳至 drag_and_drop_read_metadata.bat 上。\n');
        process.exit(0);
    }

    args.forEach(arg => {
        inspectImageFile(arg);
    });
}

if (require.main === module) {
    main();
}

module.exports = {
    readPngMetadata,
    readJpegMetadata,
    readImageMetadata,
    inspectImageFile,
};
