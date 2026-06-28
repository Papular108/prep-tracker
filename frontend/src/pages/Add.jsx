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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.estimated_exam_date) delete payload.estimated_exam_date;
      if (!payload.exam_month_nepali) delete payload.exam_month_nepali;
      await api.post('/api/syllabus/', payload);
      navigate('/');
    } catch (err) {
      setError('Failed to create syllabus. Please check your inputs.');
      console.error(err.response?.data);
    }
  };

  const fieldStyle = { width: '100%', padding: '8px', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold' };
  const groupStyle = { marginBottom: '15px' };

  return (
    <div style={{ maxWidth: '500px' }}>
      <h2>Add New Syllabus</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div style={groupStyle}>
          <label style={labelStyle}>Syllabus Name *</label>
          <input
            type="text"
            name="syllabus_name"
            value={form.syllabus_name}
            onChange={handleChange}
            style={fieldStyle}
            required
          />
        </div>
        <div style={groupStyle}>
          <label style={labelStyle}>Estimated Exam Date</label>
          <input
            type="date"
            name="estimated_exam_date"
            value={form.estimated_exam_date}
            onChange={handleChange}
            style={fieldStyle}
          />
        </div>
        <div style={groupStyle}>
          <label style={labelStyle}>Exam Month (Nepali)</label>
          <input
            type="text"
            name="exam_month_nepali"
            value={form.exam_month_nepali}
            onChange={handleChange}
            placeholder="e.g. Baisakh"
            style={fieldStyle}
          />
        </div>
        <div style={groupStyle}>
          <label style={labelStyle}>Revision Buffer (months)</label>
          <input
            type="number"
            name="revision_buffer_months"
            value={form.revision_buffer_months}
            onChange={handleChange}
            min="0"
            style={fieldStyle}
          />
        </div>
        <button
          type="submit"
          style={{ padding: '10px 20px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Create Syllabus
        </button>
      </form>
    </div>
  );
}

export default Add;
