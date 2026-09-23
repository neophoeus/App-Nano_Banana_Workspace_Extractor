/**
 * test_extraction.js
 * Integration test to verify extractor.js execution, pure PNG metadata embedding,
 * strict thumbnail/stage asset filtering, and reader.js metadata restoration.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { readPngMetadata, readJpegMetadata, readImageMetadata } = require('./reader');

const TEST_JSON_PATH = path.join(__dirname, 'dummy_workspace.json');
const OUTPUT_DIR = path.join(__dirname, 'output');
const OUTPUT_TXT_DIR = path.join(__dirname, 'output_txt_test');

// Clean up previous runs
function cleanup() {
    if (fs.existsSync(TEST_JSON_PATH)) {
        fs.unlinkSync(TEST_JSON_PATH);
    }
    if (fs.existsSync(OUTPUT_DIR)) {
        fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    }
    if (fs.existsSync(OUTPUT_TXT_DIR)) {
        fs.rmSync(OUTPUT_TXT_DIR, { recursive: true, force: true });
    }
}

// 1x1 transparent PNG base64
const testPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const testJpgBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBAQEA8QDw8QDw8QDw8QEA8PDw8QFREWFhURFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0OGxAQGzMlHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAXAAEBAQEAAAAAAAAAAAAAAAAAAQID/8QAFhEBAQEAAAAAAAAAAAAAAAAAAAER/9oADAMBAAIQAxAAAAH4gD//xAAXEAADAQAAAAAAAAAAAAAAAAAAAREx/9oACAEBAAEFAtN//8QAFhEBAQEAAAAAAAAAAAAAAAAAABEh/9oACAEDAQE/AYf/xAAVEQEBAAAAAAAAAAAAAAAAAAAQEf/aAAgBAgEBPwGH/8QAFxABAQEBAAAAAAAAAAAAAAAAAQARIf/aAAgBAQAGPwJrH//EABsQAQEBAQADAQAAAAAAAAAAAAERACExQVFh/9oACAEBAAE/IQYR0VXYs9hH6V//2gAMAwEAAgADAAAAEPP/xAAVEQEBAAAAAAAAAAAAAAAAAAAQEf/aAAgBAwEBPxBf/8QAFhEBAQEAAAAAAAAAAAAAAAAAABEh/9oACAECAQE/EFf/xAAaEAEBAQEBAQEAAAAAAAAAAAABEQAhMUFh/9oACAEBAAE/EDicY4x3g5TLFrzGF1R5i//Z';

// Create a dummy workspace JSON matching real Nano Banana Ultra exports
const mockWorkspace = {
    format: 'nbu-workspace-snapshot',
    version: 1,
    exportedAt: new Date().toISOString(),
    snapshot: {
        history: [
            {
                // Item 1: Full Success (has final image and prompt)
                id: 'item_1_success',
                prompt: '可愛的黃色小香蕉 🍌',
                model: 'gemini-3.1-flash-image',
                style: 'Anime',
                aspectRatio: '1:1',
                size: '2K',
                mode: 'Text to Image',
                executionMode: 'single-turn',
                temperature: 0.7,
                thinkingLevel: 'normal',
                createdAt: Date.now() - 20000,
                savedFilename: 'banana_yellow.png',
                thumbnailSavedFilename: 'banana_yellow-thumbnail.jpg',
                text: '這是一張可愛香蕉的模型說明文字',
                thoughts: '思考過程：正常繪製成品。'
            },
            {
                // Item 2: Thinking-image exception (no final image, but has thinking image)
                id: 'item_2_thought_only',
                prompt: '太空中的香蕉船 🚀',
                model: 'gemini-3-pro-image',
                style: 'Photorealistic',
                aspectRatio: '16:9',
                size: '4K',
                createdAt: Date.now() - 10000,
                thoughts: '思考過程：沒有產出成品，但生成了思考圖。',
                resultParts: [
                    {
                        sequence: 0,
                        kind: 'thought-image',
                        imageUrl: '',
                        mimeType: 'image/png',
                        savedFilename: 'banana_space-thought-0.png'
                    }
                ]
            },
            {
                // Item 3: Item with variant output image
                id: 'item_3_variant',
                prompt: '變體香蕉測試 🍌✨',
                model: 'gemini-3.1-flash-image',
                style: 'Pixel Art',
                aspectRatio: '1:1',
                size: '1K',
                createdAt: Date.now() - 5000,
                savedFilename: 'banana_primary.png',
                resultParts: [
                    {
                        sequence: 1,
                        kind: 'output-image',
                        imageUrl: '',
                        mimeType: 'image/png',
                        savedFilename: 'banana_variant-1.png'
                    }
                ]
            },
            {
                // Item 4: Completely Failed (has prompt but no media/images at all)
                id: 'item_4_completely_failed',
                prompt: '失敗的生成項目（無任何圖片） ❌',
                model: 'gemini-3.1-flash-image',
                style: 'None',
                aspectRatio: '1:1',
                size: '2K',
                createdAt: Date.now(),
                thoughts: '思考過程：此項目沒有生成任何圖片，因此不應儲存任何檔案。'
            },
            {
                // Item 5: Real Gemini 3.1 Flash Image JPEG generation
                id: 'item_5_gemini_jpg',
                prompt: '真實 Gemini JPEG 圖片 🍌📸',
                model: 'gemini-3.1-flash-image',
                style: 'Photorealistic',
                aspectRatio: '16:9',
                size: '4K',
                mode: 'Text to Image',
                executionMode: 'single-turn',
                temperature: 0.9,
                thinkingLevel: 'deep',
                createdAt: Date.now() - 2000,
                savedFilename: 'banana_gemini_raw.jpg',
                thumbnailSavedFilename: 'banana_gemini-thumbnail.jpg',
                text: '這是一張真實由 Gemini 產出的 JPEG 格式圖片',
                thoughts: '思考過程：Gemini 直接輸出 data:image/jpeg;base64 二進位流，測試 COM 標記內嵌。',
                resultParts: [
                    {
                        sequence: 1,
                        kind: 'output-image',
                        imageUrl: '',
                        mimeType: 'image/jpeg',
                        savedFilename: 'banana_gemini_variant.jpg'
                    }
                ]
            }
        ],
        stagedAssets: [
            {
                id: 'stage_asset_1',
                savedFilename: 'banana_stage_reference.png',
                role: 'stage-source'
            }
        ]
    },
    assets: {
        savedImages: {
            'banana_yellow.png': {
                dataUrl: testPngBase64,
                savedAt: Date.now() - 20000
            },
            'banana_yellow-thumbnail.jpg': {
                dataUrl: testJpgBase64,
                savedAt: Date.now() - 20000
            },
            'banana_space-thought-0.png': {
                dataUrl: testPngBase64,
                savedAt: Date.now() - 10000
            },
            'banana_primary.png': {
                dataUrl: testPngBase64,
                savedAt: Date.now() - 5000
            },
            'banana_variant-1.png': {
                dataUrl: testPngBase64,
                savedAt: Date.now() - 5000
            },
            'banana_gemini_raw.jpg': {
                dataUrl: testJpgBase64,
                savedAt: Date.now() - 2000
            },
            'banana_gemini-thumbnail.jpg': {
                dataUrl: testJpgBase64,
                savedAt: Date.now() - 2000
            },
            'banana_gemini_variant.jpg': {
                dataUrl: testJpgBase64,
                savedAt: Date.now() - 2000
            },
            'banana_stage_reference.png': {
                dataUrl: testPngBase64,
                savedAt: Date.now() - 25000
            }
        }
    }
};

console.log('--- Extractor & Metadata Reader Integration Test ---');

try {
    cleanup();

    // 1. Create dummy workspace JSON
    console.log('Generating dummy workspace JSON...');
    fs.writeFileSync(TEST_JSON_PATH, JSON.stringify(mockWorkspace, null, 2), 'utf8');

    // 2. Execute extractor.js (Default Mode: Pure PNG Metadata, No TXT)
    console.log('\n[Test 1] Executing extractor.js CLI (Default Mode: Pure PNGs, No TXT)...');
    execSync(`node extractor.js "${TEST_JSON_PATH}"`, { stdio: 'inherit' });

    // 3. Verify output files
    console.log('\nVerifying output files in default mode...');
    const outputFiles = fs.readdirSync(OUTPUT_DIR);
    console.log('Output directory contents:', outputFiles);

    // Expected images that MUST exist
    const expectedImages = [
        'banana_yellow.png',
        'banana_space-thought-0.png',
        'banana_primary.png',
        'banana_variant-1.png',
        'banana_gemini_raw.jpg',
        'banana_gemini_variant.jpg'
    ];

    let testPassed = true;
    expectedImages.forEach(file => {
        if (outputFiles.includes(file)) {
            console.log(`  ✓ [預期存在] 圖片存在: "${file}"`);
        } else {
            console.error(`  ❌ [預期存在] 圖片遺失: "${file}"`);
            testPassed = false;
        }
    });

    // Verify NO TXT files exist in default mode
    const txtFiles = outputFiles.filter(f => f.endsWith('.txt'));
    if (txtFiles.length === 0) {
        console.log('  ✓ [驗證成功] 預設模式下未產生任何 .txt 檔案，保持輸出目錄極致整潔！');
    } else {
        console.error('  ❌ [驗證失敗] 輸出目錄中不應存在 .txt 檔案:', txtFiles);
        testPassed = false;
    }

    // Verify thumbnails and staged assets are completely filtered out
    const forbiddenFiles = [
        'banana_yellow-thumbnail.jpg',
        'banana_gemini-thumbnail.jpg',
        'banana_stage_reference.png'
    ];
    forbiddenFiles.forEach(file => {
        if (outputFiles.includes(file)) {
            console.error(`  ❌ [驗證失敗] 縮圖或舞台素材未被過濾，錯誤存在: "${file}"`);
            testPassed = false;
        } else {
            console.log(`  ✓ [驗證成功] 成功排除非生成素材: "${file}"`);
        }
    });

    // 4. Verify embedded PNG metadata using reader.js
    console.log('\n[Test 2a] Verifying embedded PNG metadata via reader.js...');
    const yellowPngBuf = fs.readFileSync(path.join(OUTPUT_DIR, 'banana_yellow.png'));
    const yellowMeta = readImageMetadata(yellowPngBuf);

    if (yellowMeta.nano_banana_meta) {
        const parsed = JSON.parse(yellowMeta.nano_banana_meta);
        if (
            parsed.prompt === '可愛的黃色小香蕉 🍌' &&
            parsed.model === 'gemini-3.1-flash-image' &&
            parsed.style === 'Anime' &&
            parsed.aspectRatio === '1:1' &&
            parsed.size === '2K' &&
            parsed.mode === 'Text to Image' &&
            parsed.executionMode === 'single-turn' &&
            parsed.temperature === 0.7 &&
            parsed.text === '這是一張可愛香蕉的模型說明文字' &&
            parsed.thoughts.includes('正常繪製成品')
        ) {
            console.log('  ✓ [PNG Metadata 驗證] banana_yellow.png 內嵌結構化資料完全符合預期！');
        } else {
            console.error('  ❌ [PNG Metadata 驗證] banana_yellow.png 內嵌資料不符:', parsed);
            testPassed = false;
        }
    } else {
        console.error('  ❌ [PNG Metadata 驗證] 未找到 nano_banana_meta 區塊！');
        testPassed = false;
    }

    if (yellowMeta.parameters && yellowMeta.parameters.includes('可愛的黃色小香蕉 🍌')) {
        console.log('  ✓ [PNG 相容性驗證] banana_yellow.png 包含標準 AI parameters 區塊！');
    } else {
        console.error('  ❌ [PNG 相容性驗證] 缺少 parameters 區塊！');
        testPassed = false;
    }

    // Verify thinking image metadata
    const spacePngBuf = fs.readFileSync(path.join(OUTPUT_DIR, 'banana_space-thought-0.png'));
    const spaceMeta = readImageMetadata(spacePngBuf);
    if (spaceMeta.nano_banana_meta && spaceMeta.nano_banana_meta.includes('太空中的香蕉船 🚀')) {
        console.log('  ✓ [思考圖驗證] banana_space-thought-0.png 思考圖內嵌參數正確！');
    } else {
        console.error('  ❌ [思考圖驗證] 思考圖中繼資料錯誤！');
        testPassed = false;
    }

    // Verify embedded JPEG metadata using reader.js
    console.log('\n[Test 2b] Verifying embedded JPEG COM metadata via reader.js...');
    const geminiJpgBuf = fs.readFileSync(path.join(OUTPUT_DIR, 'banana_gemini_raw.jpg'));
    const geminiMeta = readImageMetadata(geminiJpgBuf);

    if (geminiMeta.nano_banana_meta) {
        const parsed = JSON.parse(geminiMeta.nano_banana_meta);
        if (
            parsed.prompt === '真實 Gemini JPEG 圖片 🍌📸' &&
            parsed.model === 'gemini-3.1-flash-image' &&
            parsed.style === 'Photorealistic' &&
            parsed.aspectRatio === '16:9' &&
            parsed.size === '4K' &&
            parsed.temperature === 0.9 &&
            parsed.text.includes('Gemini 產出的 JPEG') &&
            parsed.thoughts.includes('測試 COM 標記內嵌')
        ) {
            console.log('  ✓ [JPEG Metadata 驗證] banana_gemini_raw.jpg 內嵌 COM 結構化資料完全符合預期！');
        } else {
            console.error('  ❌ [JPEG Metadata 驗證] banana_gemini_raw.jpg 內嵌資料不符:', parsed);
            testPassed = false;
        }
    } else {
        console.error('  ❌ [JPEG Metadata 驗證] 未找到 nano_banana_meta COM 區塊！');
        testPassed = false;
    }

    if (geminiMeta.parameters && geminiMeta.parameters.includes('真實 Gemini JPEG 圖片 🍌📸')) {
        console.log('  ✓ [JPEG 相容性驗證] banana_gemini_raw.jpg 包含標準 AI parameters COM 區塊！');
    } else {
        console.error('  ❌ [JPEG 相容性驗證] 缺少 parameters 區塊！');
        testPassed = false;
    }

    // 5. Test optional --txt flag
    console.log('\n[Test 3] Executing extractor.js with optional --txt flag...');
    execSync(`node extractor.js "${TEST_JSON_PATH}" -o "${OUTPUT_TXT_DIR}" --txt`, { stdio: 'inherit' });
    const txtOutputFiles = fs.readdirSync(OUTPUT_TXT_DIR);
    if (txtOutputFiles.includes('banana_yellow.txt') && txtOutputFiles.includes('banana_yellow.png') && txtOutputFiles.includes('banana_gemini_raw.txt')) {
        const txtContent = fs.readFileSync(path.join(OUTPUT_TXT_DIR, 'banana_yellow.txt'), 'utf8');
        if (txtContent.includes('可愛的黃色小香蕉 🍌') && txtContent.includes('生成模式 (Mode): Text to Image')) {
            console.log('  ✓ [--txt 旗標驗證] 成功輸出豐富格式之 .txt 提示詞檔！');
        } else {
            console.error('  ❌ [--txt 旗標驗證] txt 內容缺少豐富欄位！');
            testPassed = false;
        }
    } else {
        console.error('  ❌ [--txt 旗標驗證] 未輸出預期之 txt 檔案！');
        testPassed = false;
    }

    // 6. Test with real Nano Banana Ultra fixture
    const realFixturePath = 'd:\\Playground\\Labs\\App-Nano_Banana_Ultra\\e2e\\fixtures\\restore\\ui-import-lite-embedded-workspace.json';
    if (fs.existsSync(realFixturePath)) {
        console.log('\n[Test 4] Testing with real Nano Banana Ultra fixture...');
        const REAL_OUTPUT_DIR = path.join(__dirname, 'output_real_test');
        execSync(`node extractor.js "${realFixturePath}" -o "${REAL_OUTPUT_DIR}"`, { stdio: 'inherit' });
        const realFiles = fs.readdirSync(REAL_OUTPUT_DIR);
        console.log('Real fixture output contents:', realFiles);

        // Thumbnail (.jpg) and Stage asset must NOT be in real output
        if (!realFiles.some(f => f.includes('thumbnail')) && !realFiles.some(f => f.includes('stage'))) {
            console.log('  ✓ [真實工作區測試] 縮圖 (.jpg) 與舞台素材 (stage) 100% 成功排除！');
        } else {
            console.error('  ❌ [真實工作區測試] 縮圖或舞台素材遭到外洩:', realFiles);
            testPassed = false;
        }
        fs.rmSync(REAL_OUTPUT_DIR, { recursive: true, force: true });
    }

    // 7. Test with user's real 283MB Gemini snapshot (if present on machine)
    const userWorkspacePath = 'D:\\Downloads\\nano-banana-workspace-2026-09-23T02-20-32.json';
    if (fs.existsSync(userWorkspacePath)) {
        console.log('\n[Test 5] Testing with user real workspace (283MB with 50 JPEG images)...');
        const USER_OUTPUT_DIR = path.join(__dirname, 'output_user_test');
        execSync(`node extractor.js "${userWorkspacePath}" -o "${USER_OUTPUT_DIR}"`, { stdio: 'inherit' });
        const userFiles = fs.readdirSync(USER_OUTPUT_DIR);
        console.log(`User workspace output extracted: ${userFiles.length} files`);
        const jpgFiles = userFiles.filter(f => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg'));
        if (jpgFiles.length > 0) {
            console.log(`  ✓ [真實 JPEG 提取] 成功提取 ${jpgFiles.length} 張真實 JPEG 圖片！`);
            // Read metadata from first extracted jpg
            const sampleJpg = path.join(USER_OUTPUT_DIR, jpgFiles[0]);
            const sampleBuf = fs.readFileSync(sampleJpg);
            const sampleMeta = readImageMetadata(sampleBuf);
            if (sampleMeta.nano_banana_meta || sampleMeta.parameters) {
                console.log(`  ✓ [真實 JPEG Metadata 驗證] 成功讀取 sample: "${jpgFiles[0]}"`);
                if (sampleMeta.nano_banana_meta) {
                    const parsed = JSON.parse(sampleMeta.nano_banana_meta);
                    console.log(`    提示詞: "${parsed.prompt ? parsed.prompt.substring(0, 40) : ''}..."`);
                    console.log(`    模型: ${parsed.model} | 比例: ${parsed.aspectRatio} | 尺寸: ${parsed.size}`);
                }
            } else {
                console.error(`  ❌ [真實 JPEG Metadata 驗證] 未在 ${jpgFiles[0]} 中找到中繼資料！`);
                testPassed = false;
            }
        } else {
            console.error('  ❌ [真實 JPEG 提取] 未提取出任何 .jpg 檔案！');
            testPassed = false;
        }
        fs.rmSync(USER_OUTPUT_DIR, { recursive: true, force: true });
    }

    if (testPassed) {
        console.log('\n==================================================');
        console.log('Result: ALL INTEGRATION TESTS PASSED! 🍌🚀🎉');
        console.log('==================================================\n');
        cleanup();
        process.exit(0);
    } else {
        console.error('\nResult: INTEGRATION TESTS FAILED ❌');
        cleanup();
        process.exit(1);
    }

} catch (error) {
    console.error('\nResult: TEST EXECUTION ENCOUNTERED ERROR ❌');
    console.error(error.message);
    cleanup();
    process.exit(1);
}
