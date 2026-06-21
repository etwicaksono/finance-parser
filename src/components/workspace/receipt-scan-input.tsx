"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Loader2, ScanText, X, ImagePlus, Play, ZoomIn, ZoomOut, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SessionImage } from "@/types";

interface PreviewFile {
  id: string;
  file?: File;
  previewUrl: string;
  cloudinaryUrl?: string;
  isUploading?: boolean;
  name: string;
  isParsed: boolean;
}

interface ReceiptScanInputProps {
  translateNames?: boolean;
  onTranslateNamesChange?: (value: boolean) => void;
  onScan?: (images: { id: string; name: string; base64: string; mimeType: string }[], translateNames: boolean) => Promise<string[] | void>;
  sessionImages?: SessionImage[] | string[];
  onImagesChange?: (images: SessionImage[]) => void;
  onClearInput?: () => void;
  onClearOutput?: () => void;
}

export function ReceiptScanInput({ 
  translateNames = false,
  onTranslateNamesChange,
  onScan, 
  sessionImages, 
  onImagesChange, 
  onClearInput,
  onClearOutput
}: ReceiptScanInputProps) {
  const [files, setFiles] = useState<PreviewFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sessionImages && sessionImages.length > 0) {
      setFiles(sessionImages.map(img => {
        if (typeof img === 'string') {
          return {
            id: crypto.randomUUID(),
            previewUrl: img,
            cloudinaryUrl: img,
            name: "Nota Lama",
            isParsed: false
          };
        } else {
          return {
            id: img.id,
            previewUrl: img.url,
            cloudinaryUrl: img.url,
            name: img.name,
            isParsed: img.isParsed
          };
        }
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initialize on mount based on key reset

  useEffect(() => {
    if (!onImagesChange) return;
    const isUploading = files.some(f => f.isUploading);
    if (!isUploading) {
       const mapped = files
         .filter(f => f.cloudinaryUrl)
         .map(f => ({
           id: f.id,
           url: f.cloudinaryUrl!,
           name: f.name,
           isParsed: f.isParsed
         }));
       onImagesChange(mapped);
    }
  }, [files, onImagesChange]);

  const addFiles = useCallback(async (incoming: File[]) => {
    const imageFiles = incoming.filter((f) => f.type.startsWith("image/"));
    
    setFiles((currentFiles) => {
      const currentHighest = currentFiles.reduce((max, f) => {
        const match = f.name?.match(/^Nota (\d+)$/);
        if (match && match[1]) return Math.max(max, parseInt(match[1]));
        return max;
      }, 0);
      
      const newPreviews: PreviewFile[] = imageFiles.map((file, i) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        isUploading: true,
        name: `Nota ${currentHighest + i + 1}`,
        isParsed: false
      }));
      
      const updatedFiles = [...currentFiles, ...newPreviews];
      
      // We need to trigger the upload process outside the state updater
      // but using setTimeout to ensure the state has settled.
      setTimeout(async () => {
        const { uploadImageToCloudinary } = await import("@/actions/cloudinary");
        for (const preview of newPreviews) {
           const reader = new FileReader();
           const base64Promise = new Promise<string>((resolve) => {
             reader.onload = () => resolve((reader.result as string).split(",")[1] || "");
             reader.readAsDataURL(preview.file!);
           });
           const base64 = await base64Promise;
           
           const url = await uploadImageToCloudinary(base64);
           
           setFiles((prev) => prev.map(f => {
             if (f.id !== preview.id) return f;
             const updated: PreviewFile = { ...f, isUploading: false };
             if (url) updated.cloudinaryUrl = url;
             return updated;
           }));
        }
      }, 0);

      return updatedFiles;
    });
  }, []);



  const removeFile = (id: string) => {
    setFiles((prev) => {
      const removed = prev.find((f) => f.id === id);
      if (removed) {
        if (removed.file) URL.revokeObjectURL(removed.previewUrl);
        if (removed.cloudinaryUrl) {
          import("@/actions/cloudinary").then(({ deleteImageFromCloudinary }) => {
            deleteImageFromCloudinary(removed.cloudinaryUrl!);
          });
        }
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleClearInput = () => {
    files.forEach((f) => {
      if (f.file) URL.revokeObjectURL(f.previewUrl);
      if (f.cloudinaryUrl) {
        import("@/actions/cloudinary").then(({ deleteImageFromCloudinary }) => {
          deleteImageFromCloudinary(f.cloudinaryUrl!);
        });
      }
    });
    setFiles([]);
    if (onClearInput) onClearInput();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items ?? []);
    const imageFiles = items
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null);
    if (imageFiles.length > 0) addFiles(imageFiles);
  }, [addFiles]);

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const handleScan = async () => {
    const unparsedFiles = files.filter(f => !f.isParsed);
    if (!onScan || unparsedFiles.length === 0) return;

    const images = await Promise.all(
      unparsedFiles.map(async (pf) => {
        if (pf.file) {
           return new Promise<{ id: string; name: string; base64: string; mimeType: string }>((resolve, reject) => {
             const reader = new FileReader();
             reader.onload = () => resolve({ id: pf.id, name: pf.name, base64: (reader.result as string).split(",")[1] || "", mimeType: pf.file!.type });
             reader.onerror = reject;
             reader.readAsDataURL(pf.file!);
           });
        } else if (pf.cloudinaryUrl) {
           try {
             const res = await fetch(pf.cloudinaryUrl as string);
             if (!res.ok) throw new Error("Fetch failed");
             const blob = await res.blob();
             return new Promise<{ id: string; name: string; base64: string; mimeType: string }>((resolve, reject) => {
               const reader = new FileReader();
               reader.onload = () => resolve({ id: pf.id, name: pf.name, base64: (reader.result as string).split(",")[1] || "", mimeType: blob.type });
               reader.onerror = reject;
               reader.readAsDataURL(blob);
             });
           } catch (e) {
             console.error("Failed to fetch image from Cloudinary for scanning", e);
           }
        }
        return { id: pf.id, name: pf.name, base64: "", mimeType: "" };
      })
    );

    const parsedIds = await onScan(images.filter(img => img.base64), translateNames);
    if (parsedIds && Array.isArray(parsedIds) && parsedIds.length > 0) {
      setFiles((prev) => prev.map((f) => parsedIds.includes(f.id) ? { ...f, isParsed: true } : f));
    }
  };

  const unparsedCount = files.filter(f => !f.isParsed).length;

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <ScanText className="h-4 w-4 text-primary" />
          <span>Scan Nota</span>
        </div>
        
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <Button
              size="sm"
              onClick={handleScan}
              disabled={unparsedCount === 0}
              className="h-8"
            >
              <Play className="mr-2 h-3.5 w-3.5" />
              Scan {unparsedCount > 0 ? `(${unparsedCount})` : ''}
            </Button>
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
              <Checkbox 
                id="translateNames" 
                checked={translateNames}
                onCheckedChange={(checked) => {
                  if (onTranslateNamesChange) onTranslateNamesChange(!!checked);
                }}
              />
              Translate singkatan
            </label>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearInput}
              disabled={files.length === 0}
              className="h-8 text-xs px-2.5"
              title="Hapus gambar nota"
            >
              Clear Input
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearOutput}
              className="h-8 text-xs px-2.5 text-destructive hover:text-destructive border-destructive/20"
              title="Hapus baris tabel dari sumber scan"
            >
              Clear Output
            </Button>
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors py-8
            ${isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
            }`}
        >
          <ImagePlus className="h-8 w-8 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium">Drag & drop foto nota</p>
            <p className="text-xs text-muted-foreground mt-1">
              atau klik untuk memilih file · atau tekan <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">Ctrl+V</kbd> untuk paste dari clipboard
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
          />
        </div>

        {/* Image previews */}
        {files.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {files.map((pf) => (
              <div 
                key={pf.id} 
                className="relative group rounded-lg overflow-hidden border bg-muted aspect-[3/4] cursor-pointer"
                onClick={() => setSelectedImage(pf.previewUrl)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pf.previewUrl}
                  alt={pf.file?.name || "Image"}
                  className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${pf.isUploading ? "opacity-50" : ""}`}
                />
                {pf.isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(pf.id); }}
                  className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {pf.isParsed && (
                  <div className="absolute top-1.5 left-1.5 bg-background/90 text-primary rounded-full p-0.5 shadow-sm border border-primary/20" title="Berhasil diparsing">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-2 py-1 truncate flex justify-between">
                  <span>{pf.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Viewer Modal */}
      <Dialog 
        open={!!selectedImage} 
        onOpenChange={(open) => {
          if (!open) {
            setSelectedImage(null);
            setZoomLevel(1);
            setPanOffset({ x: 0, y: 0 });
          }
        }}
      >
        <DialogContent showCloseButton={false} className="max-w-[95vw] sm:max-w-5xl h-[90vh] p-1 bg-transparent border-none shadow-none flex flex-col justify-center items-center">
          <div 
            className="relative w-full h-full flex justify-center items-center overflow-hidden"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsPanning(true);
              setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
            }}
            onMouseMove={(e) => {
              if (isPanning) {
                setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
              }
            }}
            onMouseUp={() => setIsPanning(false)}
            onMouseLeave={() => setIsPanning(false)}
          >
            {selectedImage && (
              <div 
                className="origin-center cursor-grab active:cursor-grabbing"
                style={{ 
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                  transition: isPanning ? 'none' : 'transform 0.2s ease-out'
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage}
                  alt="Enlarged receipt"
                  className="max-w-full max-h-full object-contain rounded-md"
                  draggable={false}
                />
              </div>
            )}
            
            {/* Zoom Controls */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm text-white p-2 rounded-full z-50">
              <button
                onClick={() => {
                  setZoomLevel(z => Math.max(0.5, z - 0.25));
                }}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <span className="text-sm font-medium w-12 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
            </div>

            <button
              onClick={() => {
                setSelectedImage(null);
                setZoomLevel(1);
                setPanOffset({ x: 0, y: 0 });
              }}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-colors z-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
