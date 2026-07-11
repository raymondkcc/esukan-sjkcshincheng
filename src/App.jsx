import React, { useEffect, useMemo, useRef, useState } from 'react';
import { initializeApp } from 'firebase/app';
import {
  collection,
  deleteField,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  Activity,
  ClipboardList,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Languages,
  Maximize2,
  Medal,
  Minimize2,
  Monitor,
  Moon,
  Printer,
  Save,
  SquarePen,
  Settings,
  Sun,
  Trash2,
  Trophy,
  Upload,
  Users,
} from 'lucide-react';

const DEFAULT_HOUSES = ['红B组', '黄A组', '红A组', '青B组', '蓝A组', '黄B组', '蓝B组', '青A组'];
const CATEGORY_ORDER = [
  'L1', 'P1', 'L2', 'P2', 'L3', 'P3',
  'L4', 'P4', 'L5', 'P5', 'L6', 'P6',
  'Tahun 1', 'Tahun 2', 'Tahun 3', 'Tahun 4', 'Tahun 5', 'Tahun 6',
  'Tahap 1 (L)', 'Tahap 1 (P)', 'Tahap 1 (Terbuka)',
  'Tahap Dua (L)', 'Tahap Dua (P)', 'Tahap Dua (Campuran)',
  'Tahap 2 (Terbuka)',
  'Terbuka L', 'Terbuka P', 'Ibu Bapa', 'Guru',
];
const ZH_YEAR_CATEGORY_LABELS = {
  1: '一年级',
  2: '二年级',
  3: '三年级',
  4: '四年级',
  5: '五年级',
  6: '六年级',
};
const CATEGORY_TRANSLATIONS = {
  ms: {
    L: 'Lelaki',
    P: 'Perempuan',
    TERBUKA: 'Terbuka',
    CAMPURAN: 'Campuran',
    'TAHAP 1': 'Tahap 1',
    'TAHAP DUA': 'Tahap 2',
    'TAHAP 2': 'Tahap 2',
    'IBU BAPA': 'Ibu Bapa',
    GURU: 'Guru',
  },
  en: {
    L: 'Male',
    P: 'Female',
    TERBUKA: 'Open',
    CAMPURAN: 'Mixed',
    'TAHAP 1': 'Level 1',
    'TAHAP DUA': 'Level 2',
    'TAHAP 2': 'Level 2',
    'IBU BAPA': 'Parents',
    GURU: 'Teachers',
  },
  zh: {
    L: '男',
    P: '女',
    TERBUKA: '公开',
    CAMPURAN: '混合',
    'TAHAP 1': '第一阶段',
    'TAHAP DUA': '第二阶段',
    'TAHAP 2': '第二阶段',
    'IBU BAPA': '家长',
    GURU: '教师',
  },
};
const DEFAULT_SETTINGS = {
  schoolName: 'SJKC Shin Cheng',
  eventTitle: 'Sistem e-Sukan',
  year: new Date().getFullYear(),
  houses: DEFAULT_HOUSES,
  liveBoardMode: 'total-only',
  liveBoardHeaderSchool: '',
  liveBoardHeaderTitle: 'Papan Markah Kejohanan Sukan Tahunan',
  maxIndividuTahap1: 2,
  maxIndividuTahap2: 3,
  maxKumpulanTahap1: 1,
  maxKumpulanTahap2: 2,
  maxTarikTaliPerHouseYear: 4,
};
const SCHOOL_LOGO_PATH = '/logo-sjkc-shin-cheng.png';
const DEFAULT_EVENT_FORM = {
  startNo: 1,
  baseName: '',
  categories: ['L1', 'P1'],
  type: 'Individu',
  kind: 'Utama',
  withoutStudent: false,
  teamCountPerHouse: 1,
  points1: 10,
  points2: 7,
  points3: 5,
  points4: 3,
};
const RESULT_PLACES = [1, 2, 3, 4];
const RESULT_PLACE_LABELS = {
  1: '🏆 Champion',
  2: '🥈 2nd',
  3: '🥉 3rd',
  4: '🎖️ 4th',
};
const TEACHER_PASSWORD = 'BBC8419';
const ADMIN_PASSWORD = 'BBC8419adm';
const ACCESS_LEVELS = {
  user: {
    label: 'Live View',
    tabs: ['live', 'viewResults'],
  },
  teacher: {
    label: 'Teacher',
    tabs: ['live', 'viewResults', 'students', 'events', 'register', 'slips', 'settings'],
  },
  admin: {
    label: 'Admin',
    tabs: ['live', 'viewResults', 'students', 'events', 'register', 'results', 'slips', 'settings'],
  },
};
const LANGUAGE_OPTIONS = [
  { id: 'ms', short: 'BM', label: 'Bahasa Melayu' },
  { id: 'en', short: 'EN', label: 'English' },
  { id: 'zh', short: '中文', label: '中文' },
];
const TEXT = {
  ms: {
    liveBoard: 'Papan Markah',
    viewResults: 'Lihat Keputusan',
    students: 'Murid',
    events: 'Acara',
    register: 'Daftar',
    resultsEntry: 'Masuk Keputusan',
    slips: 'Slip',
    settings: 'Tetapan',
    liveView: 'Paparan Langsung',
    teacher: 'Guru',
    admin: 'Admin',
    loadingTitle: 'Memuat data e-Sukan',
    loadingHelp: 'Sila tunggu sementara Firebase memuat tetapan, murid, acara dan markah.',
    toggleTheme: 'Tukar tema',
    changeLanguage: 'Tukar bahasa',
    fullscreen: 'Skrin penuh',
    exitFullscreen: 'Keluar skrin penuh',
    latest: 'Terkini',
    results: 'Keputusan',
    classMarks: 'Markah Kelas',
    optional: 'Pilihan',
    noResults: 'Belum ada keputusan.',
    readonly: 'Baca sahaja',
    completed: 'Siap',
    resultEvents: 'Acara',
    viewHelp: 'Halaman ini hanya memaparkan keputusan yang telah dimasukkan. Kemasukan keputusan masih untuk admin sahaja.',
    event: 'Acara',
    allEvents: 'Semua acara',
    quickEvent: 'Cari cepat acara',
    place: 'Tempat',
    name: 'Nama',
    class: 'Kelas',
    house: 'Rumah',
    points: 'Markah',
    official: 'Rasmi',
    resultSlip: 'Slip Keputusan',
    chooseEvent: 'Pilih acara',
    registered: 'Berdaftar',
    completedResults: 'Keputusan siap',
    generateSlip: 'Jana Slip',
    printSelected: 'Cetak Acara Dipilih',
    bulkPrint: 'Cetak pukal',
    selected: 'Dipilih',
    selectAll: 'Pilih semua',
    clear: 'Kosongkan',
    noRegistered: 'Tiada peserta berdaftar.',
    participantNo: 'No. Peserta',
    record: 'Rekod',
    position: 'Kedudukan',
    preparedBy: 'Disediakan oleh',
    confirmedBy: 'Disahkan oleh',
    olahragawanTitle: 'Olahragawan / Olahragawati',
    olahragawan: 'Olahragawan',
    olahragawati: 'Olahragawati',
    medals: 'Pingat',
    noMedals: 'Belum ada pingat.',
    gold: 'Emas',
    silver: 'Perak',
    bronze: 'Gangsa',
    expand: 'Buka',
    collapse: 'Tutup',
    houseEntry: 'Penyertaan rumah',
    student: 'Murid',
    print: 'Cetak',
    appTitle: 'Sistem e-Sukan',
    template: 'Templat',
    studentNamelist: 'Senarai Nama Murid',
    downloadExcelTemplate: 'Muat Turun Templat Excel',
    uploading: 'Memuat naik...',
    uploadCompletedList: 'Muat Naik Senarai Lengkap',
    uploadingStudentsTitle: 'Memuat naik senarai nama murid',
    savingFirebase: 'Menyimpan ke Firebase. Sila kekalkan halaman ini terbuka.',
    search: 'Cari',
    allClasses: 'Semua kelas',
    allGenders: 'Semua jantina',
    allHouses: 'Semua rumah',
    showing: 'Dipaparkan',
    total: 'Jumlah',
    clearSearchFilters: 'Kosongkan Carian & Tapisan',
    requiredColumnsHelp: 'Lajur wajib: Name, Kelas, Rumah Sukan / House, Jantina/Gender. Guna Lelaki/Male/Boy atau Perempuan/Female/Girl. Lajur pilihan: 姓名.',
    chineseName: 'Nama Cina',
    gender: 'Jantina',
    save: 'Simpan',
    cancel: 'Batal',
    editStudent: 'Edit murid',
    deleteStudent: 'Padam murid',
    choose: 'Pilih',
    male: 'Lelaki',
    female: 'Perempuan',
    bulkSetup: 'Tetapan pukal',
    startNo: 'No mula',
    type: 'Jenis',
    individual: 'Individu',
    group: 'Kumpulan',
    mainEventName: 'Nama acara utama',
    sampleEventName: 'Lari 100m',
    eventKind: 'Jenis acara',
    mainKind: 'Utama',
    extraKind: 'Tambahan',
    parentKind: 'Ibu Bapa',
    teacherKind: 'Guru',
    withoutStudentDetails: 'Tanpa butiran murid',
    teamsPerHouse: 'Pasukan setiap rumah',
    team: 'Pasukan',
    registeredTeams: 'Pasukan berdaftar',
    houseTeams: 'Pasukan rumah',
    teamsPerHouseHelp: 'Gunakan 2 jika setiap rumah menghantar dua pasukan untuk acara yang sama.',
    noStudentAutoHelp: 'Semua rumah akan didaftarkan secara automatik. Kemasukan keputusan akan memberi markah kepada rumah sahaja.',
    categories: 'Kategori',
    saveBulkEvents: 'Simpan Acara Pukal',
    no: 'No',
    category: 'Kategori',
    mode: 'Mod',
    scoring: 'Skor',
    entries: 'Penyertaan',
    editEvent: 'Edit acara',
    deleteEvent: 'Padam acara',
    houseOnly: 'Rumah sahaja',
    participants: 'Peserta',
    noStudentRegisterHelp: 'Acara ini tidak memerlukan pendaftaran murid. Semua rumah didaftarkan secara automatik daripada tetapan rumah.',
    year: 'Tahun',
    allYears: 'Semua tahun',
    eventShowsPrefix: 'Acara ini memaparkan',
    houseEvent: 'Acara rumah',
    availableStudents: 'Murid tersedia',
    studentPool: 'Senarai murid',
    registeredHouses: 'Rumah berdaftar',
    registeredStudents: 'Murid berdaftar',
    remove: 'Buang',
    judging: 'Pengadilan',
    general: 'Umum',
    eSukanSettings: 'Tetapan e-Sukan',
    schoolName: 'Nama sekolah',
    eventTitle: 'Tajuk kejohanan',
    houses: 'Rumah sukan',
    liveBoardSetting: 'Papan markah',
    totalOnly: 'Jumlah markah masa nyata sahaja',
    totalAndClass: 'Jumlah markah + markah kelas',
    liveBoardSmallHeader: 'Tajuk kecil papan markah',
    liveBoardMainTitle: 'Tajuk utama papan markah',
    saveSettings: 'Simpan Tetapan',
    rules: 'Peraturan',
    participationLimits: 'Had Penyertaan',
    tarikTaliQuota: 'Kuota Tarik Tali setiap rumah/tahun',
    registrations: 'Pendaftaran',
    password: 'Kata laluan',
    adminAccess: 'Akses admin',
    teacherAccess: 'Akses guru',
    openAdminView: 'Buka Paparan Admin',
    openTeacherView: 'Buka Paparan Guru',
    open: 'Buka',
    firebaseMissing: 'Konfigurasi Firebase tiada',
    firebaseHelp: 'Tambah nilai VITE_FIREBASE_* dalam folder ini atau tetapan projek Vercel.',
  },
  en: {
    liveBoard: 'Live Board',
    viewResults: 'View Results',
    students: 'Students',
    events: 'Events',
    register: 'Register',
    resultsEntry: 'Results Entry',
    slips: 'Slips',
    settings: 'Settings',
    liveView: 'Live View',
    teacher: 'Teacher',
    admin: 'Admin',
    loadingTitle: 'Loading e-Sukan data',
    loadingHelp: 'Please wait while Firebase loads settings, students, events, and scores.',
    toggleTheme: 'Toggle theme',
    changeLanguage: 'Change language',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen',
    latest: 'Latest',
    results: 'Results',
    classMarks: 'Class Marks',
    optional: 'Optional',
    noResults: 'No results entered yet.',
    readonly: 'Readonly',
    completed: 'Completed',
    resultEvents: 'Events',
    viewHelp: 'This page only shows keyed-in results. Result entry remains admin-only.',
    event: 'Event',
    allEvents: 'All events',
    quickEvent: 'Quick event search',
    place: 'Place',
    name: 'Name',
    class: 'Class',
    house: 'House',
    points: 'Points',
    official: 'Official',
    resultSlip: 'Result Slip',
    chooseEvent: 'Choose event',
    registered: 'Registered',
    completedResults: 'Completed results',
    generateSlip: 'Generate Slip',
    printSelected: 'Print Selected Events',
    bulkPrint: 'Bulk print',
    selected: 'Selected',
    selectAll: 'Select all',
    clear: 'Clear',
    noRegistered: 'No registered students.',
    participantNo: 'Participant No.',
    record: 'Record',
    position: 'Position',
    preparedBy: 'Prepared by',
    confirmedBy: 'Confirmed by',
    olahragawanTitle: 'Olahragawan / Olahragawati',
    olahragawan: 'Top male athlete',
    olahragawati: 'Top female athlete',
    medals: 'Medals',
    noMedals: 'No medals yet.',
    gold: 'Gold',
    silver: 'Silver',
    bronze: 'Bronze',
    expand: 'Expand',
    collapse: 'Collapse',
    houseEntry: 'House entry',
    student: 'Student',
    print: 'Print',
    appTitle: 'e-Sukan System',
    template: 'Template',
    studentNamelist: 'Student Namelist',
    downloadExcelTemplate: 'Download Excel Template',
    uploading: 'Uploading...',
    uploadCompletedList: 'Upload Completed List',
    uploadingStudentsTitle: 'Uploading student namelist',
    savingFirebase: 'Saving to Firebase. Please keep this page open.',
    search: 'Search',
    allClasses: 'All classes',
    allGenders: 'All genders',
    allHouses: 'All houses',
    showing: 'Showing',
    total: 'Total',
    clearSearchFilters: 'Clear Search & Filters',
    requiredColumnsHelp: 'Required columns: Name, Kelas, Rumah Sukan / House, Jantina/Gender. Use Lelaki/Male/Boy or Perempuan/Female/Girl. Optional column: 姓名.',
    chineseName: 'Chinese name',
    gender: 'Gender',
    save: 'Save',
    cancel: 'Cancel',
    editStudent: 'Edit student',
    deleteStudent: 'Delete student',
    choose: 'Choose',
    male: 'Male',
    female: 'Female',
    bulkSetup: 'Bulk setup',
    startNo: 'Start no',
    type: 'Type',
    individual: 'Individual',
    group: 'Group',
    mainEventName: 'Main event name',
    sampleEventName: 'Lari 100m',
    eventKind: 'Event kind',
    mainKind: 'Main',
    extraKind: 'Extra',
    parentKind: 'Parents',
    teacherKind: 'Teacher',
    withoutStudentDetails: 'Without student details',
    teamsPerHouse: 'Teams per house',
    team: 'Team',
    registeredTeams: 'Registered Teams',
    houseTeams: 'House teams',
    teamsPerHouseHelp: 'Use 2 when each house sends two teams for the same event.',
    noStudentAutoHelp: 'All houses will be registered automatically. Results entry will score houses only.',
    categories: 'Categories',
    saveBulkEvents: 'Save Bulk Events',
    no: 'No',
    category: 'Category',
    mode: 'Mode',
    scoring: 'Scoring',
    entries: 'Entries',
    editEvent: 'Edit event',
    deleteEvent: 'Delete event',
    houseOnly: 'House only',
    participants: 'Participants',
    noStudentRegisterHelp: 'This event does not need student registration. All houses are registered automatically from house settings.',
    year: 'Year',
    allYears: 'All years',
    eventShowsPrefix: 'This event shows',
    houseEvent: 'House event',
    availableStudents: 'Available students',
    studentPool: 'Student Pool',
    registeredHouses: 'Registered Houses',
    registeredStudents: 'Registered Students',
    remove: 'Remove',
    judging: 'Judging',
    general: 'General',
    eSukanSettings: 'e-Sukan Settings',
    schoolName: 'School name',
    eventTitle: 'Event title',
    houses: 'Houses',
    liveBoardSetting: 'Live board',
    totalOnly: 'Realtime total marks only',
    totalAndClass: 'Total marks + class marks',
    liveBoardSmallHeader: 'Live board small header',
    liveBoardMainTitle: 'Live board main title',
    saveSettings: 'Save Settings',
    rules: 'Rules',
    participationLimits: 'Participation Limits',
    tarikTaliQuota: 'Tarik Tali quota per house/year',
    registrations: 'Registrations',
    password: 'Password',
    adminAccess: 'Admin access',
    teacherAccess: 'Teacher access',
    openAdminView: 'Open Admin View',
    openTeacherView: 'Open Teacher View',
    open: 'Open',
    firebaseMissing: 'Firebase config missing',
    firebaseHelp: 'Add the VITE_FIREBASE_* values in this folder or in Vercel project settings.',
  },
  zh: {
    liveBoard: '即时积分榜',
    viewResults: '查看成绩',
    students: '学生',
    events: '项目',
    register: '报名',
    resultsEntry: '录入成绩',
    slips: '成绩单',
    settings: '设置',
    liveView: '即时画面',
    teacher: '教师',
    admin: '管理员',
    loadingTitle: '正在载入 e-Sukan 数据',
    loadingHelp: '请稍候，Firebase 正在载入设置、学生、项目和分数。',
    toggleTheme: '切换主题',
    changeLanguage: '切换语言',
    fullscreen: '全屏',
    exitFullscreen: '退出全屏',
    latest: '最新',
    results: '成绩',
    classMarks: '班级分数',
    optional: '选项',
    noResults: '还没有录入成绩。',
    readonly: '只读',
    completed: '已完成',
    resultEvents: '项目',
    viewHelp: '此页面只显示已录入的成绩。成绩录入仍限管理员使用。',
    event: '项目',
    allEvents: '全部项目',
    quickEvent: '快速选择项目',
    place: '名次',
    name: '姓名',
    class: '班级',
    house: '运动组',
    points: '分数',
    official: '正式',
    resultSlip: '成绩单',
    chooseEvent: '选择项目',
    registered: '已报名',
    completedResults: '已完成成绩',
    generateSlip: '生成成绩单',
    printSelected: '打印所选项目',
    bulkPrint: '批量打印',
    selected: '已选',
    selectAll: '全选',
    clear: '清除',
    noRegistered: '没有已报名学生。',
    participantNo: '参赛号',
    record: '纪录',
    position: '名次',
    preparedBy: '制表',
    confirmedBy: '确认',
    olahragawanTitle: '男女最佳运动员',
    olahragawan: '男子最佳运动员',
    olahragawati: '女子最佳运动员',
    medals: '奖牌',
    noMedals: '还没有奖牌。',
    gold: '金',
    silver: '银',
    bronze: '铜',
    expand: '展开',
    collapse: '收起',
    houseEntry: '运动组项目',
    student: '学生',
    print: '打印',
    appTitle: 'e-Sukan 系统',
    template: '模板',
    studentNamelist: '学生名单',
    downloadExcelTemplate: '下载 Excel 模板',
    uploading: '上传中...',
    uploadCompletedList: '上传完整名单',
    uploadingStudentsTitle: '正在上传学生名单',
    savingFirebase: '正在保存到 Firebase。请保持此页面开启。',
    search: '搜索',
    allClasses: '全部班级',
    allGenders: '全部性别',
    allHouses: '全部运动组',
    showing: '显示',
    total: '总数',
    clearSearchFilters: '清除搜索和筛选',
    requiredColumnsHelp: '必填栏位：Name、Kelas、Rumah Sukan / House、Jantina/Gender。请使用 Lelaki/Male/Boy 或 Perempuan/Female/Girl。选填栏位：姓名。',
    chineseName: '中文姓名',
    gender: '性别',
    save: '保存',
    cancel: '取消',
    editStudent: '编辑学生',
    deleteStudent: '删除学生',
    choose: '选择',
    male: '男',
    female: '女',
    bulkSetup: '批量设置',
    startNo: '起始编号',
    type: '类型',
    individual: '个人',
    group: '团体',
    mainEventName: '主项目名称',
    sampleEventName: '100米赛跑',
    eventKind: '项目类别',
    mainKind: '主要',
    extraKind: '附加',
    parentKind: '家长',
    teacherKind: '教师',
    withoutStudentDetails: '不使用学生资料',
    teamsPerHouse: '每组队伍数',
    team: '队',
    registeredTeams: '已报名队伍',
    houseTeams: '运动组队伍',
    teamsPerHouseHelp: '如果每个运动组派两队参加同一个项目，请选择 2。',
    noStudentAutoHelp: '所有运动组将自动报名。成绩录入只为运动组计分。',
    categories: '组别',
    saveBulkEvents: '保存批量项目',
    no: '编号',
    category: '组别',
    mode: '模式',
    scoring: '计分',
    entries: '报名数',
    editEvent: '编辑项目',
    deleteEvent: '删除项目',
    houseOnly: '仅运动组',
    participants: '参赛者',
    noStudentRegisterHelp: '此项目不需要学生报名。所有运动组会根据设置自动报名。',
    year: '年级',
    allYears: '全部年级',
    eventShowsPrefix: '此项目显示',
    houseEvent: '运动组项目',
    availableStudents: '可报名学生',
    studentPool: '学生名单',
    registeredHouses: '已报名运动组',
    registeredStudents: '已报名学生',
    remove: '移除',
    judging: '裁判',
    general: '一般',
    eSukanSettings: 'e-Sukan 设置',
    schoolName: '学校名称',
    eventTitle: '运动会标题',
    houses: '运动组',
    liveBoardSetting: '即时积分榜',
    totalOnly: '只显示实时总分',
    totalAndClass: '总分 + 班级分数',
    liveBoardSmallHeader: '积分榜小标题',
    liveBoardMainTitle: '积分榜主标题',
    saveSettings: '保存设置',
    rules: '规则',
    participationLimits: '参赛限制',
    tarikTaliQuota: '拔河每组/每年级名额',
    registrations: '报名记录',
    password: '密码',
    adminAccess: '管理员权限',
    teacherAccess: '教师权限',
    openAdminView: '打开管理员页面',
    openTeacherView: '打开教师页面',
    open: '打开',
    firebaseMissing: '缺少 Firebase 设置',
    firebaseHelp: '请在此文件夹或 Vercel 项目设置中加入 VITE_FIREBASE_* 数值。',
  },
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId,
);
const firebaseApp = hasFirebaseConfig ? initializeApp(firebaseConfig) : null;
const db = firebaseApp ? getFirestore(firebaseApp) : null;

