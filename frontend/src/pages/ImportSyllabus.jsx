import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

const STEPS = {
  UPLOAD: 'upload',
  ANALYZING: 'analyzing',
  PREVIEW: 'preview',
  CREATING: 'creating',
};

const ANALYZING_MSGS = ['Extracting text...', 'Analyzing structure with AI...'];

function ImportSyllabus() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [analyzingMsgIdx, setAnalyzingMsgIdx] = useState(0);
  const [structure, setStructure] = useState(null);
  const [error, setError] = useState('');

  const handleFile = (f) => {
    if (f && f.type === 'application/pdf') {
      setFile(f);
      setError('');
    } else {
      setError('Please select a valid PDF file.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setError('');
    setStep(STEPS.ANALYZING);
    setAnalyzingMsgIdx(0);

    const msgTimer = setTimeout(() => setAnalyzingMsgIdx(1), 2500);

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      const res = await api.post('/api/syllabus/analyze-pdf/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      clearTimeout(msgTimer);
      setStructure(res.data);
      setStep(STEPS.PREVIEW);
    } catch (err) {
      clearTimeout(msgTimer);
      setError(err.response?.data?.error || 'Analysis failed. Please try again.');
      setStep(STEPS.UPLOAD);
    }
  };

  const handleCreate = async () => {
    setStep(STEPS.CREATING);
    try {
      await api.post('/api/syllabus/import-pdf/', structure);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create syllabus.');
      setStep(STEPS.PREVIEW);
    }
  };

  const totalSubtopics = structure
    ? structure.modules?.reduce(
        (sum, m) => sum + m.chapters?.reduce((s, c) => s + (c.subtopics?.length || 0), 0),
        0
      )
    : 0;

  return (
    <div className="add-page">
      <div className="page-header">
        <h1 className="page-title">Import from PDF</h1>
        <p className="page-subtitle">Upload a syllabus PDF and let AI extract the structure</p>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {(step === STEPS.UPLOAD) && (
        <div className="form-card">
          <div
            className={`pdf-upload-area${dragOver ? ' dragover' : ''}${file ? ' has-file' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <span className="pdf-upload-icon">{file ? '📄' : '📁'}</span>
            {file ? (
              <>
                <p className="pdf-upload-filename">{file.name}</p>
                <p className="pdf-upload-hint">Click to change file</p>
              </>
            ) : (
              <>
                <p className="pdf-upload-text">Drag & drop a PDF here, or click to browse</p>
                <p className="pdf-upload-hint">PDF files only</p>
              </>
            )}
          </div>

          <button
            className="btn btn-primary btn-lg btn-full"
            disabled={!file}
            onClick={handleAnalyze}
            style={{ marginTop: '16px' }}
          >
            Upload &amp; Analyze
          </button>

          <p className="pdf-or-link">
            <Link to="/add">Or create a syllabus manually</Link>
          </p>
        </div>
      )}

      {step === STEPS.ANALYZING && (
        <div className="form-card pdf-loading-card">
          <div className="pdf-spinner" />
          <p className="pdf-loading-msg">{ANALYZING_MSGS[analyzingMsgIdx]}</p>
          <p className="pdf-loading-sub">This may take a few seconds</p>
        </div>
      )}

      {step === STEPS.CREATING && (
        <div className="form-card pdf-loading-card">
          <div className="pdf-spinner" />
          <p className="pdf-loading-msg">Creating syllabus...</p>
        </div>
      )}

      {step === STEPS.PREVIEW && structure && (
        <>
          <div className="form-card" style={{ marginBottom: '12px' }}>
            <div className="pdf-preview-header">
              <div>
                <div className="pdf-preview-title">{structure.syllabus_name}</div>
                <div className="pdf-preview-meta">
                  {structure.modules?.length || 0} modules &middot; {totalSubtopics} subtopics
                </div>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => { setStep(STEPS.UPLOAD); setStructure(null); }}
              >
                Try again
              </button>
            </div>
          </div>

          <div className="form-card pdf-preview-tree">
            <p className="form-card-title">Review extracted structure</p>
            {structure.modules?.map((mod, mi) => (
              <div key={mi} className="pdf-mod-block">
                <div className="pdf-mod-name">
                  {mod.module_name}
                  {mod.weightage_marks != null && (
                    <span className="module-badge">{mod.weightage_marks} marks</span>
                  )}
                </div>
                {mod.chapters?.map((ch, ci) => (
                  <div key={ci} className="pdf-ch-block">
                    <div className="pdf-ch-title">{ch.chapter_title}</div>
                    <ul className="pdf-subtopic-list">
                      {ch.subtopics?.map((st, si) => (
                        <li key={si} className="pdf-subtopic-item">{st}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <button
            className="btn btn-success btn-lg btn-full"
            onClick={handleCreate}
          >
            Confirm &amp; Create Syllabus
          </button>
        </>
      )}
    </div>
  );
}

export default ImportSyllabus;
