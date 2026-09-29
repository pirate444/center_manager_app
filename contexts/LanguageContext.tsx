'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'fr' | 'en';
type Dir = 'rtl' | 'ltr';

interface LanguageContextType {
  t: (key: string) => string;
  language: Language;
  setLanguage: (lang: Language) => void;
  dir: Dir;
  isRTL: boolean;
}

const translations: Record<string, Record<Language, string>> = {
  // Common
  app_name: { fr: 'Plateforme de Gestion de Centre Éducatif', en: 'Education Center Management Platform' },
  center_name: { fr: 'Nom du Centre', en: 'Center Name' },
  dashboard: { fr: 'Tableau de bord', en: 'Dashboard' },
  students: { fr: 'Étudiants', en: 'Students' },
  teachers: { fr: 'Enseignants', en: 'Teachers' },
  classes: { fr: 'Classes', en: 'Classes' },
  schedule: { fr: 'Emploi du temps', en: 'Schedule' },
  attendance: { fr: 'Présence', en: 'Attendance' },
  billing: { fr: 'Facturation', en: 'Billing' },
  reports: { fr: 'Rapports', en: 'Reports' },
  messages: { fr: 'Messages', en: 'Messages' },
  settings: { fr: 'Paramètres', en: 'Settings' },
  search: { fr: 'Rechercher', en: 'Search' },
  filter: { fr: 'Filtrer', en: 'Filter' },
  add: { fr: 'Ajouter', en: 'Add' },
  edit: { fr: 'Modifier', en: 'Edit' },
  delete: { fr: 'Supprimer', en: 'Delete' },
  save: { fr: 'Enregistrer', en: 'Save' },
  cancel: { fr: 'Annuler', en: 'Cancel' },
  confirm: { fr: 'Confirmer', en: 'Confirm' },
  close: { fr: 'Fermer', en: 'Close' },
  back: { fr: 'Retour', en: 'Back' },
  next: { fr: 'Suivant', en: 'Next' },
  previous: { fr: 'Précédent', en: 'Previous' },
  loading: { fr: 'Chargement...', en: 'Loading...' },
  no_data: { fr: 'Aucune donnée', en: 'No data' },
  export: { fr: 'Exporter', en: 'Export' },
  import: { fr: 'Importer', en: 'Import' },
  actions: { fr: 'Actions', en: 'Actions' },
  status: { fr: 'Statut', en: 'Status' },
  total: { fr: 'Total', en: 'Total' },
  view_all: { fr: 'Voir tout', en: 'View all' },
  view_details: { fr: 'Voir les détails', en: 'View details' },
  logout: { fr: 'Déconnexion', en: 'Logout' },
  login: { fr: 'Connexion', en: 'Login' },
  welcome: { fr: 'Bienvenue', en: 'Welcome' },
  welcome_back: { fr: 'Bon retour', en: 'Welcome back' },

  // Absence Journal
  absence_journal: { fr: 'Journal des absences', en: 'Absence Journal' },
  absence_journal_desc: { fr: 'Consultez le journal mensuel de présence et d\'absence par classe', en: 'View the monthly attendance journal for each class' },
  select_month: { fr: 'Sélectionner le mois', en: 'Select Month' },
  total_present: { fr: 'Total présences', en: 'Total Present' },
  total_absent: { fr: 'Total absences', en: 'Total Absent' },
  total_late: { fr: 'Total retards', en: 'Total Late' },
  total_sessions: { fr: 'Total séances', en: 'Total Sessions' },
  no_records_for_month: { fr: 'Aucun enregistrement pour ce mois', en: 'No records for this month' },
  student_name: { fr: 'Nom de l\'étudiant', en: 'Student Name' },
  overall_attendance_rate: { fr: 'Taux de présence global', en: 'Overall Attendance Rate' },
  month_january: { fr: 'Janvier', en: 'January' },
  month_february: { fr: 'Février', en: 'February' },
  month_march: { fr: 'Mars', en: 'March' },
  month_april: { fr: 'Avril', en: 'April' },
  month_may: { fr: 'Mai', en: 'May' },
  month_june: { fr: 'Juin', en: 'June' },
  month_july: { fr: 'Juillet', en: 'July' },
  month_august: { fr: 'Août', en: 'August' },
  month_september: { fr: 'Septembre', en: 'September' },
  month_october: { fr: 'Octobre', en: 'October' },
  month_november: { fr: 'Novembre', en: 'November' },
  month_december: { fr: 'Décembre', en: 'December' },
  date: { fr: 'Date', en: 'Date' },

  // Login page
  login_title: { fr: 'Connectez-vous à votre compte', en: 'Log in to your account' },
  login_subtitle: { fr: 'Veuillez entrer vos identifiants pour accéder', en: 'Please enter your credentials to access' },
  email: { fr: 'E-mail', en: 'Email' },
  password: { fr: 'Mot de passe', en: 'Password' },
  remember_me: { fr: 'Se souvenir de moi', en: 'Remember me' },
  login_button: { fr: 'Se connecter', en: 'Log In' },
  login_as_admin: { fr: 'Connexion en tant qu\'Admin', en: 'Log in as Admin' },
  login_as_teacher: { fr: 'Connexion en tant que Professeur', en: 'Log in as Teacher' },
  invalid_credentials: { fr: 'Identifiants invalides', en: 'Invalid credentials' },
  demo_credentials: { fr: 'Identifiants de démonstration', en: 'Demo credentials' },

  // Dashboard
  dashboard_title: { fr: 'Aperçu du Centre', en: 'Center Overview' },
  total_students: { fr: 'Total des Étudiants', en: 'Total Students' },
  active_classes: { fr: 'Classes Actives', en: 'Active Classes' },
  today_sessions: { fr: 'Séances d\'aujourd\'hui', en: 'Today\'s Sessions' },
  pending_payments: { fr: 'Paiements en attente', en: 'Pending Payments' },
  attendance_rate: { fr: 'Taux de présence', en: 'Attendance Rate' },
  monthly_revenue: { fr: 'Revenus Mensuels', en: 'Monthly Revenue' },
  quick_actions: { fr: 'Actions Rapides', en: 'Quick Actions' },
  new_class: { fr: 'Nouvelle Classe', en: 'New Class' },
  record_payment: { fr: 'Enregistrer un paiement', en: 'Record Payment' },
  todays_schedule: { fr: 'Programme du jour', en: 'Today\'s Schedule' },
  recent_activity: { fr: 'Activité Récente', en: 'Recent Activity' },
  upcoming_payments: { fr: 'Paiements à venir', en: 'Upcoming Payments' },
  no_sessions_today: { fr: 'Aucune séance aujourd\'hui', en: 'No sessions today' },
  welcome_message: { fr: 'Voici ce qui se passe au centre aujourd\'hui.', en: 'Here is what is happening at the center today.' },

  // Students
  student_list: { fr: 'Liste des Étudiants', en: 'Student List' },
  add_student: { fr: 'Ajouter un étudiant', en: 'Add Student' },
  edit_student: { fr: 'Modifier l\'étudiant', en: 'Edit Student' },
  student_profile: { fr: 'Profil de l\'étudiant', en: 'Student Profile' },
  first_name: { fr: 'Prénom', en: 'First Name' },
  last_name: { fr: 'Nom', en: 'Last Name' },
  full_name: { fr: 'Nom complet', en: 'Full Name' },
  date_of_birth: { fr: 'Date de naissance', en: 'Date of Birth' },
  gender: { fr: 'Genre', en: 'Gender' },
  male: { fr: 'Masculin', en: 'Male' },
  female: { fr: 'Féminin', en: 'Female' },
  grade: { fr: 'Niveau d\'étude', en: 'Grade' },
  parent_name: { fr: 'Nom du tuteur', en: 'Parent Name' },
  parent_phone: { fr: 'Téléphone du tuteur', en: 'Parent Phone' },
  parent_email: { fr: 'E-mail du tuteur', en: 'Parent Email' },
  address: { fr: 'Adresse', en: 'Address' },
  notes: { fr: 'Notes', en: 'Notes' },
  medical_notes: { fr: 'Notes médicales', en: 'Medical Notes' },
  enrolled_classes: { fr: 'Classes inscrites', en: 'Enrolled Classes' },
  student_status: { fr: 'Statut de l\'étudiant', en: 'Student Status' },
  active: { fr: 'Actif', en: 'Active' },
  inactive: { fr: 'Inactif', en: 'Inactive' },
  graduated: { fr: 'Diplômé', en: 'Graduated' },
  search_students: { fr: 'Rechercher des étudiants', en: 'Search Students' },
  filter_by_grade: { fr: 'Filtrer par niveau', en: 'Filter by Grade' },
  filter_by_status: { fr: 'Filtrer par statut', en: 'Filter by Status' },
  filter_by_class: { fr: 'Filtrer par classe', en: 'Filter by Class' },
  no_students: { fr: 'Aucun étudiant trouvé', en: 'No students found' },
  student_count: { fr: 'Nombre d\'étudiants', en: 'Student Count' },
  personal_info: { fr: 'Informations personnelles', en: 'Personal Info' },
  guardian_info: { fr: 'Informations du tuteur', en: 'Guardian Info' },
  enrollment_info: { fr: 'Informations d\'inscription', en: 'Enrollment Info' },
  progress_notes: { fr: 'Notes de progression', en: 'Progress Notes' },
  attendance_history: { fr: 'Historique de présence', en: 'Attendance History' },
  payment_history: { fr: 'Historique des paiements', en: 'Payment History' },
  confirm_delete_student: { fr: 'Êtes-vous sûr de vouloir supprimer cet étudiant ?', en: 'Are you sure you want to delete this student?' },

  // Teachers
  teacher_list: { fr: 'Liste des Enseignants', en: 'Teacher List' },
  add_teacher: { fr: 'Ajouter un enseignant', en: 'Add Teacher' },
  edit_teacher: { fr: 'Modifier l\'enseignant', en: 'Edit Teacher' },
  teacher_profile: { fr: 'Profil de l\'enseignant', en: 'Teacher Profile' },
  specialization: { fr: 'Spécialisation', en: 'Specialization' },
  assigned_classes: { fr: 'Classes assignées', en: 'Assigned Classes' },
  hire_date: { fr: 'Date d\'embauche', en: 'Hire Date' },
  teacher_status: { fr: 'Statut de l\'enseignant', en: 'Teacher Status' },
  no_teachers: { fr: 'Aucun enseignant trouvé', en: 'No teachers found' },
  teacher_count: { fr: 'Nombre d\'enseignants', en: 'Teacher Count' },
  confirm_delete_teacher: { fr: 'Êtes-vous sûr de vouloir supprimer cet enseignant ?', en: 'Are you sure you want to delete this teacher?' },
  phone: { fr: 'Numéro de téléphone', en: 'Phone' },
  math: { fr: 'Mathématiques', en: 'Math' },
  arabic_lang: { fr: 'Langue Arabe', en: 'Arabic Language' },
  french_lang: { fr: 'Langue Française', en: 'French Language' },
  english_lang: { fr: 'Langue Anglaise', en: 'English Language' },
  science: { fr: 'Sciences', en: 'Science' },
  physics: { fr: 'Physique', en: 'Physics' },
  history_geo: { fr: 'Histoire-Géo', en: 'History & Geo' },

  // Classes
  class_list: { fr: 'Liste des Classes', en: 'Class List' },
  add_class: { fr: 'Ajouter une classe', en: 'Add Class' },
  edit_class: { fr: 'Modifier la classe', en: 'Edit Class' },
  class_details: { fr: 'Détails de la classe', en: 'Class Details' },
  subject: { fr: 'Matière', en: 'Subject' },
  teacher: { fr: 'Enseignant', en: 'Teacher' },
  room: { fr: 'Salle', en: 'Room' },
  capacity: { fr: 'Capacité', en: 'Capacity' },
  max_capacity: { fr: 'Capacité maximale', en: 'Max Capacity' },
  enrolled_students: { fr: 'Étudiants inscrits', en: 'Enrolled Students' },
  class_schedule: { fr: 'Emploi du temps de la classe', en: 'Class Schedule' },
  class_status: { fr: 'Statut de la classe', en: 'Class Status' },
  no_classes: { fr: 'Aucune classe trouvée', en: 'No classes found' },
  class_count: { fr: 'Nombre de classes', en: 'Class Count' },
  confirm_delete_class: { fr: 'Êtes-vous sûr de vouloir supprimer cette classe ?', en: 'Are you sure you want to delete this class?' },
  add_schedule_slot: { fr: 'Ajouter un créneau', en: 'Add Schedule Slot' },
  remove_slot: { fr: 'Supprimer le créneau', en: 'Remove Slot' },
  class_color: { fr: 'Couleur de la classe', en: 'Class Color' },
  manage_enrollment: { fr: 'Gérer les inscriptions', en: 'Manage Enrollment' },
  enroll_student: { fr: 'Inscrire un étudiant', en: 'Enroll Student' },
  unenroll_student: { fr: 'Désinscrire', en: 'Unenroll Student' },

  // Schedule
  weekly_schedule: { fr: 'Emploi du temps hebdomadaire', en: 'Weekly Schedule' },
  day_view: { fr: 'Vue journalière', en: 'Day View' },
  week_view: { fr: 'Vue hebdomadaire', en: 'Week View' },
  today: { fr: 'Aujourd\'hui', en: 'Today' },
  sunday: { fr: 'Dimanche', en: 'Sunday' },
  monday: { fr: 'Lundi', en: 'Monday' },
  tuesday: { fr: 'Mardi', en: 'Tuesday' },
  wednesday: { fr: 'Mercredi', en: 'Wednesday' },
  thursday: { fr: 'Jeudi', en: 'Thursday' },
  friday: { fr: 'Vendredi', en: 'Friday' },
  saturday: { fr: 'Samedi', en: 'Saturday' },
  no_sessions: { fr: 'Aucune séance', en: 'No sessions' },
  time: { fr: 'Heure', en: 'Time' },
  start_time: { fr: 'Heure de début', en: 'Start Time' },
  end_time: { fr: 'Heure de fin', en: 'End Time' },
  session_details: { fr: 'Détails de la séance', en: 'Session Details' },
  filter_by_teacher: { fr: 'Filtrer par enseignant', en: 'Filter by Teacher' },
  filter_by_room: { fr: 'Filtrer par salle', en: 'Filter by Room' },

  // Attendance
  mark_attendance: { fr: 'Marquer la présence', en: 'Mark Attendance' },
  select_class: { fr: 'Sélectionner une classe', en: 'Select Class' },
  select_date: { fr: 'Sélectionner une date', en: 'Select Date' },
  present: { fr: 'Présent', en: 'Present' },
  absent: { fr: 'Absent', en: 'Absent' },
  late: { fr: 'En retard', en: 'Late' },
  excused: { fr: 'Excusé', en: 'Excused' },
  mark_all_present: { fr: 'Tout marquer comme présent', en: 'Mark All Present' },
  mark_all_absent: { fr: 'Tout marquer comme absent', en: 'Mark All Absent' },
  save_attendance: { fr: 'Enregistrer les présences', en: 'Save Attendance' },
  attendance_saved: { fr: 'Présences enregistrées avec succès', en: 'Attendance saved successfully' },
  attendance_rate_label: { fr: 'Taux de présence', en: 'Attendance Rate' },
  no_attendance_records: { fr: 'Aucun registre de présence', en: 'No attendance records' },
  attendance_summary: { fr: 'Résumé des présences', en: 'Attendance Summary' },

  // Billing
  billing_overview: { fr: 'Aperçu de la facturation', en: 'Billing Overview' },
  total_collected: { fr: 'Total collecté', en: 'Total Collected' },
  total_pending: { fr: 'Total en attente', en: 'Total Pending' },
  total_overdue: { fr: 'Total en retard', en: 'Total Overdue' },
  payment_history_title: { fr: 'Historique des paiements', en: 'Payment History' },
  amount: { fr: 'Montant', en: 'Amount' },
  currency: { fr: 'DT', en: 'TND' },
  due_date: { fr: 'Date d\'échéance', en: 'Due Date' },
  paid_date: { fr: 'Date de paiement', en: 'Paid Date' },
  payment_status: { fr: 'Statut du paiement', en: 'Payment Status' },
  payment_method: { fr: 'Méthode de paiement', en: 'Payment Method' },
  description: { fr: 'Description', en: 'Description' },
  receipt_number: { fr: 'Numéro de reçu', en: 'Receipt Number' },
  cash: { fr: 'Espèces', en: 'Cash' },
  bank_transfer: { fr: 'Virement bancaire', en: 'Bank Transfer' },
  check_payment: { fr: 'Chèque', en: 'Check' },
  online_payment: { fr: 'Paiement en ligne', en: 'Online Payment' },
  paid: { fr: 'Payé', en: 'Paid' },
  pending: { fr: 'En attente', en: 'Pending' },
  overdue: { fr: 'En retard', en: 'Overdue' },
  partial_payment: { fr: 'Paiement partiel', en: 'Partial Payment' },
  no_payments: { fr: 'Aucun paiement', en: 'No payments' },
  payment_recorded: { fr: 'Paiement enregistré avec succès', en: 'Payment recorded successfully' },
  generate_statement: { fr: 'Générer un relevé', en: 'Generate Statement' },
  dinar: { fr: 'DT', en: 'TND' },

  // Reports
  reports_title: { fr: 'Rapports et Statistiques', en: 'Reports & Analytics' },
  attendance_trends: { fr: 'Tendances de présence', en: 'Attendance Trends' },
  class_enrollment: { fr: 'Inscriptions aux classes', en: 'Class Enrollment' },
  revenue_overview: { fr: 'Aperçu des revenus', en: 'Revenue Overview' },
  student_demographics: { fr: 'Démographie des étudiants', en: 'Student Demographics' },
  teacher_workload: { fr: 'Charge de travail des enseignants', en: 'Teacher Workload' },
  daily: { fr: 'Quotidien', en: 'Daily' },
  weekly: { fr: 'Hebdomadaire', en: 'Weekly' },
  monthly: { fr: 'Mensuel', en: 'Monthly' },
  this_month: { fr: 'Ce mois-ci', en: 'This Month' },
  last_month: { fr: 'Mois dernier', en: 'Last Month' },
  this_year: { fr: 'Cette année', en: 'This Year' },
  grade_distribution: { fr: 'Répartition des niveaux', en: 'Grade Distribution' },
  gender_distribution: { fr: 'Répartition par genre', en: 'Gender Distribution' },
  hours_per_week: { fr: 'Heures / semaine', en: 'Hours / week' },
  export_report: { fr: 'Exporter le rapport', en: 'Export Report' },

  // Messages
  messages_title: { fr: 'Centre de Messagerie', en: 'Message Center' },
  compose_message: { fr: 'Nouveau message', en: 'Compose Message' },
  select_parent: { fr: 'Sélectionner un parent', en: 'Select Parent' },
  message_subject: { fr: 'Sujet', en: 'Subject' },
  message_body: { fr: 'Corps du message', en: 'Message Body' },
  send_message: { fr: 'Envoyer le message', en: 'Send Message' },
  message_sent: { fr: 'Message envoyé avec succès', en: 'Message sent successfully' },
  message_templates: { fr: 'Modèles de messages', en: 'Message Templates' },
  absence_notice: { fr: 'Avis d\'absence', en: 'Absence Notice' },
  payment_reminder: { fr: 'Rappel de paiement', en: 'Payment Reminder' },
  event_invitation: { fr: 'Invitation à un événement', en: 'Event Invitation' },
  general_notice: { fr: 'Avis général', en: 'General Notice' },
  sent_messages: { fr: 'Messages envoyés', en: 'Sent Messages' },
  no_messages: { fr: 'Aucun message', en: 'No messages' },
  bulk_message: { fr: 'Message groupé', en: 'Bulk Message' },
  send_to_class: { fr: 'Envoyer à une classe', en: 'Send to Class' },

  // Settings
  settings_title: { fr: 'Paramètres du système', en: 'System Settings' },
  language_settings: { fr: 'Paramètres de langue', en: 'Language Settings' },
  center_info: { fr: 'Informations du centre', en: 'Center Info' },
  data_management: { fr: 'Gestion des données', en: 'Data Management' },
  center_address: { fr: 'Adresse du centre', en: 'Center Address' },
  center_phone: { fr: 'Téléphone du centre', en: 'Center Phone' },
  center_email: { fr: 'E-mail du centre', en: 'Center Email' },
  working_days: { fr: 'Jours ouvrables', en: 'Working Days' },
  working_hours: { fr: 'Heures de travail', en: 'Working Hours' },
  export_data: { fr: 'Exporter les données', en: 'Export Data' },
  import_data: { fr: 'Importer les données', en: 'Import Data' },
  reset_data: { fr: 'Réinitialiser les données', en: 'Reset Data' },
  confirm_reset: { fr: 'Êtes-vous sûr de vouloir effacer toutes les données ?', en: 'Are you sure you want to reset all data?' },
  data_exported: { fr: 'Données exportées avec succès', en: 'Data exported successfully' },
  data_imported: { fr: 'Données importées avec succès', en: 'Data imported successfully' },
  data_reset: { fr: 'Données réinitialisées', en: 'Data has been reset' },
  change_language: { fr: 'Changer de langue', en: 'Change Language' },
  arabic: { fr: 'Arabe', en: 'Arabic' },
  french: { fr: 'Français', en: 'French' },
  english: { fr: 'Anglais', en: 'English' },
  save_settings: { fr: 'Enregistrer les paramètres', en: 'Save Settings' },
  settings_saved: { fr: 'Paramètres enregistrés avec succès', en: 'Settings saved successfully' },
  account_settings: { fr: 'Paramètres du compte', en: 'Account Settings' },
  change_password: { fr: 'Changer le mot de passe', en: 'Change Password' },
  current_password: { fr: 'Mot de passe actuel', en: 'Current Password' },
  new_password: { fr: 'Nouveau mot de passe', en: 'New Password' },
  confirm_password: { fr: 'Confirmer le mot de passe', en: 'Confirm Password' },
  security: { fr: 'Sécurité', en: 'Security' },
  change_password_desc: { fr: 'Entrez votre mot de passe actuel et choisissez-en un nouveau. Minimum 8 caractères.', en: 'Enter your current password and choose a new one. Minimum 8 characters.' },
  current_password_incorrect: { fr: 'Le mot de passe actuel est incorrect.', en: 'Current password is incorrect.' },
  passwords_dont_match: { fr: 'Les mots de passe ne correspondent pas.', en: 'Passwords do not match.' },
  passwords_match: { fr: 'Les mots de passe correspondent.', en: 'Passwords match.' },
  password_too_short: { fr: 'Le mot de passe doit contenir au moins 8 caractères.', en: 'Password must be at least 8 characters.' },
  password_changed: { fr: 'Mot de passe modifié avec succès !', en: 'Password changed successfully!' },

  // Resources
  resources: { fr: 'Ressources', en: 'Resources' },
  'nav.resources': { fr: 'Ressources', en: 'Resources' },
  resources_subtitle: { fr: 'Gérez et partagez les fichiers et documents par classe', en: 'Manage and share files and documents by class' },
  new_section: { fr: 'Nouvelle section', en: 'New Section' },
  section_name: { fr: 'Nom de la section', en: 'Section Name' },
  section_suggestions: { fr: 'Suggestions :', en: 'Suggestions:' },
  no_sections: { fr: 'Aucune section', en: 'No Sections Yet' },
  no_files: { fr: 'Aucun fichier dans cette section', en: 'No files in this section' },
  upload_files: { fr: 'Uploader des fichiers', en: 'Upload Files' },
  click_to_upload: { fr: 'Cliquez pour uploader', en: 'Click to upload' },
  drag_and_drop: { fr: 'ou glissez-déposez', en: 'or drag and drop' },
  delete_section: { fr: 'Supprimer la section', en: 'Delete Section' },
  delete_file: { fr: 'Supprimer le fichier', en: 'Delete File' },
  download: { fr: 'Télécharger', en: 'Download' },
  view: { fr: 'Voir', en: 'View' },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    // Load language from localStorage on mount
    const savedLanguage = localStorage.getItem('app_language') as Language;
    if (savedLanguage && (savedLanguage === 'fr' || savedLanguage === 'en')) {
      setLanguageState(savedLanguage);
    }
  }, []);

  useEffect(() => {
    // Update HTML dir and lang attributes
    const dir = 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
    localStorage.setItem('app_language', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    const keyString = key as string;
    if (translations[keyString] && translations[keyString][language]) {
      return translations[keyString][language];
    }
    return '';
  };

  const dir: Dir = 'ltr';
  const isRTL = false;

  return (
    <LanguageContext.Provider value={{ t, language, setLanguage, dir, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
