import React, { useEffect, useState, useCallback } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select } from '../../components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import api from '../../lib/axios';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  BookOpen,
  Tag,
  Loader2,
  FolderOpen,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface Subject {
  id: number;
  name: string;
  code: string;
  category: string | null;
  description: string | null;
  subject_matters_count: number;
  created_at: string;
  updated_at: string;
}

const SubjectList: React.FC = () => {
  // State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    category: '',
    description: '',
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch subjects
  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterCategory) params.category = filterCategory;

      const res = await api.get('/subjects', { params });
      setSubjects(res.data.data || []);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterCategory]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/subjects/categories');
      setCategories(res.data.data || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // Open add dialog
  const openAddDialog = () => {
    setEditingSubject(null);
    setForm({ name: '', code: '', category: '', description: '' });
    setShowDialog(true);
  };

  // Open edit dialog
  const openEditDialog = (subject: Subject) => {
    setEditingSubject(subject);
    setForm({
      name: subject.name,
      code: subject.code,
      category: subject.category || '',
      description: subject.description || '',
    });
    setShowDialog(true);
  };

  // Save (create or update)
  const handleSave = async () => {
    if (!form.name || !form.code) {
      toast.error('Name and code are required.');
      return;
    }

    setSaving(true);
    try {
      if (editingSubject) {
        await api.put(`/subjects/${editingSubject.id}`, form);
        toast.success('Subject updated successfully!');
      } else {
        await api.post('/subjects', form);
        toast.success('Subject created successfully!');
      }
      setShowDialog(false);
      fetchSubjects();
      fetchCategories();
    } catch (error: any) {
      if (!error.response || ![422].includes(error.response.status)) {
        toast.error('Failed to save subject.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async (subject: Subject) => {
    if (subject.subject_matters_count > 0) {
      toast.error(`Cannot delete "${subject.name}" — it has ${subject.subject_matters_count} material(s) linked.`);
      return;
    }
    if (!confirm(`Delete subject "${subject.name}" (${subject.code})?`)) return;

    try {
      await api.delete(`/subjects/${subject.id}`);
      toast.success('Subject deleted successfully.');
      fetchSubjects();
      fetchCategories();
    } catch (error: any) {
      if (error.response?.status === 422) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to delete subject.');
      }
    }
  };

  // Group subjects by category
  const groupedSubjects = subjects.reduce<Record<string, Subject[]>>((acc, subject) => {
    const cat = subject.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(subject);
    return acc;
  }, {});

  const categoryKeys = Object.keys(groupedSubjects).sort((a, b) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });

  return (
    <>
      <Header title="Subjects" description="Manage subjects and categories" />
      <div className="page-container">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{subjects.length}</p>
                <p className="text-xs text-gray-500">Total Subjects</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600">
                <FolderOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{categories.length}</p>
                <p className="text-xs text-gray-500">Categories</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {subjects.reduce((sum, s) => sum + s.subject_matters_count, 0)}
                </p>
                <p className="text-xs text-gray-500">Total Materials</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search subjects..."
                  className="pl-9"
                />
              </div>
              <Select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                options={[
                  { value: '', label: 'All Categories' },
                  ...categories.map((c) => ({ value: c, label: c })),
                ]}
              />
              <Button onClick={openAddDialog}>
                <Plus className="h-4 w-4" />
                Add Subject
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subject List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : subjects.length === 0 ? (
          <Card>
            <CardContent className="py-16">
              <div className="flex flex-col items-center justify-center text-gray-400">
                <BookOpen className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-lg font-medium">No subjects found</p>
                <p className="text-sm mt-1">Add your first subject to get started.</p>
                <Button className="mt-4" onClick={openAddDialog}>
                  <Plus className="h-4 w-4" />
                  Add Subject
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {categoryKeys.map((category) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary-500" />
                    {category}
                    <Badge variant="secondary" className="ml-2">{groupedSubjects[category].length}</Badge>
                  </CardTitle>
                </CardHeader>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Materials</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedSubjects[category].map((subject) => (
                      <TableRow key={subject.id}>
                        <TableCell>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{subject.name}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">{subject.code}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                            {subject.description || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={subject.subject_matters_count > 0 ? 'default' : 'secondary'}>
                            {subject.subject_matters_count} materials
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(subject)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(subject)}>
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={() => setShowDialog(false)}>
          <DialogContent onClose={() => setShowDialog(false)}>
            <DialogHeader>
              <DialogTitle>{editingSubject ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Matematika"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Code <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., MTK"
                  maxLength={20}
                />
                <p className="text-xs text-gray-400">Unique short code for the subject</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g., Science, Language, Mathematics"
                  list="category-suggestions"
                />
                <datalist id="category-suggestions">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <p className="text-xs text-gray-400">Type a new category or select existing one</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the subject..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSave} isLoading={saving} disabled={!form.name || !form.code}>
                {editingSubject ? 'Save Changes' : 'Add Subject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default SubjectList;
