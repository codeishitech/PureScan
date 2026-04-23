# FoodInsight 🍎

**FoodInsight** is an AI-powered food ingredient scanner and health analysis tool. It helps users decode complex food labels, understand hidden additives (INS/E-codes), and evaluate the nutritional safety of packaged products in seconds.

## 🚀 Key Features

-   **Barcode Scanner**: Instantly fetch product details using a barcode. Includes a local database of 40+ common products and a real-time proxy to the Open Food Facts API.
-   **AI Label OCR**: Upload a photo of a food label, and our Gemini-powered engine extracts and analyzes the text automatically.
-   **Ingredient Decoding**: Technical terms and chemical names are translated into simple, easy-to-understand explanations.
-   **Additive & INS Identification**: Specifically highlights preservatives, stabilizers, and artificial colors, explaining their purpose and potential health risks.
-   **Dual Health Scoring**:
    *   **Categorical**: Instant status (**Healthy**, **Moderate**, or **Risky**).
    *   **Numerical (0-100)**: A precise "Risk Intensity" meter for more granular comparisons.
-   **Community Registration**: If a product is missing, users can manually register the barcode, brand, and ingredients to build a local knowledge base.

## 🛠️ Tech Stack

-   **Frontend**: React 19, TypeScript, Tailwind CSS.
-   **Animations**: Framer Motion (`motion/react`).
-   **Backend**: Node.js & Express (Full-stack architecture).
-   **AI Engine**: Google Gemini AI (via `@google/genai`).
-   **External Data**: Open Food Facts API.
-   **Icons**: Lucide React.

## ⚙️ Environment Variables

To run this project, you need to set up the following environment variable:

```env
GEMINI_API_KEY=your_google_ai_studio_api_key
```

## 🏃 Getting Started

### Prerequisites

-   Node.js (v18+)
-   npm

### RUN THE APP
-   https://ai.studio/apps/7ae25447-57bf-4685-a455-9b5d10a9b6d4

### Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run in development mode**:
    ```bash
    npm run dev
    ```
    The app will be available at `http://localhost:3000`.

## 🛡️ Security & Integrity

-   **Server-Side Proxying**: All API calls to external services are handled via an Express backend to avoid CORS issues and protect request integrity.
-   **Validation**: Ingredients are analyzed using strict response schemas to ensure the AI output is always consistent and data-rich.

---

Built with ❤️ using Google Gemini & React.
