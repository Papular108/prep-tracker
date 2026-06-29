import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function Add() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    syllabus_name: '',
    estimated_exam_date: '',
    exam_month_nepali: '',
    revision_buffer_months: 2,
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.estimated_exam_date) delete payload.estimated_exam_date;
      if (!payload.exam_month_nepali) delete payload.exam_month_nepali;
      await api.post('/api/syllabus/', payload);
      navigate('/');
    } catch (err) {
      setError('Failed to create syllabus. Please check your inputs.');
      console.error(err.response?.data);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="add-page">
      <div className="page-header">
        <h1 className="page-title">Add New Syllabus</h1>
        <p className="page-subtitle">Create a new study syllabus to track</p>
      </div>

      <div className="form-card">
        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Syllabus Name *</label>
            <input
              className="form-input"
              type="text"
              name="syllabus_name"
              value={form.syllabus_name}
              onChange={handleChange}
              placeholder="e.g. Computer Science Year 1"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Estimated Exam Date</label>
            <input
              className="form-input"
              type="date"
              name="estimated_exam_date"
              value={form.estimated_exam_date}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Exam Month (Nepali)</label>
            <input
              className="form-input"
              type="text"
              name="exam_month_nepali"
              value={form.exam_month_nepali}
              onChange={handleChange}
              placeholder="e.g. Baisakh"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Revision Buffer (months)</label>
            <input
              className="form-input"
              type="number"
              name="revision_buffer_months"
              value={form.revision_buffer_months}
              onChange={handleChange}
              min="0"
              style={{ maxWidth: '140px' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={submitting}
          >
            {submitting ? 'Creating...' : 'Create Syllabus'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Add;
