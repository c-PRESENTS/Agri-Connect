import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Check, Edit3, Sparkles, Upload, X, ArrowLeft, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AIDetectionResult } from "@shared/schema";
import { getSellerTaxonomy } from "@/lib/categories";
import { motion, AnimatePresence } from "framer-motion";

interface PhotoSellFlowProps {
  onComplete?: (data: AIDetectionResult & { image: string }) => void;
  onCancel?: () => void;
  onManualListing?: () => void;
}

type Step = "capture" | "analyzing" | "results" | "success";

const mockDetect = (): AIDetectionResult => {
  const products = [
    { name: "Tomato", category: "daily-needs", subcategory: "vegetables", price: 40, unit: "kg" },
    { name: "Potato", category: "daily-needs", subcategory: "vegetables", price: 25, unit: "kg" },
    { name: "Onion", category: "daily-needs", subcategory: "vegetables", price: 30, unit: "kg" },
    { name: "Carrot", category: "daily-needs", subcategory: "vegetables", price: 45, unit: "kg" },
    { name: "Rice", category: "daily-needs", subcategory: "grains", price: 60, unit: "kg" },
    { name: "Wheat", category: "daily-needs", subcategory: "grains", price: 35, unit: "kg" },
  ];
  
  const product = products[Math.floor(Math.random() * products.length)];
  const confidence = 85 + Math.floor(Math.random() * 15);
  const quantity = 20 + Math.floor(Math.random() * 80);
  const grades: ("A" | "B" | "C")[] = ["A", "B", "C"];
  const grade = grades[Math.floor(Math.random() * grades.length)];
  
  return {
    productName: product.name,
    confidence,
    suggestedCategory: product.category,
    suggestedSubcategory: product.subcategory,
    estimatedQuantity: `~${quantity}kg`,
    qualityGrade: grade,
    suggestedPrice: product.price,
    unit: product.unit,
  };
};

