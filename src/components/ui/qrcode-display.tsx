'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';
import { Car } from 'lucide-react';

interface QRCodeDisplayProps {
    value: string;
    carName: string;
    licensePlate: string | null;
    size?: number;
    className?: string;
}

export function QRCodeDisplay({
    value,
    carName,
    licensePlate,
    size = 120,
    className,
}: QRCodeDisplayProps) {
    return (
        <Card className={`border-border bg-gradient-to-br from-card to-muted/40 ${className}`}>
            <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-shrink-0 rounded-lg border border-border bg-white p-2">
                    <QRCodeSVG
                        value={value}
                        size={size}
                        level="M"
                        includeMargin={false}
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <Car className="h-3 w-3" />
                        Kendaraan
                    </div>
                    <p className="mt-1 truncate text-lg font-semibold text-foreground">
                        {carName}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                        {licensePlate || '-'}
                    </p>
                    <p className="mt-2 truncate rounded bg-muted/60 px-2 py-1 font-mono text-xs text-muted-foreground">
                        {value}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
