import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { apiUrl } from '../config/api';

const ProgressModal = ({ jobId, onComplete, onClose }) => {
  const [jobStatus, setJobStatus] = useState(null);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!jobId) return;

    let canceled = false;
    let attempts = 0;
    const startTime = Date.now();
    const maxDurationMs = 2 * 60 * 1000;
    const baseIntervalMs = 2000;
    const maxIntervalMs = 10000;

    const pollStatus = async () => {
      if (canceled || inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        const controller = new AbortController();
        const token = localStorage.getItem('token');
        const response = await fetch(apiUrl(`/posts/status/${jobId}`), {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to fetch job status');
        }

        const data = await response.json();
        setJobStatus(data);

        if (data.status === 'completed' || data.status === 'failed') {
          if (onComplete) {
            onComplete(data);
          }
          return;
        }
      } catch (err) {
        console.error('Error polling job status:', err);
        setError(err.message);
        return;
      } finally {
        inFlightRef.current = false;
      }

      attempts += 1;
      const elapsedMs = Date.now() - startTime;
      if (elapsedMs >= maxDurationMs) {
        setError('Polling stopped after 2 minutes. Please check status again.');
        return;
      }

      const nextInterval = Math.min(baseIntervalMs + attempts * 1000, maxIntervalMs);
      timeoutRef.current = setTimeout(pollStatus, nextInterval);
    };

    pollStatus();

    return () => {
      canceled = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [jobId, onComplete]);

  if (!jobId) return null;

  const getEffectiveStatus = () => {
    if (jobStatus?.status !== 'completed') return jobStatus?.status;
    return jobStatus?.result?.status || 'completed';
  };

  const getProgressColor = () => {
    const status = getEffectiveStatus();
    if (status === 'failed') return 'bg-red-500';
    if (status === 'partial') return 'bg-yellow-500';
    if (status === 'completed' || status === 'success') return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getStatusIcon = () => {
    const status = getEffectiveStatus();
    if (status === 'failed') {
      return <XCircle className="w-8 h-8 text-red-500" />;
    }
    if (status === 'partial') {
      return <AlertCircle className="w-8 h-8 text-yellow-500" />;
    }
    if (status === 'completed' || status === 'success') {
      return <CheckCircle2 className="w-8 h-8 text-green-500" />;
    }
    return <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />;
  };

  const getPlatformStatus = (platform) => {
    const status = jobStatus?.platforms?.[platform];
    if (!status) return null;
    
    if (status === 'completed') return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (status === 'failed') return <XCircle className="w-5 h-5 text-red-500" />;
    if (status === 'publishing') return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    return null;
  };

  const handleClose = () => {
    if (jobStatus?.status === 'completed' || jobStatus?.status === 'failed') {
      if (onClose) onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/95 p-6 text-slate-100 shadow-[0_30px_80px_rgba(2,6,23,0.6)]">
        <div className="flex flex-col items-center mb-6">
          {getStatusIcon()}
          <h2 className="mt-4 text-2xl font-bold text-white">
            {getEffectiveStatus() === 'failed' ? 'Publishing Failed' :
             getEffectiveStatus() === 'partial' ? 'Publishing completed with issues' :
             getEffectiveStatus() === 'completed' || getEffectiveStatus() === 'success' ? 'Published Successfully!' :
             'Publishing...'}
          </h2>
        </div>

        {/* Progress Bar */}
        {jobStatus && jobStatus.status !== 'completed' && jobStatus.status !== 'failed' && (
          <div className="mb-6">
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-700">
              <div
                className={`h-full ${getProgressColor()} transition-all duration-500 ease-out`}
                style={{ width: `${jobStatus.progress || 0}%` }}
              />
            </div>
            <p className="mt-2 text-center text-sm text-slate-400">
              {jobStatus.progress || 0}%
            </p>
          </div>
        )}

        {/* Status Message */}
        <div className="mb-6">
          <p className="text-center text-slate-200">
            {jobStatus?.message || 'Initializing...'}
          </p>
        </div>

        {/* Platform Status */}
        {jobStatus?.platforms && Object.keys(jobStatus.platforms).length > 0 && (
          <div className="mb-6 space-y-2">
            <p className="mb-2 text-sm font-semibold text-slate-300">Platform Status:</p>
            {Object.entries(jobStatus.platforms).map(([platform, status]) => (
              <div key={platform} className="flex items-center justify-between rounded-lg bg-white/5 p-2">
                <span className="capitalize text-slate-200">{platform}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm capitalize text-slate-400">{status}</span>
                  {getPlatformStatus(platform)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error Message */}
        {(error || jobStatus?.error) && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error || jobStatus?.error}</p>
          </div>
        )}

        {/* Result Details */}
        {jobStatus?.result && (
          <div className="mb-4 rounded-lg bg-white/5 p-3">
            <p className="mb-2 text-sm font-semibold text-slate-200">Result:</p>
            <p className="text-sm text-slate-300">
              {jobStatus.result.message || 
               (jobStatus.result.status === 'success' ? 'Published successfully to all platforms!' :
                jobStatus.result.status === 'partial' ? `Published to some platforms. ${jobStatus.result.failed_platforms?.join(', ')} failed.` :
                'Publishing failed')}
            </p>
            
            {/* Show Instagram warning if present */}
            {jobStatus.result.results?.instagram?.warning && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-xs font-semibold text-yellow-800 mb-1">⚠️ Instagram Note:</p>
                <p className="text-xs text-yellow-700">{jobStatus.result.results.instagram.warning}</p>
              </div>
            )}
          </div>
        )}

        {/* Close Button (only show when done) */}
        {(jobStatus?.status === 'completed' || jobStatus?.status === 'failed') && (
          <button
            onClick={handleClose}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-500"
          >
            Close
          </button>
        )}

        {/* Info for long operations */}
        {jobStatus && jobStatus.status === 'publishing' && jobStatus.message?.includes('reel') && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-xs text-blue-700">
              <strong>Note:</strong> Video processing on Instagram can take 1-2 minutes. Please be patient!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressModal;
