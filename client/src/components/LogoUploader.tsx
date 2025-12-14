import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import logo from "@assets/logo.png";

interface LogoUploaderProps {
  currentLogoUrl?: string | null;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
}

export default function LogoUploader({
  currentLogoUrl,
  onUpload,
  onDelete,
}: LogoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Please upload PNG, JPG, JPEG, or SVG.';
    }

    // Check file size (2MB max)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      return 'File size exceeds 2MB limit.';
    }

    return null;
  };

  const handleFileSelect = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      alert(error);
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    setIsUploading(true);
    try {
      await onUpload(file);
      setPreviewUrl(null); // Clear preview after successful upload
    } catch (error) {
      console.error('Upload error:', error);
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete your organization logo?')) {
      await onDelete();
      setPreviewUrl(null);
    }
  };

  const displayLogo = previewUrl || currentLogoUrl || logo;
  const hasCustomLogo = currentLogoUrl !== null && currentLogoUrl !== undefined;

  return (
    <div className="space-y-4">
      <Card
        className={`cursor-pointer transition-all ${
          isDragging ? 'border-primary border-2 bg-primary/5' : 'border-dashed'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center p-8">
          {isUploading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Uploading logo...</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-lg bg-muted">
                <img
                  src={displayLogo}
                  alt="Logo preview"
                  className="h-full w-full object-contain p-2"
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">
                  {hasCustomLogo ? 'Current Logo' : 'Default Logo'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  PNG, JPG, or SVG (max 2MB)
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.svg"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div className="flex gap-2">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          disabled={isUploading}
          variant="outline"
          className="flex-1"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload Logo
        </Button>

        {hasCustomLogo && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={isUploading}
            variant="destructive"
            size="icon"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
