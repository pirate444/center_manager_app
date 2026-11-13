'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { classesStorage, settingsStorage, teachersStorage } from '@/lib/storage';
import { CenterSettings, ClassItem, DayOfWeek, Teacher } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import styles from './Schedule.module.css';

const DAYS: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function timeToMins(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export default function SchedulePage() {
  const { t } = useTranslation();
  const { user, isManagerOrAdmin, isTeacher, isStudent } = useAuth();
  const { clearNotification } = useNotifications();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [settings, setSettings] = useState<CenterSettings | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSessionDay, setNewSessionDay] = useState<DayOfWeek>('monday');
  const [newSessionRoom, setNewSessionRoom] = useState('1');
  const [newSessionStart, setNewSessionStart] = useState('08:00');
  const [newSessionEnd, setNewSessionEnd] = useState('10:00');
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editRoom, setEditRoom] = useState('1');

  useEffect(() => {
    const loadData = async () => {
      const [allClasses, allTeachers, centerSettings] = await Promise.all([
        classesStorage.getAll(),
        teachersStorage.getAll(),
        settingsStorage.get(),
      ]);
      const activeClasses = allClasses.filter((classItem) => classItem.status === 'active');
      setClasses(activeClasses);
      setTeachers(allTeachers);
      setSettings(centerSettings);
      setSelectedClassId((current) => current || activeClasses[0]?.id || '');
    };
    void loadData();
    clearNotification('schedule');
  }, [clearNotification]);

  const visibleClasses = classes.filter((classItem) => {
    if (isStudent && user?.studentId && !classItem.enrolledStudentIds.includes(user.studentId)) return false;
    if (isTeacher && user?.teacherId && classItem.teacherId !== user.teacherId) return false;
    return true;
  });
  const selectedClass = visibleClasses.find((classItem) => classItem.id === selectedClassId) || null;
  const roomCount = Math.max(1, settings?.physicalClassCount || 1);
  const roomOptions = Array.from({ length: roomCount }, (_, index) => ({
    value: String(index + 1),
    label: `${t('physical_class') || 'Physical classroom'} ${index + 1}`,
  }));
  const getAssignedRoom = (room?: string) => {
    const legacyRoomNumber = Number(room);
    return Number.isInteger(legacyRoomNumber) && legacyRoomNumber >= 1 && legacyRoomNumber <= roomCount
      ? String(legacyRoomNumber)
      : '1';
  };

  const teacherName = (teacherId: string) => {
    const teacher = teachers.find((item) => item.id === teacherId);
    return teacher ? `${teacher.firstName} ${teacher.lastName}` : '';
  };

  const saveSchedule = async (classItem: ClassItem, schedule: ClassItem['schedule']) => {
    await classesStorage.update(classItem.id, { schedule });
    setClasses((current) => current.map((item) => item.id === classItem.id ? { ...item, schedule } : item));
  };

  const hasConflict = (
    classId: string,
    day: DayOfWeek,
    startTime: string,
    endTime: string,
    room: string,
    ignoreIndex?: number,
  ) => {
    const start = timeToMins(startTime);
    const end = timeToMins(endTime);
    return classes.some((classItem) => classItem.schedule.some((slot, index) => {
      if (classItem.id === classId && index === ignoreIndex) return false;
      if (slot.day !== day || timeToMins(slot.startTime) >= end || timeToMins(slot.endTime) <= start) return false;
      return classItem.id === classId || getAssignedRoom(slot.room || classItem.room) === room;
    }));
  };

  const handleAddSession = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedClass || timeToMins(newSessionEnd) <= timeToMins(newSessionStart)) return;
    if (Number(newSessionRoom) > roomCount) return;
    if (hasConflict(selectedClass.id, newSessionDay, newSessionStart, newSessionEnd, newSessionRoom)) {
      window.alert(t('room_conflict') || 'This class or classroom is already booked during this time.');
      return;
    }
    await saveSchedule(selectedClass, [
      ...selectedClass.schedule,
      { day: newSessionDay, startTime: newSessionStart, endTime: newSessionEnd, room: newSessionRoom },
    ]);
    setIsAddModalOpen(false);
  };

  const beginEdit = (index: number, start: string, end: string, room: string) => {
    setEditingSlotIndex(index);
    setEditStartTime(start);
    setEditEndTime(end);
    setEditRoom(room);
  };

  const saveEdit = async (index: number) => {
    if (!selectedClass) return;
    const original = selectedClass.schedule[index];
    if (timeToMins(editEndTime) <= timeToMins(editStartTime) || Number(editRoom) > roomCount) return;
    if (hasConflict(selectedClass.id, original.day, editStartTime, editEndTime, editRoom, index)) {
      window.alert(t('room_conflict') || 'This class or classroom is already booked during this time.');
      return;
    }
    const schedule = selectedClass.schedule.map((slot, slotIndex) => slotIndex === index
      ? { ...slot, startTime: editStartTime, endTime: editEndTime, room: editRoom }
      : slot);
    await saveSchedule(selectedClass, schedule);
    setEditingSlotIndex(null);
  };

  const deleteSlot = async (index: number) => {
    if (!selectedClass || !window.confirm(t('confirm_delete') || 'Are you sure you want to delete this session?')) return;
    await saveSchedule(selectedClass, selectedClass.schedule.filter((_, slotIndex) => slotIndex !== index));
  };

  const sessions = visibleClasses.flatMap((classItem) => classItem.schedule.map((slot) => ({
    classId: classItem.id,
    className: classItem.name,
    subject: classItem.subject,
    color: classItem.color || '#06b6d4',
    day: slot.day,
    startTime: slot.startTime,
    endTime: slot.endTime,
    room: getAssignedRoom(slot.room || classItem.room),
  }))).sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || timeToMins(a.startTime) - timeToMins(b.startTime));

  return (
    <div className="page-container animate-fadeIn">
      <header className={styles.pageHeader}>
        <div>
          <h1 className="page-title">{t('weekly_schedule')}</h1>
          {isManagerOrAdmin && <p className={styles.pageSubtitle}>{t('class_weekly_schedule') || 'Schedule sessions for one class at a time.'}</p>}
        </div>
        {isManagerOrAdmin && selectedClass && (
          <Button onClick={() => setIsAddModalOpen(true)}>
            <span aria-hidden="true">＋</span> {t('add_session') || 'Add Session'}
          </Button>
        )}
      </header>

      {isManagerOrAdmin ? (
        <>
          <section className={styles.classSelector} aria-label={t('select_schedule_class') || 'Select class'}>
            <label className={styles.classSelectorLabel} htmlFor="schedule-class-select">{t('classes')}</label>
            <Select
              id="schedule-class-select"
              value={selectedClassId}
              onChange={(event) => { setSelectedClassId(event.target.value); setEditingSlotIndex(null); }}
              options={[
                { value: '', label: t('select_schedule_class') || 'Select a class to schedule' },
                ...classes.map((classItem) => ({ value: classItem.id, label: `${classItem.name} · ${classItem.subject}` })),
              ]}
            />
          </section>

          {!selectedClass ? (
            <div className={styles.emptyState}>{t('select_schedule_class') || 'Select a class to schedule'}</div>
          ) : (
            <>
              <section className={styles.selectedClassCard}>
                <span className={styles.classColor} style={{ backgroundColor: selectedClass.color || '#06b6d4' }} />
                <div className={styles.selectedClassInfo}>
                  <h2>{selectedClass.name}</h2>
                  <p>{selectedClass.subject} · {teacherName(selectedClass.teacherId)} · {selectedClass.room}</p>
                </div>
                <span className={styles.sessionCount}>{selectedClass.schedule.length} {t('sessions') || 'sessions'}</span>
              </section>

              <section className={styles.weeklyAgenda}>
                {DAYS.map((day) => {
                  const daySessions = selectedClass.schedule
                    .map((slot, index) => ({ slot, index }))
                    .filter(({ slot }) => slot.day === day)
                    .sort((a, b) => timeToMins(a.slot.startTime) - timeToMins(b.slot.startTime));
                  return (
                    <div key={day} className={styles.agendaDay}>
                      <h3>{t(day)}</h3>
                      {daySessions.length === 0 ? (
                        <span className={styles.noSessions}>{t('no_scheduled_sessions') || 'No sessions scheduled.'}</span>
                      ) : (
                        daySessions.map(({ slot, index }) => (
                          <article key={`${selectedClass.id}-${index}`} className={styles.sessionCard}>
                            {editingSlotIndex === index ? (
                              <div className={styles.editSessionForm}>
                                <Input type="time" label={t('start_time')} value={editStartTime} onChange={(event) => setEditStartTime(event.target.value)} required />
                                <Input type="time" label={t('end_time')} value={editEndTime} onChange={(event) => setEditEndTime(event.target.value)} required />
                                <Select label={t('physical_class') || 'Physical classroom'} value={editRoom} onChange={(event) => setEditRoom(event.target.value)} options={roomOptions} />
                                <div className={styles.sessionActions}>
                                  <Button size="sm" onClick={() => void saveEdit(index)}>{t('save')}</Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingSlotIndex(null)}>{t('cancel')}</Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className={styles.sessionInfo}>
                                  <strong>{slot.startTime} – {slot.endTime}</strong>
                                  <span>{t('physical_class') || 'Physical classroom'} {getAssignedRoom(slot.room || selectedClass.room)}</span>
                                </div>
                                {isManagerOrAdmin && (
                                  <div className={styles.sessionActions}>
                                    <Button size="sm" variant="ghost" onClick={() => beginEdit(index, slot.startTime, slot.endTime, getAssignedRoom(slot.room || selectedClass.room))}>{t('edit')}</Button>
                                    <Button size="sm" variant="ghost" onClick={() => void deleteSlot(index)}>{t('delete')}</Button>
                                  </div>
                                )}
                              </>
                            )}
                          </article>
                        ))
                      )}
                    </div>
                  );
                })}
              </section>
            </>
          )}
        </>
      ) : (
        <section className={styles.studentScheduleList}>
          {sessions.length === 0 ? (
            <div className={styles.emptyState}>{t('no_sessions_found') || 'No sessions scheduled.'}</div>
          ) : sessions.map((session, index) => (
            <article key={`${session.classId}-${session.day}-${session.startTime}-${index}`} className={styles.publicSessionCard} style={{ borderInlineStartColor: session.color }}>
              <div className={styles.publicSessionTop}><strong>{t(session.day)}</strong><span>{session.startTime} – {session.endTime}</span></div>
              <h2>{session.subject}</h2>
              <p>{session.className} · {t('physical_class') || 'Physical classroom'} {session.room}</p>
            </article>
          ))}
        </section>
      )}

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={t('add_session') || 'Add Session'}>
        {selectedClass && (
          <form onSubmit={handleAddSession} className={styles.addSessionForm}>
            <div className={styles.modalClassName}>{selectedClass.name} · {selectedClass.subject}</div>
            <Select label={t('day')} value={newSessionDay} onChange={(event) => setNewSessionDay(event.target.value as DayOfWeek)} options={DAYS.map((day) => ({ value: day, label: t(day) }))} required />
            <div className={styles.timeInputs}>
              <Input type="time" label={t('start_time')} value={newSessionStart} onChange={(event) => setNewSessionStart(event.target.value)} required />
              <Input type="time" label={t('end_time')} value={newSessionEnd} onChange={(event) => setNewSessionEnd(event.target.value)} required />
            </div>
            <Select label={t('physical_class') || 'Physical classroom'} value={newSessionRoom} onChange={(event) => setNewSessionRoom(event.target.value)} options={roomOptions} required />
            <div className={styles.modalActions}>
              <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>{t('cancel')}</Button>
              <Button type="submit">{t('add')}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
