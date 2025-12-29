
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Profile, Lesson, Submission, Note } from '../types';
import { mockDb } from '../services/supabaseService';
import { analyzeHomework } from '../services/geminiService';

interface LessonViewProps {
  user: Profile;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

const LessonView: React.FC<LessonViewProps> = ({ user }) => {
  const { batchCode, lessonId } = useParams<{ batchCode: string; lessonId: string }>();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [classmatesActivity, setClassmatesActivity] = useState<Submission[]>([]);
  
  const [isScanning, setIsScanning] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasVideoError, setHasVideoError] = useState(false);
  
  const playerRef = useRef<any>(null);
  const activityIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (batchCode && lessonId) {
      const currentLesson = mockDb.lessons.listByBatch(batchCode).find(l => l.id === lessonId);
      setLesson(currentLesson || null);
      setSubmission(mockDb.submissions.getByStudentAndLesson(user.id, lessonId) || null);
      
      const savedNotes = JSON.parse(localStorage.getItem(`notes_${lessonId}_${user.id}`) || '[]');
      setNotes(savedNotes);

      refreshActivity();
      activityIntervalRef.current = window.setInterval(refreshActivity, 10000);
    }
    return () => {
      if (activityIntervalRef.current) clearInterval(activityIntervalRef.current);
    };
  }, [batchCode, lessonId, user.id]);

  const refreshActivity = () => {
    if (lessonId) {
      const allSubs = mockDb.submissions.listByLesson(lessonId);
      const filtered = allSubs
        .filter(s => s.student_id !== user.id && s.status === 'Approved')
        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
        .slice(0, 10);
      setClassmatesActivity(filtered);
    }
  };

  const getYouTubeID = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  useEffect(() => {
    if (!lesson) return;
    const initPlayer = () => {
      const videoId = getYouTubeID(lesson.youtube_url);
      if (!videoId) { setHasVideoError(true); return; }
      if (playerRef.current && playerRef.current.destroy) playerRef.current.destroy();
      playerRef.current = new window.YT.Player('yt-player', {
        height: '100%', width: '100%', videoId: videoId,
        playerVars: { modestbranding: 1, rel: 0, origin: window.location.origin, enablejsapi: 1, controls: 1 },
        events: {
          onReady: (event: any) => { setDuration(event.target.getDuration()); setHasVideoError(false); },
          onStateChange: (event: any) => { setIsPlaying(event.data === window.YT.PlayerState.PLAYING); },
          onError: () => setHasVideoError(true)
        },
      });
    };

    if (window.YT && window.YT.Player) initPlayer();
    else {
      const tag = document.createElement('script'); tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    const interval = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        setCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lesson]);

  const handleSeek = (time: number) => {
    playerRef.current?.seekTo(time, true);
    playerRef.current?.playVideo();
  };

  const addNote = () => {
    if (!newNote.trim() || !lesson) return;
    const note: Note = {
      id: Math.random().toString(36).substr(2, 9),
      lesson_id: lesson.id,
      student_id: user.id,
      timestamp: currentTime,
      content: newNote
    };
    const updated = [...notes, note].sort((a,b) => a.timestamp - b.timestamp);
    setNotes(updated);
    setNewNote("");
    localStorage.setItem(`notes_${lesson.id}_${user.id}`, JSON.stringify(updated));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !lesson) return;
    setIsScanning(true);
    setUploadProgress(10);
    
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setUploadProgress(30);
      
      // 1. Initially set status to 'Pending' and persist
      const pendingSub: Submission = {
        id: submission?.id || Math.random().toString(36).substr(2, 9),
        student_id: user.id,
        lesson_id: lesson.id,
        image_url: base64,
        ai_score: null,
        ai_feedback: "Drona is analyzing your submission...",
        status: 'Pending',
        student_name: user.name,
        created_at: new Date().toISOString()
      };
      
      await mockDb.submissions.create(pendingSub);
      setSubmission(pendingSub); // UI Update: Pending
      setUploadProgress(50);

      // 2. Perform AI analysis
      const result = await analyzeHomework(base64);
      setUploadProgress(85);
      
      // 3. Update with final result ('Approved' or 'Rejected') and persist
      const finalSub: Submission = {
        ...pendingSub,
        ai_score: result.score,
        ai_feedback: result.feedback,
        status: result.status,
      };

      await mockDb.submissions.create(finalSub);
      setSubmission(finalSub); // UI Update: Final Result
      
      setUploadProgress(100);
      setTimeout(() => setIsScanning(false), 800);
    };
    reader.readAsDataURL(file);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!lesson) return <div className="p-10 text-center font-bold">Lesson not found.</div>;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col xl:flex-row">
      {/* Sidebar - Real-time Collaboration */}
      <aside className="w-full xl:w-80 bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-8 h-auto xl:h-screen sticky top-0 overflow-auto z-20">
        <div className="space-y-4">
          <Link to={`/student/batch/${batchCode}`} className="text-emerald-500 text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:translate-x-[-4px] transition-transform">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
            Dojo Overview
          </Link>
          <div className="pt-4">
            <h2 className="text-white font-black italic tracking-tighter text-3xl">DRONA</h2>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Real-time Learning Lab</p>
          </div>
        </div>

        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Classmates Live</h3>
             <div className="flex gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse delay-75"></span>
             </div>
          </div>
          <div className="space-y-3">
            {classmatesActivity.length > 0 ? classmatesActivity.map(s => (
              <div key={s.id} className="bg-slate-950/50 p-4 rounded-2xl border border-emerald-500/10 flex items-center gap-3 animate-in slide-in-from-left duration-500">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500 font-bold text-xs">
                  {s.student_name?.[0] || 'S'}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xs font-bold truncate">{s.student_name}</p>
                  <p className="text-emerald-500 text-[9px] font-black uppercase tracking-tighter">Mastery achieved • {s.ai_score}/10</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 opacity-30 grayscale italic text-xs text-slate-500">
                Waiting for others to join the session...
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto bg-emerald-500/5 p-5 rounded-3xl border border-emerald-500/10">
          <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3">Module Progress</h4>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-400">Class Avg Score</span>
            <span className="text-white font-bold">8.4</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
             <div className="h-full bg-emerald-500" style={{ width: '84%' }}></div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 xl:p-12 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl xl:text-6xl font-black text-white tracking-tighter">{lesson.title}</h1>
            <div className="flex items-center gap-4">
               <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest italic">Live Session</span>
               <span className="text-slate-500 text-xs font-medium">Mentor: AI Drona</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Player & Notes (Col Span 8) */}
            <div className="lg:col-span-8 space-y-10">
              <div className="relative aspect-video bg-black rounded-[3rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] ring-1 ring-slate-800">
                {hasVideoError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-center p-10">
                    <p className="text-slate-500 font-black uppercase tracking-widest italic mb-4">Stream Offline</p>
                    <a href={lesson.youtube_url} target="_blank" rel="noreferrer" className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-3 rounded-2xl">Watch Externally</a>
                  </div>
                ) : (
                  <div id="yt-player" className="w-full h-full pointer-events-none"></div>
                )}
                {!isPlaying && !hasVideoError && (
                  <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[4px] flex items-center justify-center transition-all duration-700">
                     <button onClick={() => playerRef.current?.playVideo()} className="w-24 h-24 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full flex items-center justify-center text-3xl shadow-[0_0_50px_rgba(16,185,129,0.4)] transform hover:scale-110 active:scale-95 transition-all">▶</button>
                  </div>
                )}
              </div>

              {/* Enhanced Notes & Bookmarks Area */}
              <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-10 rounded-[3rem] shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-500">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black italic">Study Lab</h3>
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Bookmarks & Concept Capture</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800">
                     <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                     <span className="text-xs font-mono text-emerald-400 font-bold">{formatTime(currentTime)}</span>
                  </div>
                </div>

                <div className="flex gap-4 mb-10">
                  <input 
                    type="text" 
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addNote()}
                    placeholder="Bookmark a key concept at this moment..."
                    className="flex-1 bg-slate-950 border-2 border-slate-800 rounded-[1.5rem] px-6 py-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
                  />
                  <button onClick={addNote} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-10 rounded-[1.5rem] shadow-lg shadow-emerald-900/20 transition-all active:scale-95">Add Mark</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {notes.map(note => (
                    <div key={note.id} className="bg-slate-950/40 p-5 rounded-3xl border border-slate-800/50 group hover:border-emerald-500/30 transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <button 
                          onClick={() => handleSeek(note.timestamp)} 
                          className="text-emerald-500 font-mono text-xs font-black underline flex items-center gap-1 hover:text-emerald-400 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                          Jump to {formatTime(note.timestamp)}
                        </button>
                        <button 
                          onClick={() => {
                            const updated = notes.filter(n => n.id !== note.id);
                            setNotes(updated);
                            localStorage.setItem(`notes_${lesson.id}_${user.id}`, JSON.stringify(updated));
                          }}
                          className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                      <p className="text-slate-300 text-sm font-medium leading-relaxed">{note.content}</p>
                    </div>
                  ))}
                  {notes.length === 0 && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-20 grayscale">
                      <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                      <p className="text-lg font-black italic">Start taking notes to master the module</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Tools (Col Span 4) */}
            <div className="lg:col-span-4 space-y-10">
              {/* Instructions */}
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-xl">
                <h3 className="text-xl font-black mb-6 italic">Assignment Hub</h3>
                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-slate-400 text-sm italic leading-relaxed">
                   {lesson.homework_description || "No specific instructions provided for this module."}
                </div>
                {lesson.homework_url && (
                  <a href={lesson.homework_url} target="_blank" rel="noreferrer" className="mt-6 flex items-center justify-center gap-2 w-full bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 font-black py-4 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Download Worksheet
                  </a>
                )}
              </div>

              {/* Drona AI Evaluation */}
              <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-[3rem] shadow-2xl">
                <div className="flex items-center gap-4 mb-10">
                   <div className="w-12 h-12 bg-emerald-600/20 rounded-2xl flex items-center justify-center text-emerald-500 italic font-black text-xl shadow-inner">D</div>
                   <h3 className="text-xl font-black italic">Drona Evaluation</h3>
                </div>

                {!submission ? (
                  <label className="block cursor-pointer group">
                    <div className="border-3 border-dashed border-slate-800 rounded-[2.5rem] p-12 text-center hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all duration-500">
                      <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-xl">
                        <svg className="w-10 h-10 text-slate-400 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg>
                      </div>
                      <p className="text-xl font-black text-white group-hover:text-emerald-400 transition-colors">Submit Scan</p>
                      <p className="text-slate-500 text-[10px] font-black uppercase mt-2 tracking-widest italic opacity-50">Pedagogical Review Engine</p>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                ) : (
                  <div className="space-y-8 animate-in zoom-in duration-500">
                    <div className={`p-8 rounded-[2.5rem] border ${submission.status === 'Approved' ? 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : submission.status === 'Pending' ? 'border-amber-500/50 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.2)]' : 'border-red-500/50 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.2)]'}`}>
                      <div className="flex items-center gap-5 mb-6">
                        <div className={`shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-2xl transition-all ${submission.status === 'Approved' ? 'bg-emerald-500 text-white' : submission.status === 'Pending' ? 'bg-amber-500 text-white animate-pulse' : 'bg-red-500 text-white'}`}>
                          {submission.status === 'Pending' ? '?' : (submission.ai_score || 0)}
                        </div>
                        <div>
                          <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 block ${submission.status === 'Approved' ? 'text-emerald-400' : submission.status === 'Pending' ? 'text-amber-400' : 'text-red-400'}`}>
                             {submission.status === 'Approved' ? 'Mastery Verified' : submission.status === 'Pending' ? 'Evaluating...' : 'Needs Review'}
                          </span>
                          <h4 className="text-white font-bold text-lg leading-tight">AI Mentor Result</h4>
                        </div>
                      </div>
                      
                      <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/50">
                        <p className="text-slate-300 text-sm font-medium leading-relaxed italic">"{submission.ai_feedback}"</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      {submission.status === 'Approved' ? (
                        <button 
                          onClick={() => window.open(lesson.answer_key_url)}
                          className="w-full bg-white hover:bg-emerald-50 text-emerald-700 font-black py-5 rounded-[2rem] shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)] transition-all transform active:scale-95 text-lg flex items-center justify-center gap-3"
                        >
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>
                           Unlock Solution Guide
                        </button>
                      ) : submission.status === 'Pending' ? (
                        <div className="text-center py-4 text-amber-400 font-black text-sm uppercase tracking-widest animate-pulse">Analysis in Progress...</div>
                      ) : (
                        <button onClick={() => setSubmission(null)} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-5 rounded-[2rem] shadow-xl border border-slate-700 transition-all flex items-center justify-center gap-3">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                          Update & Re-scan
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                <p className="mt-8 text-[10px] text-slate-500 font-black text-center uppercase tracking-widest leading-loose opacity-40">
                  Pedagogical data updated in real-time for batch collaboration.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* AI Processing Overlay */}
      {isScanning && (
        <div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-3xl flex items-center justify-center flex-col p-10 text-center animate-in fade-in duration-500">
          <div className="relative mb-12">
            <div className="w-32 h-32 bg-emerald-500/10 rounded-full flex items-center justify-center animate-pulse border-2 border-emerald-500/20">
               <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center text-emerald-500 font-black italic text-4xl">D</div>
          </div>
          <h2 className="text-5xl xl:text-7xl font-black mb-4 text-white tracking-tighter italic">DRONA VISION</h2>
          <p className="text-slate-400 text-xl font-medium max-w-md mx-auto leading-relaxed">
            Scanning pedagogical patterns... <span className="text-emerald-400 font-black">{uploadProgress}%</span>
          </p>
          <div className="w-64 h-1.5 bg-slate-900 rounded-full mt-10 overflow-hidden">
             <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
          </div>
          <p className="text-slate-500 text-xs mt-6 font-bold uppercase tracking-widest animate-pulse">Submission recorded as 'Pending' in your academic profile</p>
        </div>
      )}
    </div>
  );
};

export default LessonView;
