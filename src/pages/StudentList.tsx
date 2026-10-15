import { useEffect, useState, useMemo } from 'react';
import { Search, Users, Eye, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LoadingOverlay } from '@/components/Loading';
import { EmptyState } from '@/components/EmptyState';
import { getInitials } from '@/lib/utils';
import type { Student, Course } from '@/types';

interface StudentListProps {
  onViewStudent: (id: string) => void;
}

type StudentWithCourse = Student & { course?: Course };

export function StudentList({ onViewStudent }: StudentListProps) {
  const [students, setStudents] = useState<StudentWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [courses, setCourses] = useState<Course[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    async function load() {
      const [studentsRes, coursesRes] = await Promise.all([
        supabase.from('students').select('*, course:courses(*)').order('name'),
        supabase.from('courses').select('*').order('course_name'),
      ]);
      setStudents((studentsRes.data || []) as StudentWithCourse[]);
      setCourses((coursesRes.data || []) as Course[]);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.student_id.toLowerCase().includes(search.toLowerCase()) ||
        s.enrollment_number.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase());
      const matchesCourse = courseFilter === 'all' || s.course_id === courseFilter;
      return matchesSearch && matchesCourse;
    });
  }, [students, search, courseFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (loading) return <LoadingOverlay label="Loading students..." />;

  return (
    <div className="p-4 lg:p-6 space-y-4 animate-fade-in">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Students</h2>
          <p className="text-sm text-ink-500 mt-0.5">{filtered.length} student{filtered.length !== 1 ? 's' : ''} enrolled</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="text"
            placeholder="Search by name, ID, enrollment, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input pl-9"
          />
        </div>
        <select
          value={courseFilter}
          onChange={(e) => {
            setCourseFilter(e.target.value);
            setPage(1);
          }}
          className="input sm:w-56"
        >
          <option value="all">All Courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.course_name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Users className="w-8 h-8 text-ink-400" />}
            title={search || courseFilter !== 'all' ? 'No matching students' : 'No students yet'}
            description={search || courseFilter !== 'all' ? 'Try adjusting your search or filter.' : 'Students will appear here once added.'}
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-ink-50 border-b border-ink-200">
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider py-3 px-4">Student</th>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider py-3 px-4 hidden md:table-cell">Student ID</th>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider py-3 px-4 hidden lg:table-cell">Course</th>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider py-3 px-4 hidden sm:table-cell">Semester</th>
                  <th className="text-right text-xs font-semibold text-ink-500 uppercase tracking-wider py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b border-ink-100 last:border-0 hover:bg-ink-50/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {student.photo_url ? (
                          <img
                            src={student.photo_url}
                            alt={student.name}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                            {getInitials(student.name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink-800 truncate">{student.name}</p>
                          <p className="text-xs text-ink-500 truncate">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <div>
                        <p className="text-sm text-ink-700 font-medium">{student.student_id}</p>
                        <p className="text-xs text-ink-500">{student.enrollment_number}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <p className="text-sm text-ink-600 truncate max-w-[200px]">{student.course?.course_name || '—'}</p>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <span className="badge bg-primary-100 text-primary-700">Sem {student.semester}</span>
                        <span className="badge bg-ink-100 text-ink-600">Sec {student.section}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onViewStudent(student.id)}
                        className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-ink-200">
              <p className="text-sm text-ink-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary btn-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary btn-sm"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
