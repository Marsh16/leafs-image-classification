# 🍃 Leafs.ai - AI-Powered Plant Disease Detection

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15.3.2-black?style=for-the-badge&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-5.0.4-blue?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/TailwindCSS-3.3.2-38B2AC?style=for-the-badge&logo=tailwind-css" alt="TailwindCSS">
  <img src="https://img.shields.io/badge/Watson_ML-IBM-052FAD?style=for-the-badge&logo=ibm" alt="Watson ML">
</p>

<p align="center">
  <strong>Modern AI-powered plant disease detection system with glassmorphism design</strong>
</p>

<p align="center">
  Upload mango leaf images to instantly detect diseases and get expert agricultural advice powered by IBM Watson ML and AI.
</p>

---

## ✨ Features

### 🔬 **AI Disease Detection**
- **8 Disease Classes**: Anthracnose, Bacterial Canker, Cutting Weevil, Die Back, Gall Midge, Healthy, Powdery Mildew, Sooty Mould
- **High Accuracy**: Advanced machine learning model with confidence scoring
- **Instant Results**: Real-time image processing and classification
- **Expert Insights**: Detailed disease information and treatment recommendations

### 🎨 **Modern Glassmorphism Design**
- **Glassmorphism UI**: Translucent surfaces with backdrop blur effects
- **Bento Layout**: Modular grid-based design inspired by Japanese aesthetics
- **Responsive Design**: Perfect experience across all devices
- **Dark/Light Mode**: Seamless theme switching with optimized contrast

### 🚀 **Advanced User Experience**
- **Model Reloading Detection**: Smart handling of cloud model warm-up with real-time feedback
- **Streaming Updates**: Live progress updates during prediction processing
- **Interactive Upload**: Drag-and-drop interface with visual feedback
- **Chat Interface**: Conversational AI for follow-up questions about diseases

### 📊 **Smart Features**
- **Prediction History**: Track all your leaf scans with timestamps
- **Quick Stats**: View scanning metrics and health insights
- **Session Storage**: Persistent history across browser sessions
- **Confetti Celebrations**: Fun animations for healthy leaf detections

---

## 🛠️ Technology Stack

### **Frontend**
- **Next.js 15.3.2** - React framework with App Router
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **React Confetti** - Celebration animations

### **Backend & AI**
- **IBM Watson ML** - Machine learning model hosting
- **Watson AI** - Conversational AI for expert advice
- **Jimp** - Image processing and preprocessing
- **Next.js API Routes** - Serverless API endpoints

### **Design System**
- **Glassmorphism** - Modern translucent design aesthetic
- **Custom CSS Properties** - Dynamic theming system
- **Responsive Grid** - Mobile-first bento layout
- **Smooth Animations** - Hardware-accelerated transitions

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+**
- **npm/yarn/pnpm**
- **IBM Cloud Account** (for Watson ML API)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Marsh16/leafs-image-classification.git
   cd leafs-image-classification
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   # IBM Watson ML Configuration
   API_KEY=your_ibm_watson_api_key
   WATSON_URL=your_watson_ml_deployment_url

   # Environment
   NEXT_PUBLIC_ENV=development
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
leafs-image-classification/
├── app/
│   ├── api/
│   │   ├── predict/          # Image classification endpoint
│   │   └── questions/        # AI chat endpoint
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   ├── ChatInterface.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── ModelLoadingIndicator.tsx
│   │   ├── PastLeafCard.tsx
│   │   └── UploadInterface.tsx
│   ├── lib/                 # Utility functions
│   ├── types/               # TypeScript type definitions
│   ├── globals.css          # Global styles with glassmorphism
│   ├── layout.tsx           # Root layout component
│   └── page.tsx             # Main application page
├── public/                  # Static assets
├── docs/
│   ├── GLASSMORPHISM_DESIGN.md
│   └── MODEL_RELOADING_FEATURES.md
└── README.md
```

---

## 🎯 Usage Guide

### **1. Upload Leaf Image**
- Click the upload area or drag & drop a mango leaf image
- Supported formats: JPG, PNG, WEBP (max 10MB)
- The image will be automatically processed and resized

### **2. View Results**
- Get instant disease classification with confidence percentage
- View detailed information about detected conditions
- See treatment recommendations and expert advice

### **3. Ask Questions**
- Use the chat interface to ask follow-up questions
- Get personalized advice based on your specific case
- Learn about prevention and treatment methods

### **4. Track History**
- View all your previous scans in the sidebar
- Monitor plant health trends over time
- Access quick statistics about your scanning activity

---

## 🔧 Configuration

### **Watson ML Setup**
1. Create an IBM Cloud account
2. Set up a Watson Machine Learning service
3. Deploy your trained model
4. Get your API key and deployment URL
5. Add credentials to `.env.local`

### **Model Requirements**
- Input: 227x227 RGB images
- Output: 8-class probability distribution
- Format: TensorFlow/Keras model compatible with Watson ML

### **Environment Variables**
```env
# Required
API_KEY=your_ibm_watson_api_key
WATSON_URL=your_watson_ml_deployment_url

# Optional
NEXT_PUBLIC_ENV=development|production
```

---

## 🎨 Design System

### **Glassmorphism Classes**
```css
.glass          /* Standard glassmorphism effect */
.glass-strong   /* Enhanced glass with more blur */
.glass-subtle   /* Light glass effect */
```

### **Bento Grid System**
```css
.bento-grid     /* Grid container */
.bento-item     /* Individual grid items */
```

### **Color Palette**
- **Primary**: Emerald (400-600) and Cyan (400-600)
- **Neutral**: Slate tones (50-900)
- **Background**: Dynamic gradient mesh
- **Glass**: Translucent with backdrop blur

---

## 🚀 Deployment

### **Vercel (Recommended)**
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### **Other Platforms**
- **Netlify**: Configure build settings for Next.js
- **Railway**: Use Next.js template
- **Docker**: Use the included Dockerfile (if available)

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Development Guidelines**
- Follow TypeScript best practices
- Use conventional commit messages
- Maintain glassmorphism design consistency
- Test on multiple devices and browsers
- Update documentation for new features

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **IBM Watson ML** for powerful machine learning capabilities
- **Next.js Team** for the amazing React framework
- **TailwindCSS** for the utility-first CSS framework
- **Lucide** for beautiful icons
- **Vercel** for seamless deployment platform

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Marsh16/leafs-image-classification/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Marsh16/leafs-image-classification/discussions)
- **Email**: [Your Email]

---

<p align="center">
  <strong>Made with ❤️ for farmers and agricultural professionals</strong>
</p>

<p align="center">
  <a href="#-leafsai---ai-powered-plant-disease-detection">⬆️ Back to Top</a>
</p>