const normalizeHouse = (value) => String(value || '').trim();
const houseMatchKey = (value) => normalizeHouse(value).toLocaleUpperCase('ms-MY');
const splitHouseList = (value) => String(value || '')
  .split(/[,，;；\n\r]+/)
  .map(normalizeHouse)
  .filter(Boolean);
const sortByName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''));
const hashString = (value) => {
  let hash = 0;
  String(value || '').split('').forEach((character) => {
    hash = Math.imul(31, hash) + character.charCodeAt(0) | 0;
  });
  return Math.abs(hash).toString(36);
};
const buildStudentKey = ({ name, chineseName, className }) => {
  const source = [className, name, chineseName].map((value) => String(value || '').trim()).join('|');
  return source.replace(/\|/g, '') ? `student-${hashString(source)}` : '';
};
const getStudentKey = (student) => String(student?.ic || student?.studentKey || student?.id || '').trim();
const displayStudentName = (student, fallback = '') => {
  const names = [student?.name, student?.chineseName].map((value) => String(value || '').trim()).filter(Boolean);
  return names.length ? names.join(' / ') : fallback;
};
const isHouseEntry = (registration) => registration?.entryType === 'house';
const getTeamCountPerHouse = (event) => Math.max(1, Math.min(8, Number(event?.teamCountPerHouse || 1) || 1));
const clampTeamCountPerHouse = (value) => Math.max(1, Math.min(8, Number(value || 1) || 1));
const getHouseEntryTeamNumber = (registration) => Math.max(1, Number(registration?.teamNumber || 1) || 1);
const displayEntryName = (registration, student = {}, event = null, teamLabel = 'Team') => {
  if (!isHouseEntry(registration)) return displayStudentName(student, registration.studentIc);
  const house = normalizeHouse(registration.house || student.house || registration.studentIc);
  const teamNumber = getHouseEntryTeamNumber(registration);
  return getTeamCountPerHouse(event) > 1 ? `${house} ${teamLabel} ${teamNumber}` : house;
};
const getHouseEntryKey = (house, teamNumber = 1) => {
  const baseKey = `house-${hashString(house)}`;
  return Number(teamNumber) > 1 ? `${baseKey}-team-${teamNumber}` : baseKey;
};
const normalizeGender = (value) => {
  const text = String(value || '').trim();
  const key = text.toLocaleUpperCase('ms-MY');
  if (['L', 'LELAKI', 'MALE', 'BOY'].includes(key)) return 'Lelaki';
  if (['P', 'PEREMPUAN', 'FEMALE', 'GIRL'].includes(key)) return 'Perempuan';
  return text;
};
const getYear = (className) => {
  const match = String(className || '').match(/[1-6]/);
  return match ? Number(match[0]) : 0;
};
const isResultPlace = (position) => RESULT_PLACES.includes(Number(position || 0));
const resultPlaceLabel = (position) => RESULT_PLACE_LABELS[Number(position || 0)] || String(position || '');
const getEventEligibility = (event) => {
  const category = String(event?.category || '').trim().toLocaleUpperCase('ms-MY');
  const match = category.match(/^([LP])([1-6])$/);
  if (match) return {
    year: Number(match[2]),
    gender: match[1] === 'L' ? 'Lelaki' : 'Perempuan',
  };
  const yearMatch = category.match(/^TAHUN\s*([1-6])$/);
  if (yearMatch) return { year: Number(yearMatch[1]), gender: '' };
  return { year: 0, gender: '' };
};
const getCell = (row, names) => {
  const keys = Object.keys(row || {});
  const key = keys.find((candidate) =>
    names.some((name) => candidate.trim().toLowerCase() === name),
  );
  return key ? String(row[key] || '').trim() : '';
};
const eventLabel = (event) => event ? `${event.no || '-'} - ${event.name} (${event.category || '-'})` : '';
const eventDisplayName = (event) => {
  if (!event) return 'Event';
  const name = String(event.name || event.baseName || '').trim();
  const category = String(event.category || '').trim();
  if (!name) return category || 'Event';
  if (!category || name.toLocaleUpperCase('ms-MY').includes(category.toLocaleUpperCase('ms-MY'))) return name;
  return `${name} ${category}`;
};
const eventPrintTitle = (event) => {
  if (!event) return 'Event';
  const title = String(event.name || event.baseName || eventDisplayName(event)).trim();
  return title || eventDisplayName(event);
};
const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');
const slugify = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const buildEventName = (baseName, category) => {
  const name = String(baseName || 'Acara').trim();
  const cat = String(category || '').trim();
  if (/^[LP][1-6]$/.test(cat)) {
    return `${name} TAHUN ${cat.charAt(1)} (${cat.charAt(0)})`;
  }
  return `${name} (${cat})`;
};
const houseClassName = (house) => {
  const name = houseMatchKey(house);
  if (name.includes('红') || name.includes('MERAH') || name.includes('RED')) return 'house red';
  if (name.includes('蓝') || name.includes('BIRU') || name.includes('BLUE')) return 'house blue';
  if (name.includes('黄') || name.includes('KUNING') || name.includes('YELLOW')) return 'house yellow';
  if (name.includes('青') || name.includes('绿') || name.includes('HIJAU') || name.includes('GREEN')) return 'house green';
  if (name.includes('紫') || name.includes('UNGU') || name.includes('PURPLE')) return 'house purple';
  if (name.includes('橙') || name.includes('JINGGA') || name.includes('ORANGE')) return 'house orange';
  return 'house slate';
};

