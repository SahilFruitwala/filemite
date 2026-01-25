export interface CompressionStats {
    size: number;
    time: number; // ms
    blobUrl: string;
}

export interface CompressedFile {
    id: string;
    originalName: string;
    originalSize: number;
    originalBlobUrl?: string;
    
    // Legacy support for single mode or fallback
    compressedSize: number;
    blobUrl: string;
    
    status: 'pending' | 'waiting' | 'processing' | 'done' | 'error';
    error?: string;
    fileRaw: File;

    // Benchmarking specific
    clientStats?: CompressionStats;
    serverStats?: CompressionStats;
    clientStatus?: 'pending' | 'processing' | 'done' | 'error';
    serverStatus?: 'pending' | 'processing' | 'done' | 'error';
}

export type CompressionLevel = 'best' | 'mid' | 'low';
