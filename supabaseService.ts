
import { createClient } from '@supabase/supabase-js';
import { Profile, Role, Batch, Lesson, Enrollment, Submission } from '../types';

const SUPABASE_URL = 'https://KXLai243NJ7Tl2Mumkw9pw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KXLai243NJ7Tl2Mumkw9pw_Y1wRMep5';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STORAGE_KEYS = {
  PROFILES: 'edu_profiles',
  BATCHES: 'edu_batches',
  LESSONS: 'edu_lessons',
  ENROLLMENTS: 'edu_enrollments',
  SUBMISSIONS: 'edu_submissions',
  SESSION: 'edu_session'
};

const getLocal = <T,>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const setLocal = <T,>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const mockDb = {
  profiles: {
    create: async (profile: Profile) => {
      const profiles = getLocal<Profile[]>(STORAGE_KEYS.PROFILES, []);
      profiles.push(profile);
      setLocal(STORAGE_KEYS.PROFILES, profiles);
      try { await supabase.from('profiles').upsert(profile); } catch (e) { console.warn("Supabase sync failed", e); }
    },
    get: (id: string) => getLocal<Profile[]>(STORAGE_KEYS.PROFILES, []).find(p => p.id === id),
  },
  batches: {
    create: async (batch: Batch) => {
      const batches = getLocal<Batch[]>(STORAGE_KEYS.BATCHES, []);
      batches.push(batch);
      setLocal(STORAGE_KEYS.BATCHES, batches);
      try { await supabase.from('batches').insert(batch); } catch (e) { console.warn("Supabase sync failed", e); }
    },
    listByTeacher: (teacherId: string) => getLocal<Batch[]>(STORAGE_KEYS.BATCHES, []).filter(b => b.teacher_id === teacherId),
    getByCode: (code: string) => getLocal<Batch[]>(STORAGE_KEYS.BATCHES, []).find(b => b.code === code),
  },
  enrollments: {
    create: async (enrollment: Enrollment) => {
      const ens = getLocal<Enrollment[]>(STORAGE_KEYS.ENROLLMENTS, []);
      if (ens.some(e => e.student_id === enrollment.student_id && e.batch_code === enrollment.batch_code)) return;
      ens.push(enrollment);
      setLocal(STORAGE_KEYS.ENROLLMENTS, ens);
      try { await supabase.from('enrollments').insert(enrollment); } catch (e) { console.warn("Supabase sync failed", e); }
    },
    listByStudent: (studentId: string) => {
      const ens = getLocal<Enrollment[]>(STORAGE_KEYS.ENROLLMENTS, []);
      const codes = ens.filter(e => e.student_id === studentId).map(e => e.batch_code);
      return getLocal<Batch[]>(STORAGE_KEYS.BATCHES, []).filter(b => codes.includes(b.code));
    },
    listByBatch: (batchCode: string) => {
      const ens = getLocal<Enrollment[]>(STORAGE_KEYS.ENROLLMENTS, []);
      const studentIds = ens.filter(e => e.batch_code === batchCode).map(e => e.student_id);
      return getLocal<Profile[]>(STORAGE_KEYS.PROFILES, []).filter(p => studentIds.includes(p.id));
    }
  },
  lessons: {
    upsert: async (lesson: Lesson) => {
      const ls = getLocal<Lesson[]>(STORAGE_KEYS.LESSONS, []);
      const idx = ls.findIndex(l => l.id === lesson.id);
      if (idx > -1) ls[idx] = lesson;
      else ls.push(lesson);
      setLocal(STORAGE_KEYS.LESSONS, ls);
      try { await supabase.from('lessons').upsert(lesson); } catch (e) { console.warn("Supabase sync failed", e); }
    },
    listByBatch: (batchCode: string) => getLocal<Lesson[]>(STORAGE_KEYS.LESSONS, []).filter(l => l.batch_code === batchCode),
  },
  submissions: {
    create: async (sub: Submission) => {
      const subs = getLocal<Submission[]>(STORAGE_KEYS.SUBMISSIONS, []);
      const idx = subs.findIndex(s => s.student_id === sub.student_id && s.lesson_id === sub.lesson_id);
      if (idx > -1) subs[idx] = sub;
      else subs.push(sub);
      setLocal(STORAGE_KEYS.SUBMISSIONS, subs);
      try { await supabase.from('submissions').upsert(sub); } catch (e) { console.warn("Supabase sync failed", e); }
    },
    getByStudentAndLesson: (studentId: string, lessonId: string) => 
      getLocal<Submission[]>(STORAGE_KEYS.SUBMISSIONS, []).find(s => s.student_id === studentId && s.lesson_id === lessonId),
    listByLesson: (lessonId: string) => getLocal<Submission[]>(STORAGE_KEYS.SUBMISSIONS, []).filter(s => s.lesson_id === lessonId)
  }
};

export const mockAuth = {
  signUp: async (data: any, role: Role) => {
    const id = Math.random().toString(36).substr(2, 9);
    const profile: Profile = {
      id,
      name: data.name,
      role,
      phone_number: data.phone,
      email: data.email
    };
    await mockDb.profiles.create(profile);
    setLocal(STORAGE_KEYS.SESSION, profile);
    return profile;
  },
  signIn: (id: string) => {
    const profile = mockDb.profiles.get(id);
    if (profile) setLocal(STORAGE_KEYS.SESSION, profile);
    return profile;
  },
  signOut: () => {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  },
  getSession: () => getLocal<Profile | null>(STORAGE_KEYS.SESSION, null)
};
