import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import api from '../../lib/axios';
import { formatDate } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
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
  Shield,
  User as UserIcon,
} from 'lucide-react';

interface SubjectMatterTabProps {
  classId: number;
}

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
  const ext = fileName.split('.').pop()?.toUpperCase() || '';
  return ext;
};

const SubjectMatterTab: React.FC<SubjectMatterTabProps> = ({ classId }) => {
  const { isAdmin, isTeacher, user } = useAuth();
  const canUpload = isAdmin || isTeacher;

  const [materials, setMaterials] = useState<SubjectMatter[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Upload dialog state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    type: 'optional' as 'main' | 'optional',
    subject_id: '',
    file: null as File | null,
  });

  // Edit dialog state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<SubjectMatter | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    type: 'optional' as 'main' | 'optional',
    subject_id: '',
    file: null as File | null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterType) params.type = filterType;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await api.get(`/classes/${classId}/subject-matters`, { params });
      setMaterials(res.data.data || []);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [classId, filterType, debouncedSearch]);

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
    fetchSubjects();
  }, [fetchSubjects]);

  // Upload handler
  const handleUpload = async () => {
    if (!uploadForm.title || !uploadForm.file) {
      toast.error('Title and file are required.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      formData.append('type', uploadForm.type);
      formData.append('file', uploadForm.file);
      if (uploadForm.subject_id) {
        formData.append('subject_id', uploadForm.subject_id);
      }

      await api.post(`/classes/${classId}/subject-matters`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Material uploaded successfully!');
      setShowUploadDialog(false);
      resetUploadForm();
      fetchMaterials();
    } catch (error: any) {
      if (!error.response || ![403, 422].includes(error.response.status)) {
        toast.error('Failed to upload material.');
      }
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadForm({
      title: '',
      description: '',
      type: isAdmin ? 'main' : 'optional',
      subject_id: '',
      file: null,
    });
  };

  // Edit handler
  const openEditDialog = (material: SubjectMatter) => {
    setEditingMaterial(material);
    setEditForm({
      title: material.title,
      description: material.description || '',
      type: material.type,
      subject_id: material.subject_id ? String(material.subject_id) : '',
      file: null,
    });
    setShowEditDialog(true);
  };

  const handleEdit = async () => {
    if (!editingMaterial || !editForm.title) {
      toast.error('Title is required.');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', editForm.title);
      formData.append('description', editForm.description);
      formData.append('type', editForm.type);
      if (editForm.subject_id) {
        formData.append('subject_id', editForm.subject_id);
      }
      if (editForm.file) {
        formData.append('file', editForm.file);
      }

      await api.post(`/subject-matters/${editingMaterial.id}/update`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Material updated successfully!');
      setShowEditDialog(false);
      setEditingMaterial(null);
      fetchMaterials();
    } catch (error: any) {
      if (!error.response || ![403, 422].includes(error.response.status)) {
        toast.error('Failed to update material.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Delete handler
  const handleDelete = async (material: SubjectMatter) => {
    if (!confirm(`Delete "${material.title}"? This action cannot be undone.`)) return;

    try {
      await api.delete(`/subject-matters/${material.id}`);
      toast.success('Material deleted successfully.');
      fetchMaterials();
    } catch {
      toast.error('Failed to delete material.');
    }
  };

  // Download handler
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

  // Check if user can edit/delete a material
  const canModify = (material: SubjectMatter): boolean => {
    if (isAdmin) return true;
    if (isTeacher && material.uploaded_by === user?.id && material.type === 'optional') return true;
    return false;
  };

  const openUploadDialog = () => {
    resetUploadForm();
    setUploadForm(prev => ({
      ...prev,
      type: isAdmin ? 'main' : 'optional',
    }));
    setShowUploadDialog(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Subject Matters ({materials.length})
          </CardTitle>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search materials..."
                className="pl-9 w-full sm:w-48"
              />
            </div>
            {/* Filter */}
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              options={[
                { value: '', label: 'All Types' },
                { value: 'main', label: 'Main (Utama)' },
                { value: 'optional', label: 'Optional (Tambahan)' },
              ]}
            />
            {/* Upload Button */}
            {canUpload && (
              <Button size="sm" onClick={openUploadDialog}>
                <Plus className="h-4 w-4" />
                Upload
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            </div>
          ) : materials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <BookOpen className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">No subject matters yet</p>
              {canUpload && (
                <Button variant="outline" size="sm" className="mt-3" onClick={openUploadDialog}>
                  <Upload className="h-4 w-4" />
                  Upload First Material
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
                      <Badge variant={material.type === 'main' ? 'default' : 'secondary'}>
                        {material.type === 'main' ? (
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Main
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            Optional
                          </span>
                        )}
                      </Badge>
                    </div>

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-400">
                      <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        {getFileExtension(material.file_name)}
                      </span>
                      <span>{material.file_size_formatted}</span>
                      {material.subject && (
                        <Badge variant="outline" className="text-xs py-0">
                          {material.subject.name}
                        </Badge>
                      )}
                      <span>by {material.uploader?.name || 'Unknown'}</span>
                      {material.created_at && <span>{formatDate(material.created_at)}</span>}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(material)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
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

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={() => setShowUploadDialog(false)}>
        <DialogContent className="max-w-md" onClose={() => setShowUploadDialog(false)}>
          <DialogHeader>
            <DialogTitle>Upload Subject Matter</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                placeholder="e.g., Chapter 1 - Introduction"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Brief description of the material..."
                rows={3}
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Type <span className="text-red-500">*</span>
              </label>
              {isAdmin ? (
                <Select
                  value={uploadForm.type}
                  onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value as 'main' | 'optional' })}
                  options={[
                    { value: 'main', label: 'Main (Materi Utama) - Admin only' },
                    { value: 'optional', label: 'Optional (Materi Tambahan)' },
                  ]}
                />
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <UserIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Optional (Materi Tambahan)</span>
                </div>
              )}
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Subject (optional)
              </label>
              <Select
                value={uploadForm.subject_id}
                onChange={(e) => setUploadForm({ ...uploadForm, subject_id: e.target.value })}
                options={[
                  { value: '', label: 'No specific subject' },
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
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              isLoading={uploading}
              disabled={!uploadForm.title || !uploadForm.file}
            >
              <Upload className="h-4 w-4" />
              Upload Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={() => setShowEditDialog(false)}>
        <DialogContent className="max-w-md" onClose={() => setShowEditDialog(false)}>
          <DialogHeader>
            <DialogTitle>Edit Subject Matter</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Title <span className="text-red-500">*</span>
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
                Description
              </label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Brief description..."
                rows={3}
              />
            </div>

            {/* Type (admin only can change) */}
            {isAdmin && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                <Select
                  value={editForm.type}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value as 'main' | 'optional' })}
                  options={[
                    { value: 'main', label: 'Main (Materi Utama)' },
                    { value: 'optional', label: 'Optional (Materi Tambahan)' },
                  ]}
                />
              </div>
            )}

            {/* Subject */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Subject (optional)
              </label>
              <Select
                value={editForm.subject_id}
                onChange={(e) => setEditForm({ ...editForm, subject_id: e.target.value })}
                options={[
                  { value: '', label: 'No specific subject' },
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
              Cancel
            </Button>
            <Button onClick={handleEdit} isLoading={saving} disabled={!editForm.title}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubjectMatterTab;
