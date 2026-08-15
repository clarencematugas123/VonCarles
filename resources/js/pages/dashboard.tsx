import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { db, firebaseIsConfigured } from '@/lib/firebase';
import { dashboard } from '@/routes';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
} from 'firebase/firestore';

type Student = {
    id: string;
    name: string;
    studentId: string;
    course: string;
    year: string;
    grade: string;
    email: string;
    createdAt?: { seconds: number } | Date | null;
};

const STORAGE_KEY = 'mini-student-record-demo';

const readLocalStudents = (): Student[] => {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as Student[]) : [];
    } catch {
        return [];
    }
};

const writeLocalStudents = (students: Student[]) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
};

const emptyForm = {
    name: '',
    studentId: '',
    course: '',
    year: '',
    grade: '',
    email: '',
};

export default function Dashboard() {
    const [students, setStudents] = useState<Student[]>([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!db) {
            setStudents(readLocalStudents());
            setLoading(false);
            return;
        }

        const studentsRef = collection(db, 'students');
        const q = query(studentsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const nextStudents = snapshot.docs.map((docSnap) => ({
                    id: docSnap.id,
                    ...(docSnap.data() as Omit<Student, 'id'>),
                }));
                setStudents(nextStudents);
                setLoading(false);
                setError(null);
            },
            () => {
                setError('Unable to connect to the Firestore database.');
                setLoading(false);
            },
        );

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!db) {
            writeLocalStudents(students);
        }
    }, [students]);

    const handleChange = (field: keyof typeof emptyForm, value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const resetForm = () => {
        setForm(emptyForm);
        setEditingId(null);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const trimmed = {
            name: form.name.trim(),
            studentId: form.studentId.trim(),
            course: form.course.trim(),
            year: form.year.trim(),
            grade: form.grade.trim(),
            email: form.email.trim(),
        };

        if (!trimmed.name || !trimmed.studentId || !trimmed.course || !trimmed.year || !trimmed.grade) {
            setError('Please complete all required fields before saving.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const payload = {
                ...trimmed,
                createdAt: new Date(),
            };

            if (!db) {
                const nextStudents = editingId
                    ? students.map((student) => (student.id === editingId ? { ...student, ...trimmed } : student))
                    : [
                          {
                              id: `${Date.now()}`,
                              ...payload,
                          },
                          ...students,
                      ];

                setStudents(nextStudents);
                resetForm();
                setSaving(false);
                return;
            }

            if (editingId) {
                await updateDoc(doc(db, 'students', editingId), payload);
            } else {
                await addDoc(collection(db, 'students'), payload);
            }

            resetForm();
        } catch (submitError) {
            setError('Could not save the student record. Please check your Firestore setup.');
            console.error(submitError);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (student: Student) => {
        setEditingId(student.id);
        setForm({
            name: student.name ?? '',
            studentId: student.studentId ?? '',
            course: student.course ?? '',
            year: student.year ?? '',
            grade: student.grade ?? '',
            email: student.email ?? '',
        });
    };

    const handleDelete = async (id: string) => {
        try {
            if (!db) {
                const nextStudents = students.filter((student) => student.id !== id);
                setStudents(nextStudents);
                if (editingId === id) {
                    resetForm();
                }
                return;
            }

            await deleteDoc(doc(db, 'students', id));
            if (editingId === id) {
                resetForm();
            }
        } catch (deleteError) {
            setError('Could not delete the student record.');
            console.error(deleteError);
        }
    };

    const connectionStatus = firebaseIsConfigured ? 'Connected to Firestore' : 'Firebase config missing';

    return (
        <>
            <Head title="Student Record" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4 md:p-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">VonCarles</p>
                        <h1 className="text-3xl font-bold">Mini Student Record</h1>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-sm font-medium">
                        {connectionStatus}
                    </span>
                </div>

                <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
                    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h2 className="text-xl font-semibold">{editingId ? 'Update Student' : 'Add Student'}</h2>
                            {editingId && (
                                <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                                    Cancel
                                </Button>
                            )}
                        </div>

                        <div className="grid gap-4">
                            <label className="grid gap-2 text-sm font-medium">
                                Student Name
                                <input
                                    value={form.name}
                                    onChange={(event) => handleChange('name', event.target.value)}
                                    className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-ring"
                                    placeholder="Maria Santos"
                                />
                            </label>

                            <label className="grid gap-2 text-sm font-medium">
                                Student ID
                                <input
                                    value={form.studentId}
                                    onChange={(event) => handleChange('studentId', event.target.value)}
                                    className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-ring"
                                    placeholder="2025-001"
                                />
                            </label>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="grid gap-2 text-sm font-medium">
                                    Course
                                    <input
                                        value={form.course}
                                        onChange={(event) => handleChange('course', event.target.value)}
                                        className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-ring"
                                        placeholder="BSIT"
                                    />
                                </label>

                                <label className="grid gap-2 text-sm font-medium">
                                    Year Level
                                    <input
                                        value={form.year}
                                        onChange={(event) => handleChange('year', event.target.value)}
                                        className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-ring"
                                        placeholder="3rd Year"
                                    />
                                </label>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="grid gap-2 text-sm font-medium">
                                    GPA
                                    <input
                                        value={form.grade}
                                        onChange={(event) => handleChange('grade', event.target.value)}
                                        className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-ring"
                                        placeholder="1.78"
                                    />
                                </label>

                                <label className="grid gap-2 text-sm font-medium">
                                    Email
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(event) => handleChange('email', event.target.value)}
                                        className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-ring"
                                        placeholder="student@mail.com"
                                    />
                                </label>
                            </div>
                        </div>

                        {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

                        <Button type="submit" className="mt-5 w-full" disabled={saving}>
                            {saving ? (
                                <span className="inline-flex items-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    Saving...
                                </span>
                            ) : (
                                editingId ? 'Update Record' : 'Add Student'
                            )}
                        </Button>
                    </form>

                    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h2 className="text-xl font-semibold">Student List</h2>
                            <span className="text-sm text-muted-foreground">{students.length} record(s)</span>
                        </div>

                        {!db && (
                            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                Firebase is not configured, so these records are stored in your browser for demo use only.
                            </div>
                        )}

                        {loading ? (
                            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
                                {db ? 'Loading records from Firestore...' : 'Loading saved student records...'}
                            </div>
                        ) : students.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
                                No students yet. Add the first record using the form.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {students.map((student) => (
                                    <div key={student.id} className="rounded-xl border border-border bg-background p-4">
                                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                            <div>
                                                <h3 className="text-lg font-semibold">{student.name}</h3>
                                                <p className="text-sm text-muted-foreground">ID: {student.studentId}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button type="button" variant="outline" size="sm" onClick={() => handleEdit(student)}>
                                                    Edit
                                                </Button>
                                                <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(student.id)}>
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                                            <span>Course: {student.course}</span>
                                            <span>Year: {student.year}</span>
                                            <span>Grade: {student.grade}</span>
                                            <span>Email: {student.email || '—'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
