'use client';

import { useState, useRef } from 'react';
import { faceAnalysisAPI, peopleAPI } from '../../utils/api';

const FaceAnalyzer = ({ onPersonAdded }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  const handleFiles = async (files) => {
    const file = files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Check if it's a JPG/JPEG
    if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
      setError('Please select a JPG/JPEG image file');
      return;
    }

    setError(null);
    setResult(null);
    setIsAnalyzing(true);

    try {
      // Call the backend API
      const analysisResult = await faceAnalysisAPI.analyze(file);
      setResult(analysisResult);

      // If analysis was successful and we have structured data, create a person
      if (analysisResult.success && analysisResult.llm_analysis?.structured_data) {
        try {
          const newPerson = await peopleAPI.addPersonFromAnalysis(analysisResult);
          if (onPersonAdded) {
            onPersonAdded(newPerson);
          }
        } catch (personError) {
          console.error('Error creating person from analysis:', personError);
          // Don't show this error to user as the analysis itself was successful
        }
      }

    } catch (err) {
      console.error('Face analysis error:', err);
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const resetAnalysis = () => {
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Face Analysis</h3>
      <p className="text-sm text-gray-600 mb-6">
        Upload a photo to analyze and automatically add the person to your network.
      </p>

      {!result && (
        <div
          ref={dropRef}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            
            {isAnalyzing ? (
              <div>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Analyzing face...</p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm text-gray-600">
                    Drag and drop a JPG image here, or{' '}
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-700 font-medium"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">JPG/JPEG files only</p>
                </div>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,.jpg,.jpeg"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Thumbnail */}
          {result.thumbnail_base64 && (
            <div className="text-center">
              <img
                src={result.thumbnail_base64}
                alt="Analyzed face"
                className="mx-auto rounded-lg shadow-sm max-w-24 h-auto"
              />
            </div>
          )}

          {/* Analysis Results */}
          {result.success && result.llm_analysis?.structured_data ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h4 className="text-sm font-medium text-green-800">Analysis Complete!</h4>
                  <div className="mt-2 text-sm text-green-700">
                    <p><strong>Name:</strong> {result.llm_analysis.structured_data.personal_info?.full_name || 'Unknown'}</p>
                    <p><strong>Position:</strong> {result.llm_analysis.structured_data.professional_info?.current_position || 'Unknown'}</p>
                    <p><strong>Company:</strong> {result.llm_analysis.structured_data.professional_info?.company || 'Unknown'}</p>
                    <p><strong>Confidence:</strong> {result.llm_analysis.structured_data.confidence_level || 'Unknown'}</p>
                  </div>
                  <p className="mt-2 text-xs text-green-600">Person has been added to your network!</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">Analysis Incomplete</h4>
                  <p className="mt-1 text-sm text-yellow-700">
                    The face was analyzed but no structured data was extracted.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          {result.summary && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="text-sm font-medium text-gray-900 mb-2">Analysis Summary</h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Face matches:</span>
                  <span className="ml-2 font-medium">{result.summary.face_matches || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Web mentions:</span>
                  <span className="ml-2 font-medium">{result.summary.total_mentions || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">URLs found:</span>
                  <span className="ml-2 font-medium">{result.summary.urls_with_mentions || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Pages scraped:</span>
                  <span className="ml-2 font-medium">{result.summary.scraped_pages || 0}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={resetAnalysis}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Analyze Another Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaceAnalyzer;
