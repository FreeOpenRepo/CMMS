import imageCompression from 'browser-image-compression';

export async function compressAndConvertToBase64(file: File): Promise<string> {
  const options = {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: 'image/jpeg',
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(compressedFile);
    });
  } catch (error) {
    console.warn('Image compression fallback to raw read:', error);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }
}
