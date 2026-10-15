import { useEffect, useState, useMemo } from 'react';
import { Search, Plus, Pencil, Trash2, Library, X, Save, BookOpen, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LoadingOverlay } from '@/components/Loading';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import type { Subject, Course } from '@/types';

type SubjectWithCourse = Subject & { course?: Course };

export function SubjectManagement() {
  const { showToast } = useToast();
  const [subjects, setSubjects] = useState<SubjectWithCourse[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    subject_code: '',
    subject_name: '',
    course_id: '',
    semester: 1,
    credits: 4,
    faculty: '',
  });

  async function loadData() {
    setLoading(true);
    const [subjectsRes, coursesRes] = await Promise.all([
      supabase.from('subjects').select('*, course:courses(*)').order('subject_name'),
      supabase.from('courses').select('*').order('course_name'),
    ]);
    setSubjects((subjectsRes.data || []) as SubjectWithCourse[]);
    setCourses((coursesRes.data || []) as Course[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    return subjects.filter((s) => {
      const matchesSearch =
        !search ||
        s.subject_name.toLowerCase().includes(search.toLowerCase()) ||
        s.subject_code.toLowerCase().includes(search.toLowerCase()) ||
        s.faculty.toLowerCase().includes(search.toLowerCase());
      const matchesCourse = courseFilter === 'all' || s.course_id === courseFilter;
      return matchesSearch && matchesCourse;
    });
  }, [subjects, search, courseFilter]);

  const openAdd = () => {
    setEditingSubject(null);
    setForm({ subject_code: '', subject_name: '', course_id: courses[0]?.id || '', semester: 1, credits: 4, faculty: '' });
    setModalOpen(true);
  };

  const openEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setForm({
      subject_code: subject.subject_code,
      subject_name: subject.subject_name,
      course_id: subject.course_id,
      semester: subject.semester,
      credits: subject.credits,
      faculty: subject.faculty,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.subject_code || !form.subject_name || !form.course_id) {
      showToast('error', 'Please fill in all required fields.');
      return;
    }
    setSaving(true);

    if (editingSubject) {
      const { error } = await supabase
        .from('subjects')
        .update({
          subject_code: form.subject_code,
          subject_name: form.subject_name,
          course_id: form.course_id,
          semester: form.semester,
          credits: form.credits,
          faculty: form.faculty || 'TBD',
        })
        .eq('id', editingSubject.id);
      setSaving(false);
      if (error) {
        showToast('error', error.message.includes('duplicate') ? 'Subject code already exists.' : 'Failed to update subject.');
        return;
      }
      showToast('success', 'Subject updated successfully.');
    } else {
      const { error } = await supabase.from('subjects').insert({
        subject_code: form.subject_code,
        subject_name: form.subject_name,
        course_id: form.course_id,
        semester: form.semester,
        credits: form.credits,
        faculty: form.faculty || 'TBD',
      });
      setSaving(false);
      if (error) {
        showToast('error', error.message.includes('duplicate') ? 'Subject code already exists.' : 'Failed to add subject.');
        return;
      }
      showToast('success', 'Subject added successfully.');
    }
    setModalOpen(false);
    loadData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('subjects').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    if (error) {
      showToast('error', 'Failed to delete subject.');
      return;
    }
    showToast('success', 'Subject deleted successfully.');
    loadData();
  };

  if (loading) return <LoadingOverlay label="Loading subjects..." />;

  return (
    <div className="p-4 lg:p-6 space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Subject Management</h2>
          <p className="text-sm text-ink-500 mt-0.5">{subjects.length} subject{subjects.length !== 1 ? 's' : ''} available</p>
        </div>
        <button onClick={openAdd} className="btn-primary" disabled={courses.length === 0}>
          <Plus className="w-4 h-4" />
          Add Subject
        </button>
      </div>

      {courses.length === 0 && (
        <div className="card p-4 bg-warning-50 border-warning-200">
          <p className="text-sm text-warning-800">
            You need to add at least one course before adding subjects.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="text"
            placeholder="Search by subject name, code, or faculty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="input sm:w-56"
        >
          <option value="all">All Courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.course_name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Library className="w-8 h-8 text-ink-400" />}
            title={search || courseFilter !== 'all' ? 'No matching subjects' : 'No subjects yet'}
            description={search || courseFilter !== 'all' ? 'Try adjusting your search or filter.' : 'Add your first subject to get started.'}
            action={!search && courseFilter === 'all' && courses.length > 0 && (
              <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" />Add Subject</button>
            )}
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-ink-50 border-b border-ink-200">
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider py-3 px-4">Subject Code</th>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider py-3 px-4">Subject Name</th>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider py-3 px-4 hidden md:table-cell">Course</th>
                  <th className="text-center text-xs font-semibold text-ink-500 uppercase tracking-wider py-3 px-4 hidden sm:table-cell">Semester</th>
                  <th className="text-center text-xs font-semibold text-ink-500 uppercase tracking-wider py-3 px-4 hidden lg:table-cell">Credits</th>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider py-3 px-4 hidden lg:table-cell">Faculty</th>
                  <th className="text-right text-xs font-semibold text-ink-500 uppercase tracking-wider py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((subject) => (
                  <tr key={subject.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="text-sm font-mono font-medium text-accent-600">{subject.subject_code}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-ink-800">{subject.subject_name}</p>
                      <p className="text-xs text-ink-500 lg:hidden">{subject.faculty}</p>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <p className="text-sm text-ink-600 truncate max-w-[180px]">{subject.course?.course_name || '—'}</p>
                    </td>
                    <td className="py-3 px-4 text-center hidden sm:table-cell">
                      <span className="badge bg-primary-100 text-primary-700">Sem {subject.semester}</span>
                    </td>
                    <td className="py-3 px-4 text-center hidden lg:table-cell">
                      <span className="text-sm font-medium text-ink-700">{subject.credits}</span>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-ink-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-3.5 h-3.5 text-ink-500" />
                        </div>
                        <span className="text-sm text-ink-600 truncate">{subject.faculty}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(subject)}
                          className="p-2 text-ink-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(subject)}
                          className="p-2 text-ink-500 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="border-b border-ink-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-ink-900">{editingSubject ? 'Edit Subject' : 'Add New Subject'}</h3>
                <p className="text-sm text-ink-500">{editingSubject ? 'Update subject information' : 'Create a new subject'}</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-ink-400 hover:text-ink-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="label">Subject Code <span className="text-error-500">*</span></label>
                <input
                  type="text"
                  value={form.subject_code}
                  onChange={(e) => setForm({ ...form, subject_code: e.target.value })}
                  className="input"
                  placeholder="e.g. CS301"
                />
              </div>
              <div>
                <label className="label">Subject Name <span className="text-error-500">*</span></label>
                <input
                  type="text"
                  value={form.subject_name}
                  onChange={(e) => setForm({ ...form, subject_name: e.target.value })}
                  className="input"
                  placeholder="e.g. Data Structures & Algorithms"
                />
              </div>
              <div>
                <label className="label">Course <span className="text-error-500">*</span></label>
                <select
                  value={form.course_id}
                  onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                  className="input"
                >
                  <option value="">Select course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.course_name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Semester</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={form.semester}
                    onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Credits</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={form.credits}
                    onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="label">Faculty</label>
                <input
                  type="text"
                  value={form.faculty}
                  onChange={(e) => setForm({ ...form, faculty: e.target.value })}
                  className="input"
                  placeholder="e.g. Dr. Rajesh Kumar"
                />
              </div>
            </div>

            <div className="border-t border-ink-200 px-6 py-4 flex items-center justify-end gap-3">
              <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : editingSubject ? 'Update Subject' : 'Add Subject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Subject"
        message={`Are you sure you want to delete "${deleteTarget?.subject_name}"? This will also remove associated marks and attendance. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
