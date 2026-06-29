import { useState, useEffect } from "react";
import api from "../api";

function Home() {
    const [syllabi, setSyllabi] = useState([]);

    // Inline-form visibility: keyed by parent id
    const [showModuleForm, setShowModuleForm] = useState({});
    const [showChapterForm, setShowChapterForm] = useState({});
    const [showSubTopicForm, setShowSubTopicForm] = useState({});

    // Inline-form input values: keyed by parent id
    const [moduleInputs, setModuleInputs] = useState({});
    const [chapterInputs, setChapterInputs] = useState({});
    const [subTopicInputs, setSubTopicInputs] = useState({});

    useEffect(() => {
        getSyllabi();
    }, []);

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

    const ProgressBar = ({ percentage, height = 8, style = {} }) => (
        <div style={{ background: '#e9ecef', borderRadius: '4px', overflow: 'hidden', height, ...style }}>
            <div style={{ width: `${percentage}%`, height: '100%', background: '#28A745', transition: 'width 0.3s ease' }} />
        </div>
    );

    const overall = syllabi.reduce((acc, syl) => {
        const p = calcProgress(syl.modules);
        return { total: acc.total + p.total, completed: acc.completed + p.completed };
    }, { total: 0, completed: 0 });
    const overallPct = overall.total === 0 ? 0 : Math.round((overall.completed / overall.total) * 100);

    const inputStyle = { padding: '5px', marginRight: '6px', borderRadius: '3px', border: '1px solid #ccc' };
    const addBtnStyle = { padding: '5px 10px', backgroundColor: '#28A745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', marginRight: '6px' };
    const cancelBtnStyle = { padding: '5px 10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' };
    const toggleBtnStyle = { background: 'none', border: '1px dashed #007BFF', color: '#007BFF', padding: '3px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '0.85em' };

    return (
        <div>
            <h2>My Syllabus Overview</h2>

            {/* Overall Progress Summary */}
            {syllabi.length > 0 && (
                <div style={{ marginBottom: '24px', border: '1px solid #28A745', borderRadius: '6px', padding: '16px', background: '#f8fff9' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#1a5c2a' }}>Overall Progress</h3>
                    <div style={{ display: 'flex', gap: '24px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#444' }}><strong>{syllabi.length}</strong> {syllabi.length === 1 ? 'syllabus' : 'syllabi'}</span>
                        <span style={{ color: '#444' }}><strong>{overall.completed}/{overall.total}</strong> subtopics completed</span>
                        <span style={{ color: '#28A745', fontWeight: 'bold' }}>{overallPct}%</span>
                    </div>
                    <ProgressBar percentage={overallPct} height={12} />
                </div>
            )}

            {syllabi.length === 0 && <p style={{ color: '#666' }}>No syllabi yet. <a href="/add">Add one</a>.</p>}
            {syllabi.map((syllabus) => {
                const sylProgress = calcProgress(syllabus.modules);
                return (
                <div key={syllabus.id} style={{ marginBottom: '30px', border: '1px solid #ddd', borderRadius: '6px', padding: '16px' }}>
                    <h3 style={{ margin: '0 0 4px 0' }}>{syllabus.syllabus_name}</h3>
                    {syllabus.estimated_exam_date && (
                        <p style={{ margin: '0 0 6px 0', color: '#666', fontSize: '0.9em' }}>Exam: {syllabus.estimated_exam_date}</p>
                    )}
                    {/* Syllabus progress bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <ProgressBar percentage={sylProgress.percentage} style={{ flex: 1 }} />
                        <span style={{ fontSize: '0.85em', color: '#555', whiteSpace: 'nowrap' }}>
                            {sylProgress.completed}/{sylProgress.total} completed ({sylProgress.percentage}%)
                        </span>
                    </div>

                    {/* Modules */}
                    {syllabus.modules.map((module) => {
                        const modProgress = calcModuleProgress(module);
                        return (
                        <div key={module.id} style={{ marginLeft: '16px', marginBottom: '16px', borderLeft: '3px solid #007BFF', paddingLeft: '12px' }}>
                            <div style={{ marginBottom: '4px' }}>
                                <strong>{module.module_name}</strong>
                                {module.weightage_marks && (
                                    <span style={{ marginLeft: '8px', color: '#666', fontSize: '0.85em' }}>({module.weightage_marks} marks)</span>
                                )}
                            </div>
                            {/* Module progress bar */}
                            {modProgress.total > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <ProgressBar percentage={modProgress.percentage} style={{ flex: 1, maxWidth: '200px' }} />
                                    <span style={{ fontSize: '0.78em', color: '#777' }}>
                                        {modProgress.completed}/{modProgress.total} ({modProgress.percentage}%)
                                    </span>
                                </div>
                            )}

                            {/* Chapters */}
                            {module.chapters.map((chapter) => (
                                <div key={chapter.id} style={{ marginLeft: '16px', marginBottom: '12px' }}>
                                    <div style={{ marginBottom: '6px', fontStyle: 'italic', color: '#444' }}>{chapter.chapter_title}</div>

                                    {/* SubTopics */}
                                    {chapter.sub_topics.map((sub) => (
                                        <div key={sub.id} style={{ marginLeft: '16px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input
                                                type="checkbox"
                                                checked={sub.is_completed}
                                                onChange={() => toggleSubTopic(sub.id, sub.is_completed)}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            <span style={{ textDecoration: sub.is_completed ? 'line-through' : 'none', color: sub.is_completed ? '#999' : '#222' }}>
                                                {sub.topic_text}
                                            </span>
                                        </div>
                                    ))}

                                    {/* Add SubTopic */}
                                    <div style={{ marginLeft: '16px', marginTop: '6px' }}>
                                        {showSubTopicForm[chapter.id] ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                                <input
                                                    type="text"
                                                    placeholder="Sub-topic text"
                                                    value={subTopicInputs[chapter.id]?.text || ''}
                                                    onChange={(e) => setSubTopicInputs((prev) => ({ ...prev, [chapter.id]: { ...prev[chapter.id], text: e.target.value } }))}
                                                    style={{ ...inputStyle, width: '220px' }}
                                                    onKeyDown={(e) => e.key === 'Enter' && addSubTopic(chapter.id)}
                                                />
                                                <button style={addBtnStyle} onClick={() => addSubTopic(chapter.id)}>Add</button>
                                                <button style={cancelBtnStyle} onClick={() => setShowSubTopicForm((prev) => ({ ...prev, [chapter.id]: false }))}>Cancel</button>
                                            </div>
                                        ) : (
                                            <button style={toggleBtnStyle} onClick={() => setShowSubTopicForm((prev) => ({ ...prev, [chapter.id]: true }))}>+ Sub-topic</button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Add Chapter */}
                            <div style={{ marginLeft: '16px', marginTop: '8px' }}>
                                {showChapterForm[module.id] ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                        <input
                                            type="text"
                                            placeholder="Chapter title"
                                            value={chapterInputs[module.id]?.title || ''}
                                            onChange={(e) => setChapterInputs((prev) => ({ ...prev, [module.id]: { title: e.target.value } }))}
                                            style={{ ...inputStyle, width: '200px' }}
                                            onKeyDown={(e) => e.key === 'Enter' && addChapter(module.id)}
                                        />
                                        <button style={addBtnStyle} onClick={() => addChapter(module.id)}>Add</button>
                                        <button style={cancelBtnStyle} onClick={() => setShowChapterForm((prev) => ({ ...prev, [module.id]: false }))}>Cancel</button>
                                    </div>
                                ) : (
                                    <button style={toggleBtnStyle} onClick={() => setShowChapterForm((prev) => ({ ...prev, [module.id]: true }))}>+ Chapter</button>
                                )}
                            </div>
                        </div>
                        );
                    })}

                    {/* Add Module */}
                    <div style={{ marginLeft: '16px', marginTop: '8px' }}>
                        {showModuleForm[syllabus.id] ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                <input
                                    type="text"
                                    placeholder="Module name"
                                    value={moduleInputs[syllabus.id]?.name || ''}
                                    onChange={(e) => setModuleInputs((prev) => ({ ...prev, [syllabus.id]: { ...prev[syllabus.id], name: e.target.value } }))}
                                    style={{ ...inputStyle, width: '180px' }}
                                    onKeyDown={(e) => e.key === 'Enter' && addModule(syllabus.id)}
                                />
                                <input
                                    type="number"
                                    placeholder="Marks (optional)"
                                    value={moduleInputs[syllabus.id]?.weightage || ''}
                                    onChange={(e) => setModuleInputs((prev) => ({ ...prev, [syllabus.id]: { ...prev[syllabus.id], weightage: e.target.value } }))}
                                    style={{ ...inputStyle, width: '120px' }}
                                />
                                <button style={addBtnStyle} onClick={() => addModule(syllabus.id)}>Add</button>
                                <button style={cancelBtnStyle} onClick={() => setShowModuleForm((prev) => ({ ...prev, [syllabus.id]: false }))}>Cancel</button>
                            </div>
                        ) : (
                            <button style={toggleBtnStyle} onClick={() => setShowModuleForm((prev) => ({ ...prev, [syllabus.id]: true }))}>+ Module</button>
                        )}
                    </div>
                </div>
                );
            })}
        </div>
    );
}

export default Home;
