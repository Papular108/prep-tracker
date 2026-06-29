import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line,
} from 'recharts';
import api from '../api';

// ── Heatmap helpers ──────────────────────────────────────────────────────────

function getColor(hours) {
  if (hours === 0) return '#e2e8f0';
  if (hours < 1)  return '#bbf7d0';
  if (hours < 2)  return '#4ade80';
  if (hours < 4)  return '#16a34a';
  return '#14532d';
}

function Heatmap({ data }) {
  // Pad so the grid always starts on a Monday
  const firstDate = data.length ? new Date(data[0].date + 'T00:00:00') : new Date();
  const dayOfWeek = (firstDate.getDay() + 6) % 7; // Mon=0 … Sun=6
  const padded = [
    ...Array(dayOfWeek).fill(null),
    ...data,
  ];

  const weeks = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-day-labels">
        {dayLabels.map(d => (
          <span key={d} className="heatmap-day-label">{d}</span>
        ))}
      </div>
      <div className="heatmap-grid">
        {weeks.map((week, wi) => (
          <div key={wi} className="heatmap-col">
            {week.map((cell, di) => {
              if (!cell) return <div key={di} className="heatmap-cell empty" />;
              const label = `${cell.date}: ${cell.hours}h`;
              return (
                <div
                  key={di}
                  className="heatmap-cell"
                  style={{ background: getColor(cell.hours) }}
                  title={label}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <span className="heatmap-legend-label">Less</span>
        {[0, 0.5, 2, 3, 5].map(h => (
          <div
            key={h}
            className="heatmap-cell"
            style={{ background: getColor(h), flexShrink: 0 }}
          />
        ))}
        <span className="heatmap-legend-label">More</span>
      </div>
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function HoursTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div className="chart-tooltip-value">{payload[0].value}h</div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/studylogs/analytics/')
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load analytics.'));
  }, []);

  if (error) return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
      </div>
      <div className="alert-error">{error}</div>
    </div>
  );

  if (!data) return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Loading your study data…</p>
      </div>
    </div>
  );

  const totalHours = data.hours_by_syllabus.reduce((s, s_) => s + s_.total_hours, 0).toFixed(1);
  const activeDays = data.daily_hours.filter(d => Number(d.hours) > 0).length;
  const maxDay = data.daily_hours.reduce((m, d) => Math.max(m, Number(d.hours)), 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Your study activity over the last 90 days</p>
      </div>

      {/* Quick stats */}
      <div className="summary-grid" style={{ marginBottom: 28 }}>
        <div className="summary-card">
          <span className="summary-card-icon">⏱</span>
          <div className="summary-card-value">{totalHours}h</div>
          <div className="summary-card-label">Total (90 days)</div>
        </div>
        <div className="summary-card">
          <span className="summary-card-icon">📅</span>
          <div className="summary-card-value">{activeDays}</div>
          <div className="summary-card-label">Active Days</div>
        </div>
        <div className="summary-card">
          <span className="summary-card-icon">🔥</span>
          <div className="summary-card-value">{maxDay}h</div>
          <div className="summary-card-label">Best Day</div>
        </div>
        <div className="summary-card">
          <span className="summary-card-icon">📚</span>
          <div className="summary-card-value">{data.hours_by_syllabus.length}</div>
          <div className="summary-card-label">Syllabi Studied</div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="card">
        <div className="chart-card-title">Study Heatmap</div>
        <div className="chart-card-sub">Daily hours studied — last 90 days</div>
        <Heatmap data={data.daily_hours} />
      </div>

      {/* Weekly trend */}
      <div className="card">
        <div className="chart-card-title">Weekly Study Trend</div>
        <div className="chart-card-sub">Total hours per week — last 12 weeks</div>
        {data.weekly_totals.every(w => w.hours === 0) ? (
          <p className="chart-empty">No study logs recorded yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.weekly_totals} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week_label" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="h" />
              <Tooltip content={<HoursTooltip />} />
              <Line
                type="monotone"
                dataKey="hours"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ fill: '#6366f1', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Hours by syllabus */}
      {data.hours_by_syllabus.length > 0 && (
        <div className="card">
          <div className="chart-card-title">Hours by Syllabus</div>
          <div className="chart-card-sub">Total time invested per syllabus</div>
          <ResponsiveContainer width="100%" height={Math.max(120, data.hours_by_syllabus.length * 48)}>
            <BarChart
              data={data.hours_by_syllabus}
              layout="vertical"
              margin={{ top: 4, right: 40, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} unit="h" />
              <YAxis
                type="category"
                dataKey="syllabus_name"
                width={130}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip
                formatter={(v) => [`${v}h`, 'Hours']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Bar dataKey="total_hours" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Module completion */}
      {data.completion_by_module.length > 0 && (
        <div className="card">
          <div className="chart-card-title">Module Completion</div>
          <div className="chart-card-sub">Subtopics completed per module</div>
          {(() => {
            const completionData = data.completion_by_module.map(m => ({
              ...m,
              pct: m.total > 0 ? parseFloat(((m.completed / m.total) * 100).toFixed(1)) : 0,
            }));
            return (
              <ResponsiveContainer width="100%" height={Math.max(120, completionData.length * 48)}>
                <BarChart
                  data={completionData}
                  layout="vertical"
                  margin={{ top: 4, right: 60, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
                  <YAxis
                    type="category"
                    dataKey="module_name"
                    width={130}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <Tooltip
                    formatter={(v, _name, props) =>
                      [`${v}% (${props.payload.completed}/${props.payload.total})`, 'Completion']
                    }
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="pct" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            );
          })()}
        </div>
      )}

      {data.hours_by_syllabus.length === 0 && data.completion_by_module.length === 0 && (
        <div className="empty-state">
          <span className="empty-state-icon">📊</span>
          <div className="empty-state-title">No data yet</div>
          <div className="empty-state-sub">
            Log some study sessions to see your analytics here.
          </div>
        </div>
      )}
    </div>
  );
}
