'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { ClassItem } from '@/lib/types';
import styles from './page.module.css';

// ---- Types ----
interface ResourceFile {
  _id: string;
  key: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
}

interface ResourceSection {
  id: string;
  classId: string;
  name: string;
  createdBy: string;
  files: ResourceFile[];
  createdAt: string;
  updatedAt: string;
}

interface UploadingFile {
  id: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'confirming' | 'done' | 'error';
  error?: string;
}

// ---- Helpers ----
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() || '';
}

function getFileIconClass(mimeType: string, fileName: string): string {
  if (mimeType === 'application/pdf') return styles.fileIconPdf;
  if (mimeType.startsWith('image/')) return styles.fileIconImg;
  if (
    mimeType.includes('word') ||
    mimeType.includes('document') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation') ||
    ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(getFileExtension(fileName))
  )
    return styles.fileIconDoc;
  return styles.fileIconDefault;
}

function getFileIconLabel(mimeType: string, fileName: string): string {
  if (mimeType === 'application/pdf') return 'PDF';
  const ext = getFileExtension(fileName);
  if (mimeType.startsWith('image/')) return ext.toUpperCase() || 'IMG';
  if (['doc', 'docx'].includes(ext)) return 'DOC';
  if (['xls', 'xlsx'].includes(ext)) return 'XLS';
  if (['ppt', 'pptx'].includes(ext)) return 'PPT';
  if (['zip', 'rar', '7z'].includes(ext)) return 'ZIP';
  return ext.toUpperCase() || 'FILE';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ---- Section Presets ----
const SECTION_PRESETS_FR = ['Cours', 'Exercices', 'Résumé', 'Examens', 'TD', 'TP', 'Devoirs'];
const SECTION_PRESETS_EN = ['Lessons', 'Exercises', 'Summary', 'Exams', 'Tutorials', 'Labs', 'Homework'];

// ---- Component ----
export default function ResourcesPage() {
  const { user, isStudent, isTeacher, isManagerOrAdmin } = useAuth();
  const { t, language } = useTranslation();

  // Data states
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [sections, setSections] = useState<ResourceSection[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingSections, setLoadingSections] = useState(false);

  // Upload states
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, UploadingFile[]>>(new Map());

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [creatingSection, setCreatingSection] = useState(false);

  // Drag state per section
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);

  const canManage = isManagerOrAdmin || isTeacher;

  // ---- Fetch classes ----
  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await fetch('/api/classes');
        if (!res.ok) throw new Error();
        const data: ClassItem[] = await res.json();
        // Filter: active only. For teachers, only their assigned classes.
        let filtered = data.filter((c) => c.status === 'active');
        if (isTeacher && user?.teacherId) {
          // Fetch teacher record to get assignedClassIds
          try {
            const tRes = await fetch(`/api/teachers/${user.teacherId}`);
            if (tRes.ok) {
              const teacher = await tRes.json();
              const assignedIds = new Set(teacher.assignedClassIds || []);
              filtered = filtered.filter((c) => assignedIds.has(c.id));
            }
          } catch {
            // fallback: show all
          }
        }
        if (isStudent && user?.studentId) {
          try {
            const sRes = await fetch(`/api/students/${user.studentId}`);
            if (sRes.ok) {
              const student = await sRes.json();
              const enrolledIds = new Set(student.enrolledClassIds || []);
              filtered = filtered.filter((c) => enrolledIds.has(c.id));
            }
          } catch {
            // fallback: show all
          }
        }
        setClasses(filtered);
        // Auto-select first class
        if (filtered.length > 0 && !selectedClassId) {
          setSelectedClassId(filtered[0].id);
        }
      } catch {
        setClasses([]);
      } finally {
        setLoadingClasses(false);
      }
    }
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Fetch sections for selected class ----
  const fetchSections = useCallback(async () => {
    if (!selectedClassId) {
      setSections([]);
      return;
    }
    setLoadingSections(true);
    try {
      const res = await fetch(`/api/resources?classId=${selectedClassId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSections(data);
    } catch {
      setSections([]);
    } finally {
      setLoadingSections(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  // ---- Toggle section expand ----
  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ---- Create section ----
  const handleCreateSection = async () => {
    if (!newSectionName.trim() || !selectedClassId || !user) return;
    setCreatingSection(true);
    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClassId,
          name: newSectionName.trim(),
          createdBy: user.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to create section');
        return;
      }
      setNewSectionName('');
      setShowCreateModal(false);
      fetchSections();
    } catch {
      alert('Failed to create section');
    } finally {
      setCreatingSection(false);
    }
  };

  // ---- Delete section ----
  const handleDeleteSection = async (sectionId: string, sectionName: string) => {
    const msg =
      language === 'fr'
        ? `Supprimer la section "${sectionName}" et tous ses fichiers ?`
        : `Delete section "${sectionName}" and all its files?`;
    if (!confirm(msg)) return;
    try {
      await fetch(`/api/resources/${sectionId}`, { method: 'DELETE' });
      fetchSections();
    } catch {
      alert('Failed to delete section');
    }
  };

  // ---- File upload ----
  const handleFileUpload = async (sectionId: string, files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;

    const fileArray = Array.from(files);

    // Validate sizes
    for (const file of fileArray) {
      if (file.size > MAX_FILE_SIZE) {
        alert(
          language === 'fr'
            ? `"${file.name}" dépasse la taille maximale de 50 Mo`
            : `"${file.name}" exceeds the 50MB size limit`
        );
        return;
      }
    }

    // Create upload tracking entries
    const newUploads: UploadingFile[] = fileArray.map((f) => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      fileName: f.name,
      progress: 0,
      status: 'uploading' as const,
    }));

    setUploadingFiles((prev) => {
      const next = new Map(prev);
      next.set(sectionId, [...(next.get(sectionId) || []), ...newUploads]);
      return next;
    });

    // Upload each file
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const uploadEntry = newUploads[i];

      try {
        // 1. Get presigned URL
        const urlRes = await fetch('/api/resources/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classId: selectedClassId,
            sectionId,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
          }),
        });
        if (!urlRes.ok) throw new Error('Failed to get upload URL');
        const { uploadUrl, key } = await urlRes.json();

        // 2. Upload to B2 via presigned URL using XMLHttpRequest for progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', uploadUrl, true);
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100);
              setUploadingFiles((prev) => {
                const next = new Map(prev);
                const list = next.get(sectionId) || [];
                const idx = list.findIndex((u) => u.id === uploadEntry.id);
                if (idx >= 0) {
                  list[idx] = { ...list[idx], progress };
                  next.set(sectionId, [...list]);
                }
                return next;
              });
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Upload failed with status ${xhr.status}`));
          };
          xhr.onerror = () => reject(new Error('Upload failed'));
          xhr.send(file);
        });

        // 3. Update status to confirming
        setUploadingFiles((prev) => {
          const next = new Map(prev);
          const list = next.get(sectionId) || [];
          const idx = list.findIndex((u) => u.id === uploadEntry.id);
          if (idx >= 0) {
            list[idx] = { ...list[idx], status: 'confirming', progress: 100 };
            next.set(sectionId, [...list]);
          }
          return next;
        });

        // 4. Confirm upload in DB
        const confirmRes = await fetch('/api/resources/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionId,
            key,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || 'application/octet-stream',
            uploadedBy: user.id,
          }),
        });
        if (!confirmRes.ok) throw new Error('Failed to confirm upload');

        // 5. Mark done
        setUploadingFiles((prev) => {
          const next = new Map(prev);
          const list = next.get(sectionId) || [];
          const idx = list.findIndex((u) => u.id === uploadEntry.id);
          if (idx >= 0) {
            list[idx] = { ...list[idx], status: 'done' };
            next.set(sectionId, [...list]);
          }
          return next;
        });
      } catch (err: any) {
        setUploadingFiles((prev) => {
          const next = new Map(prev);
          const list = next.get(sectionId) || [];
          const idx = list.findIndex((u) => u.id === uploadEntry.id);
          if (idx >= 0) {
            list[idx] = { ...list[idx], status: 'error', error: err.message };
            next.set(sectionId, [...list]);
          }
          return next;
        });
      }
    }

    // Refresh sections
    fetchSections();

    // Clear completed uploads after a delay
    setTimeout(() => {
      setUploadingFiles((prev) => {
        const next = new Map(prev);
        const list = (next.get(sectionId) || []).filter(
          (u) => u.status !== 'done' && u.status !== 'error'
        );
        if (list.length === 0) next.delete(sectionId);
        else next.set(sectionId, list);
        return next;
      });
    }, 3000);
  };

  // ---- Download file ----
  const handleDownload = async (file: ResourceFile) => {
    try {
      const res = await fetch('/api/resources/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: file.key }),
      });
      if (!res.ok) throw new Error();
      const { downloadUrl } = await res.json();
      // Create a temporary link and click it
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = file.fileName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      alert(language === 'fr' ? 'Échec du téléchargement' : 'Download failed');
    }
  };

  // ---- View file (open in new tab) ----
  const handleView = async (file: ResourceFile) => {
    try {
      const res = await fetch('/api/resources/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: file.key }),
      });
      if (!res.ok) throw new Error();
      const { downloadUrl } = await res.json();
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    } catch {
      alert(language === 'fr' ? 'Impossible d\'ouvrir le fichier' : 'Failed to open file');
    }
  };

  // ---- Delete file ----
  const handleDeleteFile = async (sectionId: string, fileId: string, fileName: string) => {
    const msg =
      language === 'fr'
        ? `Supprimer "${fileName}" ?`
        : `Delete "${fileName}"?`;
    if (!confirm(msg)) return;
    try {
      await fetch(`/api/resources/${sectionId}/files?fileId=${fileId}`, {
        method: 'DELETE',
      });
      fetchSections();
    } catch {
      alert('Failed to delete file');
    }
  };

  // ---- Drag & Drop handlers ----
  const handleDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingSectionId(sectionId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingSectionId(null);
  };

  const handleDrop = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingSectionId(null);
    handleFileUpload(sectionId, e.dataTransfer.files);
  };

  // ---- Presets based on language ----
  const presets = language === 'fr' ? SECTION_PRESETS_FR : SECTION_PRESETS_EN;

  // ---- Render ----
  if (loadingClasses) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>
            {t('resources') || (language === 'fr' ? 'Ressources' : 'Resources')}
          </h1>
          <p className={styles.pageSubtitle}>
            {t('resources_subtitle') ||
              (language === 'fr'
                ? 'Gérez et partagez les fichiers et documents par classe'
                : 'Manage and share files and documents by class')}
          </p>
        </div>

        {canManage && selectedClassId && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('new_section') || (language === 'fr' ? 'Nouvelle section' : 'New Section')}
          </button>
        )}
      </div>

      {/* Class Filter */}
      {classes.length > 0 && (
        <div className={styles.filterBar}>
          <span className={styles.filterLabel}>
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            {t('filter_by_class') || (language === 'fr' ? 'Filtrer par classe' : 'Filter by Class')}:
          </span>
          <div className={styles.classChips}>
            {classes.map((cls) => (
              <button
                key={cls.id}
                className={`${styles.classChip} ${selectedClassId === cls.id ? styles.classChipActive : ''}`}
                onClick={() => setSelectedClassId(cls.id)}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: cls.color || 'var(--accent-teal)',
                    marginRight: 6,
                  }}
                />
                {cls.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No class selected */}
      {!selectedClassId && classes.length > 0 && (
        <div className={styles.selectClassPrompt}>
          <div className={styles.selectClassIcon}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h2 className={styles.selectClassTitle}>
            {t('select_class') || (language === 'fr' ? 'Sélectionner une classe' : 'Select a Class')}
          </h2>
          <p className={styles.selectClassSubtitle}>
            {language === 'fr'
              ? 'Choisissez une classe pour voir et gérer ses ressources'
              : 'Choose a class to view and manage its resources'}
          </p>
        </div>
      )}

      {/* No classes at all */}
      {classes.length === 0 && !loadingClasses && (
        <div className={styles.emptyState}>
          <svg className={styles.emptyIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <h3 className={styles.emptyTitle}>
            {language === 'fr' ? 'Aucune classe disponible' : 'No Classes Available'}
          </h3>
          <p className={styles.emptySubtitle}>
            {language === 'fr'
              ? 'Vous n\'êtes inscrit à aucune classe pour le moment.'
              : 'You are not enrolled in any classes yet.'}
          </p>
        </div>
      )}

      {/* Sections Loading */}
      {loadingSections && selectedClassId && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
        </div>
      )}

      {/* Sections List */}
      {!loadingSections && selectedClassId && (
        <div className={styles.sectionsContainer}>
          {sections.length === 0 ? (
            <div className={styles.emptyState}>
              <svg className={styles.emptyIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              <h3 className={styles.emptyTitle}>
                {language === 'fr' ? 'Aucune section' : 'No Sections Yet'}
              </h3>
              <p className={styles.emptySubtitle}>
                {canManage
                  ? language === 'fr'
                    ? 'Créez une section pour commencer à partager des fichiers avec vos étudiants'
                    : 'Create a section to start sharing files with your students'
                  : language === 'fr'
                  ? 'Aucune ressource n\'a encore été partagée pour cette classe'
                  : 'No resources have been shared for this class yet'}
              </p>
            </div>
          ) : (
            sections.map((section, idx) => {
              const isExpanded = expandedSections.has(section.id);
              const sectionUploads = uploadingFiles.get(section.id) || [];

              return (
                <div
                  key={section.id}
                  className={styles.sectionCard}
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  {/* Section Header */}
                  <div className={styles.sectionHeader} onClick={() => toggleSection(section.id)}>
                    <div className={styles.sectionHeaderLeft}>
                      <div className={styles.sectionIcon}>
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className={styles.sectionName}>{section.name}</div>
                        <div className={styles.sectionMeta}>
                          {section.files.length}{' '}
                          {language === 'fr'
                            ? section.files.length === 1
                              ? 'fichier'
                              : 'fichiers'
                            : section.files.length === 1
                            ? 'file'
                            : 'files'}
                        </div>
                      </div>
                    </div>
                    <div className={styles.sectionHeaderRight}>
                      {section.files.length > 0 && (
                        <span className={styles.fileCountBadge}>{section.files.length}</span>
                      )}
                      {canManage && (
                        <div className={styles.sectionActions}>
                          <button
                            className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                            title={language === 'fr' ? 'Supprimer la section' : 'Delete section'}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSection(section.id, section.name);
                            }}
                          >
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      )}
                      <svg
                        className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Section Content */}
                  {isExpanded && (
                    <div className={styles.sectionContent}>
                      {/* Files List */}
                      {section.files.length > 0 ? (
                        <div className={styles.filesList}>
                          {section.files.map((file) => (
                            <div key={file._id} className={styles.fileRow}>
                              <div
                                className={`${styles.fileIconWrapper} ${getFileIconClass(file.mimeType, file.fileName)}`}
                              >
                                {getFileIconLabel(file.mimeType, file.fileName)}
                              </div>
                              <div className={styles.fileInfo}>
                                <div className={styles.fileName}>{file.fileName}</div>
                                <div className={styles.fileMeta}>
                                  <span>{formatFileSize(file.fileSize)}</span>
                                  <span>{formatDate(file.uploadedAt)}</span>
                                </div>
                              </div>
                              <div className={styles.fileActions}>
                                <button
                                  className={styles.fileActionBtn}
                                  onClick={() => handleView(file)}
                                  title={language === 'fr' ? 'Voir' : 'View'}
                                >
                                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                    />
                                  </svg>
                                </button>
                                <button
                                  className={styles.fileActionBtn}
                                  onClick={() => handleDownload(file)}
                                  title={language === 'fr' ? 'Télécharger' : 'Download'}
                                >
                                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                    />
                                  </svg>
                                </button>
                                {canManage && (
                                  <button
                                    className={`${styles.fileActionBtn} ${styles.fileDeleteBtn}`}
                                    onClick={() => handleDeleteFile(section.id, file._id, file.fileName)}
                                    title={language === 'fr' ? 'Supprimer' : 'Delete'}
                                  >
                                    <svg
                                      width="16"
                                      height="16"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                      />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.noFiles}>
                          {language === 'fr'
                            ? 'Aucun fichier dans cette section'
                            : 'No files in this section'}
                        </p>
                      )}

                      {/* Upload progress */}
                      {sectionUploads.length > 0 && (
                        <div className={styles.uploadProgress}>
                          {sectionUploads.map((u) => (
                            <div key={u.id} className={styles.uploadProgressItem}>
                              <div className={styles.uploadProgressInfo}>
                                <div className={styles.uploadProgressName}>{u.fileName}</div>
                                {u.status === 'uploading' && (
                                  <div className={styles.uploadProgressBar}>
                                    <div
                                      className={styles.uploadProgressFill}
                                      style={{ width: `${u.progress}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                              <span
                                className={`${styles.uploadProgressStatus} ${
                                  u.status === 'done'
                                    ? styles.uploadSuccess
                                    : u.status === 'error'
                                    ? styles.uploadError
                                    : ''
                                }`}
                              >
                                {u.status === 'uploading' && `${u.progress}%`}
                                {u.status === 'confirming' &&
                                  (language === 'fr' ? 'Finalisation...' : 'Confirming...')}
                                {u.status === 'done' && '✓'}
                                {u.status === 'error' && '✗'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Upload Area (only for managers/teachers) */}
                      {canManage && (
                        <div
                          className={`${styles.uploadArea} ${
                            draggingSectionId === section.id ? styles.uploadAreaDragging : ''
                          }`}
                          onDragOver={(e) => handleDragOver(e, section.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, section.id)}
                        >
                          <input
                            type="file"
                            multiple
                            className={styles.hiddenInput}
                            onChange={(e) => handleFileUpload(section.id, e.target.files)}
                            onClick={(e) => ((e.target as HTMLInputElement).value = '')}
                          />
                          <svg className={styles.uploadIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          <div className={styles.uploadText}>
                            <span className={styles.uploadTextAccent}>
                              {language === 'fr' ? 'Cliquez pour uploader' : 'Click to upload'}
                            </span>
                            {' '}
                            {language === 'fr' ? 'ou glissez-déposez' : 'or drag and drop'}
                          </div>
                          <div className={styles.uploadHint}>
                            PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, IMG — Max 50MB
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Create Section Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              {language === 'fr' ? 'Nouvelle Section' : 'New Section'}
            </h2>

            <div className="form-group">
              <label className="form-label">
                {language === 'fr' ? 'Nom de la section' : 'Section Name'}
              </label>
              <input
                type="text"
                className="form-input"
                placeholder={language === 'fr' ? 'Ex: Cours, Exercices...' : 'e.g. Lessons, Exercises...'}
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSection()}
                autoFocus
              />
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <span
                className="form-label"
                style={{ display: 'block', marginBottom: '0.5rem' }}
              >
                {language === 'fr' ? 'Suggestions :' : 'Suggestions:'}
              </span>
              <div className={styles.presetChips}>
                {presets.map((p) => (
                  <button
                    key={p}
                    className={styles.presetChip}
                    onClick={() => setNewSectionName(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                {t('cancel') || (language === 'fr' ? 'Annuler' : 'Cancel')}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateSection}
                disabled={!newSectionName.trim() || creatingSection}
              >
                {creatingSection
                  ? language === 'fr'
                    ? 'Création...'
                    : 'Creating...'
                  : t('confirm') || (language === 'fr' ? 'Créer' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
