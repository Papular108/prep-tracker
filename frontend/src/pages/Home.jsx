import { useState, useEffect } from "react";
import api from "../api";

function Home() {
    const [syllabi, setSyllabi] = useState([]);

    const [showModuleForm, setShowModuleForm] = useState({});
    const [showChapterForm, setShowChapterForm] = useState({});
    const [showSubTopicForm, setShowSubTopicForm] = useState({});

    const [editState, setEditState] = useState(null);

    const [moduleInputs, setModuleInputs] = useState({});
    const [chapterInputs, setChapterInputs] = useState({});
    const [subTopicInputs, setSubTopicInputs] = useState({});

    useEffect(() => { getSyllabi(); }, []);

    const getSyllabi = () => {
        api.get("/api/syllabus/")
            .then((res) => setSyllabi(res.data))
            .catch((err) => alert(err));
    };

    const toggleSubTopic = (id, current) => {
        api.patch(`/api/subtopics/${id}/`, { is_completed: !current })
            .then(() => getSyllabi())
            .catch((err) => alert(err));
    };

    const deleteItem = (endpoint, id) => {
        if (!confirm("Are you sure?")) return;
        api.delete(`${endpoint}${id}/`)
            .then(() => getSyllabi())
            .catch((err) => alert(err));
    };

    const startEdit = (type, id, value) => setEditState({ type, id, value });
    const cancelEdit = () => setEditState(null);

    const saveEdit = () => {
        if (!editState) return;
        const { type, id, value } = editState;
        const endpoints = {
            syllabus: `/api/syllabus/${id}/`,
            module: `/api/modules/${id}/`,
            chapter: `/api/chapters/${id}/`,
            subtopic: `/api/subtopics/${id}/`,
        };
        const fields = {
            syllabus: { syllabus_name: value },
            module: { module_name: value },
            chapter: { chapter_title: value },
            subtopic: { topic_text: value },
        };
        api.patch(endpoints[type], fields[type])
            .then(() => { setEditState(null); getSyllabi(); })
            .catch((err) => alert(err));
    };

    const addModule = (syllabusId) => {
        const { name = '', weightage = '' } = moduleInputs[syllabusId] || {};
        if (!name.trim()) return;
        api.post('/api/modules/', {
            syllabus: syllabusId,
            module_name: name.trim(),
            weightage_marks: weightage || null,
        })
            .then(() => {
                getSyllabi();
                setShowModuleForm((prev) => ({ ...prev, [syllabusId]: false }));
                setModuleInputs((prev) => ({ ...prev, [syllabusId]: {} }));
            })
            .catch((err) => alert(err));
    };

    const addChapter = (moduleId) => {
        const { title = '' } = chapterInputs[moduleId] || {};
        if (!title.trim()) return;
        api.post('/api/chapters/', { module: moduleId, chapter_title: title.trim() })
            .then(() => {
                getSyllabi();
                setShowChapterForm((prev) => ({ ...prev, [moduleId]: false }));
                setChapterInputs((prev) => ({ ...prev, [moduleId]: {} }));
            })
            .catch((err) => alert(err));
    };

    const addSubTopic = (chapterId) => {
        const { text = '' } = subTopicInputs[chapterId] || {};
        if (!text.trim()) return;
        api.post('/api/subtopics/', { chapter: chapterId, topic_text: text.trim(), is_completed: false })
            .then(() => {
                getSyllabi();
                setShowSubTopicForm((prev) => ({ ...prev, [chapterId]: false }));
                setSubTopicInputs((prev) => ({ ...prev, [chapterId]: {} }));
            })
            .catch((err) => alert(err));
    };

    const calcProgress = (modules) => {
        let total = 0, completed = 0;
        for (const mod of modules) {
            for (const ch of mod.chapters) {
                total += ch.sub_topics.length;
                completed += ch.sub_topics.filter(s => s.is_completed).length;
            }
        }
        return { total, completed, percentage: total === 0 ? 0 : Math.round((completed / total) * 100) };
    };

    const calcModuleProgress = (mod) => {
        let total = 0, completed = 0;
        for (const ch of mod.chapters) {
            total += ch.sub_topics.length;
            completed += ch.sub_topics.filter(s => s.is_completed).length;
        }
        return { total, completed, percentage: total === 0 ? 0 : Math.round((completed / total) * 100) };
    };

    const overall = syllabi.reduce((acc, syl) => {
        const p = calcProgress(syl.modules);
        return { total: acc.total + p.total, completed: acc.completed + p.completed };
    }, { total: 0, completed: 0 });
    const overallPct = overall.total === 0 ? 0 : Math.round((overall.completed / overall.total) * 100);

    const getDeleteEndpoint = (type) => {
        const map = { syllabus: '/api/syllabus/', module: '/api/modules/', chapter: '/api/chapters/', subtopic: '/api/subtopics/' };
        return map[type];
    };

    const InlineEdit = ({ type, id, currentValue, display }) => {
        const isEditing = editState?.type === type && editState?.id === id;
        if (isEditing) {
            return (
                <span className="inline-edit">
                    <input
                        autoFocus
                        className="inline-input"
                        value={editState.value}
                        onChange={(e) => setEditState((prev) => ({ ...prev, value: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                    />
                    <button className="inline-save-btn" onClick={saveEdit}>Save</button>
                    <button className="inline-cancel-btn" onClick={cancelEdit}>Cancel</button>
                </span>
            );
        }
        return (
            <span className="hover-item">
                <span>{display}</span>
                <span className="item-actions">
                    <button className="action-btn action-btn-edit" title="Edit" onClick={() => startEdit(type, id, currentValue)}>✎</button>
                    <button className="action-btn action-btn-delete" title="Delete" onClick={() => deleteItem(getDeleteEndpoint(type), id)}>✕</button>
                </span>
            </span>
        );
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">My Syllabi</h1>
                <p className="page-subtitle">Track your study progress across all subjects</p>
            </div>

            {/* Overall Progress */}
            {syllabi.length > 0 && (
                <div className="overall-progress">
                    <div className="overall-progress-label">Overall Progress</div>
                    <div className="overall-progress-pct">{overallPct}%</div>
                    <div className="overall-progress-meta">
                        <span><strong>{syllabi.length}</strong> {syllabi.length === 1 ? 'syllabus' : 'syllabi'}</span>
                        <span><strong>{overall.completed}/{overall.total}</strong> subtopics completed</span>
                    </div>
                    <div className="progress-bar-lg">
                        <div className="progress-fill-lg" style={{ width: `${overallPct}%` }} />
                    </div>
                </div>
            )}

            {syllabi.length === 0 && (
                <div className="empty-state">
                    <span className="empty-state-icon">📚</span>
                    <div className="empty-state-title">No syllabi yet</div>
                    <div className="empty-state-sub">
                        <a href="/add">Add your first syllabus</a> to start tracking.
                    </div>
                </div>
            )}

            {/* Syllabus Cards */}
            {syllabi.map((syllabus) => {
                const sylProgress = calcProgress(syllabus.modules);
                return (
                    <div key={syllabus.id} className="syllabus-card">
                        <div className="syllabus-card-header">
                            <div className="syllabus-name-row">
                                <span className="syllabus-name">
                                    <InlineEdit type="syllabus" id={syllabus.id} currentValue={syllabus.syllabus_name} display={syllabus.syllabus_name} />
                                </span>
                            </div>
                            {syllabus.estimated_exam_date && (
                                <div className="syllabus-meta">Exam: {syllabus.estimated_exam_date}</div>
                            )}
                            <div className="progress-row">
                                <div className="progress-bar-sm">
                                    <div className="progress-fill-sm" style={{ width: `${sylProgress.percentage}%` }} />
                                </div>
                                <span className="progress-pct-label">
                                    {sylProgress.completed}/{sylProgress.total} ({sylProgress.percentage}%)
                                </span>
                            </div>
                        </div>

                        {/* Modules */}
                        {syllabus.modules.map((module) => {
                            const modProgress = calcModuleProgress(module);
                            return (
                                <div key={module.id} className="module-block">
                                    <div className="module-header">
                                        <span className="module-name">
                                            <InlineEdit type="module" id={module.id} currentValue={module.module_name} display={module.module_name} />
                                        </span>
                                        {module.weightage_marks && (
                                            <span className="module-badge">{module.weightage_marks} marks</span>
                                        )}
                                    </div>

                                    {modProgress.total > 0 && (
                                        <div className="module-progress-row">
                                            <div className="progress-bar-xs">
                                                <div className="progress-fill-xs" style={{ width: `${modProgress.percentage}%` }} />
                                            </div>
                                            <span className="module-pct-label">
                                                {modProgress.completed}/{modProgress.total} ({modProgress.percentage}%)
                                            </span>
                                        </div>
                                    )}

                                    {/* Chapters */}
                                    {module.chapters.map((chapter) => (
                                        <div key={chapter.id} className="chapter-block">
                                            <div className="chapter-title-row">
                                                <span className="chapter-title">
                                                    <InlineEdit type="chapter" id={chapter.id} currentValue={chapter.chapter_title} display={chapter.chapter_title} />
                                                </span>
                                            </div>

                                            {/* SubTopics */}
                                            {chapter.sub_topics.map((sub) => (
                                                <div key={sub.id} className="subtopic-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={sub.is_completed}
                                                        onChange={() => toggleSubTopic(sub.id, sub.is_completed)}
                                                    />
                                                    <span className={`subtopic-text${sub.is_completed ? ' completed' : ''}`}>
                                                        <InlineEdit type="subtopic" id={sub.id} currentValue={sub.topic_text} display={sub.topic_text} />
                                                    </span>
                                                </div>
                                            ))}

                                            {/* Add SubTopic */}
                                            <div style={{ paddingLeft: '14px', marginTop: '4px' }}>
                                                {showSubTopicForm[chapter.id] ? (
                                                    <div className="add-form-panel">
                                                        <input
                                                            className="add-form-input"
                                                            type="text"
                                                            placeholder="Sub-topic text"
                                                            style={{ width: '220px' }}
                                                            value={subTopicInputs[chapter.id]?.text || ''}
                                                            onChange={(e) => setSubTopicInputs((prev) => ({ ...prev, [chapter.id]: { ...prev[chapter.id], text: e.target.value } }))}
                                                            onKeyDown={(e) => e.key === 'Enter' && addSubTopic(chapter.id)}
                                                            autoFocus
                                                        />
                                                        <button className="add-form-btn" onClick={() => addSubTopic(chapter.id)}>Add</button>
                                                        <button className="add-form-cancel" onClick={() => setShowSubTopicForm((prev) => ({ ...prev, [chapter.id]: false }))}>Cancel</button>
                                                    </div>
                                                ) : (
                                                    <button className="toggle-add-btn" onClick={() => setShowSubTopicForm((prev) => ({ ...prev, [chapter.id]: true }))}>+ Sub-topic</button>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add Chapter */}
                                    <div style={{ marginTop: '4px' }}>
                                        {showChapterForm[module.id] ? (
                                            <div className="add-form-panel">
                                                <input
                                                    className="add-form-input"
                                                    type="text"
                                                    placeholder="Chapter title"
                                                    style={{ width: '200px' }}
                                                    value={chapterInputs[module.id]?.title || ''}
                                                    onChange={(e) => setChapterInputs((prev) => ({ ...prev, [module.id]: { title: e.target.value } }))}
                                                    onKeyDown={(e) => e.key === 'Enter' && addChapter(module.id)}
                                                    autoFocus
                                                />
                                                <button className="add-form-btn" onClick={() => addChapter(module.id)}>Add</button>
                                                <button className="add-form-cancel" onClick={() => setShowChapterForm((prev) => ({ ...prev, [module.id]: false }))}>Cancel</button>
                                            </div>
                                        ) : (
                                            <button className="toggle-add-btn" onClick={() => setShowChapterForm((prev) => ({ ...prev, [module.id]: true }))}>+ Chapter</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Add Module */}
                        <div className="syllabus-card-footer">
                            {showModuleForm[syllabus.id] ? (
                                <div className="add-form-panel">
                                    <input
                                        className="add-form-input"
                                        type="text"
                                        placeholder="Module name"
                                        style={{ width: '180px' }}
                                        value={moduleInputs[syllabus.id]?.name || ''}
                                        onChange={(e) => setModuleInputs((prev) => ({ ...prev, [syllabus.id]: { ...prev[syllabus.id], name: e.target.value } }))}
                                        onKeyDown={(e) => e.key === 'Enter' && addModule(syllabus.id)}
                                        autoFocus
                                    />
                                    <input
                                        className="add-form-input"
                                        type="number"
                                        placeholder="Marks (optional)"
                                        style={{ width: '130px' }}
                                        value={moduleInputs[syllabus.id]?.weightage || ''}
                                        onChange={(e) => setModuleInputs((prev) => ({ ...prev, [syllabus.id]: { ...prev[syllabus.id], weightage: e.target.value } }))}
                                    />
                                    <button className="add-form-btn" onClick={() => addModule(syllabus.id)}>Add</button>
                                    <button className="add-form-cancel" onClick={() => setShowModuleForm((prev) => ({ ...prev, [syllabus.id]: false }))}>Cancel</button>
                                </div>
                            ) : (
                                <button className="toggle-add-btn" onClick={() => setShowModuleForm((prev) => ({ ...prev, [syllabus.id]: true }))}>+ Module</button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default Home;
