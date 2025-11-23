import { useEffect, useRef } from 'react';

interface HLSVideoPlayerProps {
  src: string;
  className?: string;
}

export function HLSVideoPlayer({ src, className = '' }: HLSVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Check if HLS is natively supported (Safari)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    } else {
      // For other browsers, we'll need to dynamically load hls.js
      // Since hls.js is not in package.json, we'll load it from CDN
      const loadHls = async () => {
        if ('Hls' in window) {
          const Hls = (window as any).Hls;
          if (Hls.isSupported()) {
            const hls = new Hls({
              maxBufferLength: 30,
              maxMaxBufferLength: 600,
            });
            hls.loadSource(src);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              console.log('HLS manifest parsed, video ready to play');
            });
            hls.on(Hls.Events.ERROR, (event: any, data: any) => {
              console.error('HLS error:', data);
              if (data.fatal) {
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    console.error('Network error, trying to recover...');
                    hls.startLoad();
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    console.error('Media error, trying to recover...');
                    hls.recoverMediaError();
                    break;
                  default:
                    console.error('Fatal error, destroying HLS instance');
                    hls.destroy();
                    break;
                }
              }
            });
            return () => {
              hls.destroy();
            };
          }
        } else {
          // Load hls.js from CDN
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
          script.async = true;
          script.onload = () => {
            const Hls = (window as any).Hls;
            if (Hls.isSupported()) {
              const hls = new Hls({
                maxBufferLength: 30,
                maxMaxBufferLength: 600,
              });
              hls.loadSource(src);
              hls.attachMedia(video);
            }
          };
          document.body.appendChild(script);
        }
      };
      loadHls();
    }
  }, [src]);

  return (
    <video
      ref={videoRef}
      controls
      className={className}
      preload="metadata"
      playsInline
    >
      Your browser does not support the video tag.
    </video>
  );
}
