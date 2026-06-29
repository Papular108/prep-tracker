import { useState, useEffect } from "react";
import api from "../api";

const todayStr = new Date().toISOString().slice(0, 10);

function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function DayCard({ day, isToday }) {
    return (
        <div className={`sp-day-card${isToday ? ' sp-day-today' : ''}`}>
            <div className="sp-day-header">
                <span className="sp-day-date">{formatDate(day.date)}</span>
                {isToday && <span className="sp-today-badge">TODAY</span>}
                <span className="sp-day-count">{day.subtopics.length} topic{day.subtopics.length !== 1 ? 's' : ''}</span>
            </div>
            <ul className="sp-subtopic-list">
                {day.subtopics.map(st => (
                    <li key={st.id} className={`sp-subtopic-item${st.is_completed ? ' sp-completed' : ''}`}>
                        <span className="sp-subtopic-check">{st.is_completed ? '✓' : '○'}</span>
                        <span className="sp-subtopic-body">
                            <span className="sp-subtopic-text">{st.topic_text}</span>
                            <span className="sp-subtopic-meta">{st.module_name} › {st.chapter_title}</span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function StudyPlan() {
    const [syllabi, setSyllabi] = useState([]);
    const [selectedId, setSelectedId] = useState('');
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [openWeeks, setOpenWeeks] = useState({});

    useEffect(() => {
        api.get('/api/syllabus/').then(r => setSyllabi(r.data)).catch(() => {});
    }, []);

    const fetchPlan = (id) => {
        if (!id) { setPlan(null); setError(''); return; }
        setLoading(true);
        setError('');
        setPlan(null);
        api.get(`/api/syllabus/${id}/study-plan/`)
            .then(r => {
                setPlan(r.data);
                const openState = {};
                r.data.weeks.forEach((w, i) => {
                    // open the week containing today, or the first week
                    const hasToday = w.days.some(d => d.date === todayStr);
                    openState[w.week_start] = hasToday || i === 0;
                });
                setOpenWeeks(openState);
            })
            .catch(err => {
                setError(err.response?.data?.error || 'Failed to load study plan.');
            })
            .finally(() => setLoading(false));
    };

    const handleSelect = (e) => {
        setSelectedId(e.target.value);
        fetchPlan(e.target.value);
    };

    const toggleWeek = (weekStart) => {
        setOpenWeeks(prev => ({ ...prev, [weekStart]: !prev[weekStart] }));
    };

    const thisWeek = plan?.weeks.find(w => w.days.some(d => d.date === todayStr));

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Study Plan</h1>
                <p className="page-subtitle">Auto-distributed plan across your remaining study days</p>
            </div>

            {/* Syllabus selector */}
            <div className="form-card" style={{ marginBottom: 24 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Select Syllabus</label>
                    <select
                        className="form-select"
                        value={selectedId}
                        onChange={handleSelect}
                        style={{ maxWidth: 340 }}
                    >
                        <option value="">-- choose a syllabus --</option>
                        {syllabi.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.syllabus_name}{s.estimated_exam_date ? ` (exam: ${s.estimated_exam_date})` : ' — no exam date'}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {loading && <p className="no-logs">Generating plan…</p>}
            {error && <div className="alert-error">{error}</div>}

            {plan && (
                <>
                    {/* Summary bar */}
                    <div className="sp-summary-bar">
                        <div className="sp-summary-item">
                            <span className="sp-summary-value">{plan.summary.total_subtopics}</span>
                            <span className="sp-summary-label">Subtopics</span>
                        </div>
                        <div className="sp-summary-divider" />
                        <div className="sp-summary-item">
                            <span className="sp-summary-value">{plan.summary.study_days}</span>
                            <span className="sp-summary-label">Study Days</span>
                        </div>
                        <div className="sp-summary-divider" />
                        <div className="sp-summary-item">
                            <span className="sp-summary-value">{plan.summary.per_day}</span>
                            <span className="sp-summary-label">Per Day</span>
                        </div>
                        <div className="sp-summary-divider" />
                        <div className="sp-summary-item">
                            <span className="sp-summary-value">{formatDate(plan.summary.revision_start)}</span>
                            <span className="sp-summary-label">Revision Starts</span>
                        </div>
                        <div className="sp-summary-divider" />
                        <div className="sp-summary-item">
                            <span className="sp-summary-value">{formatDate(plan.summary.exam_date)}</span>
                            <span className="sp-summary-label">Exam Date</span>
                        </div>
                    </div>

                    {/* This week spotlight */}
                    {thisWeek && (
                        <div className="sp-this-week">
                            <div className="sp-this-week-header">
                                <span className="sp-this-week-badge">THIS WEEK</span>
                                <span className="sp-this-week-range">{thisWeek.week_label}</span>
                            </div>
                            <div className="sp-days-grid">
                                {thisWeek.days.map(day => (
                                    <DayCard key={day.date} day={day} isToday={day.date === todayStr} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Full week-by-week plan */}
                    <div className="sp-section-label">Full Plan</div>
                    {plan.weeks.map(week => {
                        const topicCount = week.days.reduce((n, d) => n + d.subtopics.length, 0);
                        const isOpen = !!openWeeks[week.week_start];
                        return (
                            <div key={week.week_start} className="sp-week-card">
                                <button className="sp-week-header" onClick={() => toggleWeek(week.week_start)}>
                                    <span className="sp-week-label">{week.week_label}</span>
                                    <span className="sp-week-count">{topicCount} topic{topicCount !== 1 ? 's' : ''}</span>
                                    <span className="sp-week-chevron">{isOpen ? '▲' : '▼'}</span>
                                </button>
                                {isOpen && (
                                    <div className="sp-week-body">
                                        {week.days.map(day => (
                                            <DayCard key={day.date} day={day} isToday={day.date === todayStr} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </>
            )}
        </div>
    );
}

export default StudyPlan;