function App() {
  const fileInputRef = useRef(null);
  const liveBoardRef = useRef(null);
  const savedSettingsRef = useRef('');
  const params = new URLSearchParams(window.location.search);
  const siteId = params.get('site') || import.meta.env.VITE_ESUKAN_SITE_ID || 'sinming-esukan';

  const [activeTab, setActiveTab] = useState('live');
  const [accessRole, setAccessRole] = useState(() => localStorage.getItem('esukan-access-role') || 'user');
  const [loginMode, setLoginMode] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [accessError, setAccessError] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('esukan-theme') || 'light');
  const [language, setLanguage] = useState(() => localStorage.getItem('esukan-language') || 'ms');
  const [isLiveBoardFullscreen, setIsLiveBoardFullscreen] = useState(false);
  const [loadedSections, setLoadedSections] = useState({ settings: false, students: false, events: false, registrations: false });
  const [uploadingStudents, setUploadingStudents] = useState(false);
  const [notice, setNotice] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [eventForm, setEventForm] = useState(DEFAULT_EVENT_FORM);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('');
  const [studentGenderFilter, setStudentGenderFilter] = useState('');
  const [studentHouseFilter, setStudentHouseFilter] = useState('');
  const [editingStudentKey, setEditingStudentKey] = useState('');
  const [studentEditForm, setStudentEditForm] = useState(null);
  const [registerEventId, setRegisterEventId] = useState('');
  const [registerQuery, setRegisterQuery] = useState('');
  const [registerHouse, setRegisterHouse] = useState('');
  const [registerClassFilter, setRegisterClassFilter] = useState('');
  const [registerGenderFilter, setRegisterGenderFilter] = useState('');
  const [resultEventId, setResultEventId] = useState('');
  const [slipEventId, setSlipEventId] = useState('');
  const [selectedSlipEventIds, setSelectedSlipEventIds] = useState([]);
  const [viewResultEventFilter, setViewResultEventFilter] = useState('');
  const [expandedLiveResultIds, setExpandedLiveResultIds] = useState({});
  const [expandedViewResultIds, setExpandedViewResultIds] = useState({});
  const [rollingLiveResultId, setRollingLiveResultId] = useState('');
  const [editingEventId, setEditingEventId] = useState('');
  const [eventEditForm, setEventEditForm] = useState(null);

  const refs = useMemo(() => {
    if (!db) return null;
    return {
      settings: doc(db, 'esukanSites', siteId, 'settings', 'app'),
      students: collection(db, 'esukanSites', siteId, 'students'),
      events: collection(db, 'esukanSites', siteId, 'events'),
      registrations: collection(db, 'esukanSites', siteId, 'registrations'),
    };
  }, [siteId]);

  const houses = useMemo(() => {
    const source = Array.isArray(settings.houses) ? settings.houses : DEFAULT_HOUSES;
    return source.map(normalizeHouse).filter(Boolean);
  }, [settings.houses]);
  const liveBoardHeaderSchool = String(settings.liveBoardHeaderSchool || settings.schoolName || DEFAULT_SETTINGS.schoolName).trim();
  const liveBoardHeaderTitle = String(settings.liveBoardHeaderTitle || DEFAULT_SETTINGS.liveBoardHeaderTitle).trim();
  const visibleTabs = ACCESS_LEVELS[accessRole]?.tabs || ACCESS_LEVELS.user.tabs;
  const loading = !Object.values(loadedSections).every(Boolean);
  const nextEventNo = useMemo(() => Math.max(0, ...events.map((event) => Number(event.no || 0))) + 1, [events]);
  const currentLanguage = LANGUAGE_OPTIONS.find((item) => item.id === language) || LANGUAGE_OPTIONS[0];
  const t = (key) => TEXT[language]?.[key] || TEXT.ms[key] || key;
  const tGender = (value) => {
    const key = normalizeGender(value);
    if (key === 'Lelaki') return t('male');
    if (key === 'Perempuan') return t('female');
    return value || '-';
  };
  const tEventType = (value) => {
    const key = String(value || '').toLocaleUpperCase('ms-MY');
    if (key.includes('INDIVIDU')) return t('individual');
    if (key.includes('KUMPULAN')) return t('group');
    return value || '-';
  };
  const tEventKind = (value) => {
    const key = String(value || '').toLocaleUpperCase('ms-MY');
    if (key === 'UTAMA') return t('mainKind');
    if (key === 'TAMBAHAN') return t('extraKind');
    if (key === 'IBU BAPA') return t('parentKind');
    if (key === 'GURU') return t('teacherKind');
    return value || '-';
  };
  const tYear = (year) => (language === 'zh' ? (ZH_YEAR_CATEGORY_LABELS[Number(year)] || `${year}年级`) : language === 'en' ? `Year ${year}` : `Tahun ${year}`);
  const tCategory = (category) => {
    const text = String(category || '').trim();
    if (!text) return '-';
    const translations = CATEGORY_TRANSLATIONS[language] || CATEGORY_TRANSLATIONS.ms;
    const yearGenderMatch = text.match(/^([LP])([1-6])$/i);
    if (yearGenderMatch) {
      const genderKey = yearGenderMatch[1].toUpperCase();
      const year = Number(yearGenderMatch[2]);
      if (language === 'zh') return `${ZH_YEAR_CATEGORY_LABELS[year] || `${year}年级`}（${translations[genderKey]}）`;
      const yearLabel = language === 'en' ? `Year ${year}` : `Tahun ${year}`;
      return `${yearLabel} (${translations[genderKey]})`;
    }
    const yearMatch = text.match(/^Tahun\s*([1-6])$/i);
    if (yearMatch) return tYear(Number(yearMatch[1]));
    const tahapMatch = text.match(/^(Tahap 1|Tahap Dua|Tahap 2)\s*\((L|P|Terbuka|Campuran)\)$/i);
    if (tahapMatch) {
      const tahapKey = tahapMatch[1].toLocaleUpperCase('ms-MY');
      const groupKey = tahapMatch[2].toLocaleUpperCase('ms-MY');
      return language === 'zh'
        ? `${translations[tahapKey] || tahapMatch[1]}（${translations[groupKey] || tahapMatch[2]}）`
        : `${translations[tahapKey] || tahapMatch[1]} (${translations[groupKey] || tahapMatch[2]})`;
    }
    const openMatch = text.match(/^Terbuka\s+([LP])$/i);
    if (openMatch) {
      const genderKey = openMatch[1].toUpperCase();
      return language === 'zh'
        ? `${translations.TERBUKA}（${translations[genderKey]}）`
        : `${translations.TERBUKA} (${translations[genderKey]})`;
    }
    const upper = text.toLocaleUpperCase('ms-MY');
    if (translations[upper]) return translations[upper];
    return text;
  };
  const tEventDisplayName = (event) => {
    if (!event) return t('event');
    const name = String(event.name || event.baseName || '').trim();
    const baseName = String(event.baseName || '').trim();
    const category = String(event.category || '').trim();
    const categoryLabel = category ? tCategory(category) : '';
    if (baseName && categoryLabel) return `${baseName} ${categoryLabel}`;
    if (!name) return categoryLabel || t('event');
    if (!categoryLabel) return name;
    const escapedCategory = category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const compactName = name
      .replace(new RegExp(`\\s*\\(${escapedCategory}\\)\\s*$`, 'i'), '')
      .replace(/\s+TAHUN\s*[1-6]\s*\([LP]\)\s*$/i, '')
      .replace(/\s+\(TAHUN\s*[1-6]\)\s*$/i, '')
      .replace(/\s+\((?:Tahap 1|Tahap Dua|Tahap 2|Terbuka\s+[LP]|Ibu Bapa|Guru)[^)]+\)\s*$/i, '')
      .trim();
    if (!compactName) return categoryLabel;
    if (compactName.toLocaleUpperCase('ms-MY').includes(category.toLocaleUpperCase('ms-MY'))) return name;
    return `${compactName} ${categoryLabel}`;
  };
  const tEventLabel = (event) => event ? `${event.no || '-'} - ${tEventDisplayName(event)}` : '';
  const runScoreTransition = (callback) => {
    if (typeof document === 'undefined' || typeof document.startViewTransition !== 'function' || document.visibilityState !== 'visible') {
      callback();
      return;
    }
    document.startViewTransition(callback).finished.catch(() => {});
  };

  useEffect(() => {
    localStorage.setItem('esukan-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('esukan-language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('esukan-access-role', accessRole);
  }, [accessRole]);

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) setActiveTab('live');
  }, [activeTab, visibleTabs]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsLiveBoardFullscreen(document.fullscreenElement === liveBoardRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    handleFullscreenChange();
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    setEventForm((current) => {
      const currentStart = Number(current.startNo || 0);
      if (String(current.baseName || '').trim() || currentStart >= nextEventNo) return current;
      return { ...current, startNo: nextEventNo };
    });
  }, [nextEventNo]);

  useEffect(() => {
    if (!refs) return undefined;
    setLoadedSections({ settings: false, students: false, events: false, registrations: false });
    const markLoaded = (key) => setLoadedSections((current) => ({ ...current, [key]: true }));
    const handleSnapshotError = (key, error) => {
      console.error(error);
      markLoaded(key);
      setNotice(`Could not load ${key}: ${error.message || 'Firebase error'}`);
    };

    const unsubscribers = [
      onSnapshot(refs.settings, (snapshot) => {
        const nextSettings = { ...DEFAULT_SETTINGS, ...(snapshot.exists() ? snapshot.data() : {}) };
        setSettings(nextSettings);
        savedSettingsRef.current = JSON.stringify({ ...nextSettings, updatedAt: undefined });
        markLoaded('settings');
      }, (error) => handleSnapshotError('settings', error)),
      onSnapshot(refs.students, (snapshot) => {
        setStudents(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).sort(sortByName));
        markLoaded('students');
      }, (error) => handleSnapshotError('students', error)),
      onSnapshot(refs.events, (snapshot) => {
        const nextEvents = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort((a, b) => Number(a.no || 0) - Number(b.no || 0));
        setEvents(nextEvents);
        setRegisterEventId((current) => current || (nextEvents[0] ? nextEvents[0].id : ''));
        setResultEventId((current) => current || (nextEvents[0] ? nextEvents[0].id : ''));
        setSlipEventId((current) => current || (nextEvents[0] ? nextEvents[0].id : ''));
        markLoaded('events');
      }, (error) => handleSnapshotError('events', error)),
      onSnapshot(refs.registrations, (snapshot) => {
        const nextRegistrations = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        runScoreTransition(() => setRegistrations(nextRegistrations));
        markLoaded('registrations');
      }, (error) => handleSnapshotError('registrations', error)),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [refs]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const studentMap = useMemo(() => new Map(students.map((student) => [getStudentKey(student), student])), [students]);
  const eventMap = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);
  const registerEvent = eventMap.get(registerEventId);
  const resultEvent = eventMap.get(resultEventId);
  const slipEvent = eventMap.get(slipEventId);

  const eventRegistrations = useMemo(() => {
    const grouped = new Map();
    registrations.forEach((registration) => {
      if (!grouped.has(registration.eventId)) grouped.set(registration.eventId, []);
      grouped.get(registration.eventId).push(registration);
    });
    return grouped;
  }, [registrations]);

  const registrationsForRegisterEvent = eventRegistrations.get(registerEventId) || [];
  const registrationsForResultEvent = eventRegistrations.get(resultEventId) || [];
  const registrationsForSlipEvent = eventRegistrations.get(slipEventId) || [];
  const sortedSlipRegistrations = [...registrationsForSlipEvent].sort((a, b) => {
    const positionA = Number(a.position || 99);
    const positionB = Number(b.position || 99);
    if (positionA !== positionB) return positionA - positionB;
    const studentA = studentMap.get(a.studentIc) || {};
    const studentB = studentMap.get(b.studentIc) || {};
    const classCompare = String(studentA.className || a.className || '').localeCompare(String(studentB.className || b.className || ''), undefined, { numeric: true });
    if (classCompare) return classCompare;
    return displayEntryName(a, studentA, slipEvent, t('team')).localeCompare(displayEntryName(b, studentB, slipEvent, t('team')));
  });
  const registeredStudentSet = new Set(registrationsForRegisterEvent.map((item) => item.studentIc));
  const studentClassOptions = useMemo(() => (
    Array.from(new Set(students.map((student) => String(student.className || '').trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  ), [students]);
  const studentGenderOptions = useMemo(() => (
    Array.from(new Set(students.map((student) => String(student.gender || '').trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b))
  ), [students]);
  const studentHouseOptions = useMemo(() => (
    Array.from(new Set(students.map((student) => normalizeHouse(student.house)).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b))
  ), [students]);

  const filteredStudents = students.filter((student) => {
    const query = studentQuery.trim().toLowerCase();
    const matchesQuery = !query || [student.name, student.chineseName, student.className, student.gender, student.house].some((value) =>
      String(value || '').toLowerCase().includes(query),
    );
    const matchesClass = !studentClassFilter || String(student.className || '') === studentClassFilter;
    const matchesGender = !studentGenderFilter || String(student.gender || '') === studentGenderFilter;
    const matchesHouse = !studentHouseFilter || houseMatchKey(student.house) === houseMatchKey(studentHouseFilter);
    return matchesQuery && matchesClass && matchesGender && matchesHouse;
  });

  const registerEligibility = getEventEligibility(registerEvent);
  const registerEffectiveClassFilter = registerEligibility.year ? String(registerEligibility.year) : registerClassFilter;
  const registerEffectiveGenderFilter = registerEligibility.gender || registerGenderFilter;
  const registerCandidates = registerEvent?.withoutStudent ? [] : students
    .filter((student) => {
      const query = registerQuery.trim().toLowerCase();
      const matchesQuery = !query || [student.name, student.chineseName, student.className, student.gender, student.house].some((value) =>
        String(value || '').toLowerCase().includes(query),
      );
      const matchesHouse = !registerHouse || houseMatchKey(student.house) === houseMatchKey(registerHouse);
      const matchesYear = !registerEffectiveClassFilter || String(getYear(student.className)) === String(registerEffectiveClassFilter);
      const matchesGender = !registerEffectiveGenderFilter || String(student.gender || '') === registerEffectiveGenderFilter;
      return matchesQuery && matchesHouse && matchesYear && matchesGender;
    })
    .sort((a, b) => {
      const classCompare = String(a.className || '').localeCompare(String(b.className || ''), undefined, { numeric: true });
      if (classCompare) return classCompare;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

  const scoreData = useMemo(() => {
    const houseTotals = houses.map((house) => ({ name: house, total: 0 }));
    const classTotals = new Map();

    registrations.forEach((registration) => {
      if (!isResultPlace(registration.position)) return;
      const student = studentMap.get(registration.studentIc) || {};
      const house = normalizeHouse(registration.house || student.house);
      const points = Number(registration.points || 0);
      const row = houseTotals.find((item) => houseMatchKey(item.name) === houseMatchKey(house));
      if (row) row.total += points;
      if (student.className) {
        classTotals.set(student.className, (classTotals.get(student.className) || 0) + points);
      }
    });

    return {
      houses: houseTotals.sort((a, b) => b.total - a.total),
      classes: Array.from(classTotals.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total),
    };
  }, [houses, registrations, studentMap]);

  const viewResults = useMemo(() => {
    return registrations
      .filter((registration) => isResultPlace(registration.position))
      .map((registration) => ({
        ...registration,
        student: studentMap.get(registration.studentIc),
        event: eventMap.get(registration.eventId),
      }))
      .sort((a, b) => {
        const eventCompare = String(a.event?.name || '').localeCompare(String(b.event?.name || ''), undefined, { numeric: true });
        if (eventCompare) return eventCompare;
        return Number(a.position || 99) - Number(b.position || 99);
      });
  }, [eventMap, registrations, studentMap]);
  const resultEventOptions = useMemo(() => (
    Array.from(new Map(viewResults.map((result) => [result.eventId, result.event])).entries())
      .map(([id, event]) => ({ id, event }))
      .filter((item) => item.event)
      .sort((a, b) => {
        const noCompare = Number(a.event.no || 0) - Number(b.event.no || 0);
        if (noCompare) return noCompare;
        return tEventDisplayName(a.event).localeCompare(tEventDisplayName(b.event), undefined, { numeric: true });
      })
  ), [language, viewResults]);
  const buildResultGroups = (results, sortMode = 'event') => {
    const grouped = new Map();
    results.forEach((result) => {
      const id = result.eventId || 'unknown';
      if (!grouped.has(id)) grouped.set(id, { id, event: result.event, results: [], latestMs: 0 });
      const group = grouped.get(id);
      group.results.push(result);
      group.latestMs = Math.max(group.latestMs, Number(result.updatedMs || 0));
    });
    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        results: group.results.sort((a, b) => Number(a.position || 99) - Number(b.position || 99)),
      }))
      .sort((a, b) => {
        if (sortMode === 'latest') return b.latestMs - a.latestMs;
        const noCompare = Number(a.event?.no || 0) - Number(b.event?.no || 0);
        if (noCompare) return noCompare;
        return tEventDisplayName(a.event).localeCompare(tEventDisplayName(b.event), undefined, { numeric: true });
      });
  };
  const latestResultGroups = useMemo(() => {
    return buildResultGroups(viewResults, 'latest').slice(0, 12);
  }, [language, viewResults]);
  const latestLiveResultId = latestResultGroups[0]?.id || '';
  const latestLiveResultStamp = latestResultGroups[0]?.latestMs || 0;
  const latestWinnerRows = latestResultGroups.slice(0, 3).map((group) => ({
    id: group.id,
    event: group.event,
    winners: RESULT_PLACES.map((position) => {
      const result = group.results.find((item) => Number(item.position || 0) === position);
      if (!result) return null;
      return normalizeHouse(result.house || result.student?.house || '');
    }),
  }));
  const filteredViewResults = useMemo(() => (
    viewResultEventFilter ? viewResults.filter((result) => result.eventId === viewResultEventFilter) : viewResults
  ), [viewResultEventFilter, viewResults]);
  const viewResultGroups = useMemo(() => buildResultGroups(filteredViewResults), [filteredViewResults, language]);
  const athleteLeaders = useMemo(() => {
    const athletes = new Map();
    registrations.forEach((registration) => {
      const position = Number(registration.position || 0);
      if (![1, 2, 3].includes(position) || isHouseEntry(registration)) return;
      const student = studentMap.get(registration.studentIc);
      if (!student) return;
      const studentKey = getStudentKey(student);
      if (!studentKey) return;
      if (!athletes.has(studentKey)) {
        athletes.set(studentKey, {
          student,
          gender: normalizeGender(student.gender),
          gold: 0,
          silver: 0,
          bronze: 0,
        });
      }
      const row = athletes.get(studentKey);
      if (position === 1) row.gold += 1;
      if (position === 2) row.silver += 1;
      if (position === 3) row.bronze += 1;
    });
    const compareAthletes = (a, b) =>
      b.gold - a.gold ||
      b.silver - a.silver ||
      b.bronze - a.bronze ||
      displayStudentName(a.student).localeCompare(displayStudentName(b.student));
    const rows = Array.from(athletes.values()).sort(compareAthletes);
    return {
      male: rows.find((row) => row.gender === 'Lelaki') || null,
      female: rows.find((row) => row.gender === 'Perempuan') || null,
    };
  }, [registrations, studentMap]);
  const jurySheetRows = sortedSlipRegistrations
    .map((registration) => ({
      registration,
      student: studentMap.get(registration.studentIc) || {},
    }))
    .sort((a, b) => {
      const houseCompare = houseMatchKey(a.registration.house || a.student.house).localeCompare(houseMatchKey(b.registration.house || b.student.house));
      if (houseCompare) return houseCompare;
      const classCompare = String(a.student.className || a.registration.className || '').localeCompare(String(b.student.className || b.registration.className || ''), undefined, { numeric: true });
      if (classCompare) return classCompare;
      return displayEntryName(a.registration, a.student, slipEvent, t('team')).localeCompare(displayEntryName(b.registration, b.student, slipEvent, t('team')));
    })
    .map((row, index) => ({ ...row, participantNo: index + 1 }));

  useEffect(() => {
    if (!latestLiveResultId) {
      setExpandedLiveResultIds({});
      setRollingLiveResultId('');
      return undefined;
    }

    setExpandedLiveResultIds({ [latestLiveResultId]: true });
    setRollingLiveResultId(latestLiveResultId);
    const timer = window.setTimeout(() => {
      setRollingLiveResultId((current) => (current === latestLiveResultId ? '' : current));
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [latestLiveResultId, latestLiveResultStamp]);

  const getScoring = () => Object.fromEntries(
    RESULT_PLACES.map((position) => [position, Number(eventForm[`points${position}`] || 0)]),
  );

  const saveSettings = async () => {
    if (accessRole === 'user') {
      setNotice('Staff access required.');
      return;
    }
    const payload = { ...settings, houses };
    const { updatedAt, ...settingsForSignature } = payload;
    const settingsSignature = JSON.stringify(settingsForSignature);
    if (settingsSignature === savedSettingsRef.current) {
      setNotice('Settings unchanged.');
      return;
    }
    await setDoc(refs.settings, { ...payload, updatedAt: serverTimestamp() }, { merge: true });
    savedSettingsRef.current = settingsSignature;
    setNotice('Settings saved.');
  };

  const toggleCategory = (category) => {
    setEventForm((current) => {
      const exists = current.categories.includes(category);
      return {
        ...current,
        categories: exists
          ? current.categories.filter((item) => item !== category)
          : [...current.categories, category],
      };
    });
  };

  const saveBulkEvents = async (submitEvent) => {
    submitEvent.preventDefault();
    if (accessRole === 'user') {
      setNotice('Staff access required.');
      return;
    }
    const baseName = eventForm.baseName.trim();
    if (!baseName || eventForm.categories.length === 0) return;

    const sortedCategories = [...eventForm.categories].sort((a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b));
    const batch = writeBatch(db);
    const timestamp = Date.now();
    const scoring = getScoring();
    const withoutStudent = Boolean(eventForm.withoutStudent);
    const teamCountPerHouse = withoutStudent ? clampTeamCountPerHouse(eventForm.teamCountPerHouse) : 1;
    sortedCategories.forEach((category, index) => {
      const eventName = buildEventName(baseName, category);
      const id = `${timestamp}-${index}-${slugify(eventName)}`;
      batch.set(doc(refs.events, id), {
        no: Number(eventForm.startNo || 1) + index,
        name: eventName,
        baseName,
        category,
        type: eventForm.type,
        kind: eventForm.kind,
        withoutStudent,
        teamCountPerHouse,
        scoring,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (withoutStudent) {
        houses.forEach((house) => {
          Array.from({ length: teamCountPerHouse }, (_, teamIndex) => teamIndex + 1).forEach((teamNumber) => {
            const entryKey = getHouseEntryKey(house, teamNumber);
            batch.set(doc(refs.registrations, `${id}_${entryKey}`), {
              eventId: id,
              entryType: 'house',
              studentIc: entryKey,
              house,
              teamNumber,
              className: '',
              position: '',
              points: 0,
              updatedAt: serverTimestamp(),
              updatedMs: Date.now(),
            }, { merge: true });
          });
        });
      }
    });

    await batch.commit();
    setRegisterEventId(`${timestamp}-0-${slugify(buildEventName(baseName, sortedCategories[0]))}`);
    setResultEventId(`${timestamp}-0-${slugify(buildEventName(baseName, sortedCategories[0]))}`);
    setSlipEventId(`${timestamp}-0-${slugify(buildEventName(baseName, sortedCategories[0]))}`);
    setEventForm((current) => ({ ...DEFAULT_EVENT_FORM, startNo: Number(current.startNo || 1) + sortedCategories.length }));
    setNotice(withoutStudent ? `${sortedCategories.length} house events created with ${teamCountPerHouse} team(s) per house.` : `${sortedCategories.length} events created.`);
  };

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet([
      { Name: 'Ali Bin Abu', '姓名': '', Kelas: '4M', 'Rumah Sukan / House': houses[0] || '红B组', 'Jantina/Gender': 'Lelaki' },
      { Name: 'Tan Mei Ling', '姓名': '陈美玲', Kelas: '5B', 'Rumah Sukan / House': houses[1] || '黄A组', 'Jantina/Gender': 'Perempuan' },
    ]);
    worksheet['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 12 }, { wch: 22 }, { wch: 18 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Namelist');
    XLSX.writeFile(workbook, `e-sukan-template-${settings.year}.xlsx`);
  };

  const importStudents = async (file) => {
    if (!file) return;
    if (accessRole === 'user') {
      setNotice('Staff access required.');
      return;
    }

    setUploadingStudents(true);
    setNotice(`Uploading ${file.name}...`);
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer());
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const validStudents = rows
        .map((row) => {
          const student = {
            name: getCell(row, ['name', 'nama', 'nama murid']),
            chineseName: getCell(row, ['姓名', 'chinese name', 'nama cina']),
            className: getCell(row, ['kelas', 'class', 'class name']),
            house: normalizeHouse(getCell(row, ['rumah sukan / house', 'rumah sukan', 'rumah', 'house'])),
            gender: normalizeGender(getCell(row, ['jantina/gender', 'jantina', 'gender', 'sex'])),
          };
          const studentKey = buildStudentKey(student);
          return {
            ...student,
            ic: studentKey,
            studentKey,
          };
        })
        .filter((student) => student.studentKey && student.name && student.className && student.house && student.gender);

      if (!validStudents.length) {
        setNotice('No valid rows. Required columns: Name, Kelas, Rumah Sukan / House, Jantina/Gender.');
        return;
      }

      const batches = [];
      let batch = writeBatch(db);
      let writeCount = 0;
      const queueWrite = (callback) => {
        if (writeCount >= 450) {
          batches.push(batch);
          batch = writeBatch(db);
          writeCount = 0;
        }
        callback(batch);
        writeCount += 1;
      };
      const importedHouses = [];
      const importedHouseKeys = new Set();
      validStudents.forEach((student) => {
        const houseKey = houseMatchKey(student.house);
        if (houseKey && !importedHouseKeys.has(houseKey)) {
          importedHouseKeys.add(houseKey);
          importedHouses.push(student.house);
        }
        queueWrite((activeBatch) => activeBatch.set(doc(refs.students, student.studentKey), {
          ...student,
          updatedAt: serverTimestamp(),
        }, { merge: true }));
      });
      if (importedHouses.length) {
        queueWrite((activeBatch) => activeBatch.set(refs.settings, { houses: importedHouses, updatedAt: serverTimestamp() }, { merge: true }));
      }
      if (writeCount > 0) batches.push(batch);
      await Promise.all(batches.map((queuedBatch) => queuedBatch.commit()));
      setNotice(`${validStudents.length} students imported. Houses updated from template.`);
    } catch (error) {
      console.error(error);
      setNotice(`Upload failed: ${error.message || 'Please check the file and Firebase permissions.'}`);
    } finally {
      setUploadingStudents(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startStudentEdit = (student) => {
    setEditingStudentKey(getStudentKey(student));
    setStudentEditForm({
      name: student.name || '',
      chineseName: student.chineseName || '',
      className: student.className || '',
      gender: student.gender || '',
      house: student.house || '',
    });
  };

  const cancelStudentEdit = () => {
    setEditingStudentKey('');
    setStudentEditForm(null);
  };

  const saveStudentEdit = async (student) => {
    if (accessRole === 'user') {
      setNotice('Staff access required.');
      return;
    }
    const studentKey = getStudentKey(student);
    if (!studentKey || !studentEditForm) return;
    const payload = {
      name: studentEditForm.name.trim(),
      chineseName: studentEditForm.chineseName.trim(),
      className: studentEditForm.className.trim(),
      gender: normalizeGender(studentEditForm.gender),
      house: normalizeHouse(studentEditForm.house),
      ic: studentKey,
      studentKey,
      updatedAt: serverTimestamp(),
    };
    if (!payload.name || !payload.className || !payload.gender || !payload.house) {
      setNotice('Name, class, gender, and house are required.');
      return;
    }
    const batch = writeBatch(db);
    batch.set(doc(refs.students, studentKey), payload, { merge: true });
    registrations.filter((registration) => registration.studentIc === studentKey).forEach((registration) => {
      batch.set(doc(refs.registrations, registration.id), {
        className: payload.className,
        house: payload.house,
        updatedAt: serverTimestamp(),
        updatedMs: Date.now(),
      }, { merge: true });
    });
    await batch.commit();
    cancelStudentEdit();
    setNotice('Student updated.');
  };

  const deleteStudent = async (student) => {
    if (accessRole === 'user') {
      setNotice('Staff access required.');
      return;
    }
    const studentKey = getStudentKey(student);
    if (!studentKey) return;
    const confirmed = window.confirm(`Delete ${displayStudentName(student, studentKey)} and all event registrations?`);
    if (!confirmed) return;
    const batch = writeBatch(db);
    registrations.filter((registration) => registration.studentIc === studentKey).forEach((registration) => {
      batch.delete(doc(refs.registrations, registration.id));
    });
    batch.delete(doc(refs.students, studentKey));
    await batch.commit();
    if (editingStudentKey === studentKey) cancelStudentEdit();
    setNotice('Student deleted.');
  };

  const startEventEdit = (event) => {
    setEditingEventId(event.id);
    setEventEditForm({
      no: Number(event.no || 0),
      name: event.name || '',
      baseName: event.baseName || event.name || '',
      category: event.category || '',
      type: event.type || 'Individu',
      kind: event.kind || 'Utama',
      withoutStudent: Boolean(event.withoutStudent),
      teamCountPerHouse: getTeamCountPerHouse(event),
      points1: Number(event.scoring?.[1] || 0),
      points2: Number(event.scoring?.[2] || 0),
      points3: Number(event.scoring?.[3] || 0),
      points4: Number(event.scoring?.[4] || 0),
    });
  };

  const cancelEventEdit = () => {
    setEditingEventId('');
    setEventEditForm(null);
  };

  const saveEventEdit = async (event) => {
    if (accessRole === 'user') {
      setNotice('Staff access required.');
      return;
    }
    if (!eventEditForm) return;
    const payload = {
      no: Number(eventEditForm.no || 0),
      name: eventEditForm.name.trim(),
      baseName: eventEditForm.baseName.trim(),
      category: eventEditForm.category.trim(),
      type: eventEditForm.type,
      kind: eventEditForm.kind,
      withoutStudent: Boolean(eventEditForm.withoutStudent),
      teamCountPerHouse: eventEditForm.withoutStudent ? clampTeamCountPerHouse(eventEditForm.teamCountPerHouse) : 1,
      scoring: {
        ...Object.fromEntries(
          RESULT_PLACES.map((position) => [position, Number(eventEditForm[`points${position}`] || 0)]),
        ),
        5: deleteField(),
      },
      updatedAt: serverTimestamp(),
    };
    if (!payload.name || !payload.category) {
      setNotice('Event name and category are required.');
      return;
    }
    const batch = writeBatch(db);
    batch.set(doc(refs.events, event.id), payload, { merge: true });
    const eventRegistrationRows = registrations.filter((registration) => registration.eventId === event.id);
    if (payload.withoutStudent) {
      if (!event.withoutStudent) {
        eventRegistrationRows.forEach((registration) => {
          batch.delete(doc(refs.registrations, registration.id));
        });
      }
      const expectedHouseEntryKeys = new Set();
      const existingHouseEntries = new Map(eventRegistrationRows.filter(isHouseEntry).map((registration) => [registration.studentIc, registration]));
      houses.forEach((house) => {
        Array.from({ length: payload.teamCountPerHouse }, (_, teamIndex) => teamIndex + 1).forEach((teamNumber) => {
          const entryKey = getHouseEntryKey(house, teamNumber);
          expectedHouseEntryKeys.add(entryKey);
          const existingEntry = existingHouseEntries.get(entryKey);
          batch.set(doc(refs.registrations, `${event.id}_${entryKey}`), {
            eventId: event.id,
            entryType: 'house',
            studentIc: entryKey,
            house,
            teamNumber,
            className: '',
            position: existingEntry?.position || '',
            points: Number(existingEntry?.points || 0),
            updatedAt: serverTimestamp(),
            updatedMs: existingEntry?.updatedMs || Date.now(),
          }, { merge: true });
        });
      });
      eventRegistrationRows.filter(isHouseEntry).forEach((registration) => {
        if (!expectedHouseEntryKeys.has(registration.studentIc)) {
          batch.delete(doc(refs.registrations, registration.id));
        }
      });
    } else if (event.withoutStudent) {
      eventRegistrationRows.filter(isHouseEntry).forEach((registration) => {
        batch.delete(doc(refs.registrations, registration.id));
      });
    }
    await batch.commit();
    cancelEventEdit();
    setNotice('Event updated.');
  };

  const getRegistrationBlockReason = (event, eventList, student) => {
    if (!event) return 'Choose an event first.';
    const year = getYear(student.className);
    if (!year) return 'Student class must contain year 1-6.';
    const eligibility = getEventEligibility(event);
    if (eligibility.year && year !== eligibility.year) {
      return `This event is only for Tahun ${eligibility.year}.`;
    }
    if (eligibility.gender && String(student.gender || '') !== eligibility.gender) {
      return `This event is only for ${eligibility.gender}.`;
    }

    const isTahap2 = year >= 4;
    const type = String(event.type || '').toUpperCase();
    const isTarikTali = String(event.name || '').toUpperCase().includes('TARIK TALI');

    if (isTarikTali) {
      if (year < 4 || year > 6) return 'Tarik Tali is only for Tahun 4, 5, 6.';
      const sameHouseYear = eventList.filter((registration) => {
        const registeredStudent = studentMap.get(registration.studentIc) || {};
        return houseMatchKey(registration.house) === houseMatchKey(student.house) && getYear(registeredStudent.className) === year;
      });
      if (sameHouseYear.length >= Number(settings.maxTarikTaliPerHouseYear || 4)) {
        return `Tarik Tali quota is full for Tahun ${year} Rumah ${student.house}.`;
      }
    }

    const studentKey = getStudentKey(student);
    const existingEvents = registrations
      .filter((registration) => registration.studentIc === studentKey && registration.eventId !== event.id)
      .map((registration) => eventMap.get(registration.eventId))
      .filter(Boolean);
    const currentIndividu = existingEvents.filter((item) => String(item.type || '').toUpperCase().includes('INDIVIDU')).length;
    const currentKumpulan = existingEvents.filter((item) => String(item.type || '').toUpperCase().includes('KUMPULAN')).length;
    const maxIndividu = Number(isTahap2 ? settings.maxIndividuTahap2 : settings.maxIndividuTahap1);
    const maxKumpulan = Number(isTahap2 ? settings.maxKumpulanTahap2 : settings.maxKumpulanTahap1);

    if (type.includes('INDIVIDU') && currentIndividu >= maxIndividu) {
      return `Individu limit reached: Tahun ${year} max ${maxIndividu}.`;
    }
    if (type.includes('KUMPULAN') && currentKumpulan >= maxKumpulan) {
      return `Kumpulan limit reached: Tahun ${year} max ${maxKumpulan}.`;
    }
    return '';
  };

  const toggleRegistration = async (student) => {
    if (accessRole === 'user') {
      setNotice('Staff access required.');
      return;
    }
    if (!registerEvent) {
      setNotice('Choose an event first.');
      return;
    }
    if (registerEvent.withoutStudent) {
      setNotice('This event registers houses automatically.');
      return;
    }

    const studentKey = getStudentKey(student);
    if (!studentKey) {
      setNotice('Student record is missing its generated key.');
      return;
    }
    const id = `${registerEvent.id}_${studentKey}`;
    if (registeredStudentSet.has(studentKey)) {
      await deleteDoc(doc(refs.registrations, id));
      return;
    }

    const blockReason = getRegistrationBlockReason(registerEvent, registrationsForRegisterEvent, student);
    if (blockReason) {
      setNotice(blockReason);
      return;
    }

    await setDoc(doc(refs.registrations, id), {
      eventId: registerEvent.id,
      studentIc: studentKey,
      house: student.house,
      className: student.className,
      position: '',
      points: 0,
      updatedAt: serverTimestamp(),
      updatedMs: Date.now(),
    });
    setResultEventId(registerEvent.id);
    setSlipEventId(registerEvent.id);
  };

  const updateResult = async (registration, position) => {
    if (accessRole !== 'admin') {
      setNotice('Admin access required.');
      return;
    }
    const event = eventMap.get(registration.eventId);
    const nextPosition = isResultPlace(position) ? position : '';
    const points = event && nextPosition ? Number(event.scoring?.[nextPosition] || 0) : 0;
    await setDoc(doc(refs.registrations, registration.id), {
      position: nextPosition,
      points,
      updatedAt: serverTimestamp(),
      updatedMs: Date.now(),
    }, { merge: true });
  };

  const deleteEvent = async (eventId) => {
    if (accessRole === 'user') {
      setNotice('Staff access required.');
      return;
    }
    const event = eventMap.get(eventId);
    const confirmed = window.confirm(`Delete ${event ? eventLabel(event) : 'this event'} and all registered students for it?`);
    if (!confirmed) return;
    const batch = writeBatch(db);
    registrations.filter((registration) => registration.eventId === eventId).forEach((registration) => {
      batch.delete(doc(refs.registrations, registration.id));
    });
    batch.delete(doc(refs.events, eventId));
    await batch.commit();
    if (editingEventId === eventId) cancelEventEdit();
    setNotice('Event deleted.');
  };

  const toggleFullscreen = async () => {
    const board = liveBoardRef.current;
    if (!board) return;
    if (document.fullscreenElement === board) {
      await document.exitFullscreen();
      return;
    }
    await board.requestFullscreen();
  };

  const cycleLanguage = () => {
    const currentIndex = LANGUAGE_OPTIONS.findIndex((item) => item.id === language);
    const nextLanguage = LANGUAGE_OPTIONS[(currentIndex + 1) % LANGUAGE_OPTIONS.length];
    setLanguage(nextLanguage.id);
  };

  const toggleResultGroup = (groupId, target) => {
    const setter = target === 'live' ? setExpandedLiveResultIds : setExpandedViewResultIds;
    setter((current) => ({ ...current, [groupId]: !current[groupId] }));
  };

  const getJuryRowsForEvent = (eventId) => {
    const event = eventMap.get(eventId);
    const eventRows = [...(eventRegistrations.get(eventId) || [])].sort((a, b) => {
      const positionA = Number(a.position || 99);
      const positionB = Number(b.position || 99);
      if (positionA !== positionB) return positionA - positionB;
      const studentA = studentMap.get(a.studentIc) || {};
      const studentB = studentMap.get(b.studentIc) || {};
      const houseCompare = houseMatchKey(a.house || studentA.house).localeCompare(houseMatchKey(b.house || studentB.house));
      if (houseCompare) return houseCompare;
      const classCompare = String(studentA.className || a.className || '').localeCompare(String(studentB.className || b.className || ''), undefined, { numeric: true });
      if (classCompare) return classCompare;
      return displayEntryName(a, studentA, event, t('team')).localeCompare(displayEntryName(b, studentB, event, t('team')));
    });
    return eventRows.map((registration, index) => ({
      registration,
      student: studentMap.get(registration.studentIc) || {},
      participantNo: index + 1,
    }));
  };

  const renderSlipPage = (event) => {
    const rows = getJuryRowsForEvent(event.id)
      .map(({ registration, student, participantNo }) => `
        <tr>
          <td>${escapeHtml(participantNo)}</td>
          <td>${escapeHtml(displayEntryName(registration, student, event, t('team')))}</td>
          <td>${escapeHtml(student.className || registration.className || '')}</td>
          <td>${escapeHtml(registration.house || student.house || '')}</td>
          <td>${escapeHtml(isResultPlace(registration.position) ? resultPlaceLabel(registration.position) : '')}</td>
          <td></td>
        </tr>
      `).join('');

    return `
      <section class="slip-page">
        <div class="header">
          <h1>${escapeHtml(settings.schoolName)}</h1>
          <h2>${escapeHtml(`${settings.eventTitle} ${settings.year}`)}</h2>
          <h3>${escapeHtml(tEventDisplayName(event))}</h3>
          <p>${escapeHtml([event.no ? `No. ${event.no}` : '', event.category ? tCategory(event.category) : ''].filter(Boolean).join(' - '))}</p>
        </div>
        <table>
          <thead><tr><th>${escapeHtml(t('participantNo'))}</th><th>${escapeHtml(t('name'))}</th><th>${escapeHtml(t('class'))}</th><th>${escapeHtml(t('house'))}</th><th>${escapeHtml(`${t('place')} / ${t('position')}`)}</th><th>${escapeHtml(t('record'))}</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="6">${escapeHtml(t('noRegistered'))}</td></tr>`}</tbody>
        </table>
        <div class="signatures">
          <div class="line">${escapeHtml(t('preparedBy'))}</div>
          <div class="line">${escapeHtml(t('confirmedBy'))}</div>
        </div>
      </section>
    `;
  };

  const printResultSlips = (eventIds) => {
    if (accessRole === 'user') {
      setNotice('Staff access required.');
      return;
    }
    const printEvents = eventIds.map((eventId) => eventMap.get(eventId)).filter(Boolean);
    if (!printEvents.length) {
      setNotice('Choose an event first.');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${escapeHtml(t('resultSlip'))} - ${escapeHtml(printEvents.length === 1 ? tEventDisplayName(printEvents[0]) : `${printEvents.length} ${t('resultEvents')}`)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            .header { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 18px; }
            h1 { margin: 0; font-size: 22px; text-transform: uppercase; }
            h2 { margin: 8px 0 0; font-size: 17px; }
            h3 { margin: 12px 0 0; font-size: 19px; text-transform: uppercase; }
            p { margin: 6px 0 0; font-size: 13px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td { border: 1px solid #111827; padding: 8px; font-size: 13px; text-align: left; }
            th { background: #f3f4f6; text-transform: uppercase; font-size: 11px; }
            td:nth-child(1), td:nth-child(5) { text-align: center; width: 72px; }
            td:nth-child(6) { height: 30px; width: 160px; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 54px; }
            .line { border-top: 1px solid #111827; padding-top: 8px; font-size: 12px; font-weight: bold; }
            .slip-page { page-break-after: always; }
            .slip-page:last-child { page-break-after: auto; }
            @media print { button { display: none; } body { padding: 0; } }
          </style>
        </head>
        <body>
          <button onclick="window.print()">${escapeHtml(t('print'))}</button>
          ${printEvents.map(renderSlipPage).join('')}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const printResultSlip = () => printResultSlips([slipEventId]);
  const printSelectedResultSlips = () => printResultSlips(selectedSlipEventIds);

  const toggleSlipSelection = (eventId) => {
    setSelectedSlipEventIds((current) => (
      current.includes(eventId) ? current.filter((id) => id !== eventId) : [...current, eventId]
    ));
  };

  const openLogin = (mode) => {
    setLoginMode(mode);
    setAccessPassword('');
    setAccessError('');
  };

  const submitAccess = (event) => {
    event.preventDefault();
    const password = accessPassword.trim();
    if (loginMode === 'teacher' && password === TEACHER_PASSWORD) {
      setAccessRole('teacher');
      setLoginMode('');
      setActiveTab('students');
      setNotice('Teacher view enabled.');
      return;
    }
    if (loginMode === 'admin' && password === ADMIN_PASSWORD) {
      setAccessRole('admin');
      setLoginMode('');
      setActiveTab('students');
      setNotice('Admin view enabled.');
      return;
    }
    setAccessError('Wrong password.');
  };

  const returnToLiveView = () => {
    setAccessRole('user');
    setLoginMode('');
    setAccessPassword('');
    setAccessError('');
    setActiveTab('live');
    setNotice('Live view enabled.');
  };

  if (!hasFirebaseConfig) {
    return (
      <main className="config-screen">
        <section className="config-panel">
          <h1>{t('firebaseMissing')}</h1>
          <p>{t('firebaseHelp')}</p>
          <code>cp .env.example .env.local</code>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <div className={`app-shell theme-${theme}`}>
        <main className="loading-screen" role="status" aria-live="polite">
          <section className="loading-card">
            <img className="loading-logo" src={SCHOOL_LOGO_PATH} alt={`${settings.schoolName || DEFAULT_SETTINGS.schoolName} logo`} />
            <div className="spinner" aria-hidden="true" />
            <p className="eyebrow">{settings.schoolName || DEFAULT_SETTINGS.schoolName}</p>
            <h1>{t('loadingTitle')}</h1>
            <p className="help-text">{t('loadingHelp')}</p>
          </section>
        </main>
        {notice && <button className="notice" type="button" onClick={() => setNotice('')}>{notice}</button>}
      </div>
    );
  }

  const allTabs = [
    ['live', Monitor, t('liveBoard')],
    ['viewResults', FileSpreadsheet, t('viewResults')],
    ['students', Users, t('students')],
    ['events', Trophy, t('events')],
    ['register', ClipboardList, t('register')],
    ['results', Medal, t('resultsEntry')],
    ['slips', Printer, t('slips')],
    ['settings', Settings, t('settings')],
  ];
  const tabs = allTabs.filter(([id]) => visibleTabs.includes(id));

  return (
    <div className={`app-shell theme-${theme}`}>
      <header className="topbar">
        <div className="brand-lockup">
          <img className="site-logo" src={SCHOOL_LOGO_PATH} alt={`${settings.schoolName || DEFAULT_SETTINGS.schoolName} logo`} />
          <div>
            <p className="eyebrow">{settings.schoolName}</p>
            <h1>{t('appTitle')}</h1>
          </div>
        </div>
        <div className="top-actions">
          {tabs.length > 1 ? (
            <nav className="tabbar">
              {tabs.map(([id, Icon, label]) => (
                <button key={id} type="button" className={activeTab === id ? 'tab active' : 'tab'} onClick={() => setActiveTab(id)}>
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </nav>
          ) : <div className="viewer-pill">{t('liveBoard')}</div>}
          <div className="access-controls">
            <span>{accessRole === 'admin' ? t('admin') : accessRole === 'teacher' ? t('teacher') : t('liveView')}</span>
            {accessRole !== 'user' && <button type="button" onClick={returnToLiveView}>{t('liveView')}</button>}
            <button type="button" onClick={() => openLogin('teacher')}>{t('teacher')}</button>
            <button type="button" onClick={() => openLogin('admin')}>{t('admin')}</button>
          </div>
          <button className="language-toggle" type="button" onClick={cycleLanguage} title={t('changeLanguage')} aria-label={t('changeLanguage')}>
            <Languages size={16} />
            <span>{currentLanguage.short}</span>
          </button>
          <button className="theme-toggle" type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title={t('toggleTheme')} aria-label={t('toggleTheme')}>
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

      {loginMode && (
        <div className="access-modal" role="dialog" aria-modal="true">
          <form className="access-card" onSubmit={submitAccess}>
            <p className="eyebrow">{loginMode === 'admin' ? t('adminAccess') : t('teacherAccess')}</p>
            <h2>{loginMode === 'admin' ? t('openAdminView') : t('openTeacherView')}</h2>
            <label>
              {t('password')}
              <input autoFocus type="password" value={accessPassword} onChange={(event) => setAccessPassword(event.target.value)} />
            </label>
            {accessError && <p className="access-error">{accessError}</p>}
            <div className="access-actions">
              <button type="button" className="secondary-button" onClick={() => setLoginMode('')}>{t('cancel')}</button>
              <button type="submit" className="primary-button">{t('open')}</button>
            </div>
          </form>
        </div>
      )}

      {notice && <button className="notice" type="button" onClick={() => setNotice('')}>{notice}</button>}
      {uploadingStudents && (
        <div className="upload-overlay" role="status" aria-live="polite">
          <div className="upload-card">
            <div className="spinner" aria-hidden="true" />
            <strong>{t('uploadingStudentsTitle')}</strong>
            <span>{t('savingFirebase')}</span>
          </div>
        </div>
      )}

      <main className="workspace">
        {activeTab === 'live' && (
          <section className={settings.liveBoardMode === 'total-only' ? 'live-grid total-only' : 'live-grid'} ref={liveBoardRef}>
            <div className="panel scoreboard-panel live-board-surface">
              <div className="section-head">
                <div className="live-board-title">
                  <img className="live-board-logo" src={SCHOOL_LOGO_PATH} alt={`${liveBoardHeaderSchool} logo`} />
                  <div>
                    <p className="eyebrow">{liveBoardHeaderSchool}</p>
                    <h2>{liveBoardHeaderTitle}</h2>
                  </div>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  onClick={toggleFullscreen}
                  title={isLiveBoardFullscreen ? t('exitFullscreen') : t('fullscreen')}
                  aria-label={isLiveBoardFullscreen ? t('exitFullscreen') : t('fullscreen')}
                >
                  {isLiveBoardFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
              </div>
              <div className="score-list">
                {scoreData.houses.map((house, index) => {
                  const maxScore = Math.max(...scoreData.houses.map((item) => item.total), 1);
                  const width = house.total > 0 ? Math.max((house.total / maxScore) * 100, 8) : 0;
                  return (
                    <div className="score-row" key={house.name} style={{ viewTransitionName: `score-row-${hashString(house.name)}` }}>
                      <div className="rank">{resultPlaceLabel(index + 1) || index + 1}</div>
                      <div className="score-track">
                        <div className={houseClassName(house.name)} style={{ width: `${width}%` }}>{house.name}</div>
                      </div>
                      <div className="score-number">{house.total}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="panel fullscreen-winners-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">{t('latest')}</p>
                  <h2>{t('results')}</h2>
                </div>
                <FileSpreadsheet size={22} />
              </div>
              <div className="winner-table">
                <div className="winner-row winner-head">
                  <span>{t('event')}</span>
                  {RESULT_PLACES.map((position) => <span key={position}>{resultPlaceLabel(position)}</span>)}
                </div>
                {latestWinnerRows.length ? latestWinnerRows.map((row, rowIndex) => (
                  <div className="winner-row" key={row.id}>
                    <strong>{rowIndex + 1}. {tEventDisplayName(row.event)}</strong>
                    {row.winners.map((house, index) => (
                      <span key={`${row.id}-${index}`} className="winner-cell">
                        {house ? <b className={`${houseClassName(house)} winner-chip`}>{house}</b> : <em>-</em>}
                      </span>
                    ))}
                  </div>
                )) : (
                  <div className="winner-row winner-empty">{t('noResults')}</div>
                )}
              </div>
            </div>

            <div className="live-side-stack">
              {settings.liveBoardMode !== 'total-only' && (
                <div className="panel class-panel">
                  <div className="section-head">
                    <div>
                      <p className="eyebrow">{t('optional')}</p>
                      <h2>{t('classMarks')}</h2>
                    </div>
                    <Medal size={22} />
                  </div>
                  <div className="mini-list">
                    {scoreData.classes.slice(0, 12).map((row, index) => (
                      <div className="mini-row" key={row.name}>
                        <span>{index + 1}. {row.name}</span>
                        <strong>{row.total}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="panel athlete-panel">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">{t('medals')}</p>
                    <h2>{t('olahragawanTitle')}</h2>
                  </div>
                  <Medal size={22} />
                </div>
                <div className="athlete-list">
                  {[
                    [t('olahragawan'), athleteLeaders.male],
                    [t('olahragawati'), athleteLeaders.female],
                  ].map(([label, athlete]) => (
                    <div className="athlete-row" key={label}>
                      <span>{label}</span>
                      {athlete ? (
                        <div>
                          <strong>{displayStudentName(athlete.student)}</strong>
                          <small>{athlete.student.className || '-'} - {athlete.student.house || '-'}</small>
                          <b>{t('gold')} {athlete.gold} / {t('silver')} {athlete.silver} / {t('bronze')} {athlete.bronze}</b>
                        </div>
                      ) : <em>{t('noMedals')}</em>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel results-panel">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">{t('latest')}</p>
                    <h2>{t('results')}</h2>
                  </div>
                  <FileSpreadsheet size={22} />
                </div>
                <div className="result-list">
                  {latestResultGroups.length ? latestResultGroups.map((group) => {
                    const expanded = Boolean(expandedLiveResultIds[group.id]);
                    return (
                      <div
                        className={rollingLiveResultId === group.id ? 'result-group rolling-new' : 'result-group'}
                        key={group.id}
                        style={{ viewTransitionName: `live-result-${hashString(group.id)}` }}
                      >
                        <button className="result-summary" type="button" onClick={() => toggleResultGroup(group.id, 'live')} aria-expanded={expanded}>
                          <span>
                            <strong>{tEventDisplayName(group.event)}</strong>
                            <small>{group.results.length} {t('completedResults').toLowerCase()}</small>
                          </span>
                          <ChevronDown className={expanded ? 'chevron open' : 'chevron'} size={18} />
                        </button>
                        {expanded && (
                          <div className="result-details">
                            {group.results.map((result) => (
                              <div className="result-detail-row" key={result.id}>
                                <b>{resultPlaceLabel(result.position)}</b>
                                <span>
                                  <strong>{displayEntryName(result, result.student, group.event, t('team'))}</strong>
                                  {!isHouseEntry(result) && <small>{`${result.student?.className || result.className || '-'} - ${result.house || result.student?.house || '-'}`}</small>}
                                </span>
                                <em>{result.points || 0}</em>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }) : <p className="empty">{t('noResults')}</p>}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'students' && visibleTabs.includes('students') && (
          <section className="split-grid">
            <div className="panel control-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">{t('template')}</p>
                  <h2>{t('studentNamelist')}</h2>
                </div>
                <Users size={22} />
              </div>
              <button className="primary-button" type="button" onClick={downloadTemplate}>
                <Download size={16} /> {t('downloadExcelTemplate')}
              </button>
              <input ref={fileInputRef} hidden type="file" accept=".xlsx,.xls,.csv" onChange={(event) => importStudents(event.target.files?.[0])} />
              <button className="secondary-button" type="button" disabled={uploadingStudents} onClick={() => fileInputRef.current?.click()}>
                <Upload size={16} /> {uploadingStudents ? t('uploading') : t('uploadCompletedList')}
              </button>
              <label>
                {t('search')}
                <input value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} placeholder={`${t('name')}, ${t('chineseName')}, ${t('class')}, ${t('gender')}, ${t('house')}`} />
              </label>
              <div className="student-filter-grid">
                <label>
                  {t('class')}
                  <select value={studentClassFilter} onChange={(event) => setStudentClassFilter(event.target.value)}>
                    <option value="">{t('allClasses')}</option>
                    {studentClassOptions.map((className) => <option key={className} value={className}>{className}</option>)}
                  </select>
                </label>
                <label>
                  {t('gender')}
                  <select value={studentGenderFilter} onChange={(event) => setStudentGenderFilter(event.target.value)}>
                    <option value="">{t('allGenders')}</option>
                    {studentGenderOptions.map((gender) => <option key={gender} value={gender}>{tGender(gender)}</option>)}
                  </select>
                </label>
                <label>
                  {t('house')}
                  <select value={studentHouseFilter} onChange={(event) => setStudentHouseFilter(event.target.value)}>
                    <option value="">{t('allHouses')}</option>
                    {studentHouseOptions.map((house) => <option key={house} value={house}>{house}</option>)}
                  </select>
                </label>
              </div>
              <div className="stats-box">
                <span>{t('showing')}: <b>{filteredStudents.length}</b></span>
                <span>{t('total')}: <b>{students.length}</b></span>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setStudentQuery('');
                  setStudentClassFilter('');
                  setStudentGenderFilter('');
                  setStudentHouseFilter('');
                }}
              >
                {t('clearSearchFilters')}
              </button>
              <p className="help-text">{t('requiredColumnsHelp')}</p>
            </div>

            <div className="panel table-panel">
              <table>
                <thead>
                  <tr><th>{t('name')}</th><th>{t('chineseName')}</th><th>{t('class')}</th><th>{t('gender')}</th><th>{t('house')}</th><th></th></tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => {
                    const studentKey = getStudentKey(student);
                    const editing = editingStudentKey === studentKey && studentEditForm;
                    return (
                      <tr key={studentKey} className={editing ? 'editing-row' : ''}>
                        <td>
                          {editing
                            ? <input value={studentEditForm.name} onChange={(event) => setStudentEditForm({ ...studentEditForm, name: event.target.value })} />
                            : student.name}
                        </td>
                        <td>
                          {editing
                            ? <input value={studentEditForm.chineseName} onChange={(event) => setStudentEditForm({ ...studentEditForm, chineseName: event.target.value })} />
                            : (student.chineseName || '-')}
                        </td>
                        <td>
                          {editing
                            ? <input value={studentEditForm.className} onChange={(event) => setStudentEditForm({ ...studentEditForm, className: event.target.value })} />
                            : student.className}
                        </td>
                        <td>
                          {editing ? (
                            <select value={studentEditForm.gender} onChange={(event) => setStudentEditForm({ ...studentEditForm, gender: event.target.value })}>
                              <option value="">{t('choose')}</option>
                              <option value="Lelaki">{t('male')}</option>
                              <option value="Perempuan">{t('female')}</option>
                            </select>
                          ) : tGender(student.gender)}
                        </td>
                        <td>
                          {editing ? (
                            <input list="house-list" value={studentEditForm.house} onChange={(event) => setStudentEditForm({ ...studentEditForm, house: event.target.value })} />
                          ) : <span className={houseClassName(student.house)}>{student.house}</span>}
                        </td>
                        <td>
                          <div className="row-actions">
                            {editing ? (
                              <>
                                <button className="small-button" type="button" onClick={() => saveStudentEdit(student)}>{t('save')}</button>
                                <button className="small-button muted" type="button" onClick={cancelStudentEdit}>{t('cancel')}</button>
                              </>
                            ) : (
                              <>
                                <button className="icon-button" title={t('editStudent')} type="button" onClick={() => startStudentEdit(student)}><SquarePen size={16} /></button>
                                <button className="icon-button danger" title={t('deleteStudent')} type="button" onClick={() => deleteStudent(student)}><Trash2 size={16} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <datalist id="house-list">
                {houses.map((house) => <option key={house} value={house} />)}
              </datalist>
            </div>
          </section>
        )}

        {activeTab === 'events' && visibleTabs.includes('events') && (
          <section className="event-layout">
            <form className="panel control-panel" onSubmit={saveBulkEvents}>
              <div className="section-head">
                <div>
                  <p className="eyebrow">{t('bulkSetup')}</p>
                  <h2>{t('events')}</h2>
                </div>
                <Trophy size={22} />
              </div>
              <div className="inline-fields">
                <label>
                  {t('startNo')}
                  <input type="number" value={eventForm.startNo} onChange={(event) => setEventForm({ ...eventForm, startNo: Number(event.target.value) })} />
                </label>
                <label>
                  {t('type')}
                  <select value={eventForm.type} onChange={(event) => setEventForm({ ...eventForm, type: event.target.value })}>
                    <option value="Individu">{t('individual')}</option>
                    <option value="Kumpulan">{t('group')}</option>
                  </select>
                </label>
              </div>
              <label>
                {t('mainEventName')}
                <input required value={eventForm.baseName} onChange={(event) => setEventForm({ ...eventForm, baseName: event.target.value })} placeholder={t('sampleEventName')} />
              </label>
              <label>
                {t('eventKind')}
                <select value={eventForm.kind} onChange={(event) => setEventForm({ ...eventForm, kind: event.target.value })}>
                  <option value="Utama">{t('mainKind')}</option>
                  <option value="Tambahan">{t('extraKind')}</option>
                  <option value="Ibu Bapa">{t('parentKind')}</option>
                  <option value="Guru">{t('teacherKind')}</option>
                </select>
              </label>
              <label className="check-row">
                <input type="checkbox" checked={eventForm.withoutStudent} onChange={(event) => setEventForm({ ...eventForm, withoutStudent: event.target.checked })} />
                <span>{t('withoutStudentDetails')}</span>
              </label>
              {eventForm.withoutStudent && (
                <>
                  <label>
                    {t('teamsPerHouse')}
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={eventForm.teamCountPerHouse}
                      onChange={(event) => setEventForm({ ...eventForm, teamCountPerHouse: event.target.value })}
                      onBlur={(event) => setEventForm({ ...eventForm, teamCountPerHouse: clampTeamCountPerHouse(event.target.value) })}
                    />
                  </label>
                  <p className="help-text">{t('noStudentAutoHelp')} {t('teamsPerHouseHelp')}</p>
                </>
              )}
              <div className="category-picker">
                <div className="category-actions">
                  <span>{t('categories')}</span>
                  <button type="button" onClick={() => setEventForm({ ...eventForm, categories: [...CATEGORY_ORDER] })}>{t('selectAll')}</button>
                </div>
                <div className="category-grid">
                  {CATEGORY_ORDER.map((category) => (
                    <button key={category} type="button" className={eventForm.categories.includes(category) ? 'chip active' : 'chip'} onClick={() => toggleCategory(category)}>
                      {tCategory(category)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="points-grid">
                {RESULT_PLACES.map((position) => (
                  <label key={position}>
                    {resultPlaceLabel(position)}
                    <input type="number" value={eventForm[`points${position}`]} onChange={(event) => setEventForm({ ...eventForm, [`points${position}`]: event.target.value })} />
                  </label>
                ))}
              </div>
              <button className="primary-button" type="submit"><Save size={16} /> {t('saveBulkEvents')}</button>
            </form>

            <div className="panel table-panel">
              <table>
                <thead>
                  <tr><th>{t('no')}</th><th>{t('event')}</th><th>{t('category')}</th><th>{t('type')}</th><th>{t('mode')}</th><th>{t('scoring')}</th><th>{t('entries')}</th><th></th></tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const editing = editingEventId === event.id && eventEditForm;
                    return (
                      <tr key={event.id} className={editing ? 'editing-row' : ''}>
                        <td>
                          {editing
                            ? <input type="number" value={eventEditForm.no} onChange={(inputEvent) => setEventEditForm({ ...eventEditForm, no: inputEvent.target.value })} />
                            : event.no}
                        </td>
                        <td>
                          {editing
                            ? <input value={eventEditForm.name} onChange={(inputEvent) => setEventEditForm({ ...eventEditForm, name: inputEvent.target.value })} />
                            : event.name}
                        </td>
                        <td>
                          {editing
                            ? <input list="category-list" value={eventEditForm.category} onChange={(inputEvent) => setEventEditForm({ ...eventEditForm, category: inputEvent.target.value })} />
                            : tCategory(event.category)}
                        </td>
                        <td>
                          {editing ? (
                            <select value={eventEditForm.type} onChange={(inputEvent) => setEventEditForm({ ...eventEditForm, type: inputEvent.target.value })}>
                              <option value="Individu">{t('individual')}</option>
                              <option value="Kumpulan">{t('group')}</option>
                            </select>
                          ) : tEventType(event.type)}
                        </td>
                        <td>
                          {editing ? (
                            <div className="mini-points">
                              <label className="table-check">
                                <input type="checkbox" checked={eventEditForm.withoutStudent} onChange={(inputEvent) => setEventEditForm({ ...eventEditForm, withoutStudent: inputEvent.target.checked })} />
                                {t('house')}
                              </label>
                              {eventEditForm.withoutStudent && (
                                <input
                                  aria-label={t('teamsPerHouse')}
                                  type="number"
                                  min="1"
                                  max="8"
                                  value={eventEditForm.teamCountPerHouse}
                                  onChange={(inputEvent) => setEventEditForm({ ...eventEditForm, teamCountPerHouse: inputEvent.target.value })}
                                  onBlur={(inputEvent) => setEventEditForm({ ...eventEditForm, teamCountPerHouse: clampTeamCountPerHouse(inputEvent.target.value) })}
                                />
                              )}
                            </div>
                          ) : (event.withoutStudent ? `${t('houseOnly')} (${getTeamCountPerHouse(event)} ${t('teamsPerHouse')})` : t('student'))}
                        </td>
                        <td>
                          {editing ? (
                            <div className="mini-points">
                              {RESULT_PLACES.map((position) => (
                                <input
                                  key={position}
                                  aria-label={`${t('position')} ${position} ${t('points')}`}
                                  type="number"
                                  value={eventEditForm[`points${position}`]}
                                  onChange={(inputEvent) => setEventEditForm({ ...eventEditForm, [`points${position}`]: inputEvent.target.value })}
                                />
                              ))}
                            </div>
                          ) : RESULT_PLACES.map((position) => event.scoring?.[position] ?? 0).join('/')}
                        </td>
                        <td>{(eventRegistrations.get(event.id) || []).length}</td>
                        <td>
                          <div className="row-actions">
                            {editing ? (
                              <>
                                <button className="small-button" type="button" onClick={() => saveEventEdit(event)}>{t('save')}</button>
                                <button className="small-button muted" type="button" onClick={cancelEventEdit}>{t('cancel')}</button>
                              </>
                            ) : (
                              <>
                                <button className="icon-button" title={t('editEvent')} type="button" onClick={() => startEventEdit(event)}><SquarePen size={16} /></button>
                                <button className="icon-button danger" title={t('deleteEvent')} type="button" onClick={() => deleteEvent(event.id)}><Trash2 size={16} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <datalist id="category-list">
                {CATEGORY_ORDER.map((category) => <option key={category} value={category} label={tCategory(category)}>{tCategory(category)}</option>)}
              </datalist>
            </div>
          </section>
        )}

        {activeTab === 'register' && visibleTabs.includes('register') && (
          <section className="register-layout">
            <div className="panel control-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">{t('participants')}</p>
                  <h2>{t('register')}</h2>
                </div>
                <ClipboardList size={22} />
              </div>
              <label>
                {t('event')}
                <select value={registerEventId} onChange={(event) => setRegisterEventId(event.target.value)}>
                  <option value="">{t('chooseEvent')}</option>
                  {events.map((event) => <option key={event.id} value={event.id}>{tEventLabel(event)}</option>)}
                </select>
              </label>
              {registerEvent?.withoutStudent && (
                <p className="help-text">{t('noStudentRegisterHelp')}</p>
              )}
              <label>
                {t('search')}
                <input value={registerQuery} onChange={(event) => setRegisterQuery(event.target.value)} placeholder={`${t('name')}, ${t('chineseName')}, ${t('class')}, ${t('gender')}`} />
              </label>
              <label>
                {t('house')}
                <select value={registerHouse} onChange={(event) => setRegisterHouse(event.target.value)}>
                  <option value="">{t('allHouses')}</option>
                  {houses.map((house) => <option key={house} value={house}>{house}</option>)}
                </select>
              </label>
              <div className="student-filter-grid">
                <label>
                  {t('year')}
                  <select value={registerEffectiveClassFilter} disabled={Boolean(registerEligibility.year)} onChange={(event) => setRegisterClassFilter(event.target.value)}>
                    <option value="">{t('allYears')}</option>
                    {[1, 2, 3, 4, 5, 6].map((year) => <option key={year} value={year}>{tYear(year)}</option>)}
                  </select>
                </label>
                <label>
                  {t('gender')}
                  <select value={registerEffectiveGenderFilter} disabled={Boolean(registerEligibility.gender)} onChange={(event) => setRegisterGenderFilter(event.target.value)}>
                    <option value="">{t('allGenders')}</option>
                    {studentGenderOptions.map((gender) => <option key={gender} value={gender}>{tGender(gender)}</option>)}
                  </select>
                </label>
              </div>
              {registerEvent && (registerEligibility.year || registerEligibility.gender) && (
                <p className="help-text">{t('eventShowsPrefix')} {registerEligibility.year ? tYear(registerEligibility.year) : t('allYears')} {registerEligibility.gender ? tGender(registerEligibility.gender) : t('allGenders')} {t('students').toLowerCase()}.</p>
              )}
              <div className="stats-box">
                <span>{t('registered')}: <b>{registrationsForRegisterEvent.length}</b></span>
                <span>{registerEvent?.withoutStudent ? t('houseTeams') : t('availableStudents')}: <b>{registerEvent?.withoutStudent ? registrationsForRegisterEvent.length : registerCandidates.length}</b></span>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setRegisterQuery('');
                  setRegisterHouse('');
                  setRegisterClassFilter('');
                  setRegisterGenderFilter('');
                }}
              >
                {t('clearSearchFilters')}
              </button>
            </div>

            <div className="panel entry-panel">
              <div className="entry-columns">
                <div>
                  <div className="list-title">
                    <p className="eyebrow">{registerEvent?.withoutStudent ? t('houseTeams') : t('studentPool')}</p>
                    <strong>{registerCandidates.length}</strong>
                  </div>
                  <div className="student-picker">
                    {registerCandidates.map((student) => {
                      const studentKey = getStudentKey(student);
                      const selected = registeredStudentSet.has(studentKey);
                      return (
                        <button className={selected ? 'picker-row selected' : 'picker-row'} key={studentKey} type="button" onClick={() => toggleRegistration(student)}>
                          <span>
                            <strong>{displayStudentName(student)}</strong>
                            <small>{student.className} - {tGender(student.gender)} - {student.house}</small>
                          </span>
                          <b>{selected ? 'IN' : '+'}</b>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="list-title">
                    <p className="eyebrow">{registerEvent?.withoutStudent ? t('registeredTeams') : t('registeredStudents')}</p>
                    <strong>{registrationsForRegisterEvent.length}</strong>
                  </div>
                  <div className="registered-list">
                    {registrationsForRegisterEvent.map((registration) => {
                      const student = studentMap.get(registration.studentIc) || {};
                      return (
                        <div className="registered-row" key={registration.id}>
                          <div className="registered-top">
                            <div>
                              <strong>{displayEntryName(registration, student, registerEvent, t('team'))}</strong>
                              {!isHouseEntry(registration) && <small>{`${student.className || registration.className} - ${tGender(student.gender)} - ${registration.house}`}</small>}
                            </div>
                            {!registerEvent?.withoutStudent && <button className="position clear" type="button" onClick={() => toggleRegistration({ ...student, ic: registration.studentIc })}>{t('remove')}</button>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'viewResults' && visibleTabs.includes('viewResults') && (
          <section className="split-grid">
            <div className="panel control-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">{t('readonly')}</p>
                  <h2>{t('viewResults')}</h2>
                </div>
                <FileSpreadsheet size={22} />
              </div>
              <label>
                {t('quickEvent')}
                <select value={viewResultEventFilter} onChange={(event) => setViewResultEventFilter(event.target.value)}>
                  <option value="">{t('allEvents')}</option>
                  {resultEventOptions.map(({ id, event }) => <option key={id} value={id}>{tEventDisplayName(event)}</option>)}
                </select>
              </label>
              <div className="stats-box">
                <span>{t('completed')}: <b>{filteredViewResults.length}</b></span>
                <span>{t('resultEvents')}: <b>{new Set(filteredViewResults.map((result) => result.eventId)).size}</b></span>
              </div>
              <p className="help-text">{t('viewHelp')}</p>
            </div>

            <div className="panel result-browser">
              {viewResultGroups.length ? viewResultGroups.map((group) => {
                const expanded = Boolean(expandedViewResultIds[group.id]);
                return (
                  <div className="result-group" key={group.id}>
                    <button className="result-summary" type="button" onClick={() => toggleResultGroup(group.id, 'view')} aria-expanded={expanded}>
                      <span>
                        <strong>{tEventDisplayName(group.event)}</strong>
                        <small>{group.results.length} {t('completedResults').toLowerCase()}</small>
                      </span>
                      <ChevronDown className={expanded ? 'chevron open' : 'chevron'} size={18} />
                    </button>
                    {expanded && (
                      <div className="result-details">
                        <div className="result-detail-head">
                          <span>{t('place')}</span>
                          <span>{t('name')}</span>
                          <span>{t('class')}</span>
                          <span>{t('house')}</span>
                          <span>{t('points')}</span>
                        </div>
                        {group.results.map((result) => (
                          <div className="result-detail-grid" key={result.id}>
                            <b>{resultPlaceLabel(result.position)}</b>
                            <strong>{displayEntryName(result, result.student, group.event, t('team'))}</strong>
                            <span>{result.student?.className || result.className || '-'}</span>
                            <span>{result.house || result.student?.house || '-'}</span>
                            <em>{result.points || 0}</em>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }) : <p className="empty">{t('noResults')}</p>}
            </div>
          </section>
        )}

        {activeTab === 'results' && visibleTabs.includes('results') && accessRole === 'admin' && (
          <section className="results-entry-grid">
            <div className="panel control-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">{t('judging')}</p>
                  <h2>{t('resultsEntry')}</h2>
                </div>
                <Medal size={22} />
              </div>
              <label>
                {t('event')}
                <select value={resultEventId} onChange={(event) => setResultEventId(event.target.value)}>
                  <option value="">{t('chooseEvent')}</option>
                  {events.map((event) => <option key={event.id} value={event.id}>{tEventLabel(event)}</option>)}
                </select>
              </label>
              {resultEvent && (
                <div className="points-preview">
                  {RESULT_PLACES.map((position) => (
                    <span key={position}>{resultPlaceLabel(position)}: <b>{resultEvent.scoring?.[position] || 0}</b></span>
                  ))}
                </div>
              )}
            </div>

            <div className="panel registered-list result-entry-list">
              {registrationsForResultEvent.map((registration) => {
                const student = studentMap.get(registration.studentIc) || {};
                return (
                  <div className="registered-row" key={registration.id}>
                    <div className="registered-top">
                      <div>
                        <strong>{displayEntryName(registration, student, resultEvent, t('team'))}</strong>
                        {!isHouseEntry(registration) && <small>{`${student.className || registration.className} - ${tGender(student.gender)} - ${registration.house}`}</small>}
                      </div>
                      <b>{registration.points || 0}</b>
                    </div>
                    <div className="position-buttons">
                      {RESULT_PLACES.map((position) => String(position)).map((position) => (
                        <button key={position} className={String(registration.position) === position ? 'position active' : 'position'} type="button" onClick={() => updateResult(registration, position)}>
                          {resultPlaceLabel(position)}
                        </button>
                      ))}
                      <button className="position clear" type="button" onClick={() => updateResult(registration, '')}>{t('clear')}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === 'slips' && visibleTabs.includes('slips') && (
          <section className="split-grid">
            <div className="panel control-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">{t('official')}</p>
                  <h2>{t('resultSlip')}</h2>
                </div>
                <Printer size={22} />
              </div>
              <label>
                {t('event')}
                <select value={slipEventId} onChange={(event) => setSlipEventId(event.target.value)}>
                  <option value="">{t('chooseEvent')}</option>
                  {events.map((event) => <option key={event.id} value={event.id}>{tEventLabel(event)}</option>)}
                </select>
              </label>
              <div className="stats-box">
                <span>{t('registered')}: <b>{registrationsForSlipEvent.length}</b></span>
                <span>{t('completedResults')}: <b>{registrationsForSlipEvent.filter((registration) => isResultPlace(registration.position)).length}</b></span>
              </div>
              <button className="primary-button" type="button" onClick={printResultSlip}><Printer size={16} /> {t('generateSlip')}</button>
              <div className="bulk-slip-box">
                <div className="list-title">
                  <p className="eyebrow">{t('bulkPrint')}</p>
                  <strong>{selectedSlipEventIds.length} {t('selected')}</strong>
                </div>
                <div className="bulk-actions">
                  <button type="button" onClick={() => setSelectedSlipEventIds(events.map((event) => event.id))}>{t('selectAll')}</button>
                  <button type="button" onClick={() => setSelectedSlipEventIds([])}>{t('clear')}</button>
                </div>
                <div className="bulk-slip-list">
                  {events.map((event) => (
                    <label className="bulk-slip-row" key={event.id}>
                      <input type="checkbox" checked={selectedSlipEventIds.includes(event.id)} onChange={() => toggleSlipSelection(event.id)} />
                      <span>{tEventDisplayName(event)}</span>
                    </label>
                  ))}
                </div>
                <button className="secondary-button" type="button" onClick={printSelectedResultSlips}><Printer size={16} /> {t('printSelected')}</button>
              </div>
            </div>
            <div className="panel slip-preview">
              <div className="slip-paper">
                <p className="eyebrow">{settings.schoolName}</p>
                <h2>{settings.eventTitle} {settings.year}</h2>
                <h3>{slipEvent ? tEventDisplayName(slipEvent) : t('chooseEvent')}</h3>
                {slipEvent && <p className="slip-meta">{[slipEvent.no ? `No. ${slipEvent.no}` : '', slipEvent.category ? tCategory(slipEvent.category) : ''].filter(Boolean).join(' - ')}</p>}
                <table>
                  <thead><tr><th>{t('participantNo')}</th><th>{t('name')}</th><th>{t('class')}</th><th>{t('house')}</th><th>{t('place')} / {t('position')}</th><th>{t('record')}</th></tr></thead>
                  <tbody>
                    {jurySheetRows.length ? jurySheetRows
                      .map(({ registration, student, participantNo }) => {
                        return (
                          <tr key={registration.id}>
                            <td>{participantNo}</td>
                            <td>{displayEntryName(registration, student, slipEvent, t('team'))}</td>
                            <td>{student.className || registration.className}</td>
                            <td>{registration.house || student.house}</td>
                            <td>{isResultPlace(registration.position) ? resultPlaceLabel(registration.position) : ''}</td>
                            <td></td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan="6">{t('noRegistered')}</td></tr>
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'settings' && visibleTabs.includes('settings') && (
          <section className="settings-grid">
            <div className="panel settings-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">{t('general')}</p>
                  <h2>{t('eSukanSettings')}</h2>
                </div>
                <Settings size={22} />
              </div>
              <label>{t('schoolName')}<input value={settings.schoolName || ''} onChange={(event) => setSettings({ ...settings, schoolName: event.target.value })} /></label>
              <label>{t('eventTitle')}<input value={settings.eventTitle || ''} onChange={(event) => setSettings({ ...settings, eventTitle: event.target.value })} /></label>
              <label>{t('year')}<input type="number" value={settings.year || ''} onChange={(event) => setSettings({ ...settings, year: Number(event.target.value) })} /></label>
              <label>{t('houses')}<textarea rows="4" value={houses.join('\n')} onChange={(event) => setSettings({ ...settings, houses: splitHouseList(event.target.value) })} /></label>
              <label>
                {t('liveBoardSetting')}
                <select value={settings.liveBoardMode || 'total-only'} onChange={(event) => setSettings({ ...settings, liveBoardMode: event.target.value })}>
                  <option value="total-only">{t('totalOnly')}</option>
                  <option value="total-and-class">{t('totalAndClass')}</option>
                </select>
              </label>
              <label>{t('liveBoardSmallHeader')}<input placeholder={settings.schoolName || DEFAULT_SETTINGS.schoolName} value={settings.liveBoardHeaderSchool || ''} onChange={(event) => setSettings({ ...settings, liveBoardHeaderSchool: event.target.value })} /></label>
              <label>{t('liveBoardMainTitle')}<input placeholder={DEFAULT_SETTINGS.liveBoardHeaderTitle} value={settings.liveBoardHeaderTitle || ''} onChange={(event) => setSettings({ ...settings, liveBoardHeaderTitle: event.target.value })} /></label>
              <button className="primary-button" type="button" onClick={saveSettings}><Save size={16} /> {t('saveSettings')}</button>
            </div>

            <div className="panel settings-panel">
              <div className="section-head">
                <div><p className="eyebrow">{t('rules')}</p><h2>{t('participationLimits')}</h2></div>
                <Medal size={22} />
              </div>
              <div className="inline-fields">
                <label>{t('individual')} Tahap 1<input type="number" value={settings.maxIndividuTahap1 || 0} onChange={(event) => setSettings({ ...settings, maxIndividuTahap1: Number(event.target.value) })} /></label>
                <label>{t('individual')} Tahap 2<input type="number" value={settings.maxIndividuTahap2 || 0} onChange={(event) => setSettings({ ...settings, maxIndividuTahap2: Number(event.target.value) })} /></label>
              </div>
              <div className="inline-fields">
                <label>{t('group')} Tahap 1<input type="number" value={settings.maxKumpulanTahap1 || 0} onChange={(event) => setSettings({ ...settings, maxKumpulanTahap1: Number(event.target.value) })} /></label>
                <label>{t('group')} Tahap 2<input type="number" value={settings.maxKumpulanTahap2 || 0} onChange={(event) => setSettings({ ...settings, maxKumpulanTahap2: Number(event.target.value) })} /></label>
              </div>
              <label>{t('tarikTaliQuota')}<input type="number" value={settings.maxTarikTaliPerHouseYear || 0} onChange={(event) => setSettings({ ...settings, maxTarikTaliPerHouseYear: Number(event.target.value) })} /></label>
              <div className="stats-box">
                <span>{t('students')}: <b>{students.length}</b></span>
                <span>{t('events')}: <b>{events.length}</b></span>
                <span>{t('registrations')}: <b>{registrations.length}</b></span>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
