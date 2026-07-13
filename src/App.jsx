import React, { useEffect, useMemo, useRef, useState } from 'react';
import { initializeApp } from 'firebase/app';
import {
  collection,
  deleteField,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  Activity,
  ClipboardList,
  CircleAlert,
  CircleCheck,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Languages,
  Maximize2,
  Medal,
  Minimize2,
  Monitor,
  Moon,
  Pin,
  Printer,
  Save,
  SquarePen,
  Settings,
  Sun,
  Trash2,
  Trophy,
  Upload,
  Users,
  X,
} from 'lucide-react';

const CANONICAL_HOUSES = ['红 MERAH', '黄 KUNING', '蓝 BIRU', '青 HIJAU'];
const DEFAULT_HOUSES = CANONICAL_HOUSES;
const HOUSE_COLOR_ORDER = [
  ['红', 'MERAH', 'RED'],
  ['黄', 'KUNING', 'YELLOW'],
  ['蓝', 'BIRU', 'BLUE'],
  ['青', '绿', 'HIJAU', 'GREEN'],
];
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
  liveBoardPinnedEventIds: [],
  liveBoardHeaderSchool: '',
  liveBoardHeaderTitle: 'Papan Markah Kejohanan Sukan Tahunan',
  maxIndividuTahap1: 2,
  maxIndividuTahap2: 3,
  maxKumpulanTahap1: 1,
  maxKumpulanTahap2: 2,
  maxTarikTaliPerHouseYear: 4,
};
const SCHOOL_LOGO_PATH = '/logo-sjkc-shin-cheng.png';
const LIVE_SUMMARY_VERSION = 7;
const STUDENT_YEARS = [1, 2, 3, 4, 5, 6];
const DEFAULT_LANE_COUNT = 8;
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
    tabs: ['live', 'viewResults', 'lanes'],
  },
  teacher: {
    label: 'Teacher',
    tabs: ['live', 'viewResults', 'lanes', 'students', 'events', 'register', 'slips', 'settings'],
  },
  admin: {
    label: 'Admin',
    tabs: ['live', 'viewResults', 'lanes', 'students', 'events', 'register', 'results', 'slips', 'settings'],
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
    lanes: 'Lorong',
    laneViewer: 'Paparan Lorong',
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
    overview: 'Keseluruhan',
    pinnedEvents: 'Acara dipinkan',
    savePinnedEvents: 'Simpan acara dipinkan',
    noticeSuccess: 'Berjaya',
    noticeInfo: 'Makluman',
    noticeError: 'Ralat',
    settingsSaved: 'Tetapan berjaya disimpan.',
    eventsCreated: 'acara berjaya dicipta.',
    houseEventsCreated: 'acara rumah berjaya dicipta.',
    templateDownloaded: 'Templat Excel berjaya dimuat turun.',
    studentsImported: 'murid berjaya diimport.',
    studentUpdated: 'Maklumat murid berjaya dikemas kini.',
    studentDeleted: 'Murid berjaya dipadam.',
    studentRegistered: 'Murid berjaya didaftarkan.',
    studentUnregistered: 'Pendaftaran murid berjaya dibatalkan.',
    relayTeamSaved: 'Pasukan lari berganti-ganti berjaya disimpan.',
    resultSaved: 'Keputusan berjaya disimpan.',
    eventUpdated: 'Acara berjaya dikemas kini.',
    eventDeleted: 'Acara berjaya dipadam.',
    printOpened: 'Tetingkap cetakan telah dibuka.',
    printWindowBlocked: 'Tetingkap cetakan tidak dapat dibuka. Benarkan pop-up dan cuba lagi.',
    teacherViewEnabled: 'Paparan guru telah dibuka.',
    adminViewEnabled: 'Paparan admin telah dibuka.',
    liveViewEnabled: 'Paparan langsung telah dibuka.',
    results: 'Keputusan',
    classMarks: 'Markah Kelas',
    optional: 'Pilihan',
    noResults: 'Belum ada keputusan.',
    noLanes: 'Belum ada susunan lorong.',
    noAssignedLane: 'Tiada lorong ditetapkan yang kosong untuk rumah',
    noAvailableLane: 'Tiada lorong kosong untuk acara ini.',
    readonly: 'Baca sahaja',
    completed: 'Siap',
    resultEvents: 'Acara',
    viewHelp: 'Halaman ini hanya memaparkan keputusan yang telah dimasukkan. Kemasukan keputusan masih untuk admin sahaja.',
    event: 'Acara',
    allEvents: 'Semua acara',
    quickEvent: 'Cari cepat acara',
    place: 'Tempat',
    lane: 'Lorong',
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
    teamsPerHouse: 'Pasukan setiap rumah (maksimum 8)',
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
    relayMembersRequired: 'Pilih empat murid berbeza untuk pasukan lari berganti-ganti ini.',
    relayMemberInUse: 'Seorang murid hanya boleh mewakili satu pasukan lari berganti-ganti bagi acara ini.',
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
    lanes: 'Lanes',
    laneViewer: 'Lane Viewer',
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
    overview: 'Overview',
    pinnedEvents: 'Pinned events',
    savePinnedEvents: 'Save pinned events',
    noticeSuccess: 'Success',
    noticeInfo: 'Notice',
    noticeError: 'Error',
    settingsSaved: 'Settings saved.',
    eventsCreated: 'events created.',
    houseEventsCreated: 'house events created.',
    templateDownloaded: 'Excel template downloaded.',
    studentsImported: 'students imported.',
    studentUpdated: 'Student updated.',
    studentDeleted: 'Student deleted.',
    studentRegistered: 'Student registered.',
    studentUnregistered: 'Student registration removed.',
    relayTeamSaved: 'Relay team saved.',
    resultSaved: 'Result saved.',
    eventUpdated: 'Event updated.',
    eventDeleted: 'Event deleted.',
    printOpened: 'Print window opened.',
    printWindowBlocked: 'Could not open the print window. Allow pop-ups and try again.',
    teacherViewEnabled: 'Teacher view enabled.',
    adminViewEnabled: 'Admin view enabled.',
    liveViewEnabled: 'Live view enabled.',
    results: 'Results',
    classMarks: 'Class Marks',
    optional: 'Optional',
    noResults: 'No results entered yet.',
    noLanes: 'No lane assignments yet.',
    noAssignedLane: 'No assigned lane is available for house',
    noAvailableLane: 'No empty lane is available for this event.',
    readonly: 'Readonly',
    completed: 'Completed',
    resultEvents: 'Events',
    viewHelp: 'This page only shows keyed-in results. Result entry remains admin-only.',
    event: 'Event',
    allEvents: 'All events',
    quickEvent: 'Quick event search',
    place: 'Place',
    lane: 'Lane',
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
    teamsPerHouse: 'Teams per house (max 8)',
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
    relayMembersRequired: 'Choose four different students for this relay team.',
    relayMemberInUse: 'A student can only join one relay team for this event.',
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
    lanes: '跑道',
    laneViewer: '跑道查看',
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
    overview: '总览',
    pinnedEvents: '置顶项目',
    savePinnedEvents: '保存置顶项目',
    noticeSuccess: '操作成功',
    noticeInfo: '提示',
    noticeError: '错误',
    settingsSaved: '设置已保存。',
    eventsCreated: '个项目已创建。',
    houseEventsCreated: '个运动组项目已创建。',
    templateDownloaded: 'Excel 模板已下载。',
    studentsImported: '名学生已导入。',
    studentUpdated: '学生资料已更新。',
    studentDeleted: '学生已删除。',
    studentRegistered: '学生已报名。',
    studentUnregistered: '学生报名已取消。',
    relayTeamSaved: '接力队伍已保存。',
    resultSaved: '成绩已保存。',
    eventUpdated: '项目已更新。',
    eventDeleted: '项目已删除。',
    printOpened: '打印窗口已打开。',
    printWindowBlocked: '无法打开打印窗口。请允许弹出窗口后再试。',
    teacherViewEnabled: '教师页面已打开。',
    adminViewEnabled: '管理员页面已打开。',
    liveViewEnabled: '即时页面已打开。',
    results: '成绩',
    classMarks: '班级分数',
    optional: '选项',
    noResults: '还没有录入成绩。',
    noLanes: '还没有跑道安排。',
    noAssignedLane: '该运动组没有可用的指定跑道',
    noAvailableLane: '此项目没有空跑道。',
    readonly: '只读',
    completed: '已完成',
    resultEvents: '项目',
    viewHelp: '此页面只显示已录入的成绩。成绩录入仍限管理员使用。',
    event: '项目',
    allEvents: '全部项目',
    quickEvent: '快速选择项目',
    place: '名次',
    lane: '跑道',
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
    teamsPerHouse: '每组队伍数（最多8）',
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
    relayMembersRequired: '请为这支接力队选择四名不同的学生。',
    relayMemberInUse: '每名学生只能代表一个接力队参加此项目。',
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

const normalizeHouse = (value) => {
  const house = String(value || '').trim();
  if (!house) return '';
  const key = house.toLocaleUpperCase('ms-MY');
  const colorIndex = HOUSE_COLOR_ORDER.findIndex((tokens) => tokens.some((token) => key.includes(token)));
  return colorIndex >= 0 ? CANONICAL_HOUSES[colorIndex] : house;
};
const normalizeStudentRecord = (student = {}) => ({ ...student, house: normalizeHouse(student.house) });
const normalizeRegistrationRecord = (registration = {}) => ({ ...registration, house: normalizeHouse(registration.house) });
const normalizeEventRecord = (event = {}) => ({
  ...event,
  lanePlan: Array.isArray(event.lanePlan)
    ? event.lanePlan.map((lane) => ({ ...lane, house: normalizeHouse(lane.house) }))
    : event.lanePlan,
});
const houseMatchKey = (value) => normalizeHouse(value).toLocaleUpperCase('ms-MY');
const getHouseColorOrder = (house) => {
  const key = houseMatchKey(house);
  const index = HOUSE_COLOR_ORDER.findIndex((tokens) => tokens.some((token) => key.includes(token)));
  return index >= 0 ? index : HOUSE_COLOR_ORDER.length;
};
const isSameHouse = (firstHouse, secondHouse) => {
  const firstKey = houseMatchKey(firstHouse);
  const secondKey = houseMatchKey(secondHouse);
  if (!firstKey || !secondKey) return false;
  if (firstKey === secondKey) return true;
  const firstIndex = HOUSE_COLOR_ORDER.findIndex((tokens) => tokens.some((token) => firstKey.includes(token)));
  const secondIndex = HOUSE_COLOR_ORDER.findIndex((tokens) => tokens.some((token) => secondKey.includes(token)));
  return firstIndex >= 0 && firstIndex === secondIndex;
};
const resolveLaneAssignments = (event, registrations = []) => {
  const hasLanePlan = Array.isArray(event?.lanePlan) && event.lanePlan.length > 0;
  const lanes = hasLanePlan
    ? event.lanePlan
      .map((lane) => ({ laneNumber: Number(lane.laneNumber || lane.lane || 0), house: normalizeHouse(lane.house) }))
      .filter((lane) => lane.laneNumber)
    : [];
  const registrationsByLane = new Map();
  const unassigned = [];

  registrations.forEach((registration) => {
    const laneNumber = Number(registration.laneNumber || 0);
    const knownLane = !hasLanePlan || lanes.some((lane) => lane.laneNumber === laneNumber);
    if (laneNumber && knownLane && !registrationsByLane.has(laneNumber)) {
      registrationsByLane.set(laneNumber, registration);
      if (!hasLanePlan) lanes.push({ laneNumber, house: normalizeHouse(registration.house) });
      return;
    }
    unassigned.push(registration);
  });

  unassigned.forEach((registration) => {
    const lane = hasLanePlan
      ? lanes.find((candidate) => !registrationsByLane.has(candidate.laneNumber) && isSameHouse(candidate.house, registration.house))
      : (() => {
        const laneNumber = Array.from({ length: DEFAULT_LANE_COUNT }, (_, index) => index + 1)
          .find((candidate) => !registrationsByLane.has(candidate));
        return laneNumber ? { laneNumber, house: normalizeHouse(registration.house) } : null;
      })();
    if (!lane) return;
    registrationsByLane.set(lane.laneNumber, { ...registration, laneNumber: lane.laneNumber });
    if (!hasLanePlan) lanes.push(lane);
  });

  return {
    lanes: lanes
      .filter((lane, index, all) => all.findIndex((candidate) => candidate.laneNumber === lane.laneNumber) === index)
      .sort((a, b) => a.laneNumber - b.laneNumber || compareHouses(a.house, b.house)),
    registrationsByLane,
  };
};
const compareHouses = (a, b) => {
  const colorCompare = getHouseColorOrder(a) - getHouseColorOrder(b);
  if (colorCompare) return colorCompare;
  return normalizeHouse(a).localeCompare(normalizeHouse(b), undefined, { numeric: true });
};
const sortHouseList = (items) => {
  const unique = new Map();
  items.map(normalizeHouse).filter(Boolean).forEach((house) => {
    const key = houseMatchKey(house);
    if (!unique.has(key)) unique.set(key, house);
  });
  return Array.from(unique.values()).sort(compareHouses);
};
const splitHouseList = (value) => sortHouseList(String(value || '').split(/[,，;；\n\r]+/));
const mergeHouseScoreRows = (rows) => {
  const totals = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const name = normalizeHouse(row?.name);
    if (!name) return;
    totals.set(name, (totals.get(name) || 0) + Number(row?.total || 0));
  });
  return Array.from(totals, ([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total || compareHouses(a.name, b.name));
};
const normalizeLiveSummary = (summary) => {
  if (!summary) return null;
  const normalizeResult = (result) => ({
    ...result,
    house: normalizeHouse(result.house),
    student: result.student ? normalizeStudentRecord(result.student) : result.student,
  });
  const normalizeResultGroup = (group) => ({
    ...group,
    results: Array.isArray(group.results) ? group.results.map(normalizeResult) : [],
  });
  return {
    ...summary,
    scoreData: summary.scoreData ? {
      ...summary.scoreData,
      houses: mergeHouseScoreRows(summary.scoreData.houses),
      classes: Array.isArray(summary.scoreData.classes)
        ? [...summary.scoreData.classes].sort((a, b) => Number(b.total || 0) - Number(a.total || 0) || compareClassNames(a.name, b.name))
        : summary.scoreData.classes,
    } : summary.scoreData,
    latestResultGroups: Array.isArray(summary.latestResultGroups) ? summary.latestResultGroups.map(normalizeResultGroup) : summary.latestResultGroups,
    resultGroups: Array.isArray(summary.resultGroups) ? summary.resultGroups.map(normalizeResultGroup) : summary.resultGroups,
    laneGroups: Array.isArray(summary.laneGroups) ? summary.laneGroups.map((group) => ({
      ...group,
      rows: Array.isArray(group.rows) ? group.rows.map((row) => ({
        ...row,
        house: normalizeHouse(row.house),
        registration: row.registration ? normalizeResult(row.registration) : row.registration,
      })) : [],
    })) : summary.laneGroups,
    athleteLeaders: summary.athleteLeaders ? {
      ...summary.athleteLeaders,
      male: (Array.isArray(summary.athleteLeaders.male)
        ? summary.athleteLeaders.male
        : summary.athleteLeaders.male ? [summary.athleteLeaders.male] : [])
        .map((row) => ({ ...row, student: normalizeStudentRecord(row.student) })),
      female: (Array.isArray(summary.athleteLeaders.female)
        ? summary.athleteLeaders.female
        : summary.athleteLeaders.female ? [summary.athleteLeaders.female] : [])
        .map((row) => ({ ...row, student: normalizeStudentRecord(row.student) })),
    } : summary.athleteLeaders,
  };
};
const CLASS_SECTION_ORDER = ['M', 'J', 'K', 'H', 'B', 'U', 'E', 'P'];
const compareClassNames = (first, second) => {
  const parse = (value) => {
    const label = String(value || '').trim();
    const compactLabel = label.toLocaleUpperCase('ms-MY').replace(/\s+/g, '');
    const year = Number(compactLabel.match(/(?:TAHUN)?([1-6])/)?.[1] || 0);
    const section = year ? (compactLabel.match(/([A-Z])$/)?.[1] || '') : '';
    const sectionIndex = CLASS_SECTION_ORDER.indexOf(section);
    return { label, year, sectionIndex: sectionIndex === -1 ? CLASS_SECTION_ORDER.length : sectionIndex };
  };
  const left = parse(first);
  const right = parse(second);
  if (left.year !== right.year) return left.year - right.year;
  if (left.sectionIndex !== right.sectionIndex) return left.sectionIndex - right.sectionIndex;
  return left.label.localeCompare(right.label, undefined, { numeric: true });
};
const sortByName = (a, b) => (
  compareClassNames(a.className, b.className) ||
  String(a.name || '').localeCompare(String(b.name || ''))
);
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
const normalizeStudentProfileValue = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('ms-MY');
const studentChineseNameKey = (student) => normalizeStudentProfileValue(student?.chineseName || student?.name);
const studentProfileKey = (student) => {
  const chineseName = studentChineseNameKey(student);
  const className = normalizeStudentProfileValue(student?.className);
  return chineseName && className ? `${chineseName}|${className}` : '';
};
const studentClassHouseKey = (student) => {
  const className = normalizeStudentProfileValue(student?.className);
  const house = houseMatchKey(student?.house);
  return className && house ? `${className}|${house}` : '';
};
const studentNameEditDistance = (first, second) => {
  const source = Array.from(String(first || ''));
  const target = Array.from(String(second || ''));
  if (Math.abs(source.length - target.length) > 1) return 2;
  const previous = Array.from({ length: target.length + 1 }, (_, index) => index);
  for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex += 1) {
    let diagonal = previous[0];
    previous[0] = sourceIndex;
    for (let targetIndex = 1; targetIndex <= target.length; targetIndex += 1) {
      const temporary = previous[targetIndex];
      previous[targetIndex] = Math.min(
        previous[targetIndex] + 1,
        previous[targetIndex - 1] + 1,
        diagonal + (source[sourceIndex - 1] === target[targetIndex - 1] ? 0 : 1),
      );
      diagonal = temporary;
    }
  }
  return previous[target.length];
};
const hasDuplicateStudentNames = (student) => {
  const name = normalizeStudentProfileValue(student?.name);
  const chineseName = normalizeStudentProfileValue(student?.chineseName);
  return Boolean(name && chineseName && name === chineseName);
};
const buildCanonicalStudentMap = (students) => {
  const canonicalStudents = new Map();
  const uniqueChineseNames = new Map();
  const classHouseCandidates = new Map();
  students.forEach((student) => {
    const key = studentProfileKey(student);
    if (!key || hasDuplicateStudentNames(student) || !String(student?.name || '').trim()) return;
    if (!canonicalStudents.has(key)) canonicalStudents.set(key, student);
    const chineseName = studentChineseNameKey(student);
    if (!chineseName) return;
    if (!uniqueChineseNames.has(chineseName)) {
      uniqueChineseNames.set(chineseName, student);
    } else if (getStudentKey(uniqueChineseNames.get(chineseName)) !== getStudentKey(student)) {
      uniqueChineseNames.set(chineseName, null);
    }
    const classHouseKey = studentClassHouseKey(student);
    if (classHouseKey) {
      const candidates = classHouseCandidates.get(classHouseKey) || [];
      candidates.push(student);
      classHouseCandidates.set(classHouseKey, candidates);
    }
  });
  uniqueChineseNames.forEach((student, chineseName) => {
    if (student) canonicalStudents.set(`name:${chineseName}`, student);
  });
  classHouseCandidates.forEach((candidates, classHouseKey) => {
    canonicalStudents.set(`fuzzy:${classHouseKey}`, candidates);
  });
  return canonicalStudents;
};
const resolveCanonicalStudent = (student, canonicalStudents) => {
  if (!student || !hasDuplicateStudentNames(student)) return student || {};
  const exact = canonicalStudents.get(studentProfileKey(student)) || canonicalStudents.get(`name:${studentChineseNameKey(student)}`);
  if (exact) return exact;
  const candidates = canonicalStudents.get(`fuzzy:${studentClassHouseKey(student)}`) || [];
  const fuzzyMatches = candidates.filter((candidate) => (
    studentNameEditDistance(studentChineseNameKey(student), studentChineseNameKey(candidate)) === 1
  ));
  return fuzzyMatches.length === 1 ? fuzzyMatches[0] : student;
};
const displayStudentName = (student, fallback = '') => {
  const names = [];
  [student?.name, student?.chineseName].map((value) => String(value || '').trim()).filter(Boolean).forEach((name) => {
    if (!names.some((item) => normalizeStudentProfileValue(item) === normalizeStudentProfileValue(name))) names.push(name);
  });
  return names.length ? names.join(' / ') : fallback;
};
const isHouseEntry = (registration) => registration?.entryType === 'house';
const isRelayEntry = (registration) => registration?.entryType === 'relay';
const isRelayEvent = (event) => {
  const name = `${event?.name || ''} ${event?.baseName || ''}`;
  return /4\s*(?:x|×)/i.test(name) || (String(event?.type || '').toLocaleUpperCase('ms-MY').includes('KUMPULAN') && /(RELAY|接力)/i.test(name));
};
const getTeamCountPerHouse = (event) => Math.max(1, Math.min(8, Number(event?.teamCountPerHouse || 1) || 1));
const clampTeamCountPerHouse = (value) => Math.max(1, Math.min(8, Number(value || 1) || 1));
const getHouseEntryTeamNumber = (registration) => Math.max(1, Number(registration?.teamNumber || 1) || 1);
const getHouseEntryTeamSuffix = (registration) => String.fromCharCode(64 + getHouseEntryTeamNumber(registration));
const displayEntryName = (registration, student = {}, event = null, teamLabel = 'Team', resolveTeamMember = (member) => member) => {
  if (isRelayEntry(registration)) {
    const members = Array.isArray(registration.teamMembers) ? registration.teamMembers : [];
    const names = members.map((member) => displayStudentName(resolveTeamMember({
      ...member,
      chineseName: member.chineseName || member.name,
    }), member.name)).filter(Boolean);
    return names.length ? names.join(' / ') : normalizeHouse(registration.house || student.house || registration.studentIc);
  }
  if (!isHouseEntry(registration)) return displayStudentName(student, registration.studentIc);
  const house = normalizeHouse(registration.house || student.house || registration.studentIc);
  return getTeamCountPerHouse(event) > 1 ? `${house} ${getHouseEntryTeamSuffix(registration)}` : house;
};
const displaySlipEntryName = (registration, student = {}, event = null, resolveTeamMember = (member) => member) => {
  if (!isHouseEntry(registration) || getTeamCountPerHouse(event) <= 1) {
    return displayEntryName(registration, student, event, '', resolveTeamMember);
  }
  const house = normalizeHouse(registration.house || student.house || registration.studentIc);
  return `${house} Group ${getHouseEntryTeamSuffix(registration)}`;
};
const displayEntryClass = (registration, student = {}) => {
  if (isRelayEntry(registration)) {
    const classes = (Array.isArray(registration.teamMembers) ? registration.teamMembers : [])
      .map((member) => String(member.className || '').trim())
      .filter(Boolean);
    return Array.from(new Set(classes)).join(' / ') || registration.className || '-';
  }
  return student.className || registration.className || '-';
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
const compactEventForSummary = (event = {}) => ({
  id: event.id || '',
  no: Number(event.no || 0),
  name: event.name || '',
  baseName: event.baseName || '',
  category: event.category || '',
  type: event.type || '',
  withoutStudent: Boolean(event.withoutStudent),
  teamCountPerHouse: getTeamCountPerHouse(event),
});
const compactStudentForSummary = (student = {}) => ({
  id: getStudentKey(student),
  ic: getStudentKey(student),
  studentKey: getStudentKey(student),
  name: student.name || '',
  chineseName: student.chineseName || '',
  className: student.className || '',
  gender: student.gender || '',
  house: normalizeHouse(student.house),
});
const compactRegistrationForSummary = (registration = {}, student = {}, canonicalStudents = new Map()) => ({
  id: registration.id || '',
  eventId: registration.eventId || '',
  entryType: registration.entryType || '',
  studentIc: registration.studentIc || '',
  house: normalizeHouse(registration.house || student.house),
  className: registration.className || student.className || '',
  position: registration.position || '',
  points: Number(registration.points || 0),
  teamNumber: registration.teamNumber || 1,
  teamMembers: Array.isArray(registration.teamMembers)
    ? registration.teamMembers.map((member) => {
      const canonicalMember = resolveCanonicalStudent({
        ...member,
        chineseName: member.chineseName || member.name,
      }, canonicalStudents);
      return {
        ...member,
        name: canonicalMember.name || member.name || '',
        chineseName: canonicalMember.chineseName || member.chineseName || member.name || '',
        studentIc: getStudentKey(canonicalMember) || member.studentIc || '',
      };
    })
    : [],
  updatedMs: Number(registration.updatedMs || 0),
  student: compactStudentForSummary(student),
});
const buildScoreDataFromResultRows = (houses, rows) => {
  const houseTotals = houses.map((house) => ({ name: house, total: 0 }));
  const classTotals = new Map();
  rows.forEach((result) => {
    if (!isResultPlace(result.position)) return;
    const house = normalizeHouse(result.house || result.student?.house);
    const points = Number(result.points || 0);
    const houseRow = houseTotals.find((item) => houseMatchKey(item.name) === houseMatchKey(house));
    if (houseRow) houseRow.total += points;
    const className = String(result.student?.className || result.className || '').trim();
    if (className) classTotals.set(className, (classTotals.get(className) || 0) + points);
  });
  return {
    houses: houseTotals.sort((a, b) => b.total - a.total || compareHouses(a.name, b.name)),
    classes: Array.from(classTotals.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total || compareClassNames(a.name, b.name)),
  };
};
const buildLiveSummary = ({ houses, events, registrations, students }) => {
  const canonicalStudents = buildCanonicalStudentMap(students);
  const studentMap = new Map(students.map((student) => [
    getStudentKey(student),
    resolveCanonicalStudent(student, canonicalStudents),
  ]));
  const eventMap = new Map(events.map((event) => [event.id, event]));
  const houseTotals = houses.map((house) => ({ name: house, total: 0 }));
  const classTotals = new Map();

  registrations.forEach((registration) => {
    if (!isResultPlace(registration.position)) return;
    const student = studentMap.get(registration.studentIc) || {};
    const house = normalizeHouse(registration.house || student.house);
    const points = Number(registration.points || 0);
    const row = houseTotals.find((item) => houseMatchKey(item.name) === houseMatchKey(house));
    if (row) row.total += points;
    if (student.className) classTotals.set(student.className, (classTotals.get(student.className) || 0) + points);
  });

  const viewResults = registrations
    .filter((registration) => isResultPlace(registration.position))
    .map((registration) => {
      const student = studentMap.get(registration.studentIc) || {};
      return {
        ...compactRegistrationForSummary(registration, student, canonicalStudents),
        event: compactEventForSummary(eventMap.get(registration.eventId)),
      };
    })
    .filter((result) => result.event?.id);

  const grouped = new Map();
  viewResults.forEach((result) => {
    const id = result.eventId || 'unknown';
    if (!grouped.has(id)) grouped.set(id, { id, event: result.event, results: [], latestMs: 0 });
    const group = grouped.get(id);
    group.results.push(result);
    group.latestMs = Math.max(group.latestMs, Number(result.updatedMs || 0));
  });
  const resultGroups = Array.from(grouped.values())
    .map((group) => ({
      ...group,
      results: group.results.sort((a, b) => Number(a.position || 99) - Number(b.position || 99)),
    }))
    .sort((a, b) => Number(a.event?.no || 0) - Number(b.event?.no || 0));
  const latestResultGroups = [...resultGroups]
    .sort((a, b) => b.latestMs - a.latestMs)
    .slice(0, 12);

  const registrationsByEvent = new Map();
  registrations.forEach((registration) => {
    if (!registrationsByEvent.has(registration.eventId)) registrationsByEvent.set(registration.eventId, []);
    registrationsByEvent.get(registration.eventId).push(registration);
  });
  const laneGroups = events.map((event) => {
    const eventRegistrations = registrationsByEvent.get(event.id) || [];
    const { lanes, registrationsByLane } = resolveLaneAssignments(event, eventRegistrations);
    const rows = lanes
      .map((lane) => {
        const laneNumber = Number(lane.laneNumber || 0);
        const registration = registrationsByLane.get(laneNumber);
        const student = registration ? (studentMap.get(registration.studentIc) || {}) : {};
        return {
          id: registration?.id || `${event.id}-lane-${laneNumber}`,
          laneNumber,
          house: normalizeHouse(registration?.house || lane.house),
          registration: registration ? compactRegistrationForSummary(registration, student, canonicalStudents) : null,
        };
      })
      .filter((row) => row.laneNumber)
      .sort((a, b) => a.laneNumber - b.laneNumber || compareHouses(a.house, b.house));
    return rows.length ? { id: event.id, event: compactEventForSummary(event), rows } : null;
  }).filter(Boolean);

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
        student: compactStudentForSummary(student),
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
  const athleteRows = Array.from(athletes.values()).sort((a, b) =>
    b.gold - a.gold ||
    b.silver - a.silver ||
    b.bronze - a.bronze ||
    displayStudentName(a.student).localeCompare(displayStudentName(b.student)));

  return {
    version: LIVE_SUMMARY_VERSION,
    scoreData: {
      houses: houseTotals.sort((a, b) => b.total - a.total || compareHouses(a.name, b.name)),
      classes: Array.from(classTotals.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total || compareClassNames(a.name, b.name)),
    },
    eventOptions: events
      .map(compactEventForSummary)
      .sort((a, b) => Number(a.no || 0) - Number(b.no || 0)),
    resultGroups,
    latestResultGroups,
    laneGroups,
    athleteLeaders: {
      male: athleteRows.filter((row) => row.gender === 'Lelaki').slice(0, 3),
      female: athleteRows.filter((row) => row.gender === 'Perempuan').slice(0, 3),
    },
    updatedMs: Date.now(),
  };
};

function App() {
  const fileInputRef = useRef(null);
  const liveBoardRef = useRef(null);
  const savedSettingsRef = useRef('');
  const liveSummaryRefreshKeyRef = useRef('');
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
  const [liveBoardView, setLiveBoardView] = useState('pinned');
  const [loadedSections, setLoadedSections] = useState({ settings: false, liveSummary: false, students: false, events: false, registrations: false });
  const [uploadingStudents, setUploadingStudents] = useState(false);
  const [notice, setNotice] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [liveSummary, setLiveSummary] = useState(null);
  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [eventForm, setEventForm] = useState(DEFAULT_EVENT_FORM);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentYearFilter, setStudentYearFilter] = useState('');
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
  const [relayTeamDrafts, setRelayTeamDrafts] = useState({});
  const [resultEventId, setResultEventId] = useState('');
  const [slipEventId, setSlipEventId] = useState('');
  const [selectedSlipEventIds, setSelectedSlipEventIds] = useState([]);
  const [viewResultEventFilter, setViewResultEventFilter] = useState('');
  const [laneEventFilter, setLaneEventFilter] = useState('');
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
      liveSummary: doc(db, 'esukanSites', siteId, 'summaries', 'liveBoard'),
    };
  }, [siteId]);

  const houses = useMemo(() => {
    const source = Array.isArray(settings.houses) ? settings.houses : DEFAULT_HOUSES;
    return sortHouseList(source);
  }, [settings.houses]);
  const liveBoardHeaderSchool = String(settings.liveBoardHeaderSchool || settings.schoolName || DEFAULT_SETTINGS.schoolName).trim();
  const liveBoardHeaderTitle = String(settings.liveBoardHeaderTitle || DEFAULT_SETTINGS.liveBoardHeaderTitle).trim();
  const liveEventOptions = Array.isArray(liveSummary?.eventOptions) ? liveSummary.eventOptions : events;
  const liveEventIdSet = new Set(liveEventOptions.map((event) => event.id));
  const livePinnedEventIds = Array.from(new Set(
    (Array.isArray(settings.liveBoardPinnedEventIds) ? settings.liveBoardPinnedEventIds : [])
      .filter((eventId) => liveEventIdSet.has(eventId)),
  )).slice(0, 3);
  const showPinnedLiveBoard = livePinnedEventIds.length > 0 && (accessRole !== 'admin' || liveBoardView === 'pinned');
  const visibleTabs = ACCESS_LEVELS[accessRole]?.tabs || ACCESS_LEVELS.user.tabs;
  const summarySupportsOnDemandViews = liveSummary?.version === LIVE_SUMMARY_VERSION &&
    Array.isArray(liveSummary?.eventOptions) &&
    Array.isArray(liveSummary?.resultGroups) &&
    Array.isArray(liveSummary?.laneGroups);
  const needsSummaryBootstrap = activeTab !== 'live' && !summarySupportsOnDemandViews;
  const needsFullData = needsSummaryBootstrap || ['events', 'register', 'results', 'slips'].includes(activeTab);
  const shouldLoadStudentYear = activeTab === 'students' && Boolean(studentYearFilter) && !needsFullData;
  const hasFullDataSnapshot = needsFullData &&
    loadedSections.students &&
    loadedSections.events &&
    loadedSections.registrations;
  const loading = !loadedSections.settings ||
    (activeTab === 'live' && !loadedSections.liveSummary) ||
    (needsFullData && (!loadedSections.students || !loadedSections.events || !loadedSections.registrations));
  const nextEventNo = useMemo(() => Math.max(0, ...events.map((event) => Number(event.no || 0))) + 1, [events]);
  const currentLanguage = LANGUAGE_OPTIONS.find((item) => item.id === language) || LANGUAGE_OPTIONS[0];
  const t = (key) => TEXT[language]?.[key] || TEXT.ms[key] || key;
  const showNotice = (message, tone = 'info') => {
    setNotice({ id: Date.now(), message, tone });
  };
  const showSuccess = (message) => showNotice(message, 'success');
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

  const markLoaded = (key) => setLoadedSections((current) => ({ ...current, [key]: true }));
  const markLoading = (keys) => setLoadedSections((current) => (
    keys.reduce((next, key) => ({ ...next, [key]: false }), current)
  ));
  const handleSnapshotError = (key, error) => {
    console.error(error);
    markLoaded(key);
    showNotice(`Could not load ${key}: ${error.message || 'Firebase error'}`, 'error');
  };

  useEffect(() => {
    if (!refs) return undefined;
    markLoading(['settings']);
    return onSnapshot(refs.settings, (snapshot) => {
      const nextSettings = { ...DEFAULT_SETTINGS, ...(snapshot.exists() ? snapshot.data() : {}) };
      setSettings(nextSettings);
      savedSettingsRef.current = JSON.stringify({ ...nextSettings, updatedAt: undefined });
      markLoaded('settings');
    }, (error) => handleSnapshotError('settings', error));
  }, [refs]);

  useEffect(() => {
    if (!refs) return undefined;
    markLoading(['liveSummary']);
    return onSnapshot(refs.liveSummary, (snapshot) => {
      setLiveSummary(snapshot.exists() ? normalizeLiveSummary(snapshot.data()) : null);
      markLoaded('liveSummary');
    }, (error) => handleSnapshotError('liveSummary', error));
  }, [refs]);

  useEffect(() => {
    if (!refs || !needsFullData) return undefined;
    markLoading(['students', 'events', 'registrations']);
    const unsubscribers = [
      onSnapshot(refs.students, (snapshot) => {
        setStudents(snapshot.docs.map((item) => normalizeStudentRecord({ id: item.id, ...item.data() })).sort(sortByName));
        markLoaded('students');
      }, (error) => handleSnapshotError('students', error)),
      onSnapshot(refs.events, (snapshot) => {
        const nextEvents = snapshot.docs
          .map((item) => normalizeEventRecord({ id: item.id, ...item.data() }))
          .sort((a, b) => Number(a.no || 0) - Number(b.no || 0));
        setEvents(nextEvents);
        setRegisterEventId((current) => current || (nextEvents[0] ? nextEvents[0].id : ''));
        setResultEventId((current) => current || (nextEvents[0] ? nextEvents[0].id : ''));
        setSlipEventId((current) => current || (nextEvents[0] ? nextEvents[0].id : ''));
        markLoaded('events');
      }, (error) => handleSnapshotError('events', error)),
      onSnapshot(refs.registrations, (snapshot) => {
        const nextRegistrations = snapshot.docs.map((item) => normalizeRegistrationRecord({ id: item.id, ...item.data() }));
        runScoreTransition(() => setRegistrations(nextRegistrations));
        markLoaded('registrations');
      }, (error) => handleSnapshotError('registrations', error)),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [refs, needsFullData]);

  useEffect(() => {
    if (!refs || activeTab !== 'students' || needsFullData || !studentYearFilter) {
      if (activeTab === 'students' && !needsFullData) {
        setStudents([]);
        markLoaded('students');
      }
      return undefined;
    }
    markLoading(['students']);
    const yearStart = String(studentYearFilter);
    const yearEnd = String(Number(studentYearFilter) + 1);
    let cancelled = false;
    getDocs(query(refs.students,
      where('className', '>=', yearStart),
      where('className', '<', yearEnd),
    )).then((snapshot) => {
      if (cancelled) return;
      setStudents(snapshot.docs.map((item) => normalizeStudentRecord({ id: item.id, ...item.data() })).sort(sortByName));
      markLoaded('students');
    }).catch((error) => {
      if (!cancelled) handleSnapshotError('students', error);
    });
    return () => {
      cancelled = true;
    };
  }, [activeTab, needsFullData, refs, studentYearFilter]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const canonicalStudents = useMemo(() => buildCanonicalStudentMap(students), [students]);
  const resolveStudent = (student) => resolveCanonicalStudent(student, canonicalStudents);
  const visibleStudents = useMemo(() => students.filter((student) => {
    const canonicalStudent = resolveCanonicalStudent(student, canonicalStudents);
    return getStudentKey(canonicalStudent) === getStudentKey(student);
  }), [canonicalStudents, students]);
  const studentMap = useMemo(() => new Map(students.map((student) => [
    getStudentKey(student),
    resolveCanonicalStudent(student, canonicalStudents),
  ])), [canonicalStudents, students]);
  const onDemandEvents = useMemo(() => (
    ['viewResults', 'lanes'].includes(activeTab) && summarySupportsOnDemandViews
      ? liveSummary.eventOptions
      : events
  ), [activeTab, events, liveSummary?.eventOptions, summarySupportsOnDemandViews]);
  const eventMap = useMemo(() => new Map(onDemandEvents.map((event) => [event.id, event])), [onDemandEvents]);
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
  const withResolvedLanes = (event, eventRows) => {
    const { registrationsByLane } = resolveLaneAssignments(event, eventRows);
    const assignmentsById = new Map(Array.from(registrationsByLane.values()).map((registration) => [registration.id, registration]));
    return eventRows.map((registration) => assignmentsById.get(registration.id) || registration);
  };
  const sortedSlipRegistrations = [...withResolvedLanes(slipEvent, registrationsForSlipEvent)].sort((a, b) => {
    const positionA = Number(a.position || 99);
    const positionB = Number(b.position || 99);
    if (positionA !== positionB) return positionA - positionB;
    const studentA = studentMap.get(a.studentIc) || {};
    const studentB = studentMap.get(b.studentIc) || {};
    const houseCompare = compareHouses(a.house || studentA.house, b.house || studentB.house);
    if (houseCompare) return houseCompare;
    const classCompare = compareClassNames(studentA.className || a.className, studentB.className || b.className);
    if (classCompare) return classCompare;
    return displaySlipEntryName(a, studentA, slipEvent, resolveStudent).localeCompare(displaySlipEntryName(b, studentB, slipEvent, resolveStudent));
  });
  const registeredStudentSet = new Set(registrationsForRegisterEvent.map((item) => item.studentIc));
  const studentClassOptions = useMemo(() => (
    Array.from(new Set(visibleStudents.map((student) => String(student.className || '').trim()).filter(Boolean)))
      .sort(compareClassNames)
  ), [visibleStudents]);
  const studentGenderOptions = useMemo(() => (
    Array.from(new Set(visibleStudents.map((student) => String(student.gender || '').trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b))
  ), [visibleStudents]);
  const studentHouseOptions = useMemo(() => (
    Array.from(new Set(visibleStudents.map((student) => normalizeHouse(student.house)).filter(Boolean)))
      .sort(compareHouses)
  ), [visibleStudents]);

  const filteredStudents = (studentYearFilter ? visibleStudents : []).filter((student) => {
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
  const registerCandidates = registerEvent?.withoutStudent ? [] : visibleStudents
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
      const classCompare = compareClassNames(a.className, b.className);
      if (classCompare) return classCompare;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  const relayTeamsForRegisterEvent = useMemo(() => {
    if (!isRelayEvent(registerEvent)) return [];
    const lanePlan = Array.isArray(registerEvent.lanePlan) && registerEvent.lanePlan.length
      ? registerEvent.lanePlan
      : houses.map((house, index) => ({ laneNumber: index + 1, house }));
    return lanePlan
      .map((lane) => ({
        laneNumber: Number(lane.laneNumber || lane.lane || 0),
        house: normalizeHouse(lane.house),
      }))
      .filter((lane) => lane.laneNumber && lane.house)
      .sort((a, b) => a.laneNumber - b.laneNumber)
      .map((lane) => {
        const studentIc = `relay-${registerEvent.id}-lane-${lane.laneNumber}`;
        const registration = registrationsForRegisterEvent.find((item) => (
          isRelayEntry(item) && (Number(item.laneNumber || 0) === lane.laneNumber || item.studentIc === studentIc)
        ));
        return {
          ...lane,
          studentIc,
          registration,
          key: registration?.id || `${registerEvent.id}_${studentIc}`,
        };
      });
  }, [houses, registerEvent, registrationsForRegisterEvent]);
  const getRelayTeamDraft = (team) => relayTeamDrafts[team.key] || Array.from(
    { length: 4 },
    (_, index) => {
      const member = team.registration?.teamMembers?.[index];
      return member ? getStudentKey(studentMap.get(member.studentIc) || member) : '';
    },
  );
  const relayCandidatesForTeam = (team) => visibleStudents
    .filter((student) => {
      const matchesHouse = isSameHouse(student.house, team.house);
      const matchesYear = !registerEligibility.year || getYear(student.className) === registerEligibility.year;
      const matchesGender = !registerEligibility.gender || String(student.gender || '') === registerEligibility.gender;
      return matchesHouse && matchesYear && matchesGender;
    })
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

  const fullScoreData = useMemo(() => {
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
      houses: houseTotals.sort((a, b) => b.total - a.total || compareHouses(a.name, b.name)),
      classes: Array.from(classTotals.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total || compareClassNames(a.name, b.name)),
    };
  }, [houses, registrations, studentMap]);
  const pinnedLiveScoreData = useMemo(() => {
    if (!livePinnedEventIds.length) return null;
    const hasLiveSummaryResultGroups = Array.isArray(liveSummary?.resultGroups);
    const summaryRows = hasLiveSummaryResultGroups
      ? liveSummary.resultGroups
        .filter((group) => livePinnedEventIds.includes(group.id))
        .flatMap((group) => group.results)
      : [];
    const fullRows = registrations
      .filter((registration) => livePinnedEventIds.includes(registration.eventId))
      .map((registration) => ({ ...registration, student: studentMap.get(registration.studentIc) || {} }));
    return buildScoreDataFromResultRows(houses, hasLiveSummaryResultGroups ? summaryRows : fullRows);
  }, [houses, livePinnedEventIds, liveSummary?.resultGroups, registrations, studentMap]);
  const scoreData = activeTab === 'live' && showPinnedLiveBoard
    ? pinnedLiveScoreData
    : activeTab === 'live' && liveSummary?.scoreData ? liveSummary.scoreData : fullScoreData;

  const viewResults = useMemo(() => {
    if (activeTab === 'viewResults' && summarySupportsOnDemandViews) {
      return liveSummary.resultGroups.flatMap((group) => group.results.map((result) => ({
        ...result,
        student: result.student || {},
        event: group.event,
      })));
    }
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
  }, [activeTab, eventMap, liveSummary?.resultGroups, registrations, studentMap, summarySupportsOnDemandViews]);
  const resultEventOptions = useMemo(() => (
    onDemandEvents
      .map((event) => ({ id: event.id, event }))
      .sort((a, b) => {
        const noCompare = Number(a.event.no || 0) - Number(b.event.no || 0);
        if (noCompare) return noCompare;
        return tEventDisplayName(a.event).localeCompare(tEventDisplayName(b.event), undefined, { numeric: true });
      })
  ), [language, onDemandEvents]);
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
  const fullLatestResultGroups = useMemo(() => {
    return buildResultGroups(viewResults, 'latest').slice(0, 12);
  }, [language, viewResults]);
  const latestResultGroups = activeTab === 'live' && Array.isArray(liveSummary?.latestResultGroups)
    ? liveSummary.latestResultGroups
    : fullLatestResultGroups;
  const liveResultGroups = useMemo(() => {
    if (!showPinnedLiveBoard) return latestResultGroups;
    const groupedResults = new Map((Array.isArray(liveSummary?.resultGroups) ? liveSummary.resultGroups : latestResultGroups)
      .map((group) => [group.id, group]));
    const eventById = new Map(liveEventOptions.map((event) => [event.id, event]));
    return livePinnedEventIds.map((id) => (
      groupedResults.get(id) || { id, event: eventById.get(id), results: [], latestMs: 0 }
    )).filter((group) => group.event);
  }, [latestResultGroups, liveEventOptions, livePinnedEventIds, liveSummary?.resultGroups, showPinnedLiveBoard]);
  const latestLiveResult = [...liveResultGroups].sort((a, b) => Number(b.latestMs || 0) - Number(a.latestMs || 0))[0];
  const latestLiveResultId = latestLiveResult?.id || '';
  const latestLiveResultStamp = latestLiveResult?.latestMs || 0;
  const latestWinnerRows = liveResultGroups.slice(0, 3).map((group) => ({
    id: group.id,
    event: group.event,
    winners: RESULT_PLACES.map((position) => {
      const result = group.results.find((item) => Number(item.position || 0) === position);
      if (!result) return null;
      const house = normalizeHouse(result.house || result.student?.house || '');
      return {
        house,
        label: displayEntryName(result, result.student, group.event, t('team'), resolveStudent),
      };
    }),
  }));
  const filteredViewResults = useMemo(() => (
    viewResultEventFilter ? viewResults.filter((result) => result.eventId === viewResultEventFilter) : []
  ), [viewResultEventFilter, viewResults]);
  const viewResultGroups = useMemo(() => buildResultGroups(filteredViewResults), [filteredViewResults, language]);
  const laneEventOptions = useMemo(() => {
    if (activeTab === 'lanes' && summarySupportsOnDemandViews) {
      return liveSummary.laneGroups
        .map((group) => group.event)
        .sort((a, b) => Number(a.no || 0) - Number(b.no || 0) || tEventDisplayName(a).localeCompare(tEventDisplayName(b), undefined, { numeric: true }));
    }
    return events
      .filter((event) => (Array.isArray(event.lanePlan) && event.lanePlan.length) || (eventRegistrations.get(event.id) || []).some((registration) => Number(registration.laneNumber || 0) > 0))
      .sort((a, b) => Number(a.no || 0) - Number(b.no || 0) || tEventDisplayName(a).localeCompare(tEventDisplayName(b), undefined, { numeric: true }));
  }, [activeTab, eventRegistrations, events, language, liveSummary?.laneGroups, summarySupportsOnDemandViews]);
  const laneGroups = useMemo(() => (
    activeTab === 'lanes' && summarySupportsOnDemandViews
      ? (laneEventFilter ? liveSummary.laneGroups.filter((group) => group.id === laneEventFilter) : [])
      : laneEventOptions
      .filter((event) => !laneEventFilter || event.id === laneEventFilter)
      .map((event) => {
        const { lanes, registrationsByLane } = resolveLaneAssignments(event, eventRegistrations.get(event.id) || []);
        return {
          id: event.id,
          event,
          rows: lanes
            .map((lane) => {
              const laneNumber = Number(lane.laneNumber || 0);
              const registration = registrationsByLane.get(laneNumber);
              return {
                id: registration?.id || `${event.id}-lane-${laneNumber}`,
                laneNumber,
                house: registration?.house || lane.house || '',
                registration,
              };
            })
            .filter((row) => row.laneNumber)
            .sort((a, b) => a.laneNumber - b.laneNumber || compareHouses(a.house, b.house)),
        };
      })
      .filter((group) => group.rows.length)
  ), [activeTab, eventRegistrations, laneEventFilter, laneEventOptions, liveSummary?.laneGroups, summarySupportsOnDemandViews]);
  const fullAthleteLeaders = useMemo(() => {
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
      male: rows.filter((row) => row.gender === 'Lelaki').slice(0, 3),
      female: rows.filter((row) => row.gender === 'Perempuan').slice(0, 3),
    };
  }, [registrations, studentMap]);
  const athleteLeaders = activeTab === 'live' && liveSummary?.athleteLeaders
    ? liveSummary.athleteLeaders
    : fullAthleteLeaders;
  const jurySheetRows = sortedSlipRegistrations
    .map((registration) => ({
      registration,
      student: studentMap.get(registration.studentIc) || {},
    }))
    .sort((a, b) => {
      const houseCompare = compareHouses(a.registration.house || a.student.house, b.registration.house || b.student.house);
      if (houseCompare) return houseCompare;
      const classCompare = compareClassNames(a.student.className || a.registration.className, b.student.className || b.registration.className);
      if (classCompare) return classCompare;
      return displaySlipEntryName(a.registration, a.student, slipEvent, resolveStudent).localeCompare(displaySlipEntryName(b.registration, b.student, slipEvent, resolveStudent));
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

  const refreshLiveSummary = async (overrides = {}) => {
    if (!refs) return;
    const nextSettings = overrides.settings || settings;
    const nextHouses = sortHouseList(overrides.houses || nextSettings.houses || houses);
    const summary = buildLiveSummary({
      houses: nextHouses,
      events: overrides.events || events,
      registrations: overrides.registrations || registrations,
      students: overrides.students || students,
    });
    try {
      await setDoc(refs.liveSummary, { ...summary, updatedAt: serverTimestamp() }, { merge: true });
    } catch (error) {
      console.error(error);
      showNotice(`Saved, but live board summary did not refresh: ${error.message || 'Firebase error'}`, 'error');
    }
  };

  useEffect(() => {
    if (!needsFullData || !loadedSections.students || !loadedSections.events || !loadedSections.registrations) return;
    const latestRegistrationMs = Math.max(0, ...registrations.map((registration) => Number(registration.updatedMs || 0)));
    const summaryUpdatedMs = Number(liveSummary?.updatedMs || 0);
    if (liveSummary?.version === LIVE_SUMMARY_VERSION && liveSummary?.scoreData && summaryUpdatedMs >= latestRegistrationMs) return;
    const refreshKey = `${students.length}:${events.length}:${registrations.length}:${latestRegistrationMs}:${summaryUpdatedMs}:${liveSummary?.version || 0}`;
    if (liveSummaryRefreshKeyRef.current === refreshKey) return;
    liveSummaryRefreshKeyRef.current = refreshKey;
    refreshLiveSummary();
  }, [
    needsFullData,
    loadedSections.students,
    loadedSections.events,
    loadedSections.registrations,
    students,
    events,
    registrations,
    liveSummary?.updatedMs,
    liveSummary?.version,
  ]);

  const saveSettings = async () => {
    if (accessRole === 'user') {
      showNotice('Staff access required.', 'error');
      return;
    }
    const payload = { ...settings, houses };
    const { updatedAt, ...settingsForSignature } = payload;
    const settingsSignature = JSON.stringify(settingsForSignature);
    if (settingsSignature === savedSettingsRef.current) {
      showNotice('Settings unchanged.');
      return;
    }
    await setDoc(refs.settings, { ...payload, updatedAt: serverTimestamp() }, { merge: true });
    if (hasFullDataSnapshot) await refreshLiveSummary({ settings: payload, houses: payload.houses });
    savedSettingsRef.current = settingsSignature;
    showSuccess(t('settingsSaved'));
  };

  const updatePinnedLiveEvent = (slot, eventId) => {
    setSettings((current) => {
      const validEventIds = new Set(liveEventOptions.map((event) => event.id));
      const currentPins = Array.from(new Set(
        (Array.isArray(current.liveBoardPinnedEventIds) ? current.liveBoardPinnedEventIds : [])
          .filter((id) => validEventIds.has(id)),
      )).slice(0, 3);
      const nextPins = [...currentPins];

      if (eventId && validEventIds.has(eventId)) {
        nextPins[slot] = eventId;
      } else if (!eventId && slot < nextPins.length) {
        nextPins.splice(slot, 1);
      }

      return {
        ...current,
        liveBoardPinnedEventIds: Array.from(new Set(nextPins.filter((id) => validEventIds.has(id)))).slice(0, 3),
      };
    });
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
      showNotice('Staff access required.', 'error');
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
    const createdEvents = [];
    const createdRegistrations = [];
    sortedCategories.forEach((category, index) => {
      const eventName = buildEventName(baseName, category);
      const id = `${timestamp}-${index}-${slugify(eventName)}`;
      const newEvent = {
        id,
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
      };
      createdEvents.push(newEvent);
      batch.set(doc(refs.events, id), newEvent);
      if (withoutStudent) {
        houses.forEach((house) => {
          Array.from({ length: teamCountPerHouse }, (_, teamIndex) => teamIndex + 1).forEach((teamNumber) => {
            const entryKey = getHouseEntryKey(house, teamNumber);
            const newRegistration = {
              id: `${id}_${entryKey}`,
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
            };
            createdRegistrations.push(newRegistration);
            batch.set(doc(refs.registrations, newRegistration.id), newRegistration, { merge: true });
          });
        });
      }
    });

    await batch.commit();
    await refreshLiveSummary({
      events: [...events, ...createdEvents].sort((a, b) => Number(a.no || 0) - Number(b.no || 0)),
      registrations: [...registrations, ...createdRegistrations],
    });
    setRegisterEventId(`${timestamp}-0-${slugify(buildEventName(baseName, sortedCategories[0]))}`);
    setResultEventId(`${timestamp}-0-${slugify(buildEventName(baseName, sortedCategories[0]))}`);
    setSlipEventId(`${timestamp}-0-${slugify(buildEventName(baseName, sortedCategories[0]))}`);
    setEventForm((current) => ({ ...DEFAULT_EVENT_FORM, startNo: Number(current.startNo || 1) + sortedCategories.length }));
    showSuccess(`${sortedCategories.length} ${t(withoutStudent ? 'houseEventsCreated' : 'eventsCreated')}`);
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
    showSuccess(t('templateDownloaded'));
  };

  const importStudents = async (file) => {
    if (!file) return;
    if (accessRole === 'user') {
      showNotice('Staff access required.', 'error');
      return;
    }

    setUploadingStudents(true);
    showNotice(`Uploading ${file.name}...`);
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
        showNotice('No valid rows. Required columns: Name, Kelas, Rumah Sukan / House, Jantina/Gender.', 'error');
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
        queueWrite((activeBatch) => activeBatch.set(refs.settings, { houses: sortHouseList(importedHouses), updatedAt: serverTimestamp() }, { merge: true }));
      }
      if (writeCount > 0) batches.push(batch);
      await Promise.all(batches.map((queuedBatch) => queuedBatch.commit()));
      const nextStudentMap = new Map(students.map((student) => [getStudentKey(student), student]));
      validStudents.forEach((student) => nextStudentMap.set(student.studentKey, student));
      const nextSettings = importedHouses.length
        ? { ...settings, houses: sortHouseList(importedHouses) }
        : settings;
      if (hasFullDataSnapshot) {
        await refreshLiveSummary({ settings: nextSettings, houses: nextSettings.houses, students: Array.from(nextStudentMap.values()) });
      }
      showSuccess(`${validStudents.length} ${t('studentsImported')}`);
    } catch (error) {
      console.error(error);
      showNotice(`Upload failed: ${error.message || 'Please check the file and Firebase permissions.'}`, 'error');
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
      showNotice('Staff access required.', 'error');
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
      showNotice('Name, class, gender, and house are required.', 'error');
      return;
    }
    const registrationRows = hasFullDataSnapshot
      ? registrations.filter((registration) => registration.studentIc === studentKey)
      : (await getDocs(query(refs.registrations, where('studentIc', '==', studentKey)))).docs
        .map((item) => ({ id: item.id, ...item.data() }));
    const batch = writeBatch(db);
    batch.set(doc(refs.students, studentKey), payload, { merge: true });
    registrationRows.forEach((registration) => {
      batch.set(doc(refs.registrations, registration.id), {
        className: payload.className,
        house: payload.house,
        updatedAt: serverTimestamp(),
        updatedMs: Date.now(),
      }, { merge: true });
    });
    await batch.commit();
    setStudents((current) => current.map((item) => (
      getStudentKey(item) === studentKey ? { ...item, ...payload } : item
    )).sort(sortByName));
    if (hasFullDataSnapshot) {
      await refreshLiveSummary({
        students: students.map((item) => (getStudentKey(item) === studentKey ? { ...item, ...payload } : item)),
        registrations: registrations.map((registration) => (
          registration.studentIc === studentKey
            ? { ...registration, className: payload.className, house: payload.house, updatedMs: Date.now() }
            : registration
        )),
      });
    }
    cancelStudentEdit();
    showSuccess(t('studentUpdated'));
  };

  const deleteStudent = async (student) => {
    if (accessRole === 'user') {
      showNotice('Staff access required.', 'error');
      return;
    }
    const studentKey = getStudentKey(student);
    if (!studentKey) return;
    const confirmed = window.confirm(`Delete ${displayStudentName(student, studentKey)} and all event registrations?`);
    if (!confirmed) return;
    const registrationRows = hasFullDataSnapshot
      ? registrations.filter((registration) => registration.studentIc === studentKey)
      : (await getDocs(query(refs.registrations, where('studentIc', '==', studentKey)))).docs
        .map((item) => ({ id: item.id, ...item.data() }));
    const batch = writeBatch(db);
    registrationRows.forEach((registration) => {
      batch.delete(doc(refs.registrations, registration.id));
    });
    batch.delete(doc(refs.students, studentKey));
    await batch.commit();
    setStudents((current) => current.filter((item) => getStudentKey(item) !== studentKey));
    if (hasFullDataSnapshot) {
      await refreshLiveSummary({
        students: students.filter((item) => getStudentKey(item) !== studentKey),
        registrations: registrations.filter((registration) => registration.studentIc !== studentKey),
      });
    }
    if (editingStudentKey === studentKey) cancelStudentEdit();
    showSuccess(t('studentDeleted'));
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
      showNotice('Staff access required.', 'error');
      return;
    }
    if (!eventEditForm) return;
    const scoring = Object.fromEntries(
      RESULT_PLACES.map((position) => [position, Number(eventEditForm[`points${position}`] || 0)]),
    );
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
        ...scoring,
        5: deleteField(),
      },
      updatedAt: serverTimestamp(),
    };
    if (!payload.name || !payload.category) {
      showNotice('Event name and category are required.', 'error');
      return;
    }
    const batch = writeBatch(db);
    batch.set(doc(refs.events, event.id), payload, { merge: true });
    const eventRegistrationRows = registrations.filter((registration) => registration.eventId === event.id);
    let nextEventRegistrationRows = eventRegistrationRows;
    if (payload.withoutStudent) {
      if (!event.withoutStudent) {
        eventRegistrationRows.forEach((registration) => {
          batch.delete(doc(refs.registrations, registration.id));
        });
        nextEventRegistrationRows = [];
      }
      const expectedHouseEntryKeys = new Set();
      const existingHouseEntries = new Map(eventRegistrationRows.filter(isHouseEntry).map((registration) => [registration.studentIc, registration]));
      houses.forEach((house) => {
        Array.from({ length: payload.teamCountPerHouse }, (_, teamIndex) => teamIndex + 1).forEach((teamNumber) => {
          const entryKey = getHouseEntryKey(house, teamNumber);
          expectedHouseEntryKeys.add(entryKey);
          const existingEntry = existingHouseEntries.get(entryKey);
          const nextRegistration = {
            id: `${event.id}_${entryKey}`,
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
          };
          nextEventRegistrationRows = [
            ...nextEventRegistrationRows.filter((registration) => registration.studentIc !== entryKey),
            nextRegistration,
          ];
          batch.set(doc(refs.registrations, nextRegistration.id), nextRegistration, { merge: true });
        });
      });
      eventRegistrationRows.filter(isHouseEntry).forEach((registration) => {
        if (!expectedHouseEntryKeys.has(registration.studentIc)) {
          batch.delete(doc(refs.registrations, registration.id));
          nextEventRegistrationRows = nextEventRegistrationRows.filter((item) => item.id !== registration.id);
        }
      });
    } else if (event.withoutStudent) {
      eventRegistrationRows.filter(isHouseEntry).forEach((registration) => {
        batch.delete(doc(refs.registrations, registration.id));
      });
      nextEventRegistrationRows = eventRegistrationRows.filter((registration) => !isHouseEntry(registration));
    }
    await batch.commit();
    await refreshLiveSummary({
      events: events.map((item) => (item.id === event.id ? { ...item, ...payload, scoring } : item)),
      registrations: [
        ...registrations.filter((registration) => registration.eventId !== event.id),
        ...nextEventRegistrationRows,
      ],
    });
    cancelEventEdit();
    showSuccess(t('eventUpdated'));
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
      showNotice('Staff access required.', 'error');
      return;
    }
    if (!registerEvent) {
      showNotice('Choose an event first.', 'error');
      return;
    }
    if (registerEvent.withoutStudent) {
      showNotice('This event registers houses automatically.');
      return;
    }

    const studentKey = getStudentKey(student);
    if (!studentKey) {
      showNotice('Student record is missing its generated key.', 'error');
      return;
    }
    const id = `${registerEvent.id}_${studentKey}`;
    if (registeredStudentSet.has(studentKey)) {
      await deleteDoc(doc(refs.registrations, id));
      await refreshLiveSummary({ registrations: registrations.filter((registration) => registration.id !== id) });
      showSuccess(t('studentUnregistered'));
      return;
    }

    const blockReason = getRegistrationBlockReason(registerEvent, registrationsForRegisterEvent, student);
    if (blockReason) {
      showNotice(blockReason, 'error');
      return;
    }

    const lanePlan = Array.isArray(registerEvent.lanePlan) ? registerEvent.lanePlan : [];
    const houseLanes = lanePlan
      .map((lane) => ({ ...lane, laneNumber: Number(lane.laneNumber || lane.lane || 0) }))
      .filter((lane) => lane.laneNumber && isSameHouse(lane.house, student.house))
      .sort((a, b) => a.laneNumber - b.laneNumber);
    const occupiedLanes = new Set(registrationsForRegisterEvent.map((registration) => Number(registration.laneNumber || 0)).filter(Boolean));
    const laneNumber = lanePlan.length
      ? houseLanes.find((lane) => !occupiedLanes.has(lane.laneNumber))?.laneNumber || 0
      : Array.from({ length: DEFAULT_LANE_COUNT }, (_, index) => index + 1).find((lane) => !occupiedLanes.has(lane)) || 0;
    if (lanePlan.length && !laneNumber) {
      showNotice(`${t('noAssignedLane')} ${student.house}.`, 'error');
      return;
    }
    if (!laneNumber) {
      showNotice(t('noAvailableLane'), 'error');
      return;
    }

    const newRegistration = {
      id,
      eventId: registerEvent.id,
      studentIc: studentKey,
      house: student.house,
      className: student.className,
      laneNumber,
      position: '',
      points: 0,
      updatedAt: serverTimestamp(),
      updatedMs: Date.now(),
    };
    await setDoc(doc(refs.registrations, id), newRegistration);
    await refreshLiveSummary({ registrations: [...registrations, newRegistration] });
    setResultEventId(registerEvent.id);
    setSlipEventId(registerEvent.id);
    showSuccess(t('studentRegistered'));
  };

  const saveRelayTeam = async (team) => {
    if (!registerEvent || !isRelayEvent(registerEvent)) return;
    const memberKeys = getRelayTeamDraft(team);
    if (memberKeys.length !== 4 || memberKeys.some((key) => !key) || new Set(memberKeys).size !== 4) {
      showNotice(t('relayMembersRequired'), 'error');
      return;
    }
    const members = memberKeys.map((key) => studentMap.get(key)).filter(Boolean);
    if (members.length !== 4) {
      showNotice(t('relayMembersRequired'), 'error');
      return;
    }
    const selectedKeys = new Set(members.map(getStudentKey));
    const usedMemberKeys = new Set(
      registrationsForRegisterEvent
        .filter((registration) => isRelayEntry(registration) && registration.id !== team.registration?.id)
        .flatMap((registration) => registration.teamMembers || [])
        .map((member) => getStudentKey(studentMap.get(member.studentIc) || member)),
    );
    if (Array.from(selectedKeys).some((key) => usedMemberKeys.has(key))) {
      showNotice(t('relayMemberInUse'), 'error');
      return;
    }
    const nextRegistration = {
      id: team.key,
      eventId: registerEvent.id,
      entryType: 'relay',
      studentIc: team.studentIc,
      laneNumber: team.laneNumber,
      house: team.house,
      className: Array.from(new Set(members.map((student) => student.className).filter(Boolean))).join(' / '),
      teamMembers: members.map((student) => ({
        name: student.name || '',
        chineseName: student.chineseName || '',
        className: student.className || '',
        studentIc: getStudentKey(student),
      })),
      position: team.registration?.position || '',
      points: Number(team.registration?.points || 0),
      updatedAt: serverTimestamp(),
      updatedMs: Date.now(),
    };
    await setDoc(doc(refs.registrations, nextRegistration.id), nextRegistration, { merge: true });
    await refreshLiveSummary({
      registrations: [
        ...registrations.filter((registration) => registration.id !== nextRegistration.id),
        nextRegistration,
      ],
    });
    setRelayTeamDrafts((current) => {
      const { [team.key]: removed, ...remaining } = current;
      return remaining;
    });
    setResultEventId(registerEvent.id);
    setSlipEventId(registerEvent.id);
    showSuccess(t('relayTeamSaved'));
  };

  const updateResult = async (registration, position) => {
    if (accessRole !== 'admin') {
      showNotice('Admin access required.', 'error');
      return;
    }
    const event = eventMap.get(registration.eventId);
    const nextPosition = isResultPlace(position) ? position : '';
    const points = event && nextPosition ? Number(event.scoring?.[nextPosition] || 0) : 0;
    const updatedMs = Date.now();
    await setDoc(doc(refs.registrations, registration.id), {
      position: nextPosition,
      points,
      updatedAt: serverTimestamp(),
      updatedMs,
    }, { merge: true });
    await refreshLiveSummary({
      registrations: registrations.map((item) => (
        item.id === registration.id ? { ...item, position: nextPosition, points, updatedMs } : item
      )),
    });
    showSuccess(t('resultSaved'));
  };

  const deleteEvent = async (eventId) => {
    if (accessRole === 'user') {
      showNotice('Staff access required.', 'error');
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
    await refreshLiveSummary({
      events: events.filter((item) => item.id !== eventId),
      registrations: registrations.filter((registration) => registration.eventId !== eventId),
    });
    if (editingEventId === eventId) cancelEventEdit();
    showSuccess(t('eventDeleted'));
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
    const eventRows = [...withResolvedLanes(event, eventRegistrations.get(eventId) || [])].sort((a, b) => {
      const positionA = Number(a.position || 99);
      const positionB = Number(b.position || 99);
      if (positionA !== positionB) return positionA - positionB;
      const studentA = studentMap.get(a.studentIc) || {};
      const studentB = studentMap.get(b.studentIc) || {};
      const houseCompare = compareHouses(a.house || studentA.house, b.house || studentB.house);
      if (houseCompare) return houseCompare;
      const classCompare = compareClassNames(studentA.className || a.className, studentB.className || b.className);
      if (classCompare) return classCompare;
      return displaySlipEntryName(a, studentA, event, resolveStudent).localeCompare(displaySlipEntryName(b, studentB, event, resolveStudent));
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
          <td>${escapeHtml(registration.laneNumber || '-')}</td>
          <td>${escapeHtml(displaySlipEntryName(registration, student, event, resolveStudent))}</td>
          <td>${escapeHtml(displayEntryClass(registration, student))}</td>
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
          <thead><tr><th>${escapeHtml(t('participantNo'))}</th><th>${escapeHtml(t('lane'))}</th><th>${escapeHtml(t('name'))}</th><th>${escapeHtml(t('class'))}</th><th>${escapeHtml(t('house'))}</th><th>${escapeHtml(`${t('place')} / ${t('position')}`)}</th><th>${escapeHtml(t('record'))}</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="7">${escapeHtml(t('noRegistered'))}</td></tr>`}</tbody>
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
      showNotice('Staff access required.', 'error');
      return;
    }
    const printEvents = eventIds.map((eventId) => eventMap.get(eventId)).filter(Boolean);
    if (!printEvents.length) {
      showNotice('Choose an event first.', 'error');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      showNotice(t('printWindowBlocked'), 'error');
      return;
    }
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
            td:nth-child(1), td:nth-child(2), td:nth-child(6) { text-align: center; width: 58px; }
            td:nth-child(7) { height: 30px; width: 132px; }
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
    showSuccess(t('printOpened'));
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
      showSuccess(t('teacherViewEnabled'));
      return;
    }
    if (loginMode === 'admin' && password === ADMIN_PASSWORD) {
      setAccessRole('admin');
      setLoginMode('');
      setActiveTab('students');
      showSuccess(t('adminViewEnabled'));
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
    showSuccess(t('liveViewEnabled'));
  };

  const renderNotice = () => {
    if (!notice) return null;
    const message = typeof notice === 'string' ? notice : notice.message;
    const tone = typeof notice === 'string' ? 'info' : notice.tone || 'info';
    const Icon = tone === 'success' ? CircleCheck : tone === 'error' ? CircleAlert : Activity;
    const heading = tone === 'success' ? t('noticeSuccess') : tone === 'error' ? t('noticeError') : t('noticeInfo');
    return (
      <button
        className={`notice notice-${tone}`}
        type="button"
        onClick={() => setNotice(null)}
        role={tone === 'error' ? 'alert' : 'status'}
        aria-live={tone === 'error' ? 'assertive' : 'polite'}
        aria-label={`${heading}: ${message}`}
      >
        <Icon size={20} aria-hidden="true" />
        <span>
          <strong>{heading}</strong>
          <small>{message}</small>
        </span>
        <X size={18} aria-hidden="true" />
      </button>
    );
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
        {renderNotice()}
      </div>
    );
  }

  const allTabs = [
    ['live', Monitor, t('liveBoard')],
    ['viewResults', FileSpreadsheet, t('viewResults')],
    ['lanes', Activity, t('lanes')],
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

      {renderNotice()}
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
              {accessRole === 'admin' && (
                <div className="live-pin-controls">
                  <div className="live-pin-heading">
                    <div className="live-pin-title">
                      <Pin size={18} />
                      <strong>{t('pinnedEvents')}</strong>
                    </div>
                    <div className="live-board-view-toggle" role="group" aria-label={t('liveBoard')}>
                      <button
                        className={liveBoardView === 'overview' ? 'active' : ''}
                        type="button"
                        aria-pressed={liveBoardView === 'overview'}
                        onClick={() => setLiveBoardView('overview')}
                      >
                        {t('overview')}
                      </button>
                      <button
                        className={liveBoardView === 'pinned' ? 'active' : ''}
                        type="button"
                        disabled={!livePinnedEventIds.length}
                        aria-pressed={liveBoardView === 'pinned'}
                        onClick={() => setLiveBoardView('pinned')}
                      >
                        {t('pinnedEvents')}
                      </button>
                    </div>
                  </div>
                  <div className="live-pin-selectors">
                    {[0, 1, 2].map((slot) => {
                      const selectedEventId = livePinnedEventIds[slot] || '';
                      return (
                        <div className="live-pin-select" key={slot}>
                          <label>
                            {`${t('event')} ${slot + 1}`}
                            <select value={selectedEventId} onChange={(event) => updatePinnedLiveEvent(slot, event.target.value)}>
                              <option value="">{t('chooseEvent')}</option>
                              {liveEventOptions.map((event) => (
                                <option key={event.id} value={event.id} disabled={event.id !== selectedEventId && livePinnedEventIds.includes(event.id)}>
                                  {tEventLabel(event)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            className="icon-button live-pin-clear"
                            type="button"
                            disabled={!selectedEventId}
                            onClick={() => updatePinnedLiveEvent(slot, '')}
                            title={t('clear')}
                            aria-label={t('clear')}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <button className="primary-button live-pin-save" type="button" onClick={saveSettings}>
                    <Save size={16} /> {t('savePinnedEvents')}
                  </button>
                </div>
              )}
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
                  <p className="eyebrow">{showPinnedLiveBoard ? t('pinnedEvents') : t('latest')}</p>
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
                    {row.winners.map((winner, index) => (
                      <span key={`${row.id}-${index}`} className="winner-cell">
                        {winner ? <b className={`${houseClassName(winner.house)} winner-chip`}>{winner.label}</b> : <em>-</em>}
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
                  ].map(([label, athletes]) => (
                    <div className="athlete-row" key={label}>
                      <span>{label}</span>
                      {athletes.length ? (
                        <div className="athlete-rankings">
                          {athletes.map((athlete, index) => (
                            <div className="athlete-rank" key={getStudentKey(athlete.student) || `${label}-${index}`}>
                              <strong className="athlete-place">{index + 1}</strong>
                              <div>
                                <strong>{displayStudentName(athlete.student)}</strong>
                                <small>{athlete.student.className || '-'} - {athlete.student.house || '-'}</small>
                                <b>{t('gold')} {athlete.gold} / {t('silver')} {athlete.silver} / {t('bronze')} {athlete.bronze}</b>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <em>{t('noMedals')}</em>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel results-panel">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">{showPinnedLiveBoard ? t('pinnedEvents') : t('latest')}</p>
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
                                  <strong>{displayEntryName(result, result.student, group.event, t('team'), resolveStudent)}</strong>
                                  {!isHouseEntry(result) && <small>{`${displayEntryClass(result, result.student)} - ${result.house || result.student?.house || '-'}`}</small>}
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
                  {t('year')}
                  <select value={studentYearFilter} onChange={(event) => {
                    setStudentYearFilter(event.target.value);
                    setStudentClassFilter('');
                  }}>
                    <option value="">{t('choose')}</option>
                    {STUDENT_YEARS.map((year) => <option key={year} value={year}>{tYear(year)}</option>)}
                  </select>
                </label>
                <label>
                  {t('class')}
                  <select disabled={!studentYearFilter} value={studentClassFilter} onChange={(event) => setStudentClassFilter(event.target.value)}>
                    <option value="">{t('allClasses')}</option>
                    {studentClassOptions.map((className) => <option key={className} value={className}>{className}</option>)}
                  </select>
                </label>
                <label>
                  {t('gender')}
                  <select disabled={!studentYearFilter} value={studentGenderFilter} onChange={(event) => setStudentGenderFilter(event.target.value)}>
                    <option value="">{t('allGenders')}</option>
                    {studentGenderOptions.map((gender) => <option key={gender} value={gender}>{tGender(gender)}</option>)}
                  </select>
                </label>
                <label>
                  {t('house')}
                  <select disabled={!studentYearFilter} value={studentHouseFilter} onChange={(event) => setStudentHouseFilter(event.target.value)}>
                    <option value="">{t('allHouses')}</option>
                    {studentHouseOptions.map((house) => <option key={house} value={house}>{house}</option>)}
                  </select>
                </label>
              </div>
              <div className="stats-box">
                <span>{t('showing')}: <b>{filteredStudents.length}</b></span>
                <span>{t('total')}: <b>{visibleStudents.length}</b></span>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setStudentQuery('');
                  setStudentYearFilter('');
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
                  {!studentYearFilter && <tr><td colSpan="6">{t('choose')}</td></tr>}
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
              {isRelayEvent(registerEvent) ? (
                <div className="relay-team-list">
                  {relayTeamsForRegisterEvent.map((team) => {
                    const draft = getRelayTeamDraft(team);
                    const candidates = relayCandidatesForTeam(team);
                    return (
                      <div className="relay-team-row" key={team.key}>
                        <div className="relay-team-head">
                          <span className={houseClassName(team.house)}>{team.house}</span>
                          <strong>{t('lane')} {team.laneNumber}</strong>
                          <button className="small-button" type="button" onClick={() => saveRelayTeam(team)}>{t('save')}</button>
                        </div>
                        <div className="relay-member-grid">
                          {draft.map((studentKey, index) => (
                            <label key={`${team.key}-${index}`}>
                              <span>{index + 1}</span>
                              <select value={studentKey} onChange={(event) => {
                                const nextDraft = [...draft];
                                nextDraft[index] = event.target.value;
                                setRelayTeamDrafts((current) => ({ ...current, [team.key]: nextDraft }));
                              }}>
                                <option value="">{t('choose')}</option>
                                {candidates.map((student) => {
                                  const candidateKey = getStudentKey(student);
                                  return <option key={candidateKey} value={candidateKey}>{displayStudentName(student)} ({student.className})</option>;
                                })}
                              </select>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
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
                                <strong>{displayEntryName(registration, student, registerEvent, t('team'), resolveStudent)}</strong>
                                {!isHouseEntry(registration) && <small>{`${displayEntryClass(registration, student)} - ${tGender(student.gender)} - ${registration.house}`}</small>}
                              </div>
                              {!registerEvent?.withoutStudent && <button className="position clear" type="button" onClick={() => toggleRegistration({ ...student, ic: registration.studentIc })}>{t('remove')}</button>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
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
                            <strong>{displayEntryName(result, result.student, group.event, t('team'), resolveStudent)}</strong>
                            <span>{displayEntryClass(result, result.student)}</span>
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

        {activeTab === 'lanes' && visibleTabs.includes('lanes') && (
          <section className="split-grid">
            <div className="panel control-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">{t('official')}</p>
                  <h2>{t('laneViewer')}</h2>
                </div>
                <Activity size={22} />
              </div>
              <label>
                {t('quickEvent')}
                <select value={laneEventFilter} onChange={(event) => setLaneEventFilter(event.target.value)}>
                  <option value="">{t('allEvents')}</option>
                  {laneEventOptions.map((event) => <option key={event.id} value={event.id}>{tEventDisplayName(event)}</option>)}
                </select>
              </label>
              <div className="stats-box">
                <span>{t('resultEvents')}: <b>{laneEventOptions.length}</b></span>
                <span>{t('entries')}: <b>{laneGroups.reduce((total, group) => total + group.rows.length, 0)}</b></span>
              </div>
            </div>

            <div className="panel result-browser">
              {laneGroups.length ? laneGroups.map((group) => (
                <div className="result-group" key={group.id}>
                  <button className="result-summary" type="button" aria-expanded="true">
                    <span>
                      <strong>{tEventDisplayName(group.event)}</strong>
                      <small>{group.rows.length} {t('entries').toLowerCase()}</small>
                    </span>
                  </button>
                  <div className="result-details">
                    <div className="lane-detail-head">
                      <span>{t('lane')}</span>
                      <span>{t('name')}</span>
                      <span>{t('class')}</span>
                      <span>{t('house')}</span>
                    </div>
                    {group.rows.map((row) => {
                      const registration = row.registration;
                      const student = registration ? (registration.student || studentMap.get(registration.studentIc) || {}) : {};
                      return (
                        <div className="lane-detail-grid" key={row.id}>
                          <b>{row.laneNumber}</b>
                          <strong>{registration ? displayEntryName(registration, student, group.event, t('team'), resolveStudent) : '-'}</strong>
                          <span>{registration ? displayEntryClass(registration, student) : '-'}</span>
                          <span className={houseClassName(row.house || student.house)}>{row.house || student.house || '-'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )) : <p className="empty">{t('noLanes')}</p>}
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
                const relayResult = isRelayEvent(resultEvent) && isRelayEntry(registration);
                return (
                  <div className="registered-row" key={registration.id}>
                    <div className="registered-top">
                      <div>
                        <strong>{relayResult ? `${registration.house || '-'}${registration.laneNumber ? ` - ${t('lane')} ${registration.laneNumber}` : ''}` : displayEntryName(registration, student, resultEvent, t('team'), resolveStudent)}</strong>
                        {!relayResult && !isHouseEntry(registration) && <small>{`${displayEntryClass(registration, student)} - ${tGender(student.gender)} - ${registration.house}`}</small>}
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
                  <thead><tr><th>{t('participantNo')}</th><th>{t('lane')}</th><th>{t('name')}</th><th>{t('class')}</th><th>{t('house')}</th><th>{t('place')} / {t('position')}</th><th>{t('record')}</th></tr></thead>
                  <tbody>
                    {jurySheetRows.length ? jurySheetRows
                      .map(({ registration, student, participantNo }) => {
                        return (
                          <tr key={registration.id}>
                            <td>{participantNo}</td>
                            <td>{registration.laneNumber || '-'}</td>
                            <td>{displaySlipEntryName(registration, student, slipEvent, resolveStudent)}</td>
                            <td>{displayEntryClass(registration, student)}</td>
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
