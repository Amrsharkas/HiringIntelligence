import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Play, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

type AnimationDirection = 'left' | 'right' | null;

interface TutorialSlide {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  order: number;
}

interface TutorialSlideshowProps {
  isOpen: boolean;
  onClose: () => void;
  audience?: 'hiring' | 'applicant' | 'all';
  autoShow?: boolean;
  className?: string;
}

const LOCAL_STORAGE_KEY = 'tutorial-completed';

export const TutorialSlideshow: React.FC<TutorialSlideshowProps> = ({
  isOpen,
  onClose,
  audience = 'hiring',
  autoShow = false,
  className,
}) => {
  const [slides, setSlides] = useState<TutorialSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animationDirection, setAnimationDirection] = useState<AnimationDirection>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Check if tutorial was completed before
  const isTutorialCompleted = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const completed = localStorage.getItem(`${LOCAL_STORAGE_KEY}-${audience}`);
    return completed === 'true';
  }, [audience]);

  // Mark tutorial as completed
  const markTutorialCompleted = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${LOCAL_STORAGE_KEY}-${audience}`, 'true');
  }, [audience]);

  // Fetch tutorial slides from API
  useEffect(() => {
    const fetchSlides = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/tutorial/slides/active?audience=${audience}`);

        if (!response.ok) {
          throw new Error('Failed to fetch tutorial slides');
        }

        const data = await response.json();
        setSlides(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchSlides();
    }
  }, [isOpen, audience]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || slides.length === 0) return;

      const lastSlide = currentSlideIndex === slides.length - 1;

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrevious();
          break;
        case 'Escape':
          e.preventDefault();
          if (lastSlide) {
            markTutorialCompleted();
            onClose();
          } else {
            handleSkip();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentSlideIndex, slides.length]);

  // Auto-show logic
  useEffect(() => {
    if (autoShow && !isTutorialCompleted()) {
      // Show tutorial on first visit
      const timer = setTimeout(() => {
        // Parent component should handle opening
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [autoShow, isTutorialCompleted]);

  const handleNext = () => {
    if (isAnimating) return;

    if (currentSlideIndex < slides.length - 1) {
      setIsAnimating(true);
      setAnimationDirection('left');
      setTimeout(() => {
        setCurrentSlideIndex(currentSlideIndex + 1);
        setTimeout(() => {
          setIsAnimating(false);
          setAnimationDirection(null);
        }, 50);
      }, 300);
    } else {
      // Last slide - close and mark as completed
      markTutorialCompleted();
      onClose();
    }
  };

  const handlePrevious = () => {
    if (isAnimating) return;

    if (currentSlideIndex > 0) {
      setIsAnimating(true);
      setAnimationDirection('right');
      setTimeout(() => {
        setCurrentSlideIndex(currentSlideIndex - 1);
        setTimeout(() => {
          setIsAnimating(false);
          setAnimationDirection(null);
        }, 50);
      }, 300);
    }
  };

  const handleSkip = () => {
    markTutorialCompleted();
    onClose();
  };

  const goToSlide = (index: number) => {
    if (isAnimating || index === currentSlideIndex) return;

    setIsAnimating(true);
    setAnimationDirection(index > currentSlideIndex ? 'left' : 'right');
    setTimeout(() => {
      setCurrentSlideIndex(index);
      setTimeout(() => {
        setIsAnimating(false);
        setAnimationDirection(null);
      }, 50);
    }, 300);
  };

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-xl flex items-center justify-center z-[100]">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
            <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-gray-600 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-xl flex items-center justify-center z-[100] p-8">
        <div className="max-w-md w-full text-center">
          <X className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-light text-gray-900 mb-2">Something went wrong</h3>
          <p className="text-gray-600 mb-8">{error}</p>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return null;
  }

  const currentSlide = slides[currentSlideIndex];
  const isLastSlide = currentSlideIndex === slides.length - 1;

  return (
    <div className="fixed inset-0 bg-white/70 backdrop-blur-2xl text-gray-900 z-[100] overflow-hidden">
      {/* Subtle animated background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-200 via-pink-100 to-blue-200 animate-pulse" />
      </div>
      {/* Add blur overlay for the content behind */}
      <div className="absolute inset-0 backdrop-blur-sm" />

      {/* Content container */}
      <div className="relative h-screen flex flex-col justify-center">
        {/* Top controls */}
        <div className="absolute top-0 left-0 right-0 z-10 p-8 flex justify-between items-center">
          {/* Progress */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {slides.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-px transition-all duration-700 ease-out",
                    index === currentSlideIndex
                      ? "w-16 bg-gray-900"
                      : index < currentSlideIndex
                      ? "w-8 bg-gray-400"
                      : "w-8 bg-gray-300"
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-gray-600 font-light tracking-widest">
              {String(currentSlideIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
            </span>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-3 rounded-full hover:bg-gray-200/60 transition-colors group"
          >
            <X className="h-5 w-5 text-gray-500 group-hover:text-gray-900 transition-colors" />
          </button>
        </div>

        {/* Main content */}
        <div className="flex-1 flex items-center justify-center px-8 py-16">
          <div className="max-w-7xl w-full">
            <div className={cn(
              "grid grid-cols-1 lg:grid-cols-3 gap-16 lg:gap-32 items-center transition-all duration-500 ease-out",
              isAnimating && animationDirection === 'left' && "opacity-0 transform translate-x-8",
              isAnimating && animationDirection === 'right' && "opacity-0 transform -translate-x-8",
              !isAnimating && "opacity-100 transform translate-x-0"
            )}>
              {/* Text content */}
              <div className="lg:col-span-1 space-y-8">
                <div className="space-y-4">
                  <div className="inline-flex items-center px-3 py-1 rounded-full border border-gray-300 text-xs text-gray-600 tracking-widest bg-white/50">
                    {currentSlideIndex + 1} OF {slides.length}
                  </div>
                  <h1 className="text-4xl lg:text-5xl font-extralight tracking-tight leading-tight">
                    {currentSlide.title.split(' ').map((word, i) => (
                      <span key={i} className={cn(i > 0 && 'block')}>{word}</span>
                    ))}
                  </h1>
                </div>

                {currentSlide.description && (
                  <p className="text-lg text-gray-600 leading-relaxed font-light">
                    {currentSlide.description}
                  </p>
                )}

                {!isLastSlide && (
                  <button
                    onClick={handleSkip}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors underline underline-offset-4"
                  >
                    Skip tutorial
                  </button>
                )}
              </div>

              {/* Visual content - now takes 2 columns */}
              <div className="lg:col-span-2 relative">
                {currentSlide.imageUrl ? (
                  <div className="relative aspect-video lg:aspect-[4/3] rounded-3xl overflow-hidden bg-gray-900/50 shadow-2xl">
                    <img
                      src={currentSlide.imageUrl}
                      alt={currentSlide.title}
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                  </div>
                ) : (
                  <div className="aspect-video lg:aspect-[4/3] rounded-3xl bg-gradient-to-br from-gray-100 via-gray-50 to-white flex items-center justify-center relative overflow-hidden border border-gray-200 shadow-2xl">
                    {/* Abstract geometric decoration */}
                    <div className="absolute inset-0 opacity-30">
                      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-200 rounded-full filter blur-3xl animate-pulse" />
                      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-200 rounded-full filter blur-3xl animate-pulse delay-1000" />
                    </div>
                    <Sparkles className="h-32 w-32 text-gray-400 relative z-10" />
                  </div>
                )}

                {/* Floating decorative elements */}
                <div className="absolute -top-12 -right-12 w-20 h-20 border border-gray-300 rounded-full" />
                <div className="absolute -bottom-12 -left-12 w-32 h-32 border border-gray-300 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom navigation */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentSlideIndex === 0 || isAnimating}
                className={cn(
                  "flex items-center space-x-3 transition-all duration-200",
                  currentSlideIndex === 0 || isAnimating
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-500 hover:text-gray-900 group"
                )}
              >
                <ChevronLeft className={cn("h-5 w-5 transition-transform", isAnimating && "animate-pulse")} />
                <span className="text-sm font-light tracking-wide">PREVIOUS</span>
              </button>

              <button
                onClick={handleNext}
                disabled={isAnimating}
                className={cn(
                  "flex items-center space-x-3 text-gray-900 group transition-all duration-200",
                  isAnimating && "opacity-50"
                )}
              >
                <span className="text-sm font-light tracking-wide">
                  {isLastSlide ? 'GET STARTED' : 'NEXT'}
                </span>
                {isLastSlide ? (
                  <Play className="h-5 w-5" />
                ) : (
                  <ChevronRight className={cn("h-5 w-5 transform transition-transform", isAnimating ? "" : "group-hover:translate-x-1")} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Keyboard navigation hint */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <p className="text-xs text-gray-500 font-light">
            Use arrow keys to navigate
          </p>
        </div>
      </div>

      {/* Add keyboard navigation */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out;
        }
      `}</style>
    </div>
  );
};

// Hook to check if tutorial should be shown
export const useTutorial = (audience: 'hiring' | 'applicant' | 'all' = 'hiring') => {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(`${LOCAL_STORAGE_KEY}-${audience}`);
    setShouldShow(completed !== 'true');
  }, [audience]);

  const markCompleted = () => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}-${audience}`, 'true');
    setShouldShow(false);
  };

  const reset = () => {
    localStorage.removeItem(`${LOCAL_STORAGE_KEY}-${audience}`);
    setShouldShow(true);
  };

  return { shouldShow, markCompleted, reset };
};