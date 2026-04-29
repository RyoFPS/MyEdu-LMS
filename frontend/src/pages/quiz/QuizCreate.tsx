import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select } from '../../components/ui/select';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import api from '../../lib/axios';
import toast from 'react-hot-toast';
import type { ClassRoom, QuizQuestion } from '../../types';
import {
  FileQuestion,
  Plus,
  Trash2,
  Save,
  GripVertical,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Shield,
  Repeat,
  Hash,
} from 'lucide-react';

interface QuestionForm {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'a' | 'b' | 'c' | 'd';
  points: number;
}

const emptyQuestion: QuestionForm = {
  question: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 'a',
  points: 10,
};

const QuizCreate: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditing = !!editId;

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    class_id: '',
    duration_minutes: '30',
    start_time: '',
    end_time: '',
    is_active: true,
    max_attempts: '1',
  });

  const [questions, setQuestions] = useState<QuestionForm[]>([{ ...emptyQuestion }]);

  // Drag-and-drop state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const fetchClasses = useCallback(async () => {
    try {
      const response = await api.get('/classes');
      const data = response.data.data || response.data;
      setClasses(Array.isArray(data) ? data : data.data || []);
    } catch {
      setClasses([]);
    }
  }, []);

  const fetchQuiz = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/quizzes/${id}`);
      const quiz = response.data.data || response.data;
      setFormData({
        title: quiz.title,
        description: quiz.description || '',
        class_id: String(quiz.class_id),
        duration_minutes: String(quiz.duration_minutes),
        start_time: quiz.start_time ? quiz.start_time.slice(0, 16) : '',
        end_time: quiz.end_time ? quiz.end_time.slice(0, 16) : '',
        is_active: quiz.is_active,
        max_attempts: String(quiz.max_attempts ?? 1),
      });
      if (quiz.questions && quiz.questions.length > 0) {
        setQuestions(
          quiz.questions.map((q: QuizQuestion) => ({
            question: q.question,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_answer: q.correct_answer || 'a',
            points: q.points,
          }))
        );
      }
    } catch {
      toast.error('Failed to load quiz');
      navigate('/quizzes');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchClasses();
    if (editId) {
      fetchQuiz(editId);
    }
  }, [editId, fetchClasses, fetchQuiz]);

  const addQuestion = () => {
    setQuestions([...questions, { ...emptyQuestion }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) {
      toast.error('Quiz must have at least one question');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof QuestionForm, value: string | number) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
  };

  // Drag-and-drop handlers
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const reordered = [...questions];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    setQuestions(reordered);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Move up/down as alternative to drag
  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;
    const reordered = [...questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setQuestions(reordered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title || !formData.class_id || !formData.duration_minutes) {
      toast.error('Please fill in all required fields');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !q.option_a || !q.option_b || !q.option_c || !q.option_d) {
        toast.error(`Please fill in all fields for Question ${i + 1}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        class_id: Number(formData.class_id),
        duration_minutes: Number(formData.duration_minutes),
        max_attempts: Number(formData.max_attempts),
        questions,
      };

      if (isEditing) {
        await api.put(`/quizzes/${editId}`, payload);
        toast.success('Quiz updated successfully');
      } else {
        await api.post('/quizzes', payload);
        toast.success('Quiz created successfully');
      }
      navigate('/quizzes');
    } catch {
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} quiz`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <>
      <Header
        title={isEditing ? 'Edit Quiz' : 'Create Quiz'}
        description={isEditing ? 'Update quiz details and questions' : 'Create a new quiz for your class'}
      />
      <div className="page-container max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/quizzes')} className="mb-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Quizzes
        </Button>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quiz Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileQuestion className="h-5 w-5 text-primary-500" />
                Quiz Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label required>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter quiz title"
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter quiz description (optional)"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label required>Class</Label>
                  <Select
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
                    placeholder="Select a class"
                  />
                </div>
                <div className="space-y-2">
                  <Label required>Duration (minutes)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="300"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
                {/* Attempt Mode */}
                <div className="space-y-3 md:col-span-2">
                  <Label>Attempt Mode</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Single Attempt */}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, max_attempts: '1' })}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                        formData.max_attempts === '1'
                          ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600'
                      )}
                    >
                      <div className={cn(
                        'p-2.5 rounded-lg',
                        formData.max_attempts === '1' ? 'bg-primary-100' : 'bg-gray-100'
                      )}>
                        <Shield className="h-5 w-5" />
                      </div>
                      <span className="font-semibold text-sm">Single Attempt</span>
                      <span className="text-xs text-center opacity-70 leading-relaxed">
                        Students can only take this quiz once
                      </span>
                    </button>

                    {/* Unlimited Attempts */}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, max_attempts: '0' })}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                        formData.max_attempts === '0'
                          ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600'
                      )}
                    >
                      <div className={cn(
                        'p-2.5 rounded-lg',
                        formData.max_attempts === '0' ? 'bg-primary-100' : 'bg-gray-100'
                      )}>
                        <Repeat className="h-5 w-5" />
                      </div>
                      <span className="font-semibold text-sm">Unlimited</span>
                      <span className="text-xs text-center opacity-70 leading-relaxed">
                        Students can retake as many times as they want
                      </span>
                    </button>

                    {/* Custom Attempts */}
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.max_attempts === '0' || formData.max_attempts === '1') {
                          setFormData({ ...formData, max_attempts: '3' });
                        }
                      }}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                        Number(formData.max_attempts) > 1
                          ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600'
                      )}
                    >
                      <div className={cn(
                        'p-2.5 rounded-lg',
                        Number(formData.max_attempts) > 1 ? 'bg-primary-100' : 'bg-gray-100'
                      )}>
                        <Hash className="h-5 w-5" />
                      </div>
                      <span className="font-semibold text-sm">Custom Limit</span>
                      {Number(formData.max_attempts) > 1 ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="2"
                            max="100"
                            value={formData.max_attempts}
                            onChange={(e) => setFormData({ ...formData, max_attempts: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-16 h-7 text-center text-xs"
                          />
                          <span className="text-xs opacity-70">attempts</span>
                        </div>
                      ) : (
                        <span className="text-xs text-center opacity-70 leading-relaxed">
                          Set a specific number of attempts
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Questions ({questions.length})</h3>
              <p className="text-sm text-gray-500">Total points: {totalPoints}</p>
            </div>
            <Button type="button" variant="outline" onClick={addQuestion}>
              <Plus className="h-4 w-4" />
              Add Question
            </Button>
          </div>

          {questions.map((question, index) => (
            <Card
              key={index}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              className={cn(
                'relative transition-all duration-200',
                dragIndex === index && 'opacity-50 scale-[0.98] shadow-lg',
                dragOverIndex === index && dragIndex !== index && 'ring-2 ring-primary-500 ring-offset-2',
              )}
            >
              {/* Drop indicator line */}
              {dragOverIndex === index && dragIndex !== null && dragIndex !== index && (
                <div className="absolute -top-1 left-4 right-4 h-0.5 bg-primary-500 rounded-full" />
              )}

              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div
                      className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-100 transition-colors"
                      title="Drag to reorder"
                    >
                      <GripVertical className="h-4 w-4 text-gray-400" />
                    </div>
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
                      {index + 1}
                    </span>
                    Question {index + 1}
                    <Badge variant="secondary">{question.points} pts</Badge>
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {/* Move up button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveQuestion(index, 'up')}
                      disabled={index === 0}
                      className="h-8 w-8 text-gray-400 hover:text-gray-600"
                      title="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    {/* Move down button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveQuestion(index, 'down')}
                      disabled={index === questions.length - 1}
                      className="h-8 w-8 text-gray-400 hover:text-gray-600"
                      title="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    {/* Delete button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuestion(index)}
                      className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                      title="Delete question"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label required>Question</Label>
                  <Textarea
                    value={question.question}
                    onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                    placeholder="Enter your question"
                    rows={2}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(['a', 'b', 'c', 'd'] as const).map((option) => (
                    <div key={option} className="space-y-1">
                      <Label className="flex items-center gap-1">
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-100 text-xs font-semibold text-gray-600 uppercase">
                          {option}
                        </span>
                        Option {option.toUpperCase()}
                        {question.correct_answer === option && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-1" />
                        )}
                      </Label>
                      <Input
                        value={question[`option_${option}`]}
                        onChange={(e) => updateQuestion(index, `option_${option}`, e.target.value)}
                        placeholder={`Option ${option.toUpperCase()}`}
                        required
                      />
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="space-y-2">
                    <Label required>Correct Answer</Label>
                    <RadioGroup
                      value={question.correct_answer}
                      onValueChange={(value) => updateQuestion(index, 'correct_answer', value)}
                      className="flex gap-4"
                    >
                      <RadioGroupItem value="a" label="A" id={`correct-a-${index}`} />
                      <RadioGroupItem value="b" label="B" id={`correct-b-${index}`} />
                      <RadioGroupItem value="c" label="C" id={`correct-c-${index}`} />
                      <RadioGroupItem value="d" label="D" id={`correct-d-${index}`} />
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label>Points</Label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={question.points}
                      onChange={(e) => updateQuestion(index, 'points', Number(e.target.value))}
                      className="w-24"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Submit */}
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm sticky bottom-4">
            <div className="text-sm text-gray-500">
              {questions.length} question{questions.length !== 1 ? 's' : ''} &middot; {totalPoints} total points
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/quizzes')}>
                Cancel
              </Button>
              <Button type="submit" isLoading={submitting}>
                <Save className="h-4 w-4" />
                {isEditing ? 'Update Quiz' : 'Create Quiz'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default QuizCreate;
