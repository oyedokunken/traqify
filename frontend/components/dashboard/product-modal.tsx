"use client";

import { useState, useRef, useEffect } from "react";
import { X, ImagePlus, AlertCircle, Wand2 } from "lucide-react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";

interface ProductModalProps { product?: any; onClose: () => void; onSaved: () => void; }

const MAX_FILE_SIZE_MB = 2;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGES = 4;

function generateSKU(name: string, orgSlug: string): string {
  const words = name.trim().split(/\s+/).slice(0, 3);
  const prefix = words.map((w) => w[0]?.toUpperCase() || "").join("");
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `${prefix || "PRD"}-${suffix}`;
}

const selectCls = "mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ProductModal({ product, onClose, onSaved }: ProductModalProps) {
  const isEdit = !!product;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>(product?.imageUrls?.length ? product.imageUrls : product?.imageUrl ? [product.imageUrl] : []);
  const [imageError, setImageError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get("/api/categories").then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: {
      name: product?.name || "",
      sku: product?.sku || "",
      description: product?.description || "",
      price: product?.price || "",
      comparePrice: product?.comparePrice || "",
      categoryId: product?.categoryId || "",
      status: product?.status || "published",
      productType: (product as any)?.productType || "SIMPLE",
      downloadUrl: (product as any)?.downloadUrl || "",
      isActive: product?.isActive ?? true,
      initialStock: product?.inventory?.quantity || 0,
      lowStockAlert: product?.inventory?.lowStockAlert || 10,
    },
  });

  const nameValue = watch("name");
  const productType = watch("productType");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImageError("");
    const remaining = MAX_IMAGES - imagePreviews.length;
    if (remaining <= 0) { setImageError(`Maximum ${MAX_IMAGES} images allowed.`); return; }
    const toAdd = files.slice(0, remaining);
    for (const f of toAdd) {
      if (!ALLOWED_TYPES.includes(f.type)) { setImageError("Only JPG, PNG, or WebP images are allowed."); return; }
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) { setImageError(`Image must be under ${MAX_FILE_SIZE_MB}MB.`); return; }
    }
    setImageFiles((prev) => [...prev, ...toAdd]);
    setImagePreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  };

  const removeImage = (i: number) => {
    setImagePreviews((prev) => prev.filter((_, idx) => idx !== i));
    setImageFiles((prev) => prev.filter((_, idx) => idx !== i));
  };

  const onSubmit = async (data: any) => {
    setIsLoading(true); setError("");
    try {
      const uploadedUrls: string[] = [];
      if (imageFiles.length > 0) {
        setUploadProgress(true);
        for (const file of imageFiles) {
          const fd = new FormData(); fd.append("image", file);
          try {
            const r = await api.post("/api/products/upload-image", fd, { headers: { "Content-Type": "multipart/form-data" } });
            uploadedUrls.push(r.data.url);
          } catch { setImageError("Some images failed to upload and were skipped."); }
        }
        setUploadProgress(false);
      }

      const existingUrls = imagePreviews.filter((p) => !p.startsWith("blob:"));
      const allUrls = [...existingUrls, ...uploadedUrls];

      const payload: any = {
        ...data,
        price: parseFloat(data.price),
        comparePrice: data.comparePrice ? parseFloat(data.comparePrice) : undefined,
        initialStock: parseInt(data.initialStock),
        lowStockAlert: parseInt(data.lowStockAlert),
        imageUrl: allUrls[0] || undefined,
        imageUrls: allUrls,
        categoryId: data.categoryId || undefined,
        productType: data.productType || "SIMPLE",
        downloadUrl: data.productType === "DOWNLOADABLE" ? (data.downloadUrl || undefined) : undefined,
      };

      if (isEdit) { await api.patch(`/api/products/${product.id}`, payload); }
      else { await api.post("/api/products", payload); }
      onSaved();
    } catch (err: any) { setError(err.response?.data?.error || "Failed to save product."); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-xl bg-white rounded-xl shadow-2xl mx-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-semibold text-[#0a0a0a]">{isEdit ? "Edit product" : "Add product"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {error && <div className="flex items-start gap-2 text-sm text-[#DE1010] bg-red-50 px-3 py-2 rounded-md"><AlertCircle size={14} className="mt-0.5 flex-shrink-0" />{error}</div>}

          {/* Multi-image upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Product images</Label>
              <span className="text-xs text-gray-400">{imagePreviews.length}/{MAX_IMAGES}</span>
            </div>
            <p className="text-xs text-gray-400 mb-2">Max {MAX_FILE_SIZE_MB}MB each · JPG, PNG, WebP · Up to {MAX_IMAGES} images</p>
            <div className="grid grid-cols-4 gap-2">
              {imagePreviews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-white/90 rounded-full p-0.5 hover:bg-white shadow">
                    <X size={10} />
                  </button>
                  {i === 0 && <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full">Cover</span>}
                </div>
              ))}
              {imagePreviews.length < MAX_IMAGES && (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-gray-200 hover:border-[#DE1010]/40 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-[#DE1010] transition-colors">
                  <ImagePlus size={18} />
                  <span className="text-[10px]">Add</span>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleImageChange} />
            {imageError && <div className="flex items-center gap-1.5 text-xs text-[#DE1010] mt-1.5"><AlertCircle size={11} />{imageError}</div>}
            {uploadProgress && <p className="text-xs text-gray-400 mt-1">Uploading images...</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Product name</Label>
              <Input className="mt-1.5" placeholder="e.g. Nike Air Max" {...register("name", { required: "Name is required." })} />
              {errors.name && <p className="text-xs text-[#DE1010] mt-1">{errors.name.message as string}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label>SKU</Label>
                <button type="button" onClick={() => setValue("sku", generateSKU(nameValue, ""))}
                  className="text-[10px] text-[#DE1010] flex items-center gap-1 hover:underline">
                  <Wand2 size={11} /> Auto-generate
                </button>
              </div>
              <Input className="mt-0" placeholder="e.g. NAM-001" {...register("sku", { required: "SKU is required." })} />
              {errors.sku && <p className="text-xs text-[#DE1010] mt-1">{errors.sku.message as string}</p>}
            </div>

            <div>
              <Label>Category</Label>
              <select className={selectCls} {...register("categoryId")}>
                <option value="">No category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <Label>Price (NGN)</Label>
              <Input className="mt-1.5" type="number" step="0.01" placeholder="0.00" {...register("price", { required: "Price is required." })} />
              {errors.price && <p className="text-xs text-[#DE1010] mt-1">{errors.price.message as string}</p>}
            </div>

            <div>
              <Label>Sale price (optional)</Label>
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

            <div>
              <Label>Status</Label>
              <select className={selectCls} {...register("status")}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div>
              <Label>Product type</Label>
              <select className={selectCls} {...register("productType")}>
                <option value="SIMPLE">Simple product</option>
                <option value="DOWNLOADABLE">Downloadable</option>
                <option value="VARIABLE">Variable product</option>
              </select>
            </div>

            {productType === "DOWNLOADABLE" && (
              <div className="col-span-2">
                <Label>Download URL</Label>
                <Input className="mt-1.5" placeholder="https://..." {...register("downloadUrl")} />
                <p className="text-xs text-gray-400 mt-1">Link customers receive after purchase</p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="isActive" {...register("isActive")} className="w-4 h-4 accent-[#DE1010]" />
              <Label htmlFor="isActive" className="cursor-pointer text-sm">Visible in store</Label>
            </div>

            <div className="col-span-2">
              <Label>Description</Label>
              <textarea className="mt-1.5 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" placeholder="Brief product description..." {...register("description", { required: "Description is required." })} />
              {errors.description && <p className="text-xs text-[#DE1010] mt-1">{errors.description.message as string}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : isEdit ? "Save changes" : "Add product"}</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}