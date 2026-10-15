import { useEffect, useState, useMemo } from 'react';
import { Search, Plus, Pencil, Trash2, BookOpen, X, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LoadingOverlay } from '@/components/Loading';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import type { Course } from '@/types';

interface CourseManagementProps {
  onViewStudents?: () => void;
}

export function CourseManagement({}: CourseManagementProps) {
  const { showToast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [saving, setSaving] = useState(false);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [subjectCounts, setSubjectCounts] = useState<Record<string, number>>({});

  const [form, setForm] = useState({
    course_id: '',
    course_name: '',
    department: '',
    duration: '',
    num_semesters: 8,
  });

  async function loadData() {
    setLoading(true);
    const [coursesRes, studentsRes, subjectsRes] = await Promise.all([
      supabase.from('courses').select('*').order('course_name'),
      supabase.from('students').select('course_id'),
      supabase.from('subjects').select('course_id'),
    ]);
    const coursesData = (coursesRes.data || []) as Course[];
    setCourses(coursesData);

    const sCounts: Record<string, number> = {};
    (studentsRes.data || []).forEach((s: { course_id: string }) => {
      if (s.course_id) sCounts[s.course_id] = (sCounts[s.course_id] || 0) + 1;
    });
    setStudentCounts(sCounts);

    const subCounts: Record<string, number> = {};
    (subjectsRes.data || []).forEach((s: { course_id: string }) => {
      if (s.course_id) subCounts[s.course_id] = (subCounts[s.course_id] || 0) + 1;
    });
    setSubjectCounts(subCounts);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return courses;
    const q = search.toLowerCase();
    return courses.filter(
      (c) =>
        c.course_name.toLowerCase().includes(q) ||
        c.course_id.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q)
    );
  }, [courses, search]);

  const openAdd = () => {
    setEditingCourse(null);
    setForm({ course_id: '', course_name: '', department: '', duration: '4 Years', num_semesters: 8 });
    setModalOpen(true);
  };

  const openEdit = (course: Course) => {
    setEditingCourse(course);
    setForm({
      course_id: course.course_id,
      course_name: course.course_name,
      department: course.department,
      duration: course.duration,
      num_semesters: course.num_semesters,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.course_id || !form.course_name || !form.department) {
      showToast('error', 'Please fill in all required fields.');
      return;
    }
    setSaving(true);

    if (editingCourse) {
      const { error } = await supabase
        .from('courses')
        .update({
          course_id: form.course_id,
          course_name: form.course_name,
          department: form.department,
          duration: form.duration,
          num_semesters: form.num_semesters,
        })
        .eq('id', editingCourse.id);
      setSaving(false);
      if (error) {
        showToast('error', error.message.includes('duplicate') ? 'Course ID already exists.' : 'Failed to update course.');
        return;
      }
      showToast('success', 'Course updated successfully.');
    } else {
      const { error } = await supabase.from('courses').insert({
        course_id: form.course_id,
        course_name: form.course_name,
        department: form.department,
        duration: form.duration,
        num_semesters: form.num_semesters,
      });
      setSaving(false);
      if (error) {
        showToast('error', error.message.includes('duplicate') ? 'Course ID already exists.' : 'Failed to add course.');
        return;
      }
      showToast('success', 'Course added successfully.');
    }
    setModalOpen(false);
    loadData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('courses').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    if (error) {
      showToast('error', 'Failed to delete course. It may have associated data.');
      return;
    }
    showToast('success', 'Course deleted successfully.');
    loadData();
  };

  if (loading) return <LoadingOverlay label="Loading courses..." />;

  return (
    <div className="p-4 lg:p-6 space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Course Management</h2>
          <p className="text-sm text-ink-500 mt-0.5">{courses.length} course{courses.length !== 1 ? 's' : ''} available</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Course
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="text"
            placeholder="Search by course name, ID, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<BookOpen className="w-8 h-8 text-ink-400" />}
            title={search ? 'No matching courses' : 'No courses yet'}
            description={search ? 'Try adjusting your search.' : 'Add your first course to get started.'}
            action={!search && <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" />Add Course</button>}
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-ink-50 border-b border-ink-200">
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider py-3 px-4">Course ID</th>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider py-3 px-4">Course Name</th>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider py-3 px-4 hidden md:table-cell">Department</th>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider py-3 px-4 hidden lg:table-cell">Duration</th>
                  <th className="text-center text-xs font-semibold text-ink-500 uppercase tracking-wider py-3 px-4 hidden sm:table-cell">Semesters</th>
                  <th className="text-center text-xs font-semibold text-ink-500 uppercase tracking-wider py-3 px-4 hidden lg:table-cell">Students</th>
                  <th className="text-right text-xs font-semibold text-ink-500 uppercase tracking-wider py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((course) => (
                  <tr key={course.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="text-sm font-mono font-medium text-primary-600">{course.course_id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-ink-800">{course.course_name}</p>
                      <p className="text-xs text-ink-500 md:hidden">{course.department}</p>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <p className="text-sm text-ink-600">{course.department}</p>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <span className="text-sm text-ink-600">{course.duration}</span>
                    </td>
                    <td className="py-3 px-4 text-center hidden sm:table-cell">
                      <span className="badge bg-accent-100 text-accent-700">{course.num_semesters} sem</span>
                    </td>
                    <td className="py-3 px-4 text-center hidden lg:table-cell">
                      <span className="text-sm font-medium text-ink-700">{studentCounts[course.id] || 0}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(course)}
                          className="p-2 text-ink-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(course)}
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
          <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full animate-slide-up">
            <div className="border-b border-ink-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-ink-900">{editingCourse ? 'Edit Course' : 'Add New Course'}</h3>
                <p className="text-sm text-ink-500">{editingCourse ? 'Update course information' : 'Create a new degree program'}</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-ink-400 hover:text-ink-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="label">Course ID <span className="text-error-500">*</span></label>
                <input
                  type="text"
                  value={form.course_id}
                  onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                  className="input"
                  placeholder="e.g. BCS101"
                />
              </div>
              <div>
                <label className="label">Course Name <span className="text-error-500">*</span></label>
                <input
                  type="text"
                  value={form.course_name}
                  onChange={(e) => setForm({ ...form, course_name: e.target.value })}
                  className="input"
                  placeholder="e.g. B.Tech Computer Science"
                />
              </div>
              <div>
                <label className="label">Department <span className="text-error-500">*</span></label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="input"
                  placeholder="e.g. Computer Science & Engineering"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Duration</label>
                  <input
                    type="text"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className="input"
                    placeholder="e.g. 4 Years"
                  />
                </div>
                <div>
                  <label className="label">Number of Semesters</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={form.num_semesters}
                    onChange={(e) => setForm({ ...form, num_semesters: Number(e.target.value) })}
                    className="input"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-ink-200 px-6 py-4 flex items-center justify-end gap-3">
              <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : editingCourse ? 'Update Course' : 'Add Course'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Course"
        message={`Are you sure you want to delete "${deleteTarget?.course_name}"? This will also delete all subjects associated with this course. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
