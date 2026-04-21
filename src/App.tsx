import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Search, 
  ScanBarcode, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  ChevronRight,
  Loader2,
  X,
  Upload
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { GoogleGenAI } from "@google/genai";
import { BarcodeScanner } from './components/BarcodeScanner';
import { fetchProductByBarcode } from './services/foodApi';
import { analyzeIngredients } from './services/gemini';
import { ProductData, AnalysisResult } from './types';
import { MOCK_PRODUCTS } from './mockProducts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [localProducts, setLocalProducts] = useState<Record<string, ProductData>>(MOCK_PRODUCTS);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', brand: '', ingredients: '', barcode: '' });
  const [showAllSamples, setShowAllSamples] = useState(false);

  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setUploadPreview(URL.createObjectURL(file));

    try {
      const reader = new FileReader();
      const fileReadPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const dataUrl = await fileReadPromise;
      const base64Data = dataUrl.split(',')[1];
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: file.type
            }
          },
          {
            text: "Extract all ingredients from this food label. Return ONLY the comma-separated list of ingredients. If no ingredients are found, return an empty string."
          }
        ]
      });
      
      const extractedIngredients = response.text?.trim() || '';
      if (extractedIngredients && extractedIngredients.length > 5) {
        const result = await analyzeIngredients(extractedIngredients);
        setAnalysis(result);
        setProduct({
          name: "Scanned Label",
          ingredients: extractedIngredients,
          image: uploadPreview || URL.createObjectURL(file)
        });
      } else {
        throw new Error("Could not extract ingredients from the image. Please try a clearer photo or enter manually.");
      }
    } catch (err: any) {
      console.error("OCR Error:", err);
      setError(err.message || "Failed to process image. Please try again.");
      setUploadPreview(null);
    } finally {
      setIsLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  // ... rest of the component ...

  const handleScan = async (barcode: string) => {
    setIsScanning(false);
    setIsLoading(true);
    setError(null);
    
    try {
      // Check local/mock first
      if (localProducts[barcode]) {
        const data = localProducts[barcode];
        setProduct(data);
        const result = await analyzeIngredients(data.ingredients);
        setAnalysis(result);
        return;
      }

      const data = await fetchProductByBarcode(barcode);
      if (data) {
        setProduct(data);
        if (data.ingredients) {
          const result = await analyzeIngredients(data.ingredients);
          setAnalysis(result);
        } else {
          setError("Product found, but no ingredients list available. Please enter manually.");
          setShowManual(true);
        }
      } else {
        setError(`Barcode ${barcode} not found in database. You can add it using the "Add Product" button.`);
        setShowAddProduct(true);
        setNewProduct(prev => ({ ...prev, barcode }));
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.ingredients || !newProduct.barcode) return;
    
    setLocalProducts(prev => ({
      ...prev,
      [newProduct.barcode]: {
        name: newProduct.name,
        brand: newProduct.brand,
        ingredients: newProduct.ingredients
      }
    }));
    setShowAddProduct(false);
    handleScan(newProduct.barcode);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeIngredients(manualInput);
      setAnalysis(result);
      setProduct({
        name: "Manual Entry",
        ingredients: manualInput
      });
      setShowManual(false);
    } catch (err) {
      setError("Failed to analyze ingredients. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setProduct(null);
    setAnalysis(null);
    setError(null);
    setManualInput('');
    setShowManual(false);
    setShowAddProduct(false);
    setUploadPreview(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-bottom border-slate-200">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2" onClick={reset} style={{ cursor: 'pointer' }}>
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <ScanBarcode className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">FoodInsight</h1>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setShowAddProduct(!showAddProduct)}
              className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors"
            >
              Add Product
            </button>
            <button 
              onClick={() => setShowManual(!showManual)}
              className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors"
            >
              Manual Entry
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-8">
        <AnimatePresence mode="wait">
          {!product && !isLoading && !showManual && !showAddProduct && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8 text-center"
            >
              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-slate-900">Decode Your Food</h2>
                <p className="text-slate-600 max-w-md mx-auto">
                  Scan a barcode or upload a label to understand exactly what's in your food.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={() => setIsScanning(true)}
                  className="group relative overflow-hidden rounded-3xl bg-brand-600 p-10 text-white shadow-xl transition-all hover:bg-brand-700 hover:shadow-brand-200/50 active:scale-95"
                >
                  <div className="relative z-10 flex flex-col items-center gap-4">
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="rounded-full bg-white/20 p-5 backdrop-blur-sm group-hover:bg-white/30 transition-colors"
                    >
                      <Camera className="w-10 h-10" />
                    </motion.div>
                    <div className="space-y-1">
                      <span className="text-2xl font-black block">Scan Barcode</span>
                      <span className="text-sm font-medium opacity-80 block">Instant database lookup</span>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <div className="flex gap-4">
                  <div {...getRootProps()} className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white border border-slate-200 p-4 font-medium text-slate-700 shadow-sm cursor-pointer transition-all",
                    isDragActive ? "border-brand-500 bg-brand-50" : "hover:border-brand-200 hover:bg-brand-50"
                  )}>
                    <input {...getInputProps()} />
                    <Upload className="w-5 h-5" />
                    Upload Label
                  </div>
                  <button 
                    onClick={() => setShowManual(true)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white border border-slate-200 p-4 font-medium text-slate-700 shadow-sm hover:border-brand-200 hover:bg-brand-50 transition-all"
                  >
                    <Search className="w-5 h-5" />
                    Type Ingredients
                  </button>
                </div>
              </div>

              {/* Sample Products */}
              <div className="pt-8 space-y-4 text-left">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-brand-600" />
                  Quick Try (Database Examples)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(localProducts)
                    .slice(0, showAllSamples ? undefined : 6)
                    .map(([barcode, data]) => {
                      const productData = data as ProductData;
                      return (
                        <button 
                          key={barcode} 
                          onClick={() => handleScan(barcode)}
                          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-brand-300 transition-all text-left group"
                        >
                          {productData.image ? (
                            <img src={productData.image} className="w-12 h-12 object-contain rounded border border-slate-100" alt={productData.name} referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
                              <ScanBarcode className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                          <div className="flex-1 overflow-hidden">
                            <div className="text-sm font-bold truncate group-hover:text-brand-600 transition-colors">{productData.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">BC: {barcode}</div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-400 group-hover:translate-x-1 transition-all" />
                        </button>
                      );
                    })}
                </div>
                {Object.keys(localProducts).length > 6 && (
                  <button 
                    onClick={() => setShowAllSamples(!showAllSamples)}
                    className="w-full py-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    {showAllSamples ? "Show Less" : `View All ${Object.keys(localProducts).length} Products`}
                  </button>
                )}
              </div>

              <div className="pt-8 grid grid-cols-3 gap-4">
                {[
                  { icon: Info, label: "INS Codes", color: "text-blue-500" },
                  { icon: AlertCircle, label: "Additives", color: "text-orange-500" },
                  { icon: CheckCircle2, label: "Health Score", color: "text-green-500" }
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <item.icon className={cn("w-6 h-6", item.color)} />
                    <span className="text-xs font-medium text-slate-500">{item.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {showAddProduct && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Register Product</h2>
                <button onClick={() => setShowAddProduct(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-600">Product not in database? Add it locally to scan it later!</p>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Barcode</label>
                  <input 
                    type="text"
                    value={newProduct.barcode}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, barcode: e.target.value }))}
                    className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-500 transition-all font-mono"
                    placeholder="Enter digits"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Product Name</label>
                  <input 
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                    placeholder="e.g. Dark Chocolate"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Ingredients</label>
                  <textarea 
                    required
                    value={newProduct.ingredients}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, ingredients: e.target.value }))}
                    className="w-full h-32 p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-500 transition-all resize-none"
                    placeholder="Paste full ingredient list..."
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-brand-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-brand-700 transition-all"
                >
                  Save & Analyze
                </button>
              </form>
            </motion.div>
          )}

          {showManual && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Manual Entry</h2>
                <button onClick={() => setShowManual(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Paste Ingredient List</label>
                  <textarea 
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="e.g. Sugar, Palm Oil, INS 322, Artificial Flavors..."
                    className="w-full h-40 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all resize-none"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={!manualInput.trim() || isLoading}
                  className="w-full bg-brand-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Analyze Now
                </button>
              </form>
            </motion.div>
          )}

          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 space-y-6"
            >
              <div className="relative">
                <Loader2 className="w-16 h-16 text-brand-600 animate-spin" />
                {uploadPreview && (
                  <motion.img 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={uploadPreview} 
                    className="absolute inset-0 w-16 h-16 object-cover rounded-full opacity-20"
                  />
                )}
              </div>
              <div className="text-center space-y-2">
                <p className="text-xl font-bold text-slate-900">
                  {uploadPreview ? "Scanning Label..." : "Analyzing Ingredients..."}
                </p>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                  {uploadPreview 
                    ? "Gemini AI is reading the text from your image. This may take a few seconds." 
                    : "Decoding technical terms and INS codes for you."}
                </p>
              </div>
              
              {uploadPreview && (
                <div className="w-full max-w-xs h-1 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 5, ease: "linear" }}
                    className="h-full bg-brand-500"
                  />
                </div>
              )}
            </motion.div>
          )}

          {analysis && product && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Product Info */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex gap-4 items-center">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-20 h-20 object-contain rounded-lg border border-slate-100" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center">
                    <ScanBarcode className="text-slate-400 w-8 h-8" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{product.name}</h3>
                  <p className="text-sm text-slate-500">{product.brand || 'No brand info'}</p>
                </div>
              </div>

              {/* Score Card */}
              <div className={cn(
                "rounded-3xl p-8 border-2 flex flex-col items-center text-center gap-4",
                analysis.score === 'Healthy' ? "health-score-healthy" : 
                analysis.score === 'Moderate' ? "health-score-moderate" : 
                "health-score-risky"
              )}>
                <div className="text-sm font-bold uppercase tracking-widest opacity-70">Health Score</div>
                <div className="text-5xl font-black">{analysis.score}</div>
                <p className="text-sm font-medium max-w-xs">{analysis.summary}</p>
              </div>

              {/* Recommendation */}
              <div className="bg-brand-50 border border-brand-100 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-brand-600 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-brand-900">Recommendation</h4>
                    <p className="text-sm text-brand-800">{analysis.recommendation}</p>
                  </div>
                </div>
              </div>

              {/* Ingredients List */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold px-2">Ingredient Breakdown</h4>
                <div className="space-y-3">
                  {analysis.ingredients.map((ing, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:border-brand-200 transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-slate-900">{ing.name}</span>
                        <span className={cn(
                          "text-[10px] font-bold uppercase px-2 py-1 rounded-full",
                          ing.risk === 'Low' ? "bg-green-100 text-green-600" :
                          ing.risk === 'Medium' ? "bg-yellow-100 text-yellow-600" :
                          "bg-red-100 text-red-600"
                        )}>
                          {ing.risk} Risk
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{ing.explanation}</p>
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">
                        Category: {ing.category}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Additives */}
              {analysis.additives.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-bold px-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                    Additives & INS Codes
                  </h4>
                  <div className="space-y-3">
                    {analysis.additives.map((add, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-slate-900 rounded-2xl p-4 text-white shadow-lg border border-slate-800"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-col">
                            <span className="font-bold text-white">{add.name}</span>
                            {add.code && (
                              <span className="text-[10px] font-mono text-orange-400 uppercase tracking-wider">
                                Code: {add.code}
                              </span>
                            )}
                          </div>
                          <span className={cn(
                            "text-[10px] font-bold uppercase px-2 py-1 rounded-full",
                            add.risk === 'Low' ? "bg-green-500/20 text-green-400" :
                            add.risk === 'Medium' ? "bg-yellow-500/20 text-yellow-400" :
                            "bg-red-500/20 text-red-400"
                          )}>
                            {add.risk} Risk
                          </span>
                        </div>
                        <p className="text-sm text-slate-300">{add.explanation}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <button 
                onClick={reset}
                className="w-full py-4 text-slate-500 font-medium hover:text-slate-900 transition-colors"
              >
                Scan Another Product
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between gap-3 text-red-700 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </main>

      {isScanning && (
        <BarcodeScanner 
          onScan={handleScan} 
          onClose={() => setIsScanning(false)} 
        />
      )}
    </div>
  );
}
