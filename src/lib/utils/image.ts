export async function processImage(file: File, maxWidth = 1200): Promise<Blob> {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('No file provided'));
            return;
        }

        const rawImage = new Image();

        rawImage.onload = () => {
            const canvas = document.createElement('canvas');
            let width = rawImage.width;
            let height = rawImage.height;

            // Calculate new dimensions if image is larger than maxWidth
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            ctx.drawImage(rawImage, 0, 0, width, height);

            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Canvas to Blob conversion failed'));
                }
            }, 'image/webp', 0.8); // 0.8 quality for WebP
        };

        rawImage.onerror = () => {
            reject(new Error('Failed to load image'));
        };

        rawImage.src = URL.createObjectURL(file);
    });
}
