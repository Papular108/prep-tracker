import { useState, useEffect } from 'react';
import api from '../api';

const todayStr = () => new Date().toISOString().slice(0, 10);

const nDaysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

function calcCompletion(syllabus) {
  let total = 0, done = 0;
  syllabus.modules.forEach(m =>
    m.chapters.forEach(c =>
      c.sub_topics.forEach(st => { total++; if (st.is_completed) done++; })
    )
  );
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

function moduleStats(syllabus) {
  return syllabus.modules.map(m => {
    let total = 0, done = 0;
    m.chapters.forEach(c =>
      c.sub_topics.forEach(st => { total++; if (st.is_completed) done++; })
    );
    return {
      name: m.module_name,
      weightage: m.weightage_marks,
      done,
      total,
      pct: total ? Math.round((done / total) * 100) : 0,
    };
  });
}

function daysRemaining(examDate) {
  if (!examDate) return null;
  return Math.ceil((new Date(examDate) - new Date()) / 86400000);
}

function ProgressReport() {
  const [syllabi, setSyllabi] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedId, setSelectedId] = useState('all');
  const [dateFrom, setDateFrom] = useState(nDaysAgo(6));
  const [dateTo, setDateTo] = useState(todayStr());
  const [generated, setGenerated] = useState(false);

  const username = localStorage.getItem('username') || 'User';

  useEffect(() => {
    api.get('/api/syllabus/').then(r => setSyllabi(r.data)).catch(() => {});
    api.get('/api/studylogs/').then(r => setLogs(r.data)).catch(() => {});
  }, []);

  const reportSyllabi = selectedId === 'all'
    ? syllabi
    : syllabi.filter(s => String(s.id) === String(selectedId));

  const filteredLogs = logs
    .filter(log => {
      const inRange = log.date >= dateFrom && log.date <= dateTo;
      const inSyllabus = selectedId === 'all' || String(log.syllabus) === String(selectedId);
      return inRange && inSyllabus;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalHours = filteredLogs.reduce((sum, l) => sum + parseFloat(l.hours_spent), 0);
  const dayCount = Math.max(1, Math.ceil((new Date(dateTo) - new Date(dateFrom)) / 86400000) + 1);
  const dailyAvg = totalHours / dayCount;

  const completedSubtopics = [];
  reportSyllabi.forEach(s =>
    s.modules.forEach(m =>
      m.chapters.forEach(c =>
        c.sub_topics.forEach(st => {
          if (st.is_completed) {
            completedSubtopics.push({
              text: st.topic_text,
              module: m.module_name,
              chapter: c.chapter_title,
              syllabus: s.syllabus_name,
            });
          }
        })
      )
    )
  );

  return (
    <div>
      {/* Controls — hidden when printing */}
      <div className="no-print">
        <div className="page-header">
          <h1 className="page-title">Progress Report</h1>
          <p className="page-subtitle">Generate a PDF summary of your study progress</p>
        </div>

        <div className="form-card">
          <div className="form-card-title">Report Settings</div>
          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Syllabus</label>
              <select
                className="form-select"
                value={selectedId}
                onChange={e => { setSelectedId(e.target.value); setGenerated(false); }}
              >
                <option value="all">All Syllabi</option>
                {syllabi.map(s => (
                  <option key={s.id} value={s.id}>{s.syllabus_name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">From</label>
              <input
                className="form-input"
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setGenerated(false); }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">To</label>
              <input
                className="form-input"
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setGenerated(false); }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ visibility: 'hidden' }}>Action</label>
              <button className="btn btn-primary" onClick={() => setGenerated(true)}>
                Generate Report
              </button>
            </div>

            {generated && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ visibility: 'hidden' }}>Download</label>
                <button className="btn btn-success" onClick={() => window.print()}>
                  Download as PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {generated && (
        <div className="report-doc">
          {/* Header */}
          <div className="report-header">
            <div className="report-brand">PrepTracker</div>
            <h1 className="report-title">Progress Report</h1>
            <div className="report-meta">
              <span>Prepared for: <strong>{username}</strong></span>
              <span>Period: <strong>{dateFrom}</strong> to <strong>{dateTo}</strong></span>
              <span>Generated: <strong>{todayStr()}</strong></span>
            </div>
          </div>

          {/* Study Hours Summary */}
          <section className="report-section">
            <h2 className="report-section-title">Study Hours Summary</h2>
            <div className="report-stats-grid">
              <div className="report-stat">
                <div className="report-stat-value">{totalHours.toFixed(1)}h</div>
                <div className="report-stat-label">Total Hours</div>
              </div>
              <div className="report-stat">
                <div className="report-stat-value">{dayCount}d</div>
                <div className="report-stat-label">Period Length</div>
              </div>
              <div className="report-stat">
                <div className="report-stat-value">{dailyAvg.toFixed(1)}h</div>
                <div className="report-stat-label">Daily Average</div>
              </div>
              <div className="report-stat">
                <div className="report-stat-value">{filteredLogs.length}</div>
                <div className="report-stat-label">Log Entries</div>
              </div>
            </div>
          </section>

          {/* Per-syllabus breakdown */}
          {reportSyllabi.map(s => {
            const comp = calcCompletion(s);
            const days = daysRemaining(s.exam_date);
            const mods = moduleStats(s);
            return (
              <section key={s.id} className="report-section">
                <h2 className="report-section-title">{s.syllabus_name}</h2>
                <div className="report-syllabus-meta">
                  {s.exam_date && (
                    <span>Exam date: <strong>{s.exam_date}</strong></span>
                  )}
                  {days !== null && (
                    <span>
                      Days remaining: <strong>{days > 0 ? days : 'Exam passed'}</strong>
                    </span>
                  )}
                  <span>
                    Overall completion: <strong>{comp.pct}%</strong> ({comp.done}/{comp.total} subtopics)
                  </span>
                </div>

                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Module</th>
                      <th>Weightage</th>
                      <th>Completed</th>
                      <th>Total</th>
                      <th>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mods.map((m, i) => (
                      <tr key={i}>
                        <td>{m.name}</td>
                        <td>{m.weightage != null ? m.weightage : '—'}</td>
                        <td>{m.done}</td>
                        <td>{m.total}</td>
                        <td>
                          <div className="report-progress-wrap">
                            <div className="report-progress-bar">
                              <div
                                className="report-progress-fill"
                                style={{ width: `${m.pct}%` }}
                              />
                            </div>
                            <span className="report-progress-pct">{m.pct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}

          {/* Study log entries in range */}
          <section className="report-section">
            <h2 className="report-section-title">
              Study Log Entries ({dateFrom} – {dateTo})
            </h2>
            {filteredLogs.length === 0 ? (
              <p className="report-empty">No study sessions logged in this period.</p>
            ) : (
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Syllabus</th>
                    <th>Subtopic</th>
                    <th>Hours</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => (
                    <tr key={log.id}>
                      <td>{log.date}</td>
                      <td>{log.syllabus_name}</td>
                      <td>{log.subtopic_text || '—'}</td>
                      <td>{parseFloat(log.hours_spent).toFixed(1)}h</td>
                      <td>{log.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Completed subtopics */}
          <section className="report-section">
            <h2 className="report-section-title">
              Completed Subtopics ({completedSubtopics.length})
            </h2>
            {completedSubtopics.length === 0 ? (
              <p className="report-empty">No subtopics completed yet.</p>
            ) : (
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Subtopic</th>
                    <th>Module</th>
                    <th>Chapter</th>
                    {selectedId === 'all' && <th>Syllabus</th>}
                  </tr>
                </thead>
                <tbody>
                  {completedSubtopics.map((st, i) => (
                    <tr key={i}>
                      <td>{st.text}</td>
                      <td>{st.module}</td>
                      <td>{st.chapter}</td>
                      {selectedId === 'all' && <td>{st.syllabus}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <div className="report-footer">
            Generated by PrepTracker &middot; {todayStr()}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProgressReport;
