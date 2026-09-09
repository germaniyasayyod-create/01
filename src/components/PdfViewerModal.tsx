import React, { useState, useEffect } from 'react';
import { X, Download, FileText, ExternalLink, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, Loader2 } from 'lucide-react';
import { resolvePdfUrl } from '../lib/storage';

interface Props {
  isOpen: boolean;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  title?: string;
  onClose: () => void;
}

export const PdfViewerModal: React.FC<Props> = ({
  isOpen,
  fileUrl,
  fileName = 'hujjat.pdf',
  fileSize,
  title = 'PDF Hujjatni ko‘rish',
  onClose,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [resolvedUrl, setResolvedUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !fileUrl) {
      setResolvedUrl('');
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    let isMounted = true;
    let createdBlobUrl = '';
    setIsLoading(true);
    setLoadError(null);

    resolvePdfUrl(fileUrl)
      .then(url => {
        if (isMounted) {
          setResolvedUrl(url);
          if (url.startsWith('blob:')) {
            createdBlobUrl = url;
          }
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error('Error resolving PDF:', err);
        if (isMounted) {
          setLoadError('Faylni ochishda xatolik yuz berdi.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [isOpen, fileUrl]);

  if (!isOpen || !fileUrl) return null;

  const formattedSize = fileSize ? `${(fileSize / (1024 * 1024)).toFixed(2)} MB` : undefined;
  const activeUrl = resolvedUrl || fileUrl;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = activeUrl;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 25, 50));
  const handleZoomReset = () => setZoomLevel(100);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isFullscreen ? 'p-0' : 'p-2 sm:p-4 lg:p-6'} bg-slate-950/75 backdrop-blur-xs`}>
      <div
        className={`bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl flex flex-col w-full ${
          isFullscreen ? 'h-full rounded-none border-none' : 'max-w-4xl h-[92vh] max-h-[95dvh]'
        } overflow-hidden`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-b border-slate-200 bg-slate-50 gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate leading-tight">{title}</h3>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {fileName} {formattedSize && `• ${formattedSize}`}
              </p>
            </div>
          </div>

          {/* Action buttons (min 44px touch targets) */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Zoom Controls */}
            <div className="hidden xs:flex items-center bg-white border border-slate-200 rounded-xl p-0.5 mr-1">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 50 || isLoading}
                className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 disabled:opacity-30 transition-colors"
                title="Kichraytirish"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono font-semibold px-1 text-slate-700 select-none">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 200 || isLoading}
                className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 disabled:opacity-30 transition-colors"
                title="Kattalashtirish"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              {zoomLevel !== 100 && (
                <button
                  type="button"
                  onClick={handleZoomReset}
                  className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800"
                  title="Tiklash"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isLoading || !!loadError}
              className="min-w-[40px] h-10 px-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 border border-blue-200 rounded-xl transition-colors"
              title="Yuklab olish"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Yuklab olish</span>
            </button>

            {activeUrl.startsWith('http') && (
              <a
                href={activeUrl}
                target="_blank"
                rel="noreferrer"
                className="min-w-[40px] h-10 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                title="Brauzerda alohida ochish"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="min-w-[40px] h-10 hidden sm:flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              title={isFullscreen ? "Kichik rejim" : "To'liq ekran"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] h-10 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors ml-1"
              title="Yopish"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / PDF Frame with touch scroll */}
        <div className="flex-1 bg-slate-100 relative overflow-auto p-1 sm:p-2 flex items-center justify-center touch-pan-x touch-pan-y">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
              <Loader2 className="w-8 h-8 text-blue-900 animate-spin" />
              <p className="text-sm font-semibold text-slate-800">PDF hujjat tayyorlanmoqda...</p>
              <p className="text-xs text-slate-500">Iltimos kuting</p>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center">
                <X className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">{loadError}</p>
              <button
                type="button"
                onClick={() => {
                  setIsLoading(true);
                  setLoadError(null);
                  resolvePdfUrl(fileUrl).then(u => {
                    setResolvedUrl(u);
                    setIsLoading(false);
                  }).catch(() => {
                    setLoadError('Faylni ochishda xatolik yuz berdi.');
                    setIsLoading(false);
                  });
                }}
                className="px-4 py-2 bg-blue-900 text-white rounded-xl text-xs font-semibold hover:bg-blue-800"
              >
                Qayta urinish
              </button>
            </div>
          ) : (
            <div
              className="w-full h-full transition-transform duration-150 origin-top-left"
              style={{
                width: zoomLevel !== 100 ? `${zoomLevel}%` : '100%',
                height: zoomLevel !== 100 ? `${zoomLevel}%` : '100%',
              }}
            >
              <iframe
                src={activeUrl}
                title={fileName}
                className="w-full h-full min-h-[400px] rounded-xl border border-slate-200 bg-white"
              />
            </div>
          )}
        </div>

        {/* Mobile helper footer */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span className="truncate">Telefonda sahifa ko‘rinmasa «Yuklab olish» tugmasini bosing</span>
          {activeUrl.startsWith('http') && (
            <a
              href={activeUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-900 font-semibold underline shrink-0 ml-2"
            >
              To‘g‘ridan-to‘g‘ri ochish
            </a>
          )}
        </div>
      </div>
    </div>
  );
};


