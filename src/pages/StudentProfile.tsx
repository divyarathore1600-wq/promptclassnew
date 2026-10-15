import { useEffect, useState } from 'react';
import {
  ArrowLeft, Pencil, Mail, Phone, Calendar, MapPin, User, IdCard,
  GraduationCap, BookOpen, Users, X, Save, TrendingUp, Award,
  ClipboardList, CheckCircle2, Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LoadingOverlay } from '@/components/Loading';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import {
  getGrade, getGradeColor, getAttendanceColor, getAttendanceBarColor,
  getAssignmentStatusColor, getInitials, formatDate,
} from '@/lib/utils';
import type { Student, Course, Subject, Attendance, Marks, Assignment } from '@/types';

interface StudentProfileProps {
  studentId: string;
  onBack: () => void;
}

type Tab = 'overview' | 'attendance' | 'marks' | 'subjects' | 'assignments';

interface ProfileData {
  student: Student & { course?: Course };
  subjects: Subject[];
  attendance: Attendance[];
  marks: Marks[];
  assignments: Assignment[];
}

export function StudentProfile({ studentId, onBack }: StudentProfileProps) {
  const { showToast } = useToast();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [editing, setEditing] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [editForm, setEditForm] = useState<Partial<Student>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [studentRes, coursesRes] = await Promise.all([
        supabase.from('students').select('*, course:courses(*)').eq('id', studentId).maybeSingle(),
        supabase.from('courses').select('*').order('course_name'),
      ]);

      if (!studentRes.data) {
        setLoading(false);
        return;
      }

      const student = studentRes.data as Student & { course?: Course };
      setCourses((coursesRes.data || []) as Course[]);

      // Get subjects for student's course + semester
      const subjectsRes = await supabase
        .from('subjects')
        .select('*, course:courses(*)')
        .eq('course_id', student.course_id)
        .eq('semester', student.semester)
        .order('subject_name');
      const subjects = (subjectsRes.data || []) as Subject[];

      // Get attendance, marks, assignments
      const [attRes, marksRes, assignRes] = await Promise.all([
        supabase.from('attendance').select('*, subject:subjects(*)').eq('student_id', studentId),
        supabase.from('marks').select('*, subject:subjects(*)').eq('student_id', studentId),
        supabase.from('assignments').select('*, subject:subjects(*)').eq('student_id', studentId).order('created_at', { ascending: false }),
      ]);

      setData({
        student,
        subjects,
        attendance: (attRes.data || []) as Attendance[],
        marks: (marksRes.data || []) as Marks[],
        assignments: (assignRes.data || []) as Assignment[],
      });
      setLoading(false);
    }
    load();
  }, [studentId]);

  const handleEdit = () => {
    if (!data) return;
    setEditForm({
      name: data.student.name,
      email: data.student.email,
      phone: data.student.phone || '',
      date_of_birth: data.student.date_of_birth || '',
      gender: data.student.gender || '',
      address: data.student.address || '',
      course_id: data.student.course_id || '',
      semester: data.student.semester,
      section: data.student.section || 'A',
      photo_url: data.student.photo_url || '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    const { error } = await supabase
      .from('students')
      .update({
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        date_of_birth: editForm.date_of_birth || null,
        gender: editForm.gender || null,
        address: editForm.address || null,
        course_id: editForm.course_id || null,
        semester: Number(editForm.semester) || 1,
        section: editForm.section || 'A',
        photo_url: editForm.photo_url || null,
      })
      .eq('id', studentId);

    setSaving(false);
    if (error) {
      showToast('error', 'Failed to update profile. Please try again.');
      return;
    }
    showToast('success', 'Student profile updated successfully.');
    setEditing(false);
    // Reload data
    setLoading(true);
    const studentRes = await supabase
      .from('students')
      .select('*, course:courses(*)')
      .eq('id', studentId)
      .maybeSingle();
    if (studentRes.data) {
      const subjectsRes = await supabase
        .from('subjects')
        .select('*, course:courses(*)')
        .eq('course_id', studentRes.data.course_id)
        .eq('semester', studentRes.data.semester)
        .order('subject_name');
      const [attRes, marksRes, assignRes] = await Promise.all([
        supabase.from('attendance').select('*, subject:subjects(*)').eq('student_id', studentId),
        supabase.from('marks').select('*, subject:subjects(*)').eq('student_id', studentId),
        supabase.from('assignments').select('*, subject:subjects(*)').eq('student_id', studentId).order('created_at', { ascending: false }),
      ]);
      setData({
        student: studentRes.data as Student & { course?: Course },
        subjects: (subjectsRes.data || []) as Subject[],
        attendance: (attRes.data || []) as Attendance[],
        marks: (marksRes.data || []) as Marks[],
        assignments: (assignRes.data || []) as Assignment[],
      });
    }
    setLoading(false);
  };

  if (loading) return <LoadingOverlay label="Loading student profile..." />;
  if (!data) {
    return (
      <div className="p-6">
        <div className="card">
          <EmptyState title="Student not found" description="This student may have been removed." />
        </div>
      </div>
    );
  }

  const { student, subjects, attendance, marks, assignments } = data;

  // Calculate overall percentage
  const totalObtained = marks.reduce(
    (sum, m) => sum + Number(m.internal_marks) + Number(m.assignment_marks) + Number(m.exam_marks), 0
  );
  const totalMax = marks.reduce(
    (sum, m) => sum + Number(m.max_internal) + Number(m.max_assignment) + Number(m.max_exam), 0
  );
  const overallPercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
  const overallGrade = getGrade(overallPercentage);

  // Overall attendance
  const totalClasses = attendance.reduce((sum, a) => sum + a.total_classes, 0);
  const totalAttended = attendance.reduce((sum, a) => sum + a.attended_classes, 0);
  const overallAttendance = totalClasses > 0 ? (totalAttended / totalClasses) * 100 : 0;

  const tabs: { key: Tab; label: string; icon: typeof User }[] = [
    { key: 'overview', label: 'Overview', icon: User },
    { key: 'attendance', label: 'Attendance', icon: Calendar },
    { key: 'marks', label: 'Marks', icon: Award },
    { key: 'subjects', label: 'Subjects', icon: BookOpen },
    { key: 'assignments', label: 'Assignments', icon: ClipboardList },
  ];

  const infoItems = [
    { icon: IdCard, label: 'Student ID', value: student.student_id },
    { icon: IdCard, label: 'Enrollment No.', value: student.enrollment_number },
    { icon: Mail, label: 'Email', value: student.email },
    { icon: Phone, label: 'Phone', value: student.phone || '—' },
    { icon: Calendar, label: 'Date of Birth', value: formatDate(student.date_of_birth) },
    { icon: User, label: 'Gender', value: student.gender || '—' },
    { icon: MapPin, label: 'Address', value: student.address || '—' },
    { icon: GraduationCap, label: 'Course', value: student.course?.course_name || '—' },
    { icon: BookOpen, label: 'Semester', value: `Semester ${student.semester}` },
    { icon: Users, label: 'Section', value: student.section || '—' },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-600 hover:text-ink-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Students
      </button>

      {/* Profile header card */}
      <div className="card overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary-700 via-primary-600 to-accent-600" />
        <div className="px-5 lg:px-6 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            {student.photo_url ? (
              <img
                src={student.photo_url}
                alt={student.name}
                className="w-24 h-24 rounded-xl object-cover border-4 border-white shadow-md flex-shrink-0"
              />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-md flex-shrink-0">
                {getInitials(student.name)}
              </div>
            )}
            <div className="flex-1 pt-2">
              <h2 className="text-xl font-bold text-ink-900">{student.name}</h2>
              <p className="text-sm text-ink-500">{student.course?.course_name || 'No course assigned'}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="badge bg-primary-100 text-primary-700">{student.student_id}</span>
                <span className="badge bg-ink-100 text-ink-600">Sem {student.semester}</span>
                <span className="badge bg-ink-100 text-ink-600">Sec {student.section}</span>
                <span className={`badge ${getGradeColor(overallPercentage)}`}>Grade {overallGrade}</span>
              </div>
            </div>
            <button onClick={handleEdit} className="btn-primary self-start sm:self-end">
              <Pencil className="w-4 h-4" />
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="flex items-center gap-1 px-4 border-b border-ink-200 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.key ? 'tab-active' : 'tab-inactive'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-5">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              {/* Quick stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-lg bg-primary-50 p-4 border border-primary-100">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-primary-600" />
                    <p className="text-xs font-semibold text-primary-700 uppercase tracking-wider">Overall</p>
                  </div>
                  <p className="text-2xl font-bold text-ink-900">{overallPercentage.toFixed(1)}%</p>
                  <span className={`badge mt-1 ${getGradeColor(overallPercentage)}`}>Grade {overallGrade}</span>
                </div>
                <div className="rounded-lg bg-success-50 p-4 border border-success-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-success-600" />
                    <p className="text-xs font-semibold text-success-700 uppercase tracking-wider">Attendance</p>
                  </div>
                  <p className="text-2xl font-bold text-ink-900">{overallAttendance.toFixed(1)}%</p>
                  <span className={`badge mt-1 ${getAttendanceColor(overallAttendance)}`}>
                    {totalAttended}/{totalClasses} classes
                  </span>
                </div>
                <div className="rounded-lg bg-accent-50 p-4 border border-accent-100">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-accent-600" />
                    <p className="text-xs font-semibold text-accent-700 uppercase tracking-wider">Subjects</p>
                  </div>
                  <p className="text-2xl font-bold text-ink-900">{subjects.length}</p>
                  <p className="text-xs text-ink-500 mt-1">Enrolled this semester</p>
                </div>
                <div className="rounded-lg bg-warning-50 p-4 border border-warning-100">
                  <div className="flex items-center gap-2 mb-1">
                    <ClipboardList className="w-4 h-4 text-warning-600" />
                    <p className="text-xs font-semibold text-warning-700 uppercase tracking-wider">Assignments</p>
                  </div>
                  <p className="text-2xl font-bold text-ink-900">{assignments.length}</p>
                  <p className="text-xs text-ink-500 mt-1">
                    {assignments.filter((a) => a.status === 'submitted').length} submitted
                  </p>
                </div>
              </div>

              {/* Student Information */}
              <div>
                <h3 className="text-base font-semibold text-ink-900 mb-3">Student Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  {infoItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-ink-100 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-ink-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-ink-500 uppercase tracking-wider">{item.label}</p>
                          <p className="text-sm text-ink-800 font-medium mt-0.5">{item.value}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div className="animate-fade-in">
              {attendance.length === 0 ? (
                <EmptyState title="No attendance records" description="Attendance data will appear here once recorded." />
              ) : (
                <div className="space-y-4">
                  {/* Overall attendance bar */}
                  <div className="rounded-lg bg-ink-50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-ink-700">Overall Attendance</p>
                      <span className={`badge ${getAttendanceColor(overallAttendance)}`}>
                        {overallAttendance.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-3 bg-ink-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getAttendanceBarColor(overallAttendance)} rounded-full transition-all duration-500`}
                        style={{ width: `${overallAttendance}%` }}
                      />
                    </div>
                  </div>

                  {/* Per-subject attendance */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-ink-200">
                          <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider py-2 px-3">Subject</th>
                          <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider py-2 px-3 hidden sm:table-cell">Code</th>
                          <th className="text-center text-xs font-semibold text-ink-500 uppercase tracking-wider py-2 px-3">Attended</th>
                          <th className="text-center text-xs font-semibold text-ink-500 uppercase tracking-wider py-2 px-3 hidden sm:table-cell">Total</th>
                          <th className="text-right text-xs font-semibold text-ink-500 uppercase tracking-wider py-2 px-3">Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendance.map((att) => {
                          const pct = att.total_classes > 0 ? (att.attended_classes / att.total_classes) * 100 : 0;
                          return (
                            <tr key={att.id} className="border-b border-ink-100 last:border-0">
                              <td className="py-3 px-3">
                                <p className="text-sm font-medium text-ink-800">{att.subject?.subject_name || '—'}</p>
                              </td>
                              <td className="py-3 px-3 hidden sm:table-cell">
                                <span className="text-xs font-mono text-ink-500">{att.subject?.subject_code}</span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="text-sm text-ink-700 font-medium">{att.attended_classes}</span>
                              </td>
                              <td className="py-3 px-3 text-center hidden sm:table-cell">
                                <span className="text-sm text-ink-500">{att.total_classes}</span>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-20 h-2 bg-ink-200 rounded-full overflow-hidden hidden sm:block">
                                    <div
                                      className={`h-full ${getAttendanceBarColor(pct)} rounded-full`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className={`badge ${getAttendanceColor(pct)} flex-shrink-0`}>
                                    {pct.toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Marks Tab */}
          {activeTab === 'marks' && (
            <div className="animate-fade-in">
              {marks.length === 0 ? (
                <EmptyState title="No marks recorded" description="Internal, assignment, and exam marks will appear here." />
              ) : (
                <div className="space-y-4">
                  {/* Overall summary */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-ink-50 p-3 text-center">
                      <p className="text-xs text-ink-500 font-medium">Internal Marks</p>
                      <p className="text-lg font-bold text-ink-900 mt-1">
                        {marks.reduce((s, m) => s + Number(m.internal_marks), 0)}
                        <span className="text-sm text-ink-400">/{marks.reduce((s, m) => s + Number(m.max_internal), 0)}</span>
                      </p>
                    </div>
                    <div className="rounded-lg bg-ink-50 p-3 text-center">
                      <p className="text-xs text-ink-500 font-medium">Assignment Marks</p>
                      <p className="text-lg font-bold text-ink-900 mt-1">
                        {marks.reduce((s, m) => s + Number(m.assignment_marks), 0)}
                        <span className="text-sm text-ink-400">/{marks.reduce((s, m) => s + Number(m.max_assignment), 0)}</span>
                      </p>
                    </div>
                    <div className="rounded-lg bg-ink-50 p-3 text-center">
                      <p className="text-xs text-ink-500 font-medium">Exam Marks</p>
                      <p className="text-lg font-bold text-ink-900 mt-1">
                        {marks.reduce((s, m) => s + Number(m.exam_marks), 0)}
                        <span className="text-sm text-ink-400">/{marks.reduce((s, m) => s + Number(m.max_exam), 0)}</span>
                      </p>
                    </div>
                    <div className="rounded-lg bg-primary-50 p-3 text-center border border-primary-100">
                      <p className="text-xs text-primary-700 font-medium">Overall</p>
                      <p className="text-lg font-bold text-primary-700 mt-1">{overallPercentage.toFixed(1)}%</p>
                      <span className={`badge mt-0.5 ${getGradeColor(overallPercentage)}`}>{overallGrade}</span>
                    </div>
                  </div>

                  {/* Per-subject marks table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-ink-200">
                          <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider py-2 px-3">Subject</th>
                          <th className="text-center text-xs font-semibold text-ink-500 uppercase tracking-wider py-2 px-3">Internal</th>
                          <th className="text-center text-xs font-semibold text-ink-500 uppercase tracking-wider py-2 px-3">Assignment</th>
                          <th className="text-center text-xs font-semibold text-ink-500 uppercase tracking-wider py-2 px-3">Exam</th>
                          <th className="text-center text-xs font-semibold text-ink-500 uppercase tracking-wider py-2 px-3 hidden sm:table-cell">Total</th>
                          <th className="text-right text-xs font-semibold text-ink-500 uppercase tracking-wider py-2 px-3">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {marks.map((mark) => {
                          const total = Number(mark.internal_marks) + Number(mark.assignment_marks) + Number(mark.exam_marks);
                          const max = Number(mark.max_internal) + Number(mark.max_assignment) + Number(mark.max_exam);
                          const pct = max > 0 ? (total / max) * 100 : 0;
                          return (
                            <tr key={mark.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/50">
                              <td className="py-3 px-3">
                                <p className="text-sm font-medium text-ink-800">{mark.subject?.subject_name}</p>
                                <p className="text-xs font-mono text-ink-500">{mark.subject?.subject_code}</p>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="text-sm text-ink-700">{mark.internal_marks}</span>
                                <span className="text-xs text-ink-400">/{mark.max_internal}</span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="text-sm text-ink-700">{mark.assignment_marks}</span>
                                <span className="text-xs text-ink-400">/{mark.max_assignment}</span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="text-sm text-ink-700">{mark.exam_marks}</span>
                                <span className="text-xs text-ink-400">/{mark.max_exam}</span>
                              </td>
                              <td className="py-3 px-3 text-center hidden sm:table-cell">
                                <span className="text-sm font-semibold text-ink-800">{total}</span>
                                <span className="text-xs text-ink-400">/{max}</span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className={`badge ${getGradeColor(pct)}`}>{pct.toFixed(1)}%</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Subjects Tab */}
          {activeTab === 'subjects' && (
            <div className="animate-fade-in">
              {subjects.length === 0 ? (
                <EmptyState title="No subjects enrolled" description="Subjects for this student's course and semester will appear here." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjects.map((subject) => (
                    <div key={subject.id} className="rounded-lg border border-ink-200 p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-primary-600" />
                        </div>
                        <span className="badge bg-ink-100 text-ink-600">{subject.credits} Credits</span>
                      </div>
                      <p className="text-sm font-semibold text-ink-800 mt-2">{subject.subject_name}</p>
                      <p className="text-xs font-mono text-ink-500 mt-0.5">{subject.subject_code}</p>
                      <div className="mt-3 pt-3 border-t border-ink-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-accent-50 flex items-center justify-center flex-shrink-0">
                            <User className="w-3.5 h-3.5 text-accent-600" />
                          </div>
                          <p className="text-xs text-ink-600">{subject.faculty}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Assignments Tab */}
          {activeTab === 'assignments' && (
            <div className="animate-fade-in">
              {assignments.length === 0 ? (
                <EmptyState title="No assignments" description="Assignment records will appear here once added." />
              ) : (
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center gap-4 rounded-lg border border-ink-200 p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        assignment.status === 'submitted' ? 'bg-primary-50' :
                        assignment.status === 'graded' ? 'bg-success-50' : 'bg-warning-50'
                      }`}>
                        {assignment.status === 'submitted' ? <CheckCircle2 className="w-5 h-5 text-primary-600" /> :
                         assignment.status === 'graded' ? <Award className="w-5 h-5 text-success-600" /> :
                         <Clock className="w-5 h-5 text-warning-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink-800 truncate">{assignment.title}</p>
                        <p className="text-xs text-ink-500 mt-0.5">
                          {assignment.subject?.subject_name} · {assignment.subject?.subject_code}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {assignment.marks_obtained !== null && (
                          <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold text-ink-800">
                              {assignment.marks_obtained}/{assignment.max_marks}
                            </p>
                          </div>
                        )}
                        <span className={`badge ${getAssignmentStatusColor(assignment.status)}`}>
                          {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setEditing(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-white border-b border-ink-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg font-semibold text-ink-900">Edit Student Profile</h3>
                <p className="text-sm text-ink-500">Update student information</p>
              </div>
              <button onClick={() => setEditing(false)} className="text-ink-400 hover:text-ink-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name</label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="text"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Date of Birth</label>
                  <input
                    type="date"
                    value={editForm.date_of_birth || ''}
                    onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Gender</label>
                  <select
                    value={editForm.gender || ''}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    className="input"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Photo URL</label>
                  <input
                    type="text"
                    value={editForm.photo_url || ''}
                    onChange={(e) => setEditForm({ ...editForm, photo_url: e.target.value })}
                    className="input"
                    placeholder="https://..."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Address</label>
                  <textarea
                    value={editForm.address || ''}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="input"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="label">Course</label>
                  <select
                    value={editForm.course_id || ''}
                    onChange={(e) => setEditForm({ ...editForm, course_id: e.target.value })}
                    className="input"
                  >
                    <option value="">Select course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.course_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Semester</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={editForm.semester || 1}
                    onChange={(e) => setEditForm({ ...editForm, semester: Number(e.target.value) })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Section</label>
                  <select
                    value={editForm.section || 'A'}
                    onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
                    className="input"
                  >
                    {['A', 'B', 'C', 'D'].map((s) => (
                      <option key={s} value={s}>Section {s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-ink-200 px-6 py-4 flex items-center justify-end gap-3">
              <button className="btn-secondary" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
