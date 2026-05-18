import React, { useEffect, useState, useCallback } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { CardGridSkeleton } from '../../components/skeletons';
import api from '../../lib/axios';
import { formatDate } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import toast from 'react-hot-toast';
import type { SubjectMatter, Subject } from '../../types';
import {
  Upload,
  Download,
  Trash2,
  Pencil,
  FileText,
  FileSpreadsheet,
  FileImage,
  Film,
  File,
  Search,
  Loader2,
  BookOpen,
  Plus,
  X,
  Eye,
  GraduationCap,
  Tag,
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const getFileIcon = (fileType: string) => {
  if (fileType.includes('pdf') || fileType.includes('word') || fileType.includes('document')) {
    return <FileText className="h-8 w-8 text-red-500" />;
  }
  if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('sheet')) {
    return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
  }
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) {
    return <FileText className="h-8 w-8 text-orange-500" />;
  }
  if (fileType.includes('image')) {
    return <FileImage className="h-8 w-8 text-purple-500" />;
  }
  if (fileType.includes('video')) {
    return <Film className="h-8 w-8 text-blue-500" />;
  }
  return <File className="h-8 w-8 text-gray-500" />;
};

const getFileExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toUpperCase() || '';
};

const isPreviewable = (fileType: string): boolean => {
  return (
    fileType.includes('pdf') ||
    fileType.includes('image') ||
    fileType.includes('video')
  );
};

// ─── Component ──────────────────────────────────────────────────────────────────

