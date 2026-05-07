"use client";

import { useState, useRef } from "react";
import { X, ImagePlus, AlertCircle } from "lucide-react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { INDUSTRY_OPTIONS } from "@/lib/utils";

const CATEGORIES = ["Electronics", "Fashion", "Food & Beverage", "Health & Beauty", "Home & Furniture", "Automotive", "Books", "Sports", "Toys", "Other"];

interface ProductModalProps {
  product?: any;
  onClose: () => void;
  onSaved: () => void;
}

const MAX_FILE_SIZE_MB = 2;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ProductModal({ product, onClose, onSaved }: ProductModalProps) {
  const isEdit = !!product;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(product?.imageUrl || "");
  const [imageError, setImageError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImageError("");
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setImageError("Only JPG, PNG, or WebP images are allowed.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setImageError(`Image must be under ${MAX_FILE_SIZE_MB}MB. This file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      name: product?.name || "",
      sku: product?.sku || "",
      description: product?.description || "",
      price: product?.price || "",
      comparePrice: product?.comparePrice || "",
      category: product?.category || "",
      isActive: product?.isActive ?? true,
      initialStock: product?.inventory?.quantity || 0,
      lowStockAlert: product?.inventory?.lowStockAlert || 10,
    },
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setError("");
    try {
      const payload = {
        ...data,
        price: parseFloat(data.price),
        comparePrice: data.comparePrice ? parseFloat(data.comparePrice) : undefined,
        initialStock: parseInt(data.initialStock),
        lowStockAlert: parseInt(data.lowStockAlert),
      };

      let imageUrl = product?.imageUrl || undefined;
      if (imageFile) {
        setUploadProgress(true);
        const formData = new FormData();
        formData.append("file", imageFile);
        try {
          const uploadRes = await api.post("/api/products/upload-image", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          imageUrl = uploadRes.data.url;
        } catch {
          setImageError("Image upload failed. The product will be saved without an image.");
        } finally {
          setUploadProgress(false);
        }
      }
      if (imageUrl) payload.imageUrl = imageUrl;

      if (isEdit) {
        await api.patch(`/api/products/${product.id}`, payload);
      } else {
        await api.post("/api/products", payload);
      }
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save product.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg bg-white rounded-xl shadow-2xl mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-semibold text-[#0a0a0a]">{isEdit ? "Edit product" : "Add product"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 text-sm text-[#DE1010] bg-red-50 px-3 py-2 rounded-md">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />{error}
            </div>
          )}

          <div className="col-span-2">
            <Label>Product image</Label>
            <p className="text-xs text-gray-400 mt-0.5 mb-2">Max {MAX_FILE_SIZE_MB}MB · JPG, PNG, WebP</p>
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-[#DE1010]/40 transition-colors cursor-pointer group relative"
              onClick={() => fileRef.current?.click()}
            >
              {imagePreview ? (
                <div className="relative">
                  <Image src={imagePreview} alt="Preview" width={400} height={180} className="w-full h-36 object-cover rounded-lg" />
                  <button type="button" onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(""); }}
                    className="absolute top-2 right-2 bg-white/90 rounded-full p-1 hover:bg-white shadow">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4 text-gray-400">
                  <ImagePlus size={28} className="group-hover:text-[#DE1010] transition-colors" />
                  <p className="text-xs text-center">Click to upload product image<br/><span className="text-gray-300">or drag and drop</span></p>
                </div>
              )}
              {uploadProgress && (
                <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
                  <div className="animate-spin w-6 h-6 border-2 border-[#DE1010] border-t-transparent rounded-full" />
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageChange} />
            {imageError && (
              <div className="flex items-center gap-1.5 text-xs text-[#DE1010] mt-1.5">
                <AlertCircle size={11} />{imageError}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Product name</Label>
              <Input className="mt-1.5" placeholder="e.g. Nike Air Max" {...register("name", { required: "Name is required." })} />
              {errors.name && <p className="text-xs text-[#DE1010] mt-1">{errors.name.message as string}</p>}
            </div>
            <div>
              <Label>SKU</Label>
              <Input className="mt-1.5" placeholder="e.g. NAM-001" {...register("sku", { required: "SKU is required." })} />
              {errors.sku && <p className="text-xs text-[#DE1010] mt-1">{errors.sku.message as string}</p>}
            </div>
            <div>
              <Label>Category</Label>
              <select className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...register("category")}>
                <option value="">Select...</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Price (NGN)</Label>
              <Input className="mt-1.5" type="number" step="0.01" placeholder="0.00" {...register("price", { required: "Price is required." })} />
              {errors.price && <p className="text-xs text-[#DE1010] mt-1">{errors.price.message as string}</p>}
            </div>
            <div>
              <Label>Compare price (optional)</Label>
              <Input className="mt-1.5" type="number" step="0.01" placeholder="0.00" {...register("comparePrice")} />
            </div>
            <div>
              <Label>Initial stock</Label>
              <Input className="mt-1.5" type="number" min="0" placeholder="0" {...register("initialStock")} />
            </div>
            <div>
              <Label>Low stock alert at</Label>
              <Input className="mt-1.5" type="number" min="0" placeholder="10" {...register("lowStockAlert")} />
            </div>
            <div className="col-span-2">
              <Label>Description (optional)</Label>
              <textarea
                className="mt-1.5 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                placeholder="Brief product description..."
                {...register("description")}
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="isActive" {...register("isActive")} className="w-4 h-4 accent-[#DE1010]" />
              <Label htmlFor="isActive" className="cursor-pointer">Product is active and visible</Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : isEdit ? "Save changes" : "Add product"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
