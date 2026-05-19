import React, { useState, useRef } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Avatar } from '../../components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { TableSkeleton } from '../../components/skeletons';
import { useTranslation } from '../../hooks/useTranslation';
import { useUsers, useSubjects } from '../../hooks/useApi';
import api from '../../lib/axios';
import toast from 'react-hot-toast';
import { formatDate } from '../../lib/utils';
import type { User } from '../../types';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Mail,
  Phone,
  Shield,
  Calendar,
  Loader2,
  FileX,
  AlertTriangle,
  Filter,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  BookOpen,
} from 'lucide-react';

const roleBadgeVariant: Record<string, 'destructive' | 'info' | 'success'> = {
  admin: 'destructive',
  teacher: 'info',
  student: 'success',
};

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface RoleCounts {
  total: number;
  admin: number;
  teacher: number;
  student: number;
}

const UserList: React.FC = () => {
  const { t } = useTranslation();
  
  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [joinedFrom, setJoinedFrom] = useState('');
  const [joinedTo, setJoinedTo] = useState('');
  const [page, setPage] = useState(1);

  // Debounce ref for search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // React Query hooks
  const { data: usersData, isLoading: loading, refetch: refetchUsers } = useUsers({ 
    page, 
    role: roleFilter, 
    subject_id: subjectFilter,
    search,
    joined_from: joinedFrom,
    joined_to: joinedTo,
  });
  const users = usersData?.data || [];
  const meta = usersData?.meta || { current_page: 1, last_page: 1, per_page: 15, total: 0 };
  const counts = usersData?.counts || { total: 0, admin: 0, teacher: 0, student: 0 };

  const { data: subjects = [] } = useSubjects();

  // CRUD state
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    phone: '',
    subject_ids: [] as number[],
  });

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= meta.last_page) {
      setPage(newPage);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setRoleFilter('');
    setSubjectFilter('');
    setJoinedFrom('');
    setJoinedTo('');
    setPage(1);
  };

  const hasActiveFilters = !!(search || roleFilter || subjectFilter || joinedFrom || joinedTo);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingUser) {
        const payload: Record<string, any> = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          phone: formData.phone,
        };
        if (formData.password) payload.password = formData.password;
        if (formData.role === 'teacher') {
          payload.subject_ids = formData.subject_ids.filter((id: number) => id !== 0);
        }
        await api.put(`/users/${editingUser.id}`, payload);
        toast.success('User updated successfully');
      } else {
        await api.post('/users', {
          ...formData,
          subject_ids: formData.role === 'teacher' ? formData.subject_ids.filter(id => id !== 0) : undefined,
        });
        toast.success('User created successfully');
      }
      resetForm();
      refetchUsers();
    } catch (error: any) {
      if (!error.response || ![403, 419, 422, 500].includes(error.response.status)) {
        toast.error(`Failed to ${editingUser ? 'update' : 'create'} user`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSubmitting(true);
    try {
      await api.delete(`/users/${deleteId}`);
      toast.success('User deleted successfully');
      refetchUsers();
    } catch (error: any) {
      if (!error.response || ![403, 419, 422, 500].includes(error.response.status)) {
        toast.error('Failed to delete user');
      }
    } finally {
      setSubmitting(false);
      setDeleteId(null);
    }
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      phone: user.phone || '',
      subject_ids: (user as any).subjects?.map((s: any) => s.id) || [],
    });
    setShowCreate(true);
  };

  const resetForm = () => {
    setShowCreate(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'student', phone: '', subject_ids: [] });
  };

  // Generate page numbers for pagination
  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    const { current_page, last_page } = meta;
    if (last_page <= 7) {
      for (let i = 1; i <= last_page; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current_page > 3) pages.push('...');
      const start = Math.max(2, current_page - 1);
      const end = Math.min(last_page - 1, current_page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current_page < last_page - 2) pages.push('...');
      pages.push(last_page);
    }
    return pages;
  };

  return (
    <>
      <Header title={t.users.title} description={t.users.subtitle} />
      <div className="page-container">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.total}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.users.totalUsers}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.admin}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.users.admins}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.teacher}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.sidebar.teachers}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-600">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.student}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.sidebar.students}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search - spans 2 cols */}
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder={`${t.common.search}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {/* Role filter */}
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={[
                  { value: 'admin', label: t.users.admin },
                  { value: 'teacher', label: t.users.teacher },
                  { value: 'student', label: t.users.student },
                ]}
                placeholder={t.users.allRoles}
              />
              {/* Subject filter */}
              <Select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                options={subjects.map((s) => ({ value: String(s.id), label: `${s.name} (${s.code})` }))}
                placeholder={t.users.allSubjects}
              />
              {/* Add User button */}
              <div className="flex items-end">
                <Button onClick={() => setShowCreate(true)} className="w-full">
                  <Plus className="h-4 w-4" />
                  {t.users.addUser}
                </Button>
              </div>
              {/* Date From */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{t.users.joinedFrom}</label>
                <Input
                  type="date"
                  value={joinedFrom}
                  onChange={(e) => setJoinedFrom(e.target.value)}
                />
              </div>
              {/* Date To */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{t.users.joinedTo}</label>
                <Input
                  type="date"
                  value={joinedTo}
                  onChange={(e) => setJoinedTo(e.target.value)}
                />
              </div>
              {/* Clear filters */}
              {hasActiveFilters && (
                <div className="flex items-end md:col-span-2">
                  <Button variant="outline" size="sm" onClick={clearFilters} className="w-full sm:w-auto">
                    <Filter className="h-4 w-4" />
                    {t.common.clearFilters}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          {loading ? (
            <CardContent className="p-0">
              <TableSkeleton rows={10} columns={7} />
            </CardContent>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <FileX className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-lg font-medium">{t.common.noData}</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 hidden sm:table-cell">#</TableHead>
                    <TableHead>{t.common.name}</TableHead>
                    <TableHead>{t.common.role}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t.users.subject}</TableHead>
                    <TableHead className="hidden md:table-cell">{t.common.phone}</TableHead>
                    <TableHead className="hidden md:table-cell">{t.users.joined}</TableHead>
                    <TableHead className="text-right">{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user, index) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-zinc-400 hidden sm:table-cell">
                        {(meta.current_page - 1) * meta.per_page + index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={user.name} src={user.avatar} size="sm" previewable />
                          <div className="min-w-0">
                            <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{user.name}</p>
                            <p className="text-xs text-zinc-400 flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariant[user.role]} className="capitalize">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {user.role === 'teacher' && (user as any).subjects?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {(user as any).subjects.map((s: any) => (
                              <Badge key={s.id} variant="outline" className="text-xs">
                                {s.code}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-zinc-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {user.phone ? (
                          <span className="text-sm text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            {user.phone}
                          </span>
                        ) : (
                          <span className="text-sm text-zinc-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          {formatDate(user.created_at)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                            <Edit className="h-4 w-4 text-zinc-400" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(user.id)}>
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {meta.last_page > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-zinc-100 dark:border-zinc-700">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Showing {(meta.current_page - 1) * meta.per_page + 1} to{' '}
                    {Math.min(meta.current_page * meta.per_page, meta.total)} of {meta.total} users
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {getPageNumbers().map((p, i) =>
                      p === '...' ? (
                        <span key={`dots-${i}`} className="px-2 text-zinc-400">...</span>
                      ) : (
                        <Button
                          key={p}
                          variant={p === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(p)}
                          className="min-w-[36px]"
                        >
                          {p}
                        </Button>
                      )
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= meta.last_page}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={showCreate} onOpenChange={resetForm}>
          <DialogContent onClose={resetForm}>
            <DialogHeader>
              <DialogTitle>{editingUser ? t.users.editUser : t.users.createUser}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label required>{t.users.fullName}</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={t.users.fullName}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label required>{t.common.email}</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder={t.common.email}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label required={!editingUser}>
                    {t.users.password} {editingUser && `(${t.users.passwordHint})`}
                  </Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder={editingUser ? t.users.passwordHint : t.users.password}
                    required={!editingUser}
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label required>{t.common.role}</Label>
                  <Select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    options={[
                      { value: 'admin', label: t.users.admin },
                      { value: 'teacher', label: t.users.teacher },
                      { value: 'student', label: t.users.student },
                    ]}
                  />
                </div>
                {formData.role === 'teacher' && (
                  <div className="space-y-2">
                    <Label>{t.users.subjects}</Label>
                    <div className="border border-zinc-300 dark:border-zinc-600 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                      {subjects.length === 0 ? (
                        <p className="text-sm text-zinc-400">{t.users.noSubjectsAvailable}</p>
                      ) : (
                        <>
                          {subjects.map((subject) => (
                            <label key={subject.id} className="flex items-center gap-2 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700 p-1.5 rounded">
                              <input
                                type="checkbox"
                                checked={formData.subject_ids.includes(subject.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData(prev => ({ ...prev, subject_ids: [...prev.subject_ids.filter(id => id !== 0), subject.id] }));
                                  } else {
                                    setFormData(prev => ({ ...prev, subject_ids: prev.subject_ids.filter((id) => id !== subject.id) }));
                                  }
                                }}
                                className="rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-zinc-700 dark:text-zinc-300">{subject.name}</span>
                              <Badge variant="outline" className="text-xs ml-auto">{subject.code}</Badge>
                              {subject.category && (
                                <span className="text-xs text-zinc-400">{subject.category}</span>
                              )}
                            </label>
                          ))}
                          <div className="border-t border-zinc-200 dark:border-zinc-600 my-1" />
                          <label className="flex items-center gap-2 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700 p-1.5 rounded">
                            <input
                              type="checkbox"
                              checked={formData.subject_ids.includes(0)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData(prev => ({ ...prev, subject_ids: [0] }));
                                } else {
                                  setFormData(prev => ({ ...prev, subject_ids: prev.subject_ids.filter((id) => id !== 0) }));
                                }
                              }}
                              className="rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">{t.users.other}</span>
                            <Badge variant="secondary" className="text-xs ml-auto">{t.users.versatile}</Badge>
                          </label>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">{t.users.selectSubjects}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>{t.common.phone}</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder={t.users.phoneOptional}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  {t.common.cancel}
                </Button>
                <Button type="submit" isLoading={submitting}>
                  {editingUser ? t.users.editUser : t.users.createUser}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
          <DialogContent onClose={() => setDeleteId(null)}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                {t.users.deleteUser}
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-2">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {t.users.deleteConfirm}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                {t.common.cancel}
              </Button>
              <Button variant="destructive" onClick={handleDelete} isLoading={submitting}>
                {t.common.delete}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default UserList;
