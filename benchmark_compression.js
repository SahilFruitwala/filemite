const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputFiles = ['test_image.png']; // Add more if available

async function runBenchmark() {
  for (const file of inputFiles) {
    if (!fs.existsSync(file)) {
      console.log(`Skipping ${file} - not found`);
      continue;
    }

    const inputBuffer = fs.readFileSync(file);
    const metadata = await sharp(inputBuffer).metadata();
    console.log(`\nBenchmarking: ${file} (${metadata.format}, ${inputBuffer.length} bytes)`);

    // Baseline (Original)
    console.log(`Original Size: ${inputBuffer.length} bytes`);

    // Current Implementation (PNG)
    if (metadata.format === 'png') {
      const start = Date.now();
      const currentBuffer = await sharp(inputBuffer)
        .png({
          quality: 50,
          compressionLevel: 9,
          palette: true,
          colors: 128,
          effort: 10,
          adaptiveFiltering: false,
        })
        .toBuffer();
      const end = Date.now();
      console.log(`Current Config (PNG): ${currentBuffer.length} bytes (${((currentBuffer.length / inputBuffer.length) * 100).toFixed(2)}%), Time: ${end - start}ms`);
    }

      // Experiment 1: Lower Quality, same colors
      if (metadata.format === 'png') {
        const start = Date.now();
        const exp1Buffer = await sharp(inputBuffer)
          .png({
            quality: 60,
            compressionLevel: 9,
            palette: true,
            colors: 128,
            effort: 10,
            adaptiveFiltering: true,
          })
          .toBuffer();
        const end = Date.now();
        console.log(`Exp 1 (Q=60): ${exp1Buffer.length} bytes (${((exp1Buffer.length / inputBuffer.length) * 100).toFixed(2)}%), Time: ${end - start}ms`);
      }

      // Experiment 2: Lower Colors
      if (metadata.format === 'png') {
        const start = Date.now();
        const exp2Buffer = await sharp(inputBuffer)
          .png({
            quality: 75,
            compressionLevel: 9,
            palette: true,
            colors: 64,
            effort: 10,
            adaptiveFiltering: true,
          })
          .toBuffer();
        const end = Date.now();
        console.log(`Exp 2 (Colors=64): ${exp2Buffer.length} bytes (${((exp2Buffer.length / inputBuffer.length) * 100).toFixed(2)}%), Time: ${end - start}ms`);
    }

    // Experiment 3: No Adaptive Filtering
     if (metadata.format === 'png') {
        const start = Date.now();
        const exp3Buffer = await sharp(inputBuffer)
          .png({
            quality: 75,
            compressionLevel: 9,
            palette: true,
            colors: 128,
            effort: 10,
            adaptiveFiltering: false,
          })
          .toBuffer();
        const end = Date.now();
        console.log(`Exp 3 (No Adapt): ${exp3Buffer.length} bytes (${((exp3Buffer.length / inputBuffer.length) * 100).toFixed(2)}%), Time: ${end - start}ms`);
    }
    
     // Experiment 4:  TinyPng like (Guess)
     // TinyPng uses smart quantization. quality parameter in strict sense.
     if (metadata.format === 'png') {
        const start = Date.now();
        const exp4Buffer = await sharp(inputBuffer)
          .png({
             compressionLevel: 9,
             palette: true,
             quality: 50, // More aggressive
             effort: 10
          })
          .toBuffer();
        const end = Date.now();
        console.log(`Exp 4 (Aggressive Q=50): ${exp4Buffer.length} bytes (${((exp4Buffer.length / inputBuffer.length) * 100).toFixed(2)}%), Time: ${end - start}ms`);
    }


    // Experiment 5: No Adapt + Q=50
     if (metadata.format === 'png') {
        const start = Date.now();
        const exp5Buffer = await sharp(inputBuffer)
          .png({
            quality: 50,
            compressionLevel: 9,
            palette: true,
            colors: 128,
            effort: 10,
            adaptiveFiltering: false,
          })
          .toBuffer();
        const end = Date.now();
        console.log(`Exp 5 (No Adapt + Q=50): ${exp5Buffer.length} bytes (${((exp5Buffer.length / inputBuffer.length) * 100).toFixed(2)}%), Time: ${end - start}ms`);
    }

    // Experiment 6: No Adapt + Colors=64
     if (metadata.format === 'png') {
        const start = Date.now();
        const exp6Buffer = await sharp(inputBuffer)
          .png({
            quality: 75,
            compressionLevel: 9,
            palette: true,
            colors: 64,
            effort: 10,
            adaptiveFiltering: false,
          })
          .toBuffer();
        const end = Date.now();
        console.log(`Exp 6 (No Adapt + Colors=64): ${exp6Buffer.length} bytes (${((exp6Buffer.length / inputBuffer.length) * 100).toFixed(2)}%), Time: ${end - start}ms`);
    }

    // Experiment 7: No Adapt + Colors=32
     if (metadata.format === 'png') {
        const start = Date.now();
        const exp7Buffer = await sharp(inputBuffer)
          .png({
            quality: 75,
            compressionLevel: 9,
            palette: true,
            colors: 32,
            effort: 10,
            adaptiveFiltering: false,
          })
          .toBuffer();
        const end = Date.now();
        console.log(`Exp 7 (No Adapt + Colors=32): ${exp7Buffer.length} bytes (${((exp7Buffer.length / inputBuffer.length) * 100).toFixed(2)}%), Time: ${end - start}ms`);
    }

    // Current Implementation (JPEG) - for reference if file was jpeg
    if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
         const start = Date.now();
        const currentBuffer = await sharp(inputBuffer)
        .jpeg({
          quality: 75,
          mozjpeg: true,
          chromaSubsampling: '4:2:0',
          trellisQuantisation: true,
          overshootDeringing: true,
          optimizeScans: true,
          quantisationTable: 3,
        })
        .toBuffer();
        const end = Date.now();
        console.log(`Current Config (JPEG): ${currentBuffer.length} bytes (${((currentBuffer.length / inputBuffer.length) * 100).toFixed(2)}%), Time: ${end - start}ms`);
    }

  }
}

runBenchmark().catch(console.error);
