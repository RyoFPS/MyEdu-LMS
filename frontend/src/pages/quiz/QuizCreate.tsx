import React, { useEffect, useState } from 'react';
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
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/utils';
import api from '../../lib/axios';
import toast from 'react-hot-toast';
import { useTranslation } from '../../hooks/useTranslation';
import { useClasses, useSubjects, useQuiz } from '../../hooks/useApi';
import type { ClassRoom, QuizQuestion } from '../../types';
import {
  FileQuestion,
  Plus,
  Trash2,
  Save,
  GripVertical,
  ArrowLeft,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Shield,
  Repeat,
  Hash,
} from 'lucide-react';

interface QuestionForm {
  id?: string; // Stable ID for React keys
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'a' | 'b' | 'c' | 'd';
  points: number;
}

const emptyQuestion: QuestionForm = {
  id: crypto.randomUUID(),
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
  const { t } = useTranslation();

  // React Query hooks
  const { data: classesData } = useClasses();
  const classes = classesData?.data || [];
  const { data: subjects = [] } = useSubjects();
  const { data: quiz, isLoading: loading } = useQuiz(editId || '', { enabled: !!editId });

  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    class_id: '',
    subject_id: '',
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

  // Load quiz data when editing
  useEffect(() => {
    if (isEditing && quiz) {
      setFormData({
        title: quiz.title,
        description: quiz.description || '',
        class_id: String(quiz.class_id),
        subject_id: quiz.subject_id ? String(quiz.subject_id) : '',
        duration_minutes: String(quiz.duration_minutes),
        start_time: quiz.start_time ? quiz.start_time.slice(0, 16) : '',
        end_time: quiz.end_time ? quiz.end_time.slice(0, 16) : '',
        is_active: quiz.is_active,
        max_attempts: String(quiz.max_attempts ?? 1),
      });
      if (quiz.questions && quiz.questions.length > 0) {
        setQuestions(
          quiz.questions.map((q: QuizQuestion) => ({
            id: crypto.randomUUID(),
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
    }
  }, [isEditing, quiz]);

  const addQuestion = () => {
    setQuestions([...questions, { ...emptyQuestion, id: crypto.randomUUID() }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) {
      toast.error(t.quizzes.addQuestionFirst);
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
        toast.error(`Please fill in all fields for ${t.quizzes.question} ${i + 1}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        class_id: Number(formData.class_id),
        subject_id: formData.subject_id ? Number(formData.subject_id) : null,
        duration_minutes: Number(formData.duration_minutes),
        max_attempts: Number(formData.max_attempts),
        questions,
      };

      if (isEditing) {
        await api.put(`/quizzes/${editId}`, payload);
        toast.success(t.quizzes.quizUpdated);
      } else {
        await api.post('/quizzes', payload);
        toast.success(t.quizzes.quizCreated);
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
      <>
        <Header title={t.quizzes.createQuiz} />
        <div className="page-container max-w-4xl mx-auto">
          <Skeleton className="h-8 w-32 mb-6" />
          
          <Card className="mb-6">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {[1, 2].map((i) => (
            <Card key={i} className="mb-4">
              <CardHeader>
                <Skeleton className="h-6 w-64" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-10 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  }

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  const optionLabels: Record<string, string> = {
    a: t.quizzes.optionA,
    b: t.quizzes.optionB,
    c: t.quizzes.optionC,
    d: t.quizzes.optionD,
  };

  return (
    <>
      <Header
        title={isEditing ? t.quizzes.editQuiz : t.quizzes.createQuiz}
        description={isEditing ? 'Update quiz details and questions' : 'Create a new quiz for your class'}
      />
      <div className="page-container max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/quizzes')} className="mb-2">
          <ArrowLeft className="h-4 w-4" />
          {t.quizzes.backToQuizzes}
        </Button>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quiz Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileQuestion className="h-5 w-5 text-primary-500" />
                {t.quizzes.quizDetails}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label required>{t.common.title}</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={t.quizzes.quizTitle}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>{t.common.description}</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={t.common.description}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label required>{t.sidebar.classes}</Label>
                  <Select
                    value={formData.class_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, class_id: e.target.value }))}
                    options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
                    placeholder={t.quizzes.selectClass}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.quizzes.subject}</Label>
                  <Select
                    value={formData.subject_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject_id: e.target.value }))}
                    options={subjects.map((s: any) => ({ value: String(s.id), label: `${s.name} (${s.code})` }))}
                    placeholder={t.quizzes.selectSubject}
                  />
                </div>
                <div className="space-y-2">
                  <Label required>{t.quizzes.durationMinutes}</Label>
                  <Input
                    type="number"
                    min="1"
                    max="300"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.quizzes.startTime}</Label>
                  <Input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.quizzes.endTime}</Label>
                  <Input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                  />
                </div>
                {/* Attempt Mode */}
                <div className="space-y-3 md:col-span-2">
                  <Label>{t.quizzes.attemptsConfig}</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Single Attempt */}
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, max_attempts: '1' }))}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                        formData.max_attempts === '1'
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 shadow-sm'
                          : 'border-zinc-200 dark:border-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      )}
                    >
                      <div className={cn(
                        'p-2.5 rounded-lg',
                        formData.max_attempts === '1' ? 'bg-primary-100 dark:bg-primary-900/40' : 'bg-zinc-100 dark:bg-zinc-700'
                      )}>
                        <Shield className="h-5 w-5" />
                      </div>
                      <span className="font-semibold text-sm">{t.quizzes.singleAttempt}</span>
                      <span className="text-xs text-center opacity-70 leading-relaxed">
                        Students can only take this quiz once
                      </span>
                    </button>

                    {/* Unlimited Attempts */}
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, max_attempts: '0' }))}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                        formData.max_attempts === '0'
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 shadow-sm'
                          : 'border-zinc-200 dark:border-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      )}
                    >
                      <div className={cn(
                        'p-2.5 rounded-lg',
                        formData.max_attempts === '0' ? 'bg-primary-100 dark:bg-primary-900/40' : 'bg-zinc-100 dark:bg-zinc-700'
                      )}>
                        <Repeat className="h-5 w-5" />
                      </div>
                      <span className="font-semibold text-sm">{t.quizzes.unlimitedAttempts}</span>
                      <span className="text-xs text-center opacity-70 leading-relaxed">
                        Students can retake as many times as they want
                      </span>
                    </button>

                    {/* Custom Attempts */}
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.max_attempts === '0' || formData.max_attempts === '1') {
                          setFormData(prev => ({ ...prev, max_attempts: '3' }));
                        }
                      }}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                        Number(formData.max_attempts) > 1
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 shadow-sm'
                          : 'border-zinc-200 dark:border-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      )}
                    >
                      <div className={cn(
                        'p-2.5 rounded-lg',
                        Number(formData.max_attempts) > 1 ? 'bg-primary-100 dark:bg-primary-900/40' : 'bg-zinc-100 dark:bg-zinc-700'
                      )}>
                        <Hash className="h-5 w-5" />
                      </div>
                      <span className="font-semibold text-sm">{t.quizzes.customAttempts}</span>
                      {Number(formData.max_attempts) > 1 ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="2"
                            max="100"
                            value={formData.max_attempts}
                            onChange={(e) => setFormData(prev => ({ ...prev, max_attempts: e.target.value }))}
                            onClick={(e) => e.stopPropagation()}
                            className="w-16 h-7 text-center text-xs"
                          />
                          <span className="text-xs opacity-70">{t.quizzes.attempts}</span>
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
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.quizzes.questionsSection} ({questions.length})</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.quizzes.points}: {totalPoints}</p>
            </div>
            <Button type="button" variant="outline" onClick={addQuestion}>
              <Plus className="h-4 w-4" />
              {t.quizzes.addQuestion}
            </Button>
          </div>

          {questions.map((question, index) => (
            <Card
              key={question.id || index}
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
                      className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                      title="Drag to reorder"
                    >
                      <GripVertical className="h-4 w-4 text-zinc-400" />
                    </div>
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 text-xs font-bold">
                      {index + 1}
                    </span>
                    {t.quizzes.question} {index + 1}
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
                      className="h-8 w-8 text-zinc-400 hover:text-zinc-600 dark:text-zinc-400"
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
                      className="h-8 w-8 text-zinc-400 hover:text-zinc-600 dark:text-zinc-400"
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
                      className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 dark:bg-red-900/30"
                      title="Delete question"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label required>{t.quizzes.question}</Label>
                  <Textarea
                    value={question.question}
                    onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                    placeholder={t.quizzes.question}
                    rows={2}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(['a', 'b', 'c', 'd'] as const).map((option) => (
                    <div key={option} className="space-y-1">
                      <Label className="flex items-center gap-1">
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase">
                          {option}
                        </span>
                        {optionLabels[option]}
                        {question.correct_answer === option && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-1" />
                        )}
                      </Label>
                      <Input
                        value={question[`option_${option}`]}
                        onChange={(e) => updateQuestion(index, `option_${option}`, e.target.value)}
                        placeholder={optionLabels[option]}
                        required
                      />
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="space-y-2">
                    <Label required>{t.quizzes.correctAnswer}</Label>
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
                    <Label>{t.quizzes.points}</Label>
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
          <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700 shadow-sm sticky bottom-4">
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              {questions.length} {t.quizzes.questions} &middot; {totalPoints} {t.quizzes.points}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/quizzes')}>
                {t.common.cancel}
              </Button>
              <Button type="submit" isLoading={submitting}>
                <Save className="h-4 w-4" />
                {isEditing ? t.quizzes.updateQuiz : t.quizzes.saveQuiz}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default QuizCreate;
