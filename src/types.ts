export interface CompressedFile {
    id: string;
    originalName: string;
    originalSize: number;
    originalBlobUrl?: string;
    compressedSize: number;
    blobUrl: string;
    status: 'pending' | 'waiting' | 'processing' | 'done' | 'error';
    error?: string;
    fileRaw: File; // Added to keep reference for deferred processing
}

export type CompressionLevel = 'best' | 'mid' | 'low';
