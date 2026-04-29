import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/axios';
import toast from 'react-hot-toast';
import { formatDateTime } from '../../lib/utils';
import type { Quiz } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  FileQuestion,
  Plus,
  Search,
  Clock,
  BookOpen,
  Users,
  Play,
  BarChart3,
  Trash2,
  Edit,
  Loader2,
  FileX,
  AlertTriangle,
} from 'lucide-react';

const QuizList: React.FC = () => {
  const { isTeacher, isAdmin, isStudent } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/quizzes');
      const data = response.data.data || response.data;
      setQuizzes(Array.isArray(data) ? data : data.data || []);
    } catch {
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/quizzes/${deleteId}`);
      setQuizzes((prev) => prev.filter((q) => q.id !== deleteId));
      toast.success('Quiz deleted successfully');
    } catch {
      toast.error('Failed to delete quiz');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const filteredQuizzes = quizzes.filter((quiz) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      quiz.title.toLowerCase().includes(searchLower) ||
      quiz.description?.toLowerCase().includes(searchLower) ||
      quiz.class_room?.name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      <Header
        title="Quizzes"
        description={isStudent ? 'View and take available quizzes' : 'Manage your quizzes'}
      />
      <div className="page-container">
        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search quizzes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {(isTeacher || isAdmin) && (
            <Button onClick={() => navigate('/quizzes/create')}>
              <Plus className="h-4 w-4" />
              Create Quiz
            </Button>
          )}
        </div>

        {/* Quiz Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileX className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-lg font-medium">No quizzes found</p>
            <p className="text-sm mt-1">
              {isTeacher || isAdmin ? 'Create your first quiz to get started' : 'No quizzes available yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredQuizzes.map((quiz) => (
              <Card key={quiz.id} className="hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                      <FileQuestion className="h-5 w-5" />
                    </div>
                    <Badge variant={quiz.is_active ? 'success' : 'secondary'}>
                      {quiz.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{quiz.title}</h3>
                  {quiz.description && (
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{quiz.description}</p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>{quiz.class_room?.name || 'No class'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{quiz.duration_minutes} minutes</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Users className="h-3.5 w-3.5" />
                      <span>{quiz.questions_count || 0} questions</span>
                    </div>
                    {quiz.start_time && (
                      <div className="text-xs text-gray-400">
                        Starts: {formatDateTime(quiz.start_time)}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {isStudent && quiz.is_active && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/quizzes/${quiz.id}/take`)}
                      >
                        <Play className="h-3.5 w-3.5" />
                        Take Quiz
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/quizzes/${quiz.id}/results`)}
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      Results
                    </Button>
                    {(isTeacher || isAdmin) && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/quizzes/create?edit=${quiz.id}`)}
                        >
                          <Edit className="h-4 w-4 text-gray-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(quiz.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
          <DialogContent onClose={() => setDeleteId(null)}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Delete Quiz
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this quiz? This action cannot be undone. All student
                attempts and results will also be deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} isLoading={deleting}>
                Delete Quiz
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default QuizList;
