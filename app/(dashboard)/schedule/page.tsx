'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { classesStorage, teachersStorage, settingsStorage } from '@/lib/storage';
import { ClassItem, Teacher, DayOfWeek, CenterSettings } from '@/lib/types';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import styles from './Schedule.module.css';

const DAYS: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 08:00 to 22:00

const START_HOUR = 8;
const PIXELS_PER_HOUR = 100;

// Convert HH:mm to minutes
function timeToMins(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Convert minutes to HH:mm
function minsToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export default function SchedulePage() {
  const { t } = useTranslation();
  const { user, isManagerOrAdmin, isTeacher, isStudent } = useAuth();
  const { clearNotification } = useNotifications();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [settings, setSettings] = useState<CenterSettings | null>(null);

  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterRoom, setFilterRoom] = useState('');

  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [draggingBlock, setDraggingBlock] = useState<{ classId: string, slotIndex: number } | null>(null);

  // Add Session State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSessionClassId, setNewSessionClassId] = useState('');
  const [newSessionDay, setNewSessionDay] = useState<DayOfWeek>('monday');
  const [newSessionStart, setNewSessionStart] = useState('08:00');
  const [newSessionEnd, setNewSessionEnd] = useState('10:00');

  // Edit Session State
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');

  useEffect(() => {
    async function loadData() {
      setClasses((await classesStorage.getAll()).filter(c => c.status === 'active'));
      setTeachers(await teachersStorage.getAll());
      setSettings(await settingsStorage.get());
    }
    loadData();
    clearNotification('schedule');
  }, []);

  const todayDay = DAYS[new Date().getDay()];

  // Process classes to schedule blocks
  const filteredClasses = classes.filter(c => {
    // Role-based filtering
    if (isStudent && user?.studentId && !c.enrolledStudentIds.includes(user.studentId)) return false;
    if (isTeacher && user?.teacherId && c.teacherId !== user.teacherId) return false;

    // UI filters (only for admins/managers)
    if (isManagerOrAdmin) {
      if (filterTeacher && c.teacherId !== filterTeacher) return false;
      if (filterRoom && c.room !== filterRoom) return false;
    }

    return true;
  });

  const getTeacherName = (id: string) => {
    const teacher = teachers.find(t => t.id === id);
    return teacher ? `${teacher.firstName} ${teacher.lastName}` : '';
  };

  const teacherOptions = [
    { value: '', label: t('filter_by_teacher') || 'All Teachers' },
    ...teachers.map(t => ({ value: t.id, label: `${t.firstName} ${t.lastName}` }))
  ];

  const uniqueRooms = Array.from(new Set(classes.map(c => c.room))).sort();
  const roomOptions = [
    { value: '', label: t('filter_by_room') || 'All Rooms' },
    ...uniqueRooms.map(r => ({ value: r, label: r }))
  ];

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, classId: string, slotIndex: number) => {
    if (!isManagerOrAdmin) return;
    setDraggingBlock({ classId, slotIndex });
    e.dataTransfer.setData('text/plain', JSON.stringify({ classId, slotIndex }));
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires a tiny timeout to apply dragging styles correctly if modifying DOM
    setTimeout(() => {
      // optional: add a global class or state if needed
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetDay: DayOfWeek) => {
    e.preventDefault();
    if (!isManagerOrAdmin) return;
    const dataStr = e.dataTransfer.getData('text/plain');
    if (!dataStr) {
      setDraggingBlock(null);
      return;
    }

    try {
      const { classId, slotIndex } = JSON.parse(dataStr);
      const targetClass = classes.find(c => c.id === classId);
      if (!targetClass) return;

      const slot = targetClass.schedule[slotIndex];
      const durationMins = timeToMins(slot.endTime) - timeToMins(slot.startTime);

      // Calculate new start time based on drop X coordinate
      // e.currentTarget is the dayRowContent div
      const rect = e.currentTarget.getBoundingClientRect();
      const isRTL = document.documentElement.dir === 'rtl' || document.body.dir === 'rtl' || getComputedStyle(document.body).direction === 'rtl';

      const x = isRTL ? rect.right - e.clientX : e.clientX - rect.left;

      // Calculate total minutes from the start (0 = 8:00)
      let droppedMinsFromStart = (x / PIXELS_PER_HOUR) * 60;

      // Snap to nearest 15 minutes
      droppedMinsFromStart = Math.round(droppedMinsFromStart / 15) * 15;

      let newStartMins = (START_HOUR * 60) + droppedMinsFromStart;

      // Constrain to boundaries (e.g., don't go before 8:00 or after 18:00 minus duration)
      const minStart = START_HOUR * 60;
      const maxStart = (22 * 60) - durationMins;
      if (newStartMins < minStart) newStartMins = minStart;
      if (newStartMins > maxStart) newStartMins = maxStart;

      const newEndMins = newStartMins + durationMins;

      // Update state
      const updatedSchedule = [...targetClass.schedule];
      updatedSchedule[slotIndex] = {
        ...slot,
        day: targetDay,
        startTime: minsToTime(newStartMins),
        endTime: minsToTime(newEndMins)
      };

      const updatedClass = { ...targetClass, schedule: updatedSchedule };

      // Persist
      await classesStorage.update(classId, { schedule: updatedSchedule });

      // Update local state
      setClasses(prev => prev.map(c => c.id === classId ? updatedClass : c));

    } catch (err) {
      console.error('Drop error:', err);
    }

    setDraggingBlock(null);
  };

  const handleDragEnd = () => {
    setDraggingBlock(null);
  };

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionClassId || !newSessionStart || !newSessionEnd) return;

    const targetClass = classes.find(c => c.id === newSessionClassId);
    if (!targetClass) return;

    const newSlot = {
      day: newSessionDay,
      startTime: newSessionStart,
      endTime: newSessionEnd
    };

    const updatedSchedule = [...targetClass.schedule, newSlot];
    const updatedClass = { ...targetClass, schedule: updatedSchedule };

    await classesStorage.update(newSessionClassId, { schedule: updatedSchedule });
    setClasses(prev => prev.map(c => c.id === newSessionClassId ? updatedClass : c));

    setIsAddModalOpen(false);
    setNewSessionClassId('');
  };

  const startEditSlot = (idx: number, startTime: string, endTime: string) => {
    setEditingSlotIndex(idx);
    setEditStartTime(startTime);
    setEditEndTime(endTime);
  };

  const handleSaveSlot = async (idx: number) => {
    if (!selectedClass || !editStartTime || !editEndTime) return;

    const updatedSchedule = [...selectedClass.schedule];
    updatedSchedule[idx] = {
      ...updatedSchedule[idx],
      startTime: editStartTime,
      endTime: editEndTime
    };

    const updatedClass = { ...selectedClass, schedule: updatedSchedule };
    await classesStorage.update(selectedClass.id, { schedule: updatedSchedule });
    setClasses(prev => prev.map(c => c.id === selectedClass.id ? updatedClass : c));
    setSelectedClass(updatedClass);
    setEditingSlotIndex(null);
  };

  const handleDeleteSlot = async (idx: number) => {
    if (!selectedClass) return;
    if (!confirm(t('confirm_delete') || 'Are you sure you want to delete this session?')) return;

    const updatedSchedule = selectedClass.schedule.filter((_, i) => i !== idx);
    const updatedClass = { ...selectedClass, schedule: updatedSchedule };

    await classesStorage.update(selectedClass.id, { schedule: updatedSchedule });
    setClasses(prev => prev.map(c => c.id === selectedClass.id ? updatedClass : c));
    setSelectedClass(updatedClass);
  };

  const userSessions = filteredClasses.flatMap(cls => 
    cls.schedule.map(slot => ({
      classId: cls.id,
      className: cls.name,
      subject: cls.subject,
      color: cls.color || '#06b6d4',
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: cls.room
    }))
  ).sort((a, b) => {
    const dayOrder = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
    if (dayOrder[a.day] !== dayOrder[b.day]) return dayOrder[a.day] - dayOrder[b.day];
    return timeToMins(a.startTime) - timeToMins(b.startTime);
  });

  return (
    <div className="page-container animate-fadeIn">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">{t('weekly_schedule')}</h1>
      </div>

      <div className={styles.controls}>
        {isManagerOrAdmin && (
          <>
            <div className={styles.filters}>
              <Select
                value={filterTeacher}
                onChange={(e) => setFilterTeacher(e.target.value)}
                options={teacherOptions}
                style={{ width: '250px' }}
              />
              <Select
                value={filterRoom}
                onChange={(e) => setFilterRoom(e.target.value)}
                options={roomOptions}
                style={{ width: '250px' }}
              />
            </div>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('add_session') || 'Add Session'}
            </Button>
          </>
        )}
      </div>

      {!isManagerOrAdmin ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {userSessions.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {t('no_sessions_found') || 'No sessions scheduled for this week.'}
            </div>
          ) : (
            userSessions.map((session, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '1rem', borderLeft: `4px solid ${session.color}`, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{t(session.day)}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {session.startTime} - {session.endTime}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: session.color }}>{session.subject}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{session.className} • {session.room}</div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className={styles.scheduleGrid}>
        {/* Header Row */}
        <div className={styles.headerRow}>
          <div className={styles.cornerHeader}>{t('day')} / {t('time')}</div>
          <div className={styles.timeHeadersContainer}>
            {Array.from({ length: 14 }, (_, i) => i + 8).map(hour => (
              <div key={hour} className={styles.timeHeaderBlock}>
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Body */}
        <div className={styles.bodyContainer}>
          <div className={styles.gridBody}>
            {/* Day Rows */}
            {DAYS.map(day => (
              <div
                key={day}
                className={`${styles.dayRow} ${day === todayDay ? styles.todayRow : ''}`}
              >
                <div className={`${styles.dayLabel} ${day === todayDay ? styles.todayLabel : ''}`}>
                  {t(day)}
                </div>

                <div
                  className={styles.dayRowContent}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day)}
                >
                  <div className={styles.gridLines}>
                    {Array.from({ length: 14 }).map((_, i) => (
                      <div key={i} className={styles.gridLineHour}></div>
                    ))}
                  </div>

                  {/* Render session tags for this day */}
                  {(() => {
                    // Collect all sessions for this day
                    const daySessions: { cls: typeof filteredClasses[0]; slot: typeof filteredClasses[0]['schedule'][0]; slotIdx: number; startMins: number; endMins: number; track?: number }[] = [];
                    filteredClasses.forEach(cls => {
                      cls.schedule.forEach((slot, slotIdx) => {
                        if (slot.day !== day) return;
                        daySessions.push({
                          cls,
                          slot,
                          slotIdx,
                          startMins: timeToMins(slot.startTime),
                          endMins: timeToMins(slot.endTime),
                        });
                      });
                    });

                    // Sort by start time, then duration (longest first)
                    daySessions.sort((a, b) => {
                      if (a.startMins !== b.startMins) return a.startMins - b.startMins;
                      return (b.endMins - b.startMins) - (a.endMins - a.startMins);
                    });

                    // Assign tracks to prevent overlapping
                    const tracks: number[] = []; // stores the end time of the last session in each track
                    daySessions.forEach(session => {
                      let placed = false;
                      for (let i = 0; i < tracks.length; i++) {
                        if (tracks[i] <= session.startMins) {
                          session.track = i;
                          tracks[i] = session.endMins;
                          placed = true;
                          break;
                        }
                      }
                      if (!placed) {
                        session.track = tracks.length;
                        tracks.push(session.endMins);
                      }
                    });

                    return daySessions.map((session) => {
                      const { cls, slot, slotIdx, startMins, endMins, track = 0 } = session;
                      const inlineStartPixels = ((startMins - (START_HOUR * 60)) / 60) * PIXELS_PER_HOUR;
                      const widthPixels = ((endMins - startMins) / 60) * PIXELS_PER_HOUR;

                      const isDragging = draggingBlock?.classId === cls.id && draggingBlock?.slotIndex === slotIdx;

                      return (
                        <button
                          key={`${cls.id}-${slotIdx}`}
                          type="button"
                          draggable={isManagerOrAdmin}
                          onDragStart={(e) => handleDragStart(e, cls.id, slotIdx)}
                          onDragEnd={handleDragEnd}
                          className={`${styles.sessionTag} ${isDragging ? styles.isDragging : ''}`}
                          style={{
                            backgroundColor: cls.color || '#06b6d4',
                            insetInlineStart: `${inlineStartPixels}px`,
                            width: `${widthPixels}px`,
                            top: `${10 + (track * 22)}px`
                          }}
                          onClick={() => setSelectedClass(cls)}
                          title={`${cls.subject} — ${cls.name}\n${slot.startTime} - ${slot.endTime}`}
                        >
                          <span className={styles.tagSubject}>{cls.subject}</span>
                          <span className={styles.tagClass}>{cls.name}</span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Class Details Modal */}
      <Modal isOpen={!!selectedClass} onClose={() => setSelectedClass(null)} title={t('class_details')}>
        {selectedClass && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: selectedClass.color || '#06b6d4' }}></div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{selectedClass.name}</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
              <div><span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{t('subject')}</span><div style={{ fontWeight: 500 }}>{selectedClass.subject}</div></div>
              <div><span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{t('teacher')}</span><div style={{ fontWeight: 500 }}>{getTeacherName(selectedClass.teacherId)}</div></div>
              <div><span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{t('room')}</span><div style={{ fontWeight: 500 }}>{selectedClass.room}</div></div>
              <div><span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{t('enrolled_students')}</span><div style={{ fontWeight: 500 }}>{selectedClass.enrolledStudentIds.length} / {selectedClass.maxCapacity}</div></div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-teal)', marginBottom: '0.5rem' }}>{t('class_schedule')}</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedClass.schedule.map((s, idx) => (
                  <li key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                    {editingSlotIndex === idx ? (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong style={{ minWidth: '80px' }}>{t(s.day)}</strong>
                        <Input
                          type="time"
                          value={editStartTime}
                          onChange={e => setEditStartTime(e.target.value)}
                          style={{ width: '120px' }}
                        />
                        <span>-</span>
                        <Input
                          type="time"
                          value={editEndTime}
                          onChange={e => setEditEndTime(e.target.value)}
                          style={{ width: '120px' }}
                        />
                        <Button size="sm" onClick={() => handleSaveSlot(idx)}>{t('save') || 'Save'}</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingSlotIndex(null)}>{t('cancel') || 'Cancel'}</Button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><strong>{t(s.day)}</strong>: {s.startTime} - {s.endTime}</div>
                        {isManagerOrAdmin && (
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button
                              onClick={() => startEditSlot(idx, s.startTime, s.endTime)}
                              style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', padding: '0.25rem 0.5rem' }}
                            >
                              {t('edit') || 'Edit'}
                            </button>
                            <button
                              onClick={() => handleDeleteSlot(idx)}
                              style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '0.25rem 0.5rem' }}
                            >
                              {t('delete') || 'Delete'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Session Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={t('add_session') || 'Add Session'}>
        <form onSubmit={handleAddSession} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{t('class') || 'Class'}</label>
            <Select
              value={newSessionClassId}
              onChange={e => setNewSessionClassId(e.target.value)}
              options={[
                { value: '', label: t('select_class') || 'Select Class...' },
                ...classes.map(c => ({ value: c.id, label: `${c.subject} - ${c.name}` }))
              ]}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{t('day') || 'Day'}</label>
            <Select
              value={newSessionDay}
              onChange={e => setNewSessionDay(e.target.value as DayOfWeek)}
              options={DAYS.map(day => ({ value: day, label: t(day) || day }))}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{t('start_time') || 'Start Time'}</label>
              <Input
                type="time"
                value={newSessionStart}
                onChange={e => setNewSessionStart(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{t('end_time') || 'End Time'}</label>
              <Input
                type="time"
                value={newSessionEnd}
                onChange={e => setNewSessionEnd(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>{t('cancel') || 'Cancel'}</Button>
            <Button type="submit">{t('add') || 'Add'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
