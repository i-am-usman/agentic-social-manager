import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';

const ProgressModal = ({ jobId, onComplete, onClose }) => {
  const [jobStatus, setJobStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jobId) return;

    const pollInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/posts/status/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch job status');
        }

        const data = await response.json();
        setJobStatus(data);

        // If job is completed or failed, stop polling
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(pollInterval);
          if (onComplete) {
            onComplete(data);
          }
        }
      } catch (err) {
        console.error('Error polling job status:', err);
        setError(err.message);
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [jobId, onComplete]);

  if (!jobId) return null;

  const getProgressColor = () => {
    if (jobStatus?.status === 'failed') return 'bg-red-500';
    if (jobStatus?.status === 'completed') return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getStatusIcon = () => {
    if (jobStatus?.status === 'failed') {
      return <XCircle className="w-8 h-8 text-red-500" />;
    }
    if (jobStatus?.status === 'completed') {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex flex-col items-center mb-6">
          {getStatusIcon()}
          <h2 className="text-2xl font-bold mt-4 text-gray-800">
            {jobStatus?.status === 'completed' ? 'Published Successfully!' :
             jobStatus?.status === 'failed' ? 'Publishing Failed' :
             'Publishing...'}
          </h2>
        </div>

        {/* Progress Bar */}
        {jobStatus && jobStatus.status !== 'completed' && jobStatus.status !== 'failed' && (
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full ${getProgressColor()} transition-all duration-500 ease-out`}
                style={{ width: `${jobStatus.progress || 0}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2 text-center">
              {jobStatus.progress || 0}%
            </p>
          </div>
        )}

        {/* Status Message */}
        <div className="mb-6">
          <p className="text-gray-700 text-center">
            {jobStatus?.message || 'Initializing...'}
          </p>
        </div>

        {/* Platform Status */}
        {jobStatus?.platforms && Object.keys(jobStatus.platforms).length > 0 && (
          <div className="mb-6 space-y-2">
            <p className="text-sm font-semibold text-gray-600 mb-2">Platform Status:</p>
            {Object.entries(jobStatus.platforms).map(([platform, status]) => (
              <div key={platform} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="capitalize text-gray-700">{platform}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 capitalize">{status}</span>
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
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <p className="text-sm font-semibold text-gray-700 mb-2">Result:</p>
            <p className="text-sm text-gray-600">
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
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
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
