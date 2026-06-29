import { useState, useEffect } from "react";
import api from "../api";

const today = () => new Date().toISOString().slice(0, 10);

function SummaryCard({ label, value }) {
    return (
        <div style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '16px 20px', minWidth: '120px', textAlign: 'center', background: '#fff' }}>
            <div style={{ fontSize: '1.6em', fontWeight: 'bold', color: '#007BFF' }}>{value}</div>
            <div style={{ fontSize: '0.82em', color: '#666', marginTop: '4px' }}>{label}</div>
        </div>
    );
}

function StudyLog() {
    const [syllabi, setSyllabi] = useState([]);
    const [logs, setLogs] = useState([]);
    const [summary, setSummary] = useState({ total_hours: 0, today_hours: 0, this_week_hours: 0, streak: 0 });

    const [form, setForm] = useState({ syllabus: '', subtopic: '', date: today(), hours_spent: '', notes: '' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/api/syllabus/').then(r => setSyllabi(r.data)).catch(() => {});
        fetchLogs();
        fetchSummary();
    }, []);

    const fetchLogs = () => {
        api.get('/api/studylogs/').then(r => setLogs(r.data)).catch(() => {});
    };

    const fetchSummary = () => {
        api.get('/api/studylogs/summary/').then(r => setSummary(r.data)).catch(() => {});
    };

    const selectedSyllabus = syllabi.find(s => String(s.id) === String(form.syllabus));

    // Flat list of all subtopics for selected syllabus
    const subtopics = selectedSyllabus
        ? selectedSyllabus.modules.flatMap(m =>
            m.chapters.flatMap(c =>
                c.sub_topics.map(st => ({ id: st.id, label: `${m.module_name} › ${c.chapter_title} › ${st.topic_text}` }))
            )
          )
        : [];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: value,
            ...(name === 'syllabus' ? { subtopic: '' } : {}),
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        if (!form.syllabus || !form.hours_spent || !form.date) {
            setError('Syllabus, date, and hours are required.');
            return;
        }
        const hours = parseFloat(form.hours_spent);
        if (isNaN(hours) || hours <= 0 || hours > 24) {
            setError('Hours must be between 0 and 24.');
            return;
        }
        setSubmitting(true);
        api.post('/api/studylogs/', {
            syllabus: form.syllabus,
            subtopic: form.subtopic || null,
            date: form.date,
            hours_spent: hours,
            notes: form.notes,
        })
            .then(() => {
                setForm({ syllabus: '', subtopic: '', date: today(), hours_spent: '', notes: '' });
                fetchLogs();
                fetchSummary();
            })
            .catch(err => {
                const data = err.response?.data;
                setError(data ? JSON.stringify(data) : 'Failed to save log.');
            })
            .finally(() => setSubmitting(false));
    };

    const deleteLog = (id) => {
        if (!confirm('Delete this log entry?')) return;
        api.delete(`/api/studylogs/${id}/`)
            .then(() => { fetchLogs(); fetchSummary(); })
            .catch(() => {});
    };

    // Group logs by date
    const grouped = logs.reduce((acc, log) => {
        (acc[log.date] = acc[log.date] || []).push(log);
        return acc;
    }, {});
    const sortedDates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

    const inputStyle = { padding: '6px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.95em' };
    const labelStyle = { fontSize: '0.85em', color: '#555', marginBottom: '3px', display: 'block' };

    return (
        <div style={{ maxWidth: '860px' }}>
            <h2 style={{ marginBottom: '16px' }}>Daily Study Log</h2>

            {/* Summary Cards */}
            <div style={{ display: 'flex', gap: '14px', marginBottom: '28px', flexWrap: 'wrap' }}>
                <SummaryCard label="Total Hours" value={`${summary.total_hours.toFixed(1)}h`} />
                <SummaryCard label="Today" value={`${summary.today_hours.toFixed(1)}h`} />
                <SummaryCard label="This Week" value={`${summary.this_week_hours.toFixed(1)}h`} />
                <SummaryCard label="Streak" value={`${summary.streak}d`} />
            </div>

            {/* Log Form */}
            <div style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '20px', marginBottom: '28px', background: '#fafafa' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1em', color: '#333' }}>Log a Study Session</h3>
                {error && <div style={{ color: '#dc3545', marginBottom: '12px', fontSize: '0.9em' }}>{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={labelStyle}>Date</label>
                            <input type="date" name="date" value={form.date} onChange={handleChange} style={{ ...inputStyle, width: '140px' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={labelStyle}>Syllabus *</label>
                            <select name="syllabus" value={form.syllabus} onChange={handleChange} style={{ ...inputStyle, width: '200px' }}>
                                <option value="">-- select --</option>
                                {syllabi.map(s => <option key={s.id} value={s.id}>{s.syllabus_name}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={labelStyle}>Sub-topic (optional)</label>
                            <select name="subtopic" value={form.subtopic} onChange={handleChange} style={{ ...inputStyle, width: '240px' }} disabled={!form.syllabus}>
                                <option value="">-- general / none --</option>
                                {subtopics.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={labelStyle}>Hours *</label>
                            <input type="number" name="hours_spent" value={form.hours_spent} onChange={handleChange}
                                placeholder="e.g. 1.5" min="0.01" max="24" step="any"
                                style={{ ...inputStyle, width: '90px' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '160px' }}>
                            <label style={labelStyle}>Notes (optional)</label>
                            <input type="text" name="notes" value={form.notes} onChange={handleChange}
                                placeholder="What did you cover?"
                                style={{ ...inputStyle, width: '100%' }} />
                        </div>
                        <button type="submit" disabled={submitting}
                            style={{ padding: '6px 18px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '4px', cursor: submitting ? 'not-allowed' : 'pointer', alignSelf: 'flex-end', height: '34px' }}>
                            {submitting ? 'Saving...' : 'Add Log'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Logs grouped by date */}
            {sortedDates.length === 0 && <p style={{ color: '#888' }}>No logs yet. Add your first study session above.</p>}
            {sortedDates.map(date => {
                const dayLogs = grouped[date];
                const dayTotal = dayLogs.reduce((sum, l) => sum + parseFloat(l.hours_spent), 0);
                return (
                    <div key={date} style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #eee', paddingBottom: '6px', marginBottom: '8px' }}>
                            <strong style={{ color: '#333' }}>{date}</strong>
                            <span style={{ fontSize: '0.85em', color: '#888' }}>{dayTotal.toFixed(1)}h total</span>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92em' }}>
                            <tbody>
                                {dayLogs.map(log => (
                                    <tr key={log.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                        <td style={{ padding: '7px 8px', color: '#555', width: '60px' }}>{parseFloat(log.hours_spent).toFixed(1)}h</td>
                                        <td style={{ padding: '7px 8px', color: '#007BFF' }}>{log.syllabus_name}</td>
                                        <td style={{ padding: '7px 8px', color: '#444' }}>{log.subtopic_text || <span style={{ color: '#bbb' }}>—</span>}</td>
                                        <td style={{ padding: '7px 8px', color: '#666' }}>{log.notes || ''}</td>
                                        <td style={{ padding: '7px 8px', textAlign: 'right' }}>
                                            <button onClick={() => deleteLog(log.id)}
                                                style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '0.85em' }}>✕</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            })}
        </div>
    );
}

export default StudyLog;
