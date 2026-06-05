/**
 * test_extraction.js
 * Integration test to verify extractor.js execution and conditional prompt saving rules.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TEST_JSON_PATH = path.join(__dirname, 'dummy_workspace.json');
const OUTPUT_DIR = path.join(__dirname, 'output');

// Clean up previous runs
function cleanup() {
    if (fs.existsSync(TEST_JSON_PATH)) {
        fs.unlinkSync(TEST_JSON_PATH);
    }
    if (fs.existsSync(OUTPUT_DIR)) {
        fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    }
}

// 1x1 transparent PNG base64
const testPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// Create a dummy workspace JSON matching the new requirements
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
                createdAt: Date.now() - 20000,
                savedFilename: 'banana_yellow.png',
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
                // savedFilename is missing or failed
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
                // Item 3: Completely Failed (has prompt but no media/images at all)
                id: 'item_3_completely_failed',
                prompt: '失敗的生成項目（無任何圖片） ❌',
                model: 'gemini-3.1-flash-image',
                style: 'None',
                aspectRatio: '1:1',
                size: '2K',
                createdAt: Date.now(),
                thoughts: '思考過程：此項目沒有生成任何圖片，因此不應儲存提示詞。'
            }
        ],
        stagedAssets: [],
        workflowLogs: [],
        workspaceSession: { activeResult: null },
        branchState: { nameOverrides: {} },
        conversationState: { byBranchOriginId: {} },
        viewState: { generatedImageUrls: [], selectedImageIndex: 0, selectedHistoryId: null },
        composerState: {}
    },
    assets: {
        savedImages: {
            'banana_yellow.png': {
                dataUrl: testPngBase64,
                savedAt: Date.now() - 20000
            },
            'banana_space-thought-0.png': {
                dataUrl: testPngBase64,
                savedAt: Date.now() - 10000
            }
        }
    }
};

console.log('--- Extractor Integration Test (Revised Rules) ---');

try {
    cleanup();

    // 1. Create dummy workspace file
    console.log('Generating dummy workspace JSON...');
    fs.writeFileSync(TEST_JSON_PATH, JSON.stringify(mockWorkspace, null, 2), 'utf8');

    // 2. Execute extractor.js
    console.log('Executing extractor.js CLI...');
    execSync(`node extractor.js "${TEST_JSON_PATH}"`, { stdio: 'inherit' });

    // 3. Verify output files
    console.log('\nVerifying output files...');

    // Expected files that MUST exist
    const expectedFiles = [
        'banana_yellow.png',
        'banana_yellow.txt',
        'banana_space-thought-0.png',
        'banana_space-thought-0.txt'
    ];

    let testPassed = true;
    expectedFiles.forEach(file => {
        const filePath = path.join(OUTPUT_DIR, file);
        if (fs.existsSync(filePath)) {
            console.log(`✓ [預期存在] 檔案存在: "${file}"`);
        } else {
            console.error(`❌ [預期存在] 檔案遺失: "${file}"`);
            testPassed = false;
        }
    });

    // Files that MUST NOT exist
    const unexpectedFiles = [
        'banana_space.txt',
        'banana_space.png',
        'image_no_media_item_3.txt',
        'image_no_media_item_3_completely_failed.txt'
    ];

    // Check directory to make sure no failed prompt TXT is written
    const filesInOutputDir = fs.readdirSync(OUTPUT_DIR);
    console.log('\nOutput directory contents:', filesInOutputDir);

    filesInOutputDir.forEach(file => {
        if (file.includes('failed') || file.includes('item_3') || file === 'banana_space.txt') {
            console.error(`❌ [預期不存在] 錯誤生成了無關聯圖片的檔案: "${file}"`);
            testPassed = false;
        }
    });

    if (testPassed) {
        console.log('\n✓ 成功驗證：完全沒有圖片的項目 (Item 3) 沒有產生任何提示詞檔案！');
        console.log('✓ 成功驗證：有思考圖但無成品圖的項目 (Item 2) 成功提取思考圖與提示詞 TXT！');
    }

    // 4. Verify TXT contents
    console.log('\nVerifying TXT files content...');
    const yellowTxtContent = fs.readFileSync(path.join(OUTPUT_DIR, 'banana_yellow.txt'), 'utf8');
    if (yellowTxtContent.includes('可愛的黃色小香蕉 🍌') && yellowTxtContent.includes('思考過程：正常繪製成品。')) {
        console.log('✓ banana_yellow.txt content is correct.');
    } else {
        console.error('yellowTxtContent:', yellowTxtContent);
        testPassed = false;
    }

    const thoughtTxtContent = fs.readFileSync(path.join(OUTPUT_DIR, 'banana_space-thought-0.txt'), 'utf8');
    if (thoughtTxtContent.includes('太空中的香蕉船 🚀') && thoughtTxtContent.includes('沒有產出成品，但生成了思考圖。')) {
        console.log('✓ banana_space-thought-0.txt content is correct.');
    } else {
        console.error('thoughtTxtContent:', thoughtTxtContent);
        testPassed = false;
    }

    if (testPassed) {
        console.log('\nResult: ALL REVISED RULES TESTS PASSED SUCCESSFULLY! 🍌🚀🎉');
        cleanup();
        process.exit(0);
    } else {
        console.error('\nResult: TEST FAILED ❌');
        cleanup();
        process.exit(1);
    }

} catch (error) {
    console.error('\nResult: TEST EXECUTION FAILED! ❌');
    console.error(error.message);
    cleanup();
    process.exit(1);
}