export function PhotoSellFlow({ onComplete, onCancel, onManualListing }: PhotoSellFlowProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("capture");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [detection, setDetection] = useState<AIDetectionResult | null>(null);
  const [editedDetection, setEditedDetection] = useState<AIDetectionResult | null>(null);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sellerTaxonomy = getSellerTaxonomy();
  const selectedCategory = sellerTaxonomy.find((category) => category.id === editedDetection?.suggestedCategory);

  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target?.result as string);
        startAnalysis();
      };
      reader.readAsDataURL(file);
    }
  };

  const startAnalysis = () => {
    setStep("analyzing");
    setAnalyzeProgress(0);
    
    const interval = setInterval(() => {
      setAnalyzeProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          const result = mockDetect();
          setDetection(result);
          setEditedDetection(result);
          setStep("results");
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleAccept = () => {
    setStep("success");
    setTimeout(() => {
      if (editedDetection && capturedImage) {
        onComplete?.({ ...editedDetection, image: capturedImage });
      }
    }, 2000);
  };

  const handleEdit = (field: keyof AIDetectionResult, value: string | number) => {
    if (editedDetection) {
      setEditedDetection({ ...editedDetection, [field]: value });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 flex items-center gap-4 p-4 border-b bg-background">
        <Button variant="ghost" size="icon" onClick={onCancel} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold text-lg">{t("photo_sell.title")}</h1>
      </div>

      <AnimatePresence mode="wait">
        {step === "capture" && (
          <motion.div
            key="capture"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 flex flex-col items-center justify-center min-h-[60vh]"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
              data-testid="input-photo-capture"
            />
            
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">{t("photo_sell.take_photo_title")}</h2>
              <p className="text-muted-foreground">
                {t("photo_sell.take_photo_description")}
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="h-32 w-32 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg mb-8"
              onClick={handleCapture}
              data-testid="button-take-photo"
            >
              <Camera className="h-16 w-16" />
            </motion.button>

            <Button
              variant="outline"
              className="gap-2"
              onClick={handleCapture}
              data-testid="button-upload-photo"
            >
              <Upload className="h-4 w-4" />
              {t("photo_sell.upload_from_gallery")}
            </Button>
            <Button variant="ghost" className="mt-3" onClick={onManualListing} data-testid="button-manual-listing">Create listing manually</Button>
          </motion.div>
        )}

        {step === "analyzing" && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 flex flex-col items-center justify-center min-h-[60vh]"
          >
            {capturedImage && (
              <div className="w-48 h-48 rounded-2xl overflow-hidden mb-6 ring-4 ring-primary/20">
                <img src={capturedImage} alt="Captured product image being analysed" className="w-full h-full object-cover" />
              </div>
            )}
            
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              <span className="font-medium">{t("photo_sell.ai_analyzing")}</span>
            </div>
            
            <div className="w-64">
              <Progress value={analyzeProgress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground mt-2">
                {t("photo_sell.percent_complete", { percent: analyzeProgress })}
              </p>
            </div>
          </motion.div>
        )}

        {step === "results" && editedDetection && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4"
          >
            <div className="flex gap-4 mb-6">
              {capturedImage && (
                <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={capturedImage} alt={`Captured image for ${detection?.productName || "product"}`} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500">
                    <Check className="h-4 w-4 mr-1" />
                    {t("photo_sell.match_badge", { percent: detection?.confidence })}
                  </Badge>
                </div>
                <h2 className="text-xl font-bold">{detection?.productName}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("photo_sell.ai_detected_description", { productName: detection?.productName })}
                </p>
              </div>
            </div>

            <Card className="mb-4">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <Select
                    value={editedDetection.suggestedCategory}
                    onValueChange={(categoryId) => {
                      const category = sellerTaxonomy.find((item) => item.id === categoryId);
                      handleEdit("suggestedCategory", categoryId);
                      if (category && !category.subcategories.some((item) => item.id === editedDetection.suggestedSubcategory)) {
                        handleEdit("suggestedSubcategory", category.subcategories[0]?.id || "");
                      }
                    }}
                  >
                    <SelectTrigger className="w-48" data-testid="select-seller-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sellerTaxonomy.map((category) => (
                        <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subcategory</span>
                  <Select
                    value={editedDetection.suggestedSubcategory}
                    onValueChange={(value) => handleEdit("suggestedSubcategory", value)}
                  >
                    <SelectTrigger className="w-48" data-testid="select-seller-subcategory">
                      <SelectValue placeholder="Select a subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCategory?.subcategories.map((subcategory) => (
                        <SelectItem key={subcategory.id} value={subcategory.id}>{subcategory.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("photo_sell.product_name")}</span>
                  <div className="flex items-center gap-2">
                    <Input
                      value={editedDetection.productName}
                      onChange={(e) => handleEdit("productName", e.target.value)}
                      className="w-40 text-right"
                      data-testid="input-product-name"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("photo_sell.quantity")}</span>
                  <Input
                    value={editedDetection.estimatedQuantity}
                    onChange={(e) => handleEdit("estimatedQuantity", e.target.value)}
                    className="w-32 text-right"
                    data-testid="input-quantity"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("photo_sell.quality_grade")}</span>
                  <Select
                    value={editedDetection.qualityGrade}
                    onValueChange={(value) => handleEdit("qualityGrade", value)}
                  >
                    <SelectTrigger className="w-32" data-testid="select-quality">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">{t("photo_sell.grade_a")}</SelectItem>
                      <SelectItem value="B">{t("photo_sell.grade_b")}</SelectItem>
                      <SelectItem value="C">{t("photo_sell.grade_c")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("photo_sell.suggested_price")}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      value={editedDetection.suggestedPrice}
                      onChange={(e) => handleEdit("suggestedPrice", parseInt(e.target.value))}
                      className="w-24 text-right"
                      data-testid="input-price"
                    />
                    <span className="text-muted-foreground">/{editedDetection.unit}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button className="w-full gap-2" size="lg" onClick={handleAccept} data-testid="button-accept-list">
                <Check className="h-5 w-5" />
                {t("photo_sell.accept_list")}
              </Button>
              <Button variant="outline" className="w-full gap-2" size="lg" data-testid="button-start-auction">
                <Megaphone className="h-5 w-5" />
                {t("photo_sell.start_auction")}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setCapturedImage(null);
                  setStep("capture");
                }}
                data-testid="button-retake"
              >
                {t("photo_sell.retake_photo")}
              </Button>
            </div>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 flex flex-col items-center justify-center min-h-[60vh]"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
              className="h-24 w-24 rounded-full bg-green-500 flex items-center justify-center mb-6"
            >
              <Check className="h-12 w-12 text-white" />
            </motion.div>
            
            <h2 className="text-2xl font-bold mb-2">{t("photo_sell.listed_successfully")}</h2>
            <p className="text-muted-foreground text-center mb-6">
              {t("photo_sell.listed_description", { productName: editedDetection?.productName })}
            </p>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onCancel} data-testid="button-view-listing">
                {t("photo_sell.view_listing")}
              </Button>
              <Button
                onClick={() => {
                  setCapturedImage(null);
                  setDetection(null);
                  setEditedDetection(null);
                  setStep("capture");
                }}
                data-testid="button-list-another"
              >
                {t("photo_sell.list_another")}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
