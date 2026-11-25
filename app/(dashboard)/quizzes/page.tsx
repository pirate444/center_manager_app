'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { quizzesStorage, classesStorage, teachersStorage, quizSubmissionsStorage, studentsStorage } from '@/lib/storage';
import { Quiz, QuizQuestion, QuizSubmission, ClassItem, Teacher, Student } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import styles from './quizzes.module.css';

export default function QuizzesPage() {
  const { user, isManagerOrAdmin, isTeacher, isStudent } = useAuth();
  const { t } = useTranslation();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [studentEnrolledClassIds, setStudentEnrolledClassIds] = useState<string[]>([]);
  const [resolvedStudentId, setResolvedStudentId] = useState<string>('');
  const [teacherAssignedClassIds, setTeacherAssignedClassIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  // Create/Edit Quiz Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDesc, setQuizDesc] = useState('');
  const [quizClassId, setQuizClassId] = useState('');
  const [quizTimeLimit, setQuizTimeLimit] = useState(10);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([
    {
      id: 'q1',
      text: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      explanation: '',
      points: 1,
    },
  ]);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  // Taking Quiz State (Student)
  const [activeQuizToTake, setActiveQuizToTake] = useState<Quiz | null>(null);
  const [studentAnswers, setStudentAnswers] = useState<Record<number, number>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isSubmittingTest, setIsSubmittingTest] = useState(false);

  // Review / Result Modal State
  const [reviewResult, setReviewResult] = useState<{
    quiz: Quiz;
    submission: QuizSubmission;
  } | null>(null);

  // Teacher / Admin Analytics Modal State
  const [analyticsQuiz, setAnalyticsQuiz] = useState<Quiz | null>(null);
  const [quizSubmissionsList, setQuizSubmissionsList] = useState<QuizSubmission[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allQuizzes, allClasses, allTeachers, allSubmissions] = await Promise.all([
        quizzesStorage.getAll(),
        classesStorage.getAll(),
        teachersStorage.getAll(),
        quizSubmissionsStorage.getAll(),
      ]);

      setQuizzes(allQuizzes);
      setClasses(allClasses.filter((c) => c.status === 'active'));
      setTeachers(allTeachers);
      setSubmissions(allSubmissions);

      if (isStudent) {
        let effStudentId = user?.studentId || '';
        let enrolledIds: string[] = [];

        try {
          const allStudents = await studentsStorage.getAll();
          let studentDoc = effStudentId ? allStudents.find((s) => s.id === effStudentId) : null;
          if (!studentDoc && user) {
            studentDoc = allStudents.find(
              (s) =>
                (s as any).userId === user.id ||
                (s.firstName?.trim().toLowerCase() === user.firstName?.trim().toLowerCase() &&
                  s.lastName?.trim().toLowerCase() === user.lastName?.trim().toLowerCase())
            ) || null;
            if (studentDoc) {
              effStudentId = studentDoc.id;
            }
          }
          if (studentDoc?.enrolledClassIds) {
            enrolledIds = studentDoc.enrolledClassIds.map(String);
          }
        } catch {}

        setResolvedStudentId(effStudentId);
        setStudentEnrolledClassIds(enrolledIds);
      } else if (isTeacher && user?.teacherId) {
        let assigned: string[] = [];
        try {
          const tRes = await fetch(`/api/teachers/${user.teacherId}`);
          if (tRes.ok) {
            const teacher = await tRes.json();
            assigned = (teacher.assignedClassIds || []).map(String);
          }
        } catch {}
        setTeacherAssignedClassIds(assigned);
      }
    } catch (err) {
      console.error('Failed to load quizzes data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [user?.id, user?.studentId, user?.teacherId, isStudent, isTeacher]);

  // Timer countdown for active quiz
  useEffect(() => {
    if (!activeQuizToTake || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto submit
          void handleFinishQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeQuizToTake, secondsRemaining]);

  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.id, `${t.firstName} ${t.lastName}`])), [teachers]);
  const classMap = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);

  // Classes accessible to the current user (students only see classes they are enrolled in)
  const userClasses = useMemo(() => {
    if (isStudent) {
      const sId = String(user?.studentId || resolvedStudentId || '');
      return classes.filter((c) => {
        const cId = String(c.id);
        const inClass = sId ? c.enrolledStudentIds?.map(String).includes(sId) : false;
        const inStudent = studentEnrolledClassIds.includes(cId);
        return inClass || inStudent;
      });
    }
    if (isTeacher && user?.teacherId) {
      return classes.filter(
        (c) =>
          c.teacherId === user.teacherId ||
          teacherAssignedClassIds.includes(String(c.id))
      );
    }
    return classes;
  }, [classes, isStudent, isTeacher, user, resolvedStudentId, studentEnrolledClassIds, teacherAssignedClassIds]);

  // Filter visible quizzes based on role and class filter
  const visibleQuizzes = useMemo(() => {
    const allowedClassIds = new Set(userClasses.map((c) => String(c.id)));

    return quizzes.filter((quiz) => {
      const qClassId = String(quiz.classId || '');

      // 1. Students ONLY see quizzes for classes they are enrolled in
      if (isStudent) {
        if (!allowedClassIds.has(qClassId)) return false;
        if (quiz.status !== 'published') return false;
      }

      // 2. Teachers see their own quizzes or quizzes for their classes
      if (isTeacher && user?.teacherId) {
        const isMyQuiz = quiz.teacherId === user.teacherId;
        const isMyClass = allowedClassIds.has(qClassId);
        if (!isMyQuiz && !isMyClass) return false;
      }

      // 3. Class filter dropdown selection
      if (selectedClassId !== 'all' && qClassId !== String(selectedClassId)) {
        return false;
      }

      return true;
    });
  }, [quizzes, userClasses, selectedClassId, isStudent, isTeacher, user]);

  // Question builder helpers
  const handleAddQuestion = () => {
    setQuizQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}`,
        text: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        explanation: '',
        points: 1,
      },
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (quizQuestions.length <= 1) return;
    setQuizQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateQuestion = (idx: number, updates: Partial<QuizQuestion>) => {
    setQuizQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, ...updates } : q))
    );
  };

  const handleUpdateOption = (qIdx: number, optIdx: number, val: string) => {
    setQuizQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const newOptions = [...q.options];
        newOptions[optIdx] = val;
        return { ...q, options: newOptions };
      })
    );
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTitle.trim() || !quizClassId) {
      alert('Veuillez remplir le titre et sélectionner une classe');
      return;
    }

    // Validate that questions have non-empty text and options
    for (let i = 0; i < quizQuestions.length; i++) {
      const q = quizQuestions[i];
      if (!q.text.trim()) {
        alert(`Question #${i + 1} n'a pas de texte`);
        return;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].trim()) {
          alert(`Option #${j + 1} de la Question #${i + 1} est vide`);
          return;
        }
      }
    }

    setSubmittingQuiz(true);
    try {
      if (editingQuizId) {
        await quizzesStorage.update(editingQuizId, {
          title: quizTitle.trim(),
          description: quizDesc.trim(),
          classId: quizClassId,
          timeLimitMinutes: quizTimeLimit || 10,
          questions: quizQuestions,
        });
      } else {
        await quizzesStorage.create({
          title: quizTitle.trim(),
          description: quizDesc.trim(),
          classId: quizClassId,
          teacherId: user?.teacherId || undefined,
          timeLimitMinutes: quizTimeLimit || 10,
          questions: quizQuestions,
          status: 'published',
        } as any);
      }

      setIsCreateModalOpen(false);
      setEditingQuizId(null);
      setQuizTitle('');
      setQuizDesc('');
      setQuizQuestions([
        {
          id: 'q1',
          text: '',
          options: ['', '', '', ''],
          correctOptionIndex: 0,
          explanation: '',
          points: 1,
        },
      ]);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'enregistrement du quiz');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingQuizId(null);
    setQuizTitle('');
    setQuizDesc('');
    if (classes.length > 0) setQuizClassId(classes[0].id);
    setQuizTimeLimit(10);
    setQuizQuestions([
      {
        id: 'q1',
        text: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        explanation: '',
        points: 1,
      },
    ]);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (quiz: Quiz) => {
    setEditingQuizId(quiz.id);
    setQuizTitle(quiz.title);
    setQuizDesc(quiz.description || '');
    setQuizClassId(quiz.classId);
    setQuizTimeLimit(quiz.timeLimitMinutes || 10);
    setQuizQuestions(
      quiz.questions?.length
        ? quiz.questions
        : [
            {
              id: 'q1',
              text: '',
              options: ['', '', '', ''],
              correctOptionIndex: 0,
              explanation: '',
              points: 1,
            },
          ]
    );
    setIsCreateModalOpen(true);
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!confirm('Supprimer ce quiz définitivement ?')) return;
    try {
      await quizzesStorage.delete(id);
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression');
    }
  };

  const handleToggleStatus = async (quiz: Quiz) => {
    const nextStatus = quiz.status === 'published' ? 'closed' : 'published';
    try {
      const updated = await quizzesStorage.update(quiz.id, { status: nextStatus });
      setQuizzes((prev) => prev.map((q) => (q.id === quiz.id ? updated : q)));
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour');
    }
  };

  // Student taking quiz
  const handleStartQuiz = (quiz: Quiz) => {
    setActiveQuizToTake(quiz);
    setStudentAnswers({});
    setSecondsRemaining((quiz.timeLimitMinutes || 10) * 60);
  };

  const handleFinishQuiz = async () => {
    const effStudentId = user?.studentId || resolvedStudentId;
    if (!activeQuizToTake || !effStudentId) return;
    setIsSubmittingTest(true);

    const formattedAnswers = activeQuizToTake.questions.map((_, idx) => ({
      questionIndex: idx,
      selectedOptionIndex: studentAnswers[idx] !== undefined ? studentAnswers[idx] : -1,
    }));

    try {
      const studentName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Student';
      const res = await fetch(`/api/quizzes/${activeQuizToTake.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: effStudentId,
          studentName,
          answers: formattedAnswers,
        }),
      });

      if (!res.ok) {
        throw new Error('Erreur lors de la soumission du quiz');
      }

      const data = await res.json();
      setActiveQuizToTake(null);
      setReviewResult({
        quiz: data.quiz || activeQuizToTake,
        submission: data.submission,
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erreur de soumission');
    } finally {
      setIsSubmittingTest(false);
    }
  };

  const openAnalytics = (quiz: Quiz) => {
    setAnalyticsQuiz(quiz);
    const subs = submissions.filter((s) => s.quizId === quiz.id);
    setQuizSubmissionsList(subs);
  };

  const getStudentSubmission = (quizId: string) => {
    const effStudentId = user?.studentId || resolvedStudentId;
    if (!effStudentId) return undefined;
    return submissions.find((s) => s.quizId === quizId && s.studentId === effStudentId);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{t('quizzes') || 'Quiz Interactifs'}</h1>
          <p className={styles.pageSubtitle}>
            {t('quizzes_subtitle') || 'Micro-quiz de validation des acquis post-séance avec rétroaction immédiate'}
          </p>
        </div>

        {!isStudent && (
          <Button
            variant="primary"
            onClick={handleOpenCreate}
          >
            + {t('create_quiz') || 'Créer un quiz'}
          </Button>
        )}
      </div>

      {/* Class filter */}
      <div className={styles.filterBar}>
        <div className={styles.filterSelect}>
          <Select
            label=""
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            options={[
              { value: 'all', label: isStudent ? (t('all_my_classes') || 'Toutes mes classes') : (t('all_classes') || 'Toutes les classes') },
              ...userClasses.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>
      </div>

      {/* Active Quiz Runner (Student Mode) */}
      {activeQuizToTake && (
        <div className={styles.quizRunner}>
          <div className={styles.timerBar}>
            <div>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{activeQuizToTake.title}</span>
            </div>
            <div>
              ⏱ {t('time_remaining') || 'Temps restant'}:{' '}
              <span style={{ color: secondsRemaining < 60 ? '#ef4444' : '#3b82f6' }}>
                {Math.floor(secondsRemaining / 60)}:{(secondsRemaining % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          {activeQuizToTake.questions.map((q, qIdx) => (
            <div key={q.id || qIdx} className={styles.questionCard}>
              <div style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '1.05rem' }}>
                Question {qIdx + 1} / {activeQuizToTake.questions.length}: {q.text}
              </div>

              {q.options.map((opt, oIdx) => {
                const isSelected = studentAnswers[qIdx] === oIdx;
                return (
                  <div
                    key={oIdx}
                    className={`${styles.optionSelectCard} ${isSelected ? styles.optionSelected : ''}`}
                    onClick={() => setStudentAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))}
                  >
                    <input
                      type="radio"
                      name={`question_${qIdx}`}
                      checked={isSelected}
                      onChange={() => setStudentAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))}
                    />
                    <span style={{ fontWeight: isSelected ? 600 : 400 }}>{opt}</span>
                  </div>
                );
              })}
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <Button variant="secondary" onClick={() => setActiveQuizToTake(null)}>
              {t('cancel') || 'Annuler'}
            </Button>
            <Button variant="primary" onClick={handleFinishQuiz} disabled={isSubmittingTest}>
              {isSubmittingTest ? 'Validation...' : t('submit_quiz') || 'Soumettre mes réponses'}
            </Button>
          </div>
        </div>
      )}

      {/* Quizzes List */}
      {!activeQuizToTake && (
        <>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>{t('loading') || 'Chargement...'}</div>
          ) : visibleQuizzes.length === 0 ? (
            <div className={styles.emptyState}>
              <p>{t('no_quizzes') || 'Aucun quiz disponible pour le moment.'}</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {visibleQuizzes.map((quiz) => {
                const studentSub = getStudentSubmission(quiz.id);
                const quizSubs = submissions.filter((s) => s.quizId === quiz.id);
                const avg =
                  quizSubs.length > 0
                    ? Math.round(quizSubs.reduce((acc, s) => acc + s.percentage, 0) / quizSubs.length)
                    : null;

                const badgeClass =
                  quiz.status === 'published'
                    ? styles.badgePublished
                    : quiz.status === 'draft'
                    ? styles.badgeDraft
                    : styles.badgeClosed;

                return (
                  <div key={quiz.id} className={styles.quizCard}>
                    <div>
                      <div className={styles.cardHeader}>
                        <span className={`${styles.badge} ${badgeClass}`}>
                          {quiz.status === 'published'
                            ? t('quiz_published') || 'Publié'
                            : quiz.status === 'draft'
                            ? t('quiz_draft') || 'Brouillon'
                            : t('quiz_closed') || 'Fermé'}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {classMap.get(quiz.classId) || 'Classe'}
                        </span>
                      </div>

                      <div className={styles.quizTitle}>{quiz.title}</div>
                      {quiz.description && <div className={styles.quizDesc}>{quiz.description}</div>}

                      <div className={styles.metaInfo}>
                        <div className={styles.metaItem}>
                          <span>❓ {quiz.questions?.length || 0} questions</span>
                        </div>
                        <div className={styles.metaItem}>
                          <span>⏱ {quiz.timeLimitMinutes || 10} min</span>
                        </div>
                        {!isStudent && (
                          <div className={styles.metaItem}>
                            <span>👥 {quizSubs.length} participations</span>
                          </div>
                        )}
                        {!isStudent && avg !== null && (
                          <div className={styles.metaItem}>
                            <span>🎯 Moyenne: {avg}%</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.cardActions}>
                      {isStudent ? (
                        studentSub ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <span style={{ color: '#10b981', fontWeight: 700 }}>
                              Score: {studentSub.score}/{studentSub.totalQuestions} ({studentSub.percentage}%)
                            </span>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setReviewResult({ quiz, submission: studentSub })}
                            >
                              {t('view_results') || 'Voir correction'}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={quiz.status === 'closed'}
                            onClick={() => handleStartQuiz(quiz)}
                          >
                            {t('take_quiz') || 'Passer le quiz'}
                          </Button>
                        )
                      ) : (
                        <>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenEdit(quiz)}
                            >
                              ✏️ {t('edit') || 'Modifier'}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openAnalytics(quiz)}
                            >
                              📊 Stats ({quizSubs.length})
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleToggleStatus(quiz)}
                            >
                              {quiz.status === 'published' ? 'Fermer' : 'Publier'}
                            </Button>
                          </div>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteQuiz(quiz.id)}
                          >
                            🗑
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Review / Result Modal */}
      {reviewResult && (
        <Modal
          isOpen={true}
          onClose={() => setReviewResult(null)}
          title={`${t('quiz_results') || 'Résultats'}: ${reviewResult.quiz.title}`}
        >
          <div>
            <div className={styles.scoreBanner}>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                {t('your_score') || 'Votre score'}
              </div>
              <div className={styles.scoreNumber}>
                {reviewResult.submission.score} / {reviewResult.submission.totalQuestions} ({reviewResult.submission.percentage}%)
              </div>
            </div>

            {reviewResult.quiz.questions.map((q, qIdx) => {
              const ans = reviewResult.submission.answers.find((a) => a.questionIndex === qIdx);
              const selectedIdx = ans ? ans.selectedOptionIndex : -1;
              const isCorrect = ans ? ans.isCorrect : false;

              return (
                <div key={q.id || qIdx} className={styles.questionCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700 }}>
                      Question {qIdx + 1}: {q.text}
                    </span>
                    <span style={{ fontWeight: 700, color: isCorrect ? '#10b981' : '#ef4444' }}>
                      {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                  </div>

                  {q.options.map((opt, oIdx) => {
                    const isUserChoice = selectedIdx === oIdx;
                    const isRightAnswer = q.correctOptionIndex === oIdx;

                    let optClass = '';
                    if (isRightAnswer) optClass = styles.optionCorrect;
                    else if (isUserChoice && !isRightAnswer) optClass = styles.optionWrong;

                    return (
                      <div key={oIdx} className={`${styles.optionSelectCard} ${optClass}`}>
                        <span>
                          {isRightAnswer ? '✅ ' : isUserChoice ? '❌ ' : '⚪ '}
                          {opt}
                        </span>
                      </div>
                    );
                  })}

                  {q.explanation && (
                    <div className={styles.explanationBox}>
                      <strong>💡 {t('explanation') || 'Explication'}:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {/* Teacher / Admin Analytics Modal */}
      {analyticsQuiz && (
        <Modal
          isOpen={true}
          onClose={() => setAnalyticsQuiz(null)}
          title={`Statistiques: ${analyticsQuiz.title}`}
        >
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Questions</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{analyticsQuiz.questions.length}</div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Participants</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{quizSubmissionsList.length}</div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Moyenne de la classe</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
                  {quizSubmissionsList.length > 0
                    ? Math.round(
                        quizSubmissionsList.reduce((acc, s) => acc + s.percentage, 0) /
                          quizSubmissionsList.length
                      )
                    : 0}
                  %
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Participations des élèves
            </h3>

            {quizSubmissionsList.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>Aucun élève n'a encore passé ce quiz.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {quizSubmissionsList.map((sub) => (
                  <div
                    key={sub.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{sub.studentName || 'Élève'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {new Date(sub.submittedAt).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: sub.percentage >= 50 ? '#10b981' : '#ef4444' }}>
                      {sub.score}/{sub.totalQuestions} ({sub.percentage}%)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Create Quiz Modal */}
      {isCreateModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingQuizId(null);
          }}
          title={editingQuizId ? (t('edit_quiz') || 'Modifier le Quiz') : (t('create_quiz') || 'Créer un Micro-Quiz')}
        >
          <form onSubmit={handleSaveQuiz}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <Input
                label={t('quiz_title') || 'Titre du quiz'}
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="Ex: Validation Chapitre 3 - Algèbre"
                required
              />
              <Select
                label={t('classes') || 'Classe cible'}
                value={quizClassId}
                onChange={(e) => setQuizClassId(e.target.value)}
                options={classes.map((c) => ({ value: c.id, label: c.name }))}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <Input
                label={t('quiz_description') || 'Consignes'}
                value={quizDesc}
                onChange={(e) => setQuizDesc(e.target.value)}
                placeholder="5 questions à choix multiples..."
              />
              <Input
                label={t('time_limit_mins') || 'Durée (minutes)'}
                type="number"
                min="1"
                max="120"
                value={quizTimeLimit}
                onChange={(e) => setQuizTimeLimit(Number(e.target.value))}
                required
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                {t('questions') || 'Questions'} ({quizQuestions.length})
              </h3>
              <Button type="button" variant="secondary" size="sm" onClick={handleAddQuestion}>
                + {t('add_question') || 'Ajouter une question'}
              </Button>
            </div>

            <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {quizQuestions.map((q, qIdx) => (
                <div key={q.id || qIdx} className={styles.questionBlock}>
                  <div className={styles.questionHeader}>
                    <strong>Question #{qIdx + 1}</strong>
                    {quizQuestions.length > 1 && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveQuestion(qIdx)}
                      >
                        Supprimer
                      </Button>
                    )}
                  </div>

                  <div style={{ marginBottom: '0.75rem' }}>
                    <Input
                      label={t('question_text') || 'Énoncé de la question'}
                      value={q.text}
                      onChange={(e) => handleUpdateQuestion(qIdx, { text: e.target.value })}
                      placeholder="Ex: Quelle est la dérivée de f(x) = x² ?"
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Options de réponse (Cochez le bouton radio de la bonne réponse) :
                    </label>
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className={styles.optionRow}>
                        <input
                          type="radio"
                          name={`correct_${qIdx}`}
                          checked={q.correctOptionIndex === oIdx}
                          onChange={() => handleUpdateQuestion(qIdx, { correctOptionIndex: oIdx })}
                          title="Bonne réponse"
                        />
                        <Input
                          label=""
                          value={opt}
                          onChange={(e) => handleUpdateOption(qIdx, oIdx, e.target.value)}
                          placeholder={`Option ${oIdx + 1}`}
                          required
                        />
                      </div>
                    ))}
                  </div>

                  <Input
                    label={t('explanation') || 'Explication pédagogique (facultatif)'}
                    value={q.explanation || ''}
                    onChange={(e) => handleUpdateQuestion(qIdx, { explanation: e.target.value })}
                    placeholder={t('explanation_placeholder') || 'Pourquoi cette réponse est correcte...'}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <Button type="button" variant="secondary" onClick={() => { setIsCreateModalOpen(false); setEditingQuizId(null); }}>
                {t('cancel') || 'Annuler'}
              </Button>
              <Button type="submit" variant="primary" disabled={submittingQuiz}>
                {submittingQuiz ? 'Enregistrement...' : editingQuizId ? (t('save') || 'Enregistrer') : (t('save') || 'Publier le quiz')}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
