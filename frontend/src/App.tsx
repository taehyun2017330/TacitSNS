import React, { useState } from 'react';
import BrandInfoStep from './components/onboarding/BrandInfoStep';
import PostStudio from './components/PostStudio';
import type { BrandData } from './types/brand';
import './App.css';
function App() {
  const [currentStep, setCurrentStep] = useState<'brand' | 'post'>('brand');
  const [brandData, setBrandData] = useState<BrandData | null>(null);

  return (
    <>
      {currentStep === 'brand' && (
        <BrandInfoStep
          onNext={(data) => {
            setBrandData(data);
            setCurrentStep('post');
          }}
        />
      )}

      {currentStep === 'post' && brandData && (
        <PostStudio
          brandName={brandData.name}
          brandCategory={brandData.category}
          brandContext={brandData.description}
          onBack={() => setCurrentStep('brand')}
          onFinalize={() => {
            alert('Post finalized! Ready to publish.');
          }}
        />
      )}
    </>
  );
}

export default App;