const Library: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const { t } = useTranslation();

  // Data
  const [materials, setMaterials] = useState<SubjectMatter[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradeLevels, setGradeLevels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterGradeLevel, setFilterGradeLevel] = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState('');

  // Upload dialog
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    grade_level: '',
    subject_id: '',
    file: null as File | null,
  });

  // Edit dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<SubjectMatter | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    grade_level: '',
    subject_id: '',
    file: null as File | null,
  });
  const [saving, setSaving] = useState(false);

  // Preview dialog
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState<SubjectMatter | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // ─── Debounced search ───────────────────────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ─── Fetch data ─────────────────────────────────────────────────────────────

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterGradeLevel) params.grade_level = filterGradeLevel;
      if (filterSubjectId) params.subject_id = filterSubjectId;

      const res = await api.get('/library', { params });
      setMaterials(res.data.data || []);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterGradeLevel, filterSubjectId]);

  const fetchGradeLevels = useCallback(async () => {
    try {
      const res = await api.get('/library/grade-levels');
      setGradeLevels(res.data.data || []);
    } catch {
      // ignore
    }
  }, []);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await api.get('/subjects');
      setSubjects(res.data.data || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  useEffect(() => {
    fetchGradeLevels();
    fetchSubjects();
  }, [fetchGradeLevels, fetchSubjects]);

  // ─── Upload ─────────────────────────────────────────────────────────────────

  const resetUploadForm = () => {
    setUploadForm({
      title: '',
      description: '',
      grade_level: '',
      subject_id: '',
      file: null,
    });
  };

  const openUploadDialog = () => {
    resetUploadForm();
    setShowUploadDialog(true);
  };

  const handleUpload = async () => {
    if (!uploadForm.title || !uploadForm.file || !uploadForm.grade_level || !uploadForm.subject_id) {
      toast.error('Title, grade level, subject, and file are required.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      formData.append('grade_level', uploadForm.grade_level);
      formData.append('subject_id', uploadForm.subject_id);
      formData.append('file', uploadForm.file);

      await api.post('/library', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Material uploaded successfully!');
      setShowUploadDialog(false);
      resetUploadForm();
      fetchMaterials();
      fetchGradeLevels(); // refresh grade levels in case a new one was added
    } catch (error: any) {
      if (!error.response || ![403, 422].includes(error.response.status)) {
        toast.error('Failed to upload material.');
      }
    } finally {
      setUploading(false);
    }
  };

  // ─── Edit ───────────────────────────────────────────────────────────────────

  const openEditDialog = (material: SubjectMatter) => {
    setEditingMaterial(material);
    setEditForm({
      title: material.title,
      description: material.description || '',
      grade_level: material.grade_level || '',
      subject_id: material.subject_id ? String(material.subject_id) : '',
      file: null,
    });
    setShowEditDialog(true);
  };

  const handleEdit = async () => {
    if (!editingMaterial || !editForm.title || !editForm.grade_level || !editForm.subject_id) {
      toast.error('Title, grade level, and subject are required.');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', editForm.title);
      formData.append('description', editForm.description);
      formData.append('grade_level', editForm.grade_level);
      formData.append('subject_id', editForm.subject_id);
      if (editForm.file) {
        formData.append('file', editForm.file);
      }

      await api.post(`/library/${editingMaterial.id}/update`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Material updated successfully!');
      setShowEditDialog(false);
      setEditingMaterial(null);
      fetchMaterials();
      fetchGradeLevels();
    } catch (error: any) {
      if (!error.response || ![403, 422].includes(error.response.status)) {
        toast.error('Failed to update material.');
      }
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (material: SubjectMatter) => {
    if (!confirm(`Delete "${material.title}"? This action cannot be undone.`)) return;

    try {
      await api.delete(`/library/${material.id}`);
      toast.success('Material deleted successfully.');
      fetchMaterials();
    } catch {
      toast.error('Failed to delete material.');
    }
  };

  // ─── Download ───────────────────────────────────────────────────────────────

  const handleDownload = async (material: SubjectMatter) => {
    try {
      const response = await api.get(`/subject-matters/${material.id}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', material.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download file.');
    }
  };

  // ─── Preview ────────────────────────────────────────────────────────────────

  const handlePreview = async (material: SubjectMatter) => {
    setPreviewMaterial(material);
    setShowPreviewDialog(true);
    setPreviewLoading(true);

    try {
      const response = await api.get(`/subject-matters/${material.id}/preview`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: material.file_type });
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch {
      toast.error('Failed to load preview.');
      setShowPreviewDialog(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setShowPreviewDialog(false);
    setPreviewMaterial(null);
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  };

  // ─── Permissions ────────────────────────────────────────────────────────────

  const canModify = (material: SubjectMatter): boolean => {
    if (isAdmin) return true;
    return false;
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Header title={t.library.title} description={t.library.subtitle} />

      <div className="page-container">
        {/* Filters Bar */}
        <Card>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search - spans 2 cols on md+ */}
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.library.searchMaterials}
                  className="pl-10"
                />
              </div>

              {/* Grade Level Filter */}
              <Select
                value={filterGradeLevel}
                onChange={(e) => setFilterGradeLevel(e.target.value)}
                options={[
                  { value: '', label: t.library.allGradeLevels },
                  ...gradeLevels.map((gl) => ({ value: gl, label: `${t.library.grade} ${gl}` })),
                ]}
              />

              {/* Subject Filter */}
              <Select
                value={filterSubjectId}
                onChange={(e) => setFilterSubjectId(e.target.value)}
                options={[
                  { value: '', label: t.library.allSubjects },
                  ...subjects.map((s) => ({ value: String(s.id), label: `${s.name} (${s.code})` })),
                ]}
              />

              {/* Upload Button (admin only) */}
              {isAdmin && (
                <div className="flex items-end md:col-span-2 lg:col-span-4">
                  <Button onClick={openUploadDialog} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4" />
                    {t.library.uploadMaterial}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Materials Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {t.subjects.materials} ({materials.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <CardGridSkeleton count={9} columns={2} />
            ) : materials.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <BookOpen className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-base font-medium mb-1">{t.library.noMaterials}</p>
                <p className="text-sm">
                  {debouncedSearch || filterGradeLevel || filterSubjectId
                    ? t.library.adjustFilters
                    : t.library.noMaterialsHint}
                </p>
                {isAdmin && !debouncedSearch && !filterGradeLevel && !filterSubjectId && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={openUploadDialog}>
                    <Upload className="h-4 w-4" />
                    {t.library.uploadFirst}
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {materials.map((material) => (
                  <div
                    key={material.id}
                    className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    {/* File Icon */}
                    <div className="shrink-0 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                      {getFileIcon(material.file_type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {material.title}
                          </h4>
                          {material.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                              {material.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Badges & Meta */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-400">
                        <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                          {getFileExtension(material.file_name)}
                        </span>
                        <span>{material.file_size_formatted}</span>
                        {material.grade_level && (
                          <Badge variant="default" className="text-xs py-0">
                            <GraduationCap className="h-3 w-3 mr-1" />
                            {t.library.grade} {material.grade_level}
                          </Badge>
                        )}
                        {material.subject && (
                          <Badge variant="outline" className="text-xs py-0">
                            <Tag className="h-3 w-3 mr-1" />
                            {material.subject.name}
                          </Badge>
                        )}
                        <span>by {material.uploader?.name || 'Unknown'}</span>
                        {material.created_at && <span>{formatDate(material.created_at)}</span>}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 mt-3">
                        {isPreviewable(material.file_type) && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handlePreview(material)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            {t.common.view}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(material)}
                        >
                          <Download className="h-3.5 w-3.5" />
                          {t.common.download}
                        </Button>
                        {canModify(material) && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(material)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(material)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-400" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Upload Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={showUploadDialog} onOpenChange={() => setShowUploadDialog(false)}>
        <DialogContent className="max-w-md" onClose={() => setShowUploadDialog(false)}>
          <DialogHeader>
            <DialogTitle>{t.library.uploadMaterial}</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.common.title} <span className="text-red-500">*</span>
              </label>
              <Input
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                placeholder="e.g., Chapter 1 - Introduction to Algebra"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.common.description}
              </label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Brief description of the material..."
                rows={3}
              />
            </div>

            {/* Grade Level */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.library.grade} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  value={uploadForm.grade_level}
                  onChange={(e) => setUploadForm({ ...uploadForm, grade_level: e.target.value })}
                  placeholder="e.g., 7, 8, 9, 10"
                  list="grade-level-options"
                />
                <datalist id="grade-level-options">
                  {gradeLevels.map((gl) => (
                    <option key={gl} value={gl} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.quizzes.subject} <span className="text-red-500">*</span>
              </label>
              <Select
                value={uploadForm.subject_id}
                onChange={(e) => setUploadForm({ ...uploadForm, subject_id: e.target.value })}
                options={[
                  { value: '', label: t.attendance.selectAClass },
                  ...subjects.map((s) => ({ value: String(s.id), label: `${s.name} (${s.code})` })),
                ]}
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                File <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                {uploadForm.file ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20">
                    <FileText className="h-5 w-5 text-primary-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {uploadForm.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => setUploadForm({ ...uploadForm, file: null })}
                      className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <X className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500 cursor-pointer transition-colors">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Click to select file
                    </span>
                    <span className="text-xs text-gray-400 mt-1">
                      PDF, DOC, PPT, XLS, JPG, PNG, MP4 (max 10MB)
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4,.avi,.webp,.svg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error('File size must be less than 10MB.');
                            return;
                          }
                          setUploadForm({ ...uploadForm, file });
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleUpload}
              isLoading={uploading}
              disabled={!uploadForm.title || !uploadForm.file || !uploadForm.grade_level || !uploadForm.subject_id}
            >
              <Upload className="h-4 w-4" />
              {t.library.uploadMaterial}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Dialog ───────────────────────────────────────────────────────── */}
      <Dialog open={showEditDialog} onOpenChange={() => setShowEditDialog(false)}>
        <DialogContent className="max-w-md" onClose={() => setShowEditDialog(false)}>
          <DialogHeader>
            <DialogTitle>{t.common.edit} {t.library.title}</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.common.title} <span className="text-red-500">*</span>
              </label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Material title"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.common.description}
              </label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Brief description..."
                rows={3}
              />
            </div>

            {/* Grade Level */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.library.grade} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  value={editForm.grade_level}
                  onChange={(e) => setEditForm({ ...editForm, grade_level: e.target.value })}
                  placeholder="e.g., 7, 8, 9, 10"
                  list="edit-grade-level-options"
                />
                <datalist id="edit-grade-level-options">
                  {gradeLevels.map((gl) => (
                    <option key={gl} value={gl} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.quizzes.subject} <span className="text-red-500">*</span>
              </label>
              <Select
                value={editForm.subject_id}
                onChange={(e) => setEditForm({ ...editForm, subject_id: e.target.value })}
                options={[
                  { value: '', label: t.attendance.selectAClass },
                  ...subjects.map((s) => ({ value: String(s.id), label: `${s.name} (${s.code})` })),
                ]}
              />
            </div>

            {/* Replace File (optional) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Replace File (optional)
              </label>
              {editForm.file ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20">
                  <FileText className="h-5 w-5 text-primary-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {editForm.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(editForm.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={() => setEditForm({ ...editForm, file: null })}
                    className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-gray-400 mb-2">
                    Current: {editingMaterial?.file_name} ({editingMaterial?.file_size_formatted})
                  </p>
                  <label className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-400 cursor-pointer transition-colors">
                    <Upload className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Click to replace file</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4,.avi,.webp,.svg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error('File size must be less than 10MB.');
                            return;
                          }
                          setEditForm({ ...editForm, file });
                        }
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleEdit}
              isLoading={saving}
              disabled={!editForm.title || !editForm.grade_level || !editForm.subject_id}
            >
              {t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Preview Dialog ────────────────────────────────────────────────────── */}
      <Dialog open={showPreviewDialog} onOpenChange={closePreview}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh]" onClose={closePreview}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8">
              <Eye className="h-5 w-5 text-primary-500" />
              <span className="truncate">{previewMaterial?.title}</span>
              {previewMaterial?.grade_level && (
                <Badge variant="default" className="ml-2 shrink-0">
                  {t.library.grade} {previewMaterial.grade_level}
                </Badge>
              )}
              {previewMaterial?.subject && (
                <Badge variant="outline" className="ml-1 shrink-0">
                  {previewMaterial.subject.name}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-6 pt-0" style={{ height: 'calc(90vh - 140px)' }}>
            {previewLoading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="h-10 w-10 animate-spin text-primary-500 mb-3" />
                <p className="text-sm text-gray-500">{t.common.loading}</p>
              </div>
            ) : previewUrl && previewMaterial ? (
              <>
                {previewMaterial.file_type.includes('pdf') && (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full rounded-lg border border-gray-200 dark:border-gray-700"
                    title={previewMaterial.title}
                  />
                )}
                {previewMaterial.file_type.includes('image') && (
                  <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 rounded-lg overflow-auto">
                    <img
                      src={previewUrl}
                      alt={previewMaterial.title}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
                {previewMaterial.file_type.includes('video') && (
                  <div className="flex items-center justify-center h-full bg-black rounded-lg">
                    <video
                      src={previewUrl}
                      controls
                      autoPlay
                      className="max-w-full max-h-full"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <FileText className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm">Unable to load preview</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <div className="flex items-center gap-2 w-full justify-between">
              <div className="text-xs text-gray-400">
                {previewMaterial?.file_name} • {previewMaterial?.file_size_formatted}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => previewMaterial && handleDownload(previewMaterial)}
                >
                  <Download className="h-4 w-4" />
                  {t.common.download}
                </Button>
                <Button variant="outline" onClick={closePreview}>
                  {t.common.close}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Library;
