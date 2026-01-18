'use client';

import { useState, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Upload, Loader2, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface BarcodeScannerProps {
    onDetected: (code: string) => void;
    className?: string;
}

export function BarcodeScanner({ onDetected, className }: BarcodeScannerProps) {
    const [isScanning, setIsScanning] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        // Show preview
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);

        // Scan barcode
        setIsScanning(true);
        try {
            const codeReader = new BrowserMultiFormatReader();
            const imgUrl = URL.createObjectURL(file);

            const result = await codeReader.decodeFromImageUrl(imgUrl);
            URL.revokeObjectURL(imgUrl);

            if (result) {
                onDetected(result.getText());
                toast.success('Barcode berhasil terdeteksi!');
            }
        } catch {
            toast.error('Barcode tidak terdeteksi dalam gambar. Pastikan gambar jelas dan barcode terlihat dengan baik.');
            setPreview(null);
        } finally {
            setIsScanning(false);
            // Reset input so same file can be selected again
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }

    function clearPreview() {
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    return (
        <div className={className}>
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />

            {preview ? (
                <div className="space-y-2">
                    <div className="relative inline-block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={preview}
                            alt="Barcode preview"
                            className="max-h-32 rounded-lg border border-border"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-background border border-border hover:bg-destructive hover:text-destructive-foreground"
                            onClick={clearPreview}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-border"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isScanning}
                        >
                            {isScanning ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Scanning...
                                </>
                            ) : (
                                <>
                                    <Camera className="mr-2 h-4 w-4" />
                                    Ganti Gambar
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            ) : (
                <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed border-border py-6 text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanning}
                >
                    {isScanning ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Mendeteksi barcode...
                        </>
                    ) : (
                        <>
                            <Upload className="mr-2 h-5 w-5" />
                            Upload Foto Barcode
                        </>
                    )}
                </Button>
            )}
        </div>
    );
}
