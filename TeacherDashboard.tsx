
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useParams } from 'react-router-dom';
import { Profile, Batch, Lesson } from '../types';
import { mockDb } from '../services/supabaseService';

interface TeacherDashboardProps {
  user: Profile;
  onLogout: () => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, onLogout }) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBatchTitle, setNewBatchTitle] = useState('');

  useEffect(() => {
    setBatches(mockDb.batches.listByTeacher(user.id));
  }, [user.id]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    const newBatch: Batch = {
      code,
      teacher_id: user.id,
      title: newBatchTitle
    };
    await mockDb.batches.create(newBatch);
    setBatches([...batches, newBatch]);
    setNewBatchTitle('');
    setShowCreateModal(false);
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg">D</div>
          <span className="font-black text-xl tracking-tighter italic">DRONA</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm hidden sm:inline">Hello, <span className="text-white font-medium">{user.name}</span></span>
          <button onClick={onLogout} className="text-sm text-slate-400 hover:text-red-400 transition-colors">Logout</button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 lg:p-10 max-w-7xl mx-auto w-full">
        <Routes>
          <Route path="/" element={
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold">My Batches</h1>
                  <p className="text-slate-400 mt-1">Manage your classrooms and curriculum</p>
                </div>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                  Create New Batch
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {batches.length > 0 ? batches.map(batch => (
                  <Link 
                    key={batch.code}
                    to={`/teacher/batch/${batch.code}`}
                    className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-emerald-500/50 transition-all group shadow-xl"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="bg-slate-800 px-2 py-1 rounded text-xs font-mono text-emerald-400">{batch.code}</div>
                    </div>
                    <h3 className="text-xl font-bold mb-1">{batch.title}</h3>
                    <p className="text-slate-500 text-sm">Classroom active • {mockDb.enrollments.listByBatch(batch.code).length} Students</p>
                  </Link>
                )) : (
                  <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                    <p className="text-slate-500">No batches created yet. Click above to start.</p>
                  </div>
                )}
              </div>
            </div>
          } />
          <Route path="/batch/:code" element={<BatchDetails />} />
        </Routes>
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">Create New Classroom</h2>
            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Class Name</label>
                <input
                  autoFocus
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  placeholder="e.g. Class 12 Physics"
                  value={newBatchTitle}
                  onChange={(e) => setNewBatchTitle(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 text-slate-400 hover:text-white font-semibold transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg">Generate Code</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const BatchDetails: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonFormData, setLessonFormData] = useState({ 
    title: '', 
    youtube: '', 
    deadline: '', 
    scheduled_at: '',
    homework_description: '', 
    homework_url: '',
    answer_key_url: ''
  });

  useEffect(() => {
    if (code) {
      setBatch(mockDb.batches.getByCode(code) || null);
      setLessons(mockDb.lessons.listByBatch(code));
      setStudents(mockDb.enrollments.listByBatch(code));
    }
  }, [code]);

  const handleOpenAdd = () => {
    setEditingLesson(null);
    setLessonFormData({ title: '', youtube: '', deadline: '', scheduled_at: '', homework_description: '', homework_url: '', answer_key_url: '' });
    setShowAddLesson(true);
  };

  const handleOpenEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonFormData({
      title: lesson.title,
      youtube: lesson.youtube_url,
      deadline: lesson.deadline,
      scheduled_at: lesson.scheduled_at,
      homework_description: lesson.homework_description,
      homework_url: lesson.homework_url || '',
      answer_key_url: lesson.answer_key_url || ''
    });
    setShowAddLesson(true);
  };

  const handleUpsertLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    const lesson: Lesson = {
      id: editingLesson?.id || Math.random().toString(36).substr(2, 9),
      batch_code: code,
      title: lessonFormData.title,
      youtube_url: lessonFormData.youtube,
      homework_description: lessonFormData.homework_description,
      homework_url: lessonFormData.homework_url,
      deadline: lessonFormData.deadline,
      scheduled_at: lessonFormData.scheduled_at || new Date().toISOString(),
      answer_key_url: lessonFormData.answer_key_url || "https://example.com/answer-key.pdf"
    };
    await mockDb.lessons.upsert(lesson);
    
    // Refresh list
    setLessons(mockDb.lessons.listByBatch(code));
    setShowAddLesson(false);
  };

  if (!batch) return <div>Loading...</div>;

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Link to="/teacher" className="text-emerald-500 text-sm font-medium hover:underline flex items-center gap-1 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            Back to batches
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            {batch.title}
            <span className="text-slate-600 font-mono text-lg font-normal bg-slate-900 px-2 py-1 border border-slate-800 rounded">{batch.code}</span>
          </h1>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg"
        >
          Add Module
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold">Curriculum Modules ({lessons.length})</h2>
          <div className="space-y-4">
            {lessons.map(lesson => {
              const isFuture = new Date(lesson.scheduled_at) > new Date();
              return (
                <div key={lesson.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between shadow-lg hover:border-slate-700 transition-colors">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg flex items-center gap-2">
                      {lesson.title}
                      {isFuture && <span className="bg-amber-500/10 text-amber-500 text-[10px] px-2 py-0.5 rounded-full uppercase font-black border border-amber-500/20">Scheduled</span>}
                    </h4>
                    <p className="text-slate-500 text-xs mt-1">
                      <span className="font-bold text-slate-400">Scheduled:</span> {new Date(lesson.scheduled_at).toLocaleString()}
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      <span className="font-bold text-slate-400">Deadline:</span> {new Date(lesson.deadline).toLocaleString()}
                    </p>
                    <div className="flex gap-2 mt-3">
                      {lesson.homework_url ? (
                        <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-lg border border-emerald-500/10 uppercase font-black">HW Added</span>
                      ) : (
                        <span className="bg-red-500/10 text-red-400 text-[10px] px-2 py-0.5 rounded-lg border border-red-500/10 uppercase font-black">No HW PDF</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Mastery Rate</p>
                      <p className="font-bold text-emerald-400 text-xl">{mockDb.submissions.listByLesson(lesson.id).filter(s => s.status === 'Approved').length}/{students.length}</p>
                    </div>
                    <button 
                      onClick={() => handleOpenEdit(lesson)}
                      className="p-3 bg-slate-800 hover:bg-emerald-600 text-slate-400 hover:text-white rounded-xl transition-all shadow-lg"
                      title="Manage Materials"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold">Live Dojo Status ({students.length})</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Student Name</th>
                  <th className="px-6 py-4 text-center">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {students.map(student => (
                  <tr key={student.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-5 font-medium">{student.name}</td>
                    <td className="px-6 py-5 text-center">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mx-auto animate-pulse"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-2xl font-black mb-8 italic">{editingLesson ? 'Edit Module Materials' : 'DRONA - New Module'}</h2>
            <form onSubmit={handleUpsertLesson} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Lesson Title</label>
                  <input required className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-emerald-500/50" value={lessonFormData.title} onChange={e => setLessonFormData({...lessonFormData, title: e.target.value})} placeholder="e.g. Molecular Biology" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Scheduled Release</label>
                    <input required type="datetime-local" className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-emerald-500/50" value={lessonFormData.scheduled_at} onChange={e => setLessonFormData({...lessonFormData, scheduled_at: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Homework Deadline</label>
                    <input required type="datetime-local" className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-emerald-500/50" value={lessonFormData.deadline} onChange={e => setLessonFormData({...lessonFormData, deadline: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Video Stream URL (YouTube)</label>
                  <input required className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-emerald-500/50" value={lessonFormData.youtube} onChange={e => setLessonFormData({...lessonFormData, youtube: e.target.value})} placeholder="https://youtube.com/watch?v=..." />
                </div>
                <div className="p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 space-y-4">
                   <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Homework Resources</h4>
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Briefing / Instructions</label>
                     <textarea required className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-5 py-4 text-white h-24 focus:outline-none focus:border-emerald-500/50 resize-none font-medium text-sm" value={lessonFormData.homework_description} onChange={e => setLessonFormData({...lessonFormData, homework_description: e.target.value})} placeholder="Describe the challenges..." />
                   </div>
                   <div className="grid grid-cols-1 gap-4">
                     <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Homework PDF Link</label>
                       <input className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-emerald-500/50 text-sm" value={lessonFormData.homework_url} onChange={e => setLessonFormData({...lessonFormData, homework_url: e.target.value})} placeholder="https://drive.google.com/..." />
                     </div>
                     <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Answer Key (Unlocked after Mastery)</label>
                       <input className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-emerald-500/50 text-sm" value={lessonFormData.answer_key_url} onChange={e => setLessonFormData({...lessonFormData, answer_key_url: e.target.value})} placeholder="Private Answer Sheet Link" />
                     </div>
                   </div>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAddLesson(false)} className="flex-1 py-4 text-slate-400 font-bold hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-lg transition-all transform active:scale-95">
                  {editingLesson ? 'Save Changes' : 'Publish Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
