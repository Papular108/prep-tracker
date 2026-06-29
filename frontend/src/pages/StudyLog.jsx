import { useState, useEffect } from "react";
import api from "../api";

const today = () => new Date().toISOString().slice(0, 10);

const SUMMARY_CARDS = [
    { key: 'total_hours', icon: '⏱', label: 'Total Hours', format: (v) => `${v.toFixed(1)}h` },
    { key: 'today_hours', icon: '☀️', label: 'Today', format: (v) => `${v.toFixed(1)}h` },
    { key: 'this_week_hours', icon: '📊', label: 'This Week', format: (v) => `${v.toFixed(1)}h` },
    { key: 'streak', icon: '🔥', label: 'Day Streak', format: (v) => `${v}d` },
];

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

    const fetchLogs = () => api.get('/api/studylogs/').then(r => setLogs(r.data)).catch(() => {});
    const fetchSummary = () => api.get('/api/studylogs/summary/').then(r => setSummary(r.data)).catch(() => {});

    const selectedSyllabus = syllabi.find(s => String(s.id) === String(form.syllabus));

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

    const grouped = logs.reduce((acc, log) => {
        (acc[log.date] = acc[log.date] || []).push(log);
        return acc;
    }, {});
    const sortedDates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Study Log</h1>
                <p className="page-subtitle">Record and review your daily study sessions</p>
            </div>

            {/* Summary Cards */}
            <div className="summary-grid">
                {SUMMARY_CARDS.map(({ key, icon, label, format }) => (
                    <div key={key} className="summary-card">
                        <span className="summary-card-icon">{icon}</span>
                        <div className="summary-card-value">{format(summary[key] ?? 0)}</div>
                        <div className="summary-card-label">{label}</div>
                    </div>
                ))}
            </div>

            {/* Log Form */}
            <div className="form-card">
                <div className="form-card-title">Log a Study Session</div>
                {error && <div className="alert-error">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Date</label>
                            <input
                                className="form-input"
                                type="date"
                                name="date"
                                value={form.date}
                                onChange={handleChange}
                                style={{ width: '148px' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Syllabus *</label>
                            <select
                                className="form-select"
                                name="syllabus"
                                value={form.syllabus}
                                onChange={handleChange}
                                style={{ width: '200px' }}
                            >
                                <option value="">-- select --</option>
                                {syllabi.map(s => <option key={s.id} value={s.id}>{s.syllabus_name}</option>)}
                            </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Sub-topic (optional)</label>
                            <select
                                className="form-select"
                                name="subtopic"
                                value={form.subtopic}
                                onChange={handleChange}
                                style={{ width: '240px' }}
                                disabled={!form.syllabus}
                            >
                                <option value="">-- general / none --</option>
                                {subtopics.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
                            </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Hours *</label>
                            <input
                                className="form-input"
                                type="number"
                                name="hours_spent"
                                value={form.hours_spent}
                                onChange={handleChange}
                                placeholder="1.5"
                                min="0.01"
                                max="24"
                                step="any"
                                style={{ width: '95px' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '160px' }}>
                            <label className="form-label">Notes (optional)</label>
                            <input
                                className="form-input"
                                type="text"
                                name="notes"
                                value={form.notes}
                                onChange={handleChange}
                                placeholder="What did you cover?"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ visibility: 'hidden' }}>Submit</label>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={submitting}
                            >
                                {submitting ? 'Saving…' : 'Add Log'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Log History */}
            {sortedDates.length === 0 && (
                <p className="no-logs">No logs yet. Add your first study session above.</p>
            )}

            {sortedDates.map(date => {
                const dayLogs = grouped[date];
                const dayTotal = dayLogs.reduce((sum, l) => sum + parseFloat(l.hours_spent), 0);
                return (
                    <div key={date} className="log-section">
                        <div className="log-date-header">
                            <span className="log-date-label">{date}</span>
                            <span className="log-date-total">{dayTotal.toFixed(1)}h</span>
                        </div>
                        <table className="log-table">
                            <tbody>
                                {dayLogs.map(log => (
                                    <tr key={log.id}>
                                        <td className="log-hours">{parseFloat(log.hours_spent).toFixed(1)}h</td>
                                        <td className="log-syllabus">{log.syllabus_name}</td>
                                        <td className="log-subtopic">
                                            {log.subtopic_text || <span className="log-empty-cell">—</span>}
                                        </td>
                                        <td className="log-notes">{log.notes || ''}</td>
                                        <td style={{ textAlign: 'right', width: '40px' }}>
                                            <button
                                                className="log-delete-btn"
                                                onClick={() => deleteLog(log.id)}
                                                title="Delete"
                                            >
                                                ✕
                                            </button>
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
