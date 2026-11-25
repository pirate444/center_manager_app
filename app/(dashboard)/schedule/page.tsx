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

function minsToTime(minutes: number): string {
  return `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`;
}

export default function SchedulePage() {
  const { t } = useTranslation();
  const { user, isManagerOrAdmin, isTeacher, isStudent } = useAuth();
  const { clearNotification } = useNotifications();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [settings, setSettings] = useState<CenterSettings | null>(null);

  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(DAYS[new Date().getDay()]);
  const [selectedRoom, setSelectedRoom] = useState('1');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<{ classId: string; slotIndex: number } | null>(null);
  const [newSessionClassId, setNewSessionClassId] = useState('');
  const [newSessionDay, setNewSessionDay] = useState<DayOfWeek>(DAYS[new Date().getDay()]);
  const [newSessionRoom, setNewSessionRoom] = useState('1');
  const [newSessionStart, setNewSessionStart] = useState('08:00');
  const [newSessionEnd, setNewSessionEnd] = useState('10:00');


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

    };
    void loadData();
    clearNotification('schedule');
  }, [clearNotification]);

  const visibleClasses = classes.filter((classItem) => {
    if (isStudent && user?.studentId && !classItem.enrolledStudentIds.includes(user.studentId)) return false;
    if (isTeacher && user?.teacherId && classItem.teacherId !== user.teacherId) return false;
    return true;
  });

  const addSessionClass = classes.find((classItem) => classItem.id === newSessionClassId) || null;
  const roomCount = Math.max(1, settings?.physicalClassCount || 1);
  const roomOptions = Array.from({ length: roomCount }, (_, index) => ({
    value: String(index + 1),
    label: `${t('physical_class') || 'Physical classroom'} ${index + 1}`,
  }));
  const classOptions = [
    { value: '', label: t('select_schedule_class') || 'Select a class' },
    ...classes.map((classItem) => ({ value: classItem.id, label: `${classItem.name} · ${classItem.subject}` })),
  ];
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

  const openAddSession = (room: string) => {
    setEditingSession(null);
    setNewSessionClassId('');
    setNewSessionDay(selectedDay);
    setNewSessionRoom(room);
    setNewSessionStart('08:00');
    setNewSessionEnd('10:00');
    setIsAddModalOpen(true);
  };

  const openEditSession = (classId: string, slotIndex: number, day: DayOfWeek, startTime: string, endTime: string, room: string) => {
    setEditingSession({ classId, slotIndex });
    setNewSessionClassId(classId);
    setNewSessionDay(day);
    setNewSessionRoom(room);
    setNewSessionStart(startTime);
    setNewSessionEnd(endTime);
    setIsAddModalOpen(true);
  };

  const handleSaveSession = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!addSessionClass || timeToMins(newSessionEnd) <= timeToMins(newSessionStart)) return;
    if (timeToMins(newSessionEnd) > timeToMins('22:00') || Number(newSessionRoom) > roomCount) return;

    const originalClass = editingSession
      ? classes.find((classItem) => classItem.id === editingSession.classId)
      : null;
    const originalSlot = originalClass?.schedule[editingSession?.slotIndex ?? -1];
    if (editingSession && !originalClass) return;
    if (editingSession && !originalSlot) return;

    const ignoreIndex = editingSession?.classId === addSessionClass.id
      ? editingSession.slotIndex
      : undefined;
    if (hasConflict(addSessionClass.id, newSessionDay, newSessionStart, newSessionEnd, newSessionRoom, ignoreIndex)) {
      window.alert(t('room_conflict') || 'This class or classroom is already booked during this time.');
      return;
    }

    if (editingSession && originalClass && originalSlot) {
      if (originalClass.id === addSessionClass.id) {
        const schedule = [...addSessionClass.schedule];
        schedule[editingSession.slotIndex] = {
          ...originalSlot,
          day: newSessionDay,
          startTime: newSessionStart,
          endTime: newSessionEnd,
          room: newSessionRoom,
        };
        await saveSchedule(addSessionClass, schedule);
      } else {
        await saveSchedule(originalClass, originalClass.schedule.filter((_, index) => index !== editingSession.slotIndex));
        await saveSchedule(addSessionClass, [
          ...addSessionClass.schedule,
          { day: newSessionDay, startTime: newSessionStart, endTime: newSessionEnd, room: newSessionRoom },
        ]);
      }
    } else {
      await saveSchedule(addSessionClass, [
        ...addSessionClass.schedule,
        { day: newSessionDay, startTime: newSessionStart, endTime: newSessionEnd, room: newSessionRoom },
      ]);
    }
    setSelectedDay(newSessionDay);
    setIsAddModalOpen(false);
    setEditingSession(null);
  };

  const handleDeleteSession = async (classId: string, slotIndex: number) => {
    const classItem = classes.find((item) => item.id === classId);
    if (!classItem || !window.confirm(t('confirm_delete') || 'Are you sure you want to delete this session?')) return;
    await saveSchedule(classItem, classItem.schedule.filter((_, index) => index !== slotIndex));
  };


  const sessions = visibleClasses.flatMap((classItem) => classItem.schedule.map((slot, slotIndex) => ({
    classId: classItem.id,
    slotIndex,
    className: classItem.name,
    subject: classItem.subject,
    color: classItem.color || '#06b6d4',
    day: slot.day,
    startTime: slot.startTime,
    endTime: slot.endTime,
    room: getAssignedRoom(slot.room || classItem.room),
  }))).sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || timeToMins(a.startTime) - timeToMins(b.startTime));
  const selectedRoomSessions = sessions
    .filter((session) => session.day === selectedDay && session.room === selectedRoom)
    .sort((a, b) => timeToMins(a.startTime) - timeToMins(b.startTime));
  const dayStart = timeToMins(settings?.startTime || '08:00');
  const dayEnd = timeToMins('22:00');
  const roomAvailability = (() => {
    const gaps: { startTime: string; endTime: string }[] = [];
    let cursor = dayStart;
    selectedRoomSessions.forEach((session) => {
      const sessionStart = Math.max(dayStart, timeToMins(session.startTime));
      const sessionEnd = Math.min(dayEnd, timeToMins(session.endTime));
      if (sessionStart > cursor) gaps.push({ startTime: minsToTime(cursor), endTime: minsToTime(sessionStart) });
      cursor = Math.max(cursor, sessionEnd);
    });
    if (cursor < dayEnd) gaps.push({ startTime: minsToTime(cursor), endTime: minsToTime(dayEnd) });
    return gaps;
  })();

  return (
    <div className="page-container animate-fadeIn">
      <header className={styles.pageHeader}>
        <div>
          <h1 className="page-title">{t('weekly_schedule')}</h1>
          {isManagerOrAdmin && <p className={styles.pageSubtitle}>{t('daily_room_schedule') || 'Choose a day to see every classroom and its availability.'}</p>}
        </div>
      </header>

      {isManagerOrAdmin ? (
        <>
          <nav className={styles.daySelector} aria-label={t('select_day') || 'Select day'}>
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                className={`${styles.dayButton} ${selectedDay === day ? styles.dayButtonActive : ''}`}
                onClick={() => setSelectedDay(day)}
                aria-pressed={selectedDay === day}
              >
                {t(day)}
              </button>
            ))}
          </nav>

          <section className={styles.roomPicker}>
            <label className={styles.roomPickerLabel} htmlFor="schedule-room-select">
              {t('physical_class') || 'Physical classroom'}
            </label>
            <Select
              id="schedule-room-select"
              value={selectedRoom}
              onChange={(event) => setSelectedRoom(event.target.value)}
              options={roomOptions}
            />
          </section>

          <div className={styles.roomBoardHeading}>
            <h2>{t(selectedDay)} · {t('physical_class') || 'Physical classroom'} {selectedRoom}</h2>
            <span>{selectedRoomSessions.length ? `${selectedRoomSessions.length} ${t('sessions') || 'sessions'}` : (t('available') || 'Available')}</span>
          </div>

          <section className={styles.roomBoard}>
            <article className={styles.roomColumn}>
              <header className={styles.roomColumnHeader}>
                <div className={styles.roomColumnTitle}>{t('physical_class') || 'Physical classroom'} {selectedRoom}</div>
                <Button size="sm" variant="primary" onClick={() => openAddSession(selectedRoom)}>
                  <span aria-hidden="true">＋</span> {t('add_session') || 'Add Session'}
                </Button>
              </header>
              <div className={styles.roomSessionList}>
                {selectedRoomSessions.length === 0 && (
                  <div className={styles.roomEmpty}>{t('no_scheduled_sessions') || 'No sessions scheduled.'}</div>
                )}
                {selectedRoomSessions.map((session, index) => (
                  <article key={`${session.classId}-${session.startTime}-${index}`} className={styles.roomSessionCard} style={{ borderInlineStartColor: session.color }}>
                    <strong>{session.startTime} – {session.endTime}</strong>
                    <span>{session.className}</span>
                    <small>{session.subject} · {teacherName(classes.find((item) => item.id === session.classId)?.teacherId || '')}</small>
                    <div className={styles.sessionActions}>
                      <Button size="sm" variant="ghost" onClick={() => openEditSession(session.classId, session.slotIndex, session.day, session.startTime, session.endTime, session.room)}>{t('edit')}</Button>
                      <Button size="sm" variant="ghost" onClick={() => void handleDeleteSession(session.classId, session.slotIndex)}>{t('delete')}</Button>
                    </div>
                  </article>
                ))}
              </div>
              <section className={styles.availabilitySection}>
                <h3>{t('available_time_gaps') || 'Available time gaps'}</h3>
                <p>{settings?.startTime || '08:00'} – {minsToTime(dayEnd)}</p>
                {roomAvailability.length ? (
                  <ul className={styles.availabilityList}>
                    {roomAvailability.map((gap) => (
                      <li key={`${gap.startTime}-${gap.endTime}`}>✓ {gap.startTime} – {gap.endTime}</li>
                    ))}
                  </ul>
                ) : (
                  <div className={styles.noAvailability}>{t('no_available_time_gaps') || 'No open time remains during working hours.'}</div>
                )}
              </section>
            </article>
          </section>
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

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setEditingSession(null); }}
        title={editingSession ? (t('edit_session') || 'Edit Session') : (t('add_session') || 'Add Session')}
      >
        {isManagerOrAdmin && (
          <form onSubmit={handleSaveSession} className={styles.addSessionForm}>
            <Select
              label={t('classes')}
              value={newSessionClassId}
              onChange={(event) => setNewSessionClassId(event.target.value)}
              options={classOptions}
              required
            />
            <Select label={t('day')} value={newSessionDay} onChange={(event) => setNewSessionDay(event.target.value as DayOfWeek)} options={DAYS.map((day) => ({ value: day, label: t(day) }))} required />
            <div className={styles.timeInputs}>
              <Input type="time" label={t('start_time')} value={newSessionStart} onChange={(event) => setNewSessionStart(event.target.value)} required />
              <Input type="time" label={t('end_time')} value={newSessionEnd} onChange={(event) => setNewSessionEnd(event.target.value)} required />
            </div>
            <Select label={t('physical_class') || 'Physical classroom'} value={newSessionRoom} onChange={(event) => setNewSessionRoom(event.target.value)} options={roomOptions} required />
            <div className={styles.modalActions}>
              <Button type="button" variant="ghost" onClick={() => { setIsAddModalOpen(false); setEditingSession(null); }}>{t('cancel')}</Button>
              <Button type="submit">{editingSession ? (t('save') || 'Save') : t('add')}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
