# MicroPng 🚀

MicroPng is a high-performance image optimization and conversion tool built with Next.js. It offers both client-side and server-side compression with real-time benchmarking, allowing you to choose the best balance between speed and quality.

![MicroPng Preview](public/preview.png) *(Note: Add a real preview image here)*

## ✨ Features

- **Smart Compression**: Optimized presets (Best, Balanced, Small) to reduce file size without significant quality loss.
- **Target Size Mode**: Specify a target file size (e.g., 100KB), and the app will intelligently find the best quality settings.
- **Universal Format Support**: Convert between PNG, JPEG, WebP, and AVIF formats effortlessly.
- **Real-time Benchmarking**: Compare client-side vs. server-side compression performance and results side-by-side.
- **Lossless Conversion**: Built-in support for lossless image format transformation.
- **Bulk Processing**: Upload and process multiple images simultaneously.
- **Privacy First**: Choose client-side compression to keep your images in the browser.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Client-side Compression**: [browser-image-compression](https://www.npmjs.com/package/browser-image-compression)
- **Server-side Processing**: [Sharp](https://sharp.pixelplumbing.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/micropng.git
   cd micropng
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📖 Usage Guide

### Image Compression
1. Drop your images or click to upload in the home page.
2. Select a compression level or switch to "Target Size" mode.
3. Toggle "Benchmark" to compare browser-based compression with our high-performance server processing.
4. Download the result that meets your needs.

### Format Conversion
1. Navigate to the `/convert` page.
2. Upload your images.
3. Choose the target format (WebP, PNG, JPEG, or AVIF).
4. Click "Convert All" to process your files losslessly.

## 🤝 Contributing

Contributions are welcome! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get started.

## 📄 License

This project is [MIT](LICENSE) licensed.

