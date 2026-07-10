import React, { useEffect, useMemo, useRef, useState } from 'react';
import { initializeApp } from 'firebase/app';
import {
  collection,
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
  Download,
  FileSpreadsheet,
  Maximize2,
  Medal,
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
  'Tahap Dua (L)', 'Tahap Dua (P)', 'Tahap Dua (Campuran)',
  'Terbuka L', 'Terbuka P', 'Ibu Bapa', 'Guru',
];
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
  points1: 10,
  points2: 7,
  points3: 5,
  points4: 3,
  points5: 0,
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
const getEventEligibility = (event) => {
  const category = String(event?.category || '').trim().toLocaleUpperCase('ms-MY');
  const match = category.match(/^([LP])([1-6])$/);
  if (!match) return { year: 0, gender: '' };
  return {
    year: Number(match[2]),
    gender: match[1] === 'L' ? 'Lelaki' : 'Perempuan',
  };
};
const getCell = (row, names) => {
  const keys = Object.keys(row || {});
  const key = keys.find((candidate) =>
    names.some((name) => candidate.trim().toLowerCase() === name),
  );
  return key ? String(row[key] || '').trim() : '';
};
const eventLabel = (event) => event ? `${event.no || '-'} - ${event.name} (${event.category || '-'})` : '';
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

  useEffect(() => {
    localStorage.setItem('esukan-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('esukan-access-role', accessRole);
  }, [accessRole]);

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) setActiveTab('live');
  }, [activeTab, visibleTabs]);

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
        setRegistrations(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
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
    return displayStudentName(studentA, a.studentIc).localeCompare(displayStudentName(studentB, b.studentIc));
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
  const registerCandidates = students
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

  const latestResults = useMemo(() => {
    return registrations
      .filter((registration) => Number(registration.position || 0) > 0)
      .map((registration) => ({
        ...registration,
        student: studentMap.get(registration.studentIc),
        event: eventMap.get(registration.eventId),
      }))
      .sort((a, b) => Number(b.updatedMs || 0) - Number(a.updatedMs || 0))
      .slice(0, 12);
  }, [eventMap, registrations, studentMap]);
  const viewResults = useMemo(() => {
    return registrations
      .filter((registration) => Number(registration.position || 0) > 0)
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
      return displayStudentName(a.student, a.registration.studentIc).localeCompare(displayStudentName(b.student, b.registration.studentIc));
    })
    .map((row, index) => ({ ...row, participantNo: index + 1 }));

  const getScoring = () => ({
    1: Number(eventForm.points1 || 0),
    2: Number(eventForm.points2 || 0),
    3: Number(eventForm.points3 || 0),
    4: Number(eventForm.points4 || 0),
    5: Number(eventForm.points5 || 0),
  });

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
        scoring,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
    setRegisterEventId(`${timestamp}-0-${slugify(buildEventName(baseName, sortedCategories[0]))}`);
    setResultEventId(`${timestamp}-0-${slugify(buildEventName(baseName, sortedCategories[0]))}`);
    setSlipEventId(`${timestamp}-0-${slugify(buildEventName(baseName, sortedCategories[0]))}`);
    setEventForm((current) => ({ ...DEFAULT_EVENT_FORM, startNo: Number(current.startNo || 1) + sortedCategories.length }));
    setNotice(`${sortedCategories.length} events created.`);
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
      points1: Number(event.scoring?.[1] || 0),
      points2: Number(event.scoring?.[2] || 0),
      points3: Number(event.scoring?.[3] || 0),
      points4: Number(event.scoring?.[4] || 0),
      points5: Number(event.scoring?.[5] || 0),
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
      scoring: {
        1: Number(eventEditForm.points1 || 0),
        2: Number(eventEditForm.points2 || 0),
        3: Number(eventEditForm.points3 || 0),
        4: Number(eventEditForm.points4 || 0),
        5: Number(eventEditForm.points5 || 0),
      },
      updatedAt: serverTimestamp(),
    };
    if (!payload.name || !payload.category) {
      setNotice('Event name and category are required.');
      return;
    }
    await setDoc(doc(refs.events, event.id), payload, { merge: true });
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
    const points = event && position ? Number(event.scoring?.[position] || 0) : 0;
    await setDoc(doc(refs.registrations, registration.id), {
      position,
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

  const openFullscreen = async () => {
    if (!liveBoardRef.current) return;
    if (!document.fullscreenElement) {
      await liveBoardRef.current.requestFullscreen();
    }
  };

  const printResultSlip = () => {
    if (accessRole === 'user') {
      setNotice('Staff access required.');
      return;
    }
    if (!slipEvent) {
      setNotice('Choose an event first.');
      return;
    }

    const rows = jurySheetRows
      .map(({ registration, student, participantNo }) => {
        return `
          <tr>
            <td>${participantNo}</td>
            <td>${displayStudentName(student, registration.studentIc)}</td>
            <td>${student.className || registration.className || ''}</td>
            <td>${registration.house || student.house || ''}</td>
            <td>${registration.position || ''}</td>
            <td></td>
          </tr>
        `;
      }).join('');

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Result Slip - ${slipEvent.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            .header { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 18px; }
            h1 { margin: 0; font-size: 22px; text-transform: uppercase; }
            h2 { margin: 8px 0 0; font-size: 17px; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td { border: 1px solid #111827; padding: 8px; font-size: 13px; text-align: left; }
            th { background: #f3f4f6; text-transform: uppercase; font-size: 11px; }
            td:nth-child(1), td:nth-child(5) { text-align: center; width: 72px; }
            td:nth-child(6) { height: 30px; width: 160px; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 54px; }
            .line { border-top: 1px solid #111827; padding-top: 8px; font-size: 12px; font-weight: bold; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <button onclick="window.print()">Print</button>
          <div class="header">
            <h1>${settings.schoolName}</h1>
            <h2>${settings.eventTitle} ${settings.year}</h2>
            <p>${eventLabel(slipEvent)}</p>
          </div>
          <table>
            <thead><tr><th>No. Peserta</th><th>Name</th><th>Class</th><th>House</th><th>Place / Kedudukan</th><th>Record</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="6">No registered students.</td></tr>'}</tbody>
          </table>
          <div class="signatures">
            <div class="line">Prepared by</div>
            <div class="line">Confirmed by</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
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
          <h1>Firebase config missing</h1>
          <p>Add the VITE_FIREBASE_* values in this folder or in Vercel project settings.</p>
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
            <h1>Loading e-Sukan data</h1>
            <p className="help-text">Please wait while Firebase loads settings, students, events, and scores.</p>
          </section>
        </main>
        {notice && <button className="notice" type="button" onClick={() => setNotice('')}>{notice}</button>}
      </div>
    );
  }

  const allTabs = [
    ['live', Monitor, 'Live Board'],
    ['viewResults', FileSpreadsheet, 'View Results'],
    ['students', Users, 'Students'],
    ['events', Trophy, 'Events'],
    ['register', ClipboardList, 'Register'],
    ['results', Medal, 'Results Entry'],
    ['slips', Printer, 'Slips'],
    ['settings', Settings, 'Settings'],
  ];
  const tabs = allTabs.filter(([id]) => visibleTabs.includes(id));

  return (
    <div className={`app-shell theme-${theme}`}>
      <header className="topbar">
        <div className="brand-lockup">
          <img className="site-logo" src={SCHOOL_LOGO_PATH} alt={`${settings.schoolName || DEFAULT_SETTINGS.schoolName} logo`} />
          <div>
            <p className="eyebrow">{settings.schoolName}</p>
            <h1>Sistem e-Sukan</h1>
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
          ) : <div className="viewer-pill">Live Board</div>}
          <div className="access-controls">
            <span>{ACCESS_LEVELS[accessRole]?.label || 'Live View'}</span>
            {accessRole !== 'user' && <button type="button" onClick={returnToLiveView}>Live View</button>}
            <button type="button" onClick={() => openLogin('teacher')}>Teacher</button>
            <button type="button" onClick={() => openLogin('admin')}>Admin</button>
          </div>
          <button className="theme-toggle" type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Toggle theme">
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

      {loginMode && (
        <div className="access-modal" role="dialog" aria-modal="true">
          <form className="access-card" onSubmit={submitAccess}>
            <p className="eyebrow">{loginMode === 'admin' ? 'Admin' : 'Teacher'} access</p>
            <h2>{loginMode === 'admin' ? 'Open Admin View' : 'Open Teacher View'}</h2>
            <label>
              Password
              <input autoFocus type="password" value={accessPassword} onChange={(event) => setAccessPassword(event.target.value)} />
            </label>
            {accessError && <p className="access-error">{accessError}</p>}
            <div className="access-actions">
              <button type="button" className="secondary-button" onClick={() => setLoginMode('')}>Cancel</button>
              <button type="submit" className="primary-button">Open</button>
            </div>
          </form>
        </div>
      )}

      {notice && <button className="notice" type="button" onClick={() => setNotice('')}>{notice}</button>}
      {uploadingStudents && (
        <div className="upload-overlay" role="status" aria-live="polite">
          <div className="upload-card">
            <div className="spinner" aria-hidden="true" />
            <strong>Uploading student namelist</strong>
            <span>Saving to Firebase. Please keep this page open.</span>
          </div>
        </div>
      )}

      <main className="workspace">
        {activeTab === 'live' && (
          <section className={settings.liveBoardMode === 'total-only' ? 'live-grid total-only' : 'live-grid'}>
            <div className="panel scoreboard-panel live-board-surface" ref={liveBoardRef}>
              <div className="section-head">
                <div className="live-board-title">
                  <img className="live-board-logo" src={SCHOOL_LOGO_PATH} alt={`${liveBoardHeaderSchool} logo`} />
                  <div>
                    <p className="eyebrow">{liveBoardHeaderSchool}</p>
                    <h2>{liveBoardHeaderTitle}</h2>
                  </div>
                </div>
                <button className="icon-button" type="button" onClick={openFullscreen} title="Fullscreen">
                  <Maximize2 size={18} />
                </button>
              </div>
              <div className="score-list">
                {scoreData.houses.map((house, index) => {
                  const maxScore = Math.max(...scoreData.houses.map((item) => item.total), 100);
                  const width = Math.max((house.total / maxScore) * 100, 10);
                  return (
                    <div className="score-row" key={house.name}>
                      <div className="rank">{index + 1}</div>
                      <div className="score-track">
                        <div className={houseClassName(house.name)} style={{ width: `${width}%` }}>{house.name}</div>
                      </div>
                      <div className="score-number">{house.total}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {settings.liveBoardMode !== 'total-only' && (
              <div className="panel class-panel">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Optional</p>
                    <h2>Class Marks</h2>
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

            <div className="panel results-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Latest</p>
                  <h2>Results</h2>
                </div>
                <FileSpreadsheet size={22} />
              </div>
              <div className="result-list">
                {latestResults.length ? latestResults.map((result) => (
                  <div className="result-row" key={result.id}>
                    <div>
                      <strong>{displayStudentName(result.student, result.studentIc)}</strong>
                      <span>{result.event?.name || 'Event'} ({result.event?.category || '-'})</span>
                    </div>
                    <b>{result.points || 0}</b>
                  </div>
                )) : <p className="empty">No results entered yet.</p>}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'students' && visibleTabs.includes('students') && (
          <section className="split-grid">
            <div className="panel control-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Template</p>
                  <h2>Student Namelist</h2>
                </div>
                <Users size={22} />
              </div>
              <button className="primary-button" type="button" onClick={downloadTemplate}>
                <Download size={16} /> Download Excel Template
              </button>
              <input ref={fileInputRef} hidden type="file" accept=".xlsx,.xls,.csv" onChange={(event) => importStudents(event.target.files?.[0])} />
              <button className="secondary-button" type="button" disabled={uploadingStudents} onClick={() => fileInputRef.current?.click()}>
                <Upload size={16} /> {uploadingStudents ? 'Uploading...' : 'Upload Completed List'}
              </button>
              <label>
                Search
                <input value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} placeholder="Name, 姓名, kelas, gender, house" />
              </label>
              <div className="student-filter-grid">
                <label>
                  Kelas
                  <select value={studentClassFilter} onChange={(event) => setStudentClassFilter(event.target.value)}>
                    <option value="">All classes</option>
                    {studentClassOptions.map((className) => <option key={className} value={className}>{className}</option>)}
                  </select>
                </label>
                <label>
                  Gender
                  <select value={studentGenderFilter} onChange={(event) => setStudentGenderFilter(event.target.value)}>
                    <option value="">All genders</option>
                    {studentGenderOptions.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
                  </select>
                </label>
                <label>
                  House
                  <select value={studentHouseFilter} onChange={(event) => setStudentHouseFilter(event.target.value)}>
                    <option value="">All houses</option>
                    {studentHouseOptions.map((house) => <option key={house} value={house}>{house}</option>)}
                  </select>
                </label>
              </div>
              <div className="stats-box">
                <span>Showing: <b>{filteredStudents.length}</b></span>
                <span>Total: <b>{students.length}</b></span>
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
                Clear Search & Filters
              </button>
              <p className="help-text">Required columns: Name, Kelas, Rumah Sukan / House, Jantina/Gender. Use Lelaki/Male/Boy or Perempuan/Female/Girl. Optional column: 姓名.</p>
            </div>

            <div className="panel table-panel">
              <table>
                <thead>
                  <tr><th>Name</th><th>姓名</th><th>Kelas</th><th>Gender</th><th>House</th><th></th></tr>
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
                              <option value="">Choose</option>
                              <option value="Lelaki">Lelaki</option>
                              <option value="Perempuan">Perempuan</option>
                            </select>
                          ) : (student.gender || '-')}
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
                                <button className="small-button" type="button" onClick={() => saveStudentEdit(student)}>Save</button>
                                <button className="small-button muted" type="button" onClick={cancelStudentEdit}>Cancel</button>
                              </>
                            ) : (
                              <>
                                <button className="icon-button" title="Edit student" type="button" onClick={() => startStudentEdit(student)}><SquarePen size={16} /></button>
                                <button className="icon-button danger" title="Delete student" type="button" onClick={() => deleteStudent(student)}><Trash2 size={16} /></button>
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
                  <p className="eyebrow">Bulk setup</p>
                  <h2>Events</h2>
                </div>
                <Trophy size={22} />
              </div>
              <div className="inline-fields">
                <label>
                  Start no
                  <input type="number" value={eventForm.startNo} onChange={(event) => setEventForm({ ...eventForm, startNo: Number(event.target.value) })} />
                </label>
                <label>
                  Type
                  <select value={eventForm.type} onChange={(event) => setEventForm({ ...eventForm, type: event.target.value })}>
                    <option>Individu</option>
                    <option>Kumpulan</option>
                  </select>
                </label>
              </div>
              <label>
                Main event name
                <input required value={eventForm.baseName} onChange={(event) => setEventForm({ ...eventForm, baseName: event.target.value })} placeholder="Lari 100m" />
              </label>
              <label>
                Event kind
                <select value={eventForm.kind} onChange={(event) => setEventForm({ ...eventForm, kind: event.target.value })}>
                  <option>Utama</option>
                  <option>Tambahan</option>
                  <option>Ibu Bapa</option>
                  <option>Guru</option>
                </select>
              </label>
              <div className="category-picker">
                <div className="category-actions">
                  <span>Categories</span>
                  <button type="button" onClick={() => setEventForm({ ...eventForm, categories: [...CATEGORY_ORDER] })}>Select all</button>
                </div>
                <div className="category-grid">
                  {CATEGORY_ORDER.map((category) => (
                    <button key={category} type="button" className={eventForm.categories.includes(category) ? 'chip active' : 'chip'} onClick={() => toggleCategory(category)}>
                      {category}
                    </button>
                  ))}
                </div>
              </div>
              <div className="points-grid">
                {[1, 2, 3, 4, 5].map((position) => (
                  <label key={position}>
                    P{position}
                    <input type="number" value={eventForm[`points${position}`]} onChange={(event) => setEventForm({ ...eventForm, [`points${position}`]: event.target.value })} />
                  </label>
                ))}
              </div>
              <button className="primary-button" type="submit"><Save size={16} /> Save Bulk Events</button>
            </form>

            <div className="panel table-panel">
              <table>
                <thead>
                  <tr><th>No</th><th>Event</th><th>Category</th><th>Type</th><th>Scoring</th><th>Entries</th><th></th></tr>
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
                            : event.category}
                        </td>
                        <td>
                          {editing ? (
                            <select value={eventEditForm.type} onChange={(inputEvent) => setEventEditForm({ ...eventEditForm, type: inputEvent.target.value })}>
                              <option>Individu</option>
                              <option>Kumpulan</option>
                            </select>
                          ) : event.type}
                        </td>
                        <td>
                          {editing ? (
                            <div className="mini-points">
                              {[1, 2, 3, 4, 5].map((position) => (
                                <input
                                  key={position}
                                  aria-label={`Position ${position} points`}
                                  type="number"
                                  value={eventEditForm[`points${position}`]}
                                  onChange={(inputEvent) => setEventEditForm({ ...eventEditForm, [`points${position}`]: inputEvent.target.value })}
                                />
                              ))}
                            </div>
                          ) : [1, 2, 3, 4, 5].map((position) => event.scoring?.[position] ?? 0).join('/')}
                        </td>
                        <td>{(eventRegistrations.get(event.id) || []).length}</td>
                        <td>
                          <div className="row-actions">
                            {editing ? (
                              <>
                                <button className="small-button" type="button" onClick={() => saveEventEdit(event)}>Save</button>
                                <button className="small-button muted" type="button" onClick={cancelEventEdit}>Cancel</button>
                              </>
                            ) : (
                              <>
                                <button className="icon-button" title="Edit event" type="button" onClick={() => startEventEdit(event)}><SquarePen size={16} /></button>
                                <button className="icon-button danger" title="Delete event" type="button" onClick={() => deleteEvent(event.id)}><Trash2 size={16} /></button>
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
                {CATEGORY_ORDER.map((category) => <option key={category} value={category} />)}
              </datalist>
            </div>
          </section>
        )}

        {activeTab === 'register' && visibleTabs.includes('register') && (
          <section className="register-layout">
            <div className="panel control-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Participants</p>
                  <h2>Register</h2>
                </div>
                <ClipboardList size={22} />
              </div>
              <label>
                Event
                <select value={registerEventId} onChange={(event) => setRegisterEventId(event.target.value)}>
                  <option value="">Choose event</option>
                  {events.map((event) => <option key={event.id} value={event.id}>{eventLabel(event)}</option>)}
                </select>
              </label>
              <label>
                Search
                <input value={registerQuery} onChange={(event) => setRegisterQuery(event.target.value)} placeholder="Name, 姓名, kelas, gender" />
              </label>
              <label>
                House
                <select value={registerHouse} onChange={(event) => setRegisterHouse(event.target.value)}>
                  <option value="">All houses</option>
                  {houses.map((house) => <option key={house} value={house}>{house}</option>)}
                </select>
              </label>
              <div className="student-filter-grid">
                <label>
                  Year
                  <select value={registerEffectiveClassFilter} disabled={Boolean(registerEligibility.year)} onChange={(event) => setRegisterClassFilter(event.target.value)}>
                    <option value="">All years</option>
                    {[1, 2, 3, 4, 5, 6].map((year) => <option key={year} value={year}>Tahun {year}</option>)}
                  </select>
                </label>
                <label>
                  Gender
                  <select value={registerEffectiveGenderFilter} disabled={Boolean(registerEligibility.gender)} onChange={(event) => setRegisterGenderFilter(event.target.value)}>
                    <option value="">All genders</option>
                    {studentGenderOptions.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
                  </select>
                </label>
              </div>
              {registerEvent && (registerEligibility.year || registerEligibility.gender) && (
                <p className="help-text">This event shows {registerEligibility.year ? `Tahun ${registerEligibility.year}` : 'all years'} {registerEligibility.gender || 'all genders'} students.</p>
              )}
              <div className="stats-box">
                <span>Registered: <b>{registrationsForRegisterEvent.length}</b></span>
                <span>Available students: <b>{registerCandidates.length}</b></span>
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
                Clear Search & Filters
              </button>
            </div>

            <div className="panel entry-panel">
              <div className="entry-columns">
                <div>
                  <div className="list-title">
                    <p className="eyebrow">Student Pool</p>
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
                            <small>{student.className} - {student.gender || '-'} - {student.house}</small>
                          </span>
                          <b>{selected ? 'IN' : '+'}</b>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="list-title">
                    <p className="eyebrow">Registered Students</p>
                    <strong>{registrationsForRegisterEvent.length}</strong>
                  </div>
                  <div className="registered-list">
                    {registrationsForRegisterEvent.map((registration) => {
                      const student = studentMap.get(registration.studentIc) || {};
                      return (
                        <div className="registered-row" key={registration.id}>
                          <div className="registered-top">
                            <div>
                              <strong>{displayStudentName(student, registration.studentIc)}</strong>
                              <small>{student.className || registration.className} - {student.gender || '-'} - {registration.house}</small>
                            </div>
                            <button className="position clear" type="button" onClick={() => toggleRegistration({ ...student, ic: registration.studentIc })}>Remove</button>
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
                  <p className="eyebrow">Readonly</p>
                  <h2>View Results</h2>
                </div>
                <FileSpreadsheet size={22} />
              </div>
              <div className="stats-box">
                <span>Completed: <b>{viewResults.length}</b></span>
                <span>Events: <b>{new Set(viewResults.map((result) => result.eventId)).size}</b></span>
              </div>
              <p className="help-text">This page only shows keyed-in results. Result entry remains admin-only.</p>
            </div>

            <div className="panel table-panel">
              <table>
                <thead>
                  <tr><th>Event</th><th>Place</th><th>Name</th><th>Class</th><th>House</th><th>Points</th></tr>
                </thead>
                <tbody>
                  {viewResults.length ? viewResults.map((result) => (
                    <tr key={result.id}>
                      <td>{eventLabel(result.event || {})}</td>
                      <td>{result.position}</td>
                      <td>{displayStudentName(result.student, result.studentIc)}</td>
                      <td>{result.student?.className || result.className || '-'}</td>
                      <td>{result.house || result.student?.house || '-'}</td>
                      <td>{result.points || 0}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6">No results entered yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'results' && visibleTabs.includes('results') && accessRole === 'admin' && (
          <section className="results-entry-grid">
            <div className="panel control-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Judging</p>
                  <h2>Results Entry</h2>
                </div>
                <Medal size={22} />
              </div>
              <label>
                Event
                <select value={resultEventId} onChange={(event) => setResultEventId(event.target.value)}>
                  <option value="">Choose event</option>
                  {events.map((event) => <option key={event.id} value={event.id}>{eventLabel(event)}</option>)}
                </select>
              </label>
              {resultEvent && (
                <div className="points-preview">
                  {[1, 2, 3, 4, 5].map((position) => (
                    <span key={position}>P{position}: <b>{resultEvent.scoring?.[position] || 0}</b></span>
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
                        <strong>{displayStudentName(student, registration.studentIc)}</strong>
                        <small>{student.className || registration.className} - {student.gender || '-'} - {registration.house}</small>
                      </div>
                      <b>{registration.points || 0}</b>
                    </div>
                    <div className="position-buttons">
                      {['1', '2', '3', '4', '5'].map((position) => (
                        <button key={position} className={String(registration.position) === position ? 'position active' : 'position'} type="button" onClick={() => updateResult(registration, position)}>
                          {position}
                        </button>
                      ))}
                      <button className="position clear" type="button" onClick={() => updateResult(registration, '')}>Clear</button>
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
                  <p className="eyebrow">Official</p>
                  <h2>Result Slip</h2>
                </div>
                <Printer size={22} />
              </div>
              <label>
                Event
                <select value={slipEventId} onChange={(event) => setSlipEventId(event.target.value)}>
                  <option value="">Choose event</option>
                  {events.map((event) => <option key={event.id} value={event.id}>{eventLabel(event)}</option>)}
                </select>
              </label>
              <div className="stats-box">
                <span>Registered: <b>{registrationsForSlipEvent.length}</b></span>
                <span>Completed results: <b>{registrationsForSlipEvent.filter((registration) => Number(registration.position || 0) > 0).length}</b></span>
              </div>
              <button className="primary-button" type="button" onClick={printResultSlip}><Printer size={16} /> Generate Slip</button>
            </div>
            <div className="panel slip-preview">
              <div className="slip-paper">
                <p className="eyebrow">{settings.schoolName}</p>
                <h2>{settings.eventTitle} {settings.year}</h2>
                <h3>{slipEvent ? eventLabel(slipEvent) : 'Choose an event'}</h3>
                <table>
                  <thead><tr><th>No. Peserta</th><th>Name</th><th>Class</th><th>House</th><th>Place / Kedudukan</th><th>Record</th></tr></thead>
                  <tbody>
                    {jurySheetRows.length ? jurySheetRows
                      .map(({ registration, student, participantNo }) => {
                        return (
                          <tr key={registration.id}>
                            <td>{participantNo}</td>
                            <td>{displayStudentName(student, registration.studentIc)}</td>
                            <td>{student.className || registration.className}</td>
                            <td>{registration.house || student.house}</td>
                            <td>{registration.position || ''}</td>
                            <td></td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan="6">No registered students.</td></tr>
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
                  <p className="eyebrow">General</p>
                  <h2>e-Sukan Settings</h2>
                </div>
                <Settings size={22} />
              </div>
              <label>School name<input value={settings.schoolName || ''} onChange={(event) => setSettings({ ...settings, schoolName: event.target.value })} /></label>
              <label>Event title<input value={settings.eventTitle || ''} onChange={(event) => setSettings({ ...settings, eventTitle: event.target.value })} /></label>
              <label>Year<input type="number" value={settings.year || ''} onChange={(event) => setSettings({ ...settings, year: Number(event.target.value) })} /></label>
              <label>Houses<textarea rows="4" value={houses.join('\n')} onChange={(event) => setSettings({ ...settings, houses: splitHouseList(event.target.value) })} /></label>
              <label>
                Live board
                <select value={settings.liveBoardMode || 'total-only'} onChange={(event) => setSettings({ ...settings, liveBoardMode: event.target.value })}>
                  <option value="total-only">Realtime total marks only</option>
                  <option value="total-and-class">Total marks + class marks</option>
                </select>
              </label>
              <label>Live board small header<input placeholder={settings.schoolName || DEFAULT_SETTINGS.schoolName} value={settings.liveBoardHeaderSchool || ''} onChange={(event) => setSettings({ ...settings, liveBoardHeaderSchool: event.target.value })} /></label>
              <label>Live board main title<input placeholder={DEFAULT_SETTINGS.liveBoardHeaderTitle} value={settings.liveBoardHeaderTitle || ''} onChange={(event) => setSettings({ ...settings, liveBoardHeaderTitle: event.target.value })} /></label>
              <button className="primary-button" type="button" onClick={saveSettings}><Save size={16} /> Save Settings</button>
            </div>

            <div className="panel settings-panel">
              <div className="section-head">
                <div><p className="eyebrow">Rules</p><h2>Participation Limits</h2></div>
                <Medal size={22} />
              </div>
              <div className="inline-fields">
                <label>Individu T1<input type="number" value={settings.maxIndividuTahap1 || 0} onChange={(event) => setSettings({ ...settings, maxIndividuTahap1: Number(event.target.value) })} /></label>
                <label>Individu T2<input type="number" value={settings.maxIndividuTahap2 || 0} onChange={(event) => setSettings({ ...settings, maxIndividuTahap2: Number(event.target.value) })} /></label>
              </div>
              <div className="inline-fields">
                <label>Kumpulan T1<input type="number" value={settings.maxKumpulanTahap1 || 0} onChange={(event) => setSettings({ ...settings, maxKumpulanTahap1: Number(event.target.value) })} /></label>
                <label>Kumpulan T2<input type="number" value={settings.maxKumpulanTahap2 || 0} onChange={(event) => setSettings({ ...settings, maxKumpulanTahap2: Number(event.target.value) })} /></label>
              </div>
              <label>Tarik Tali quota per house/year<input type="number" value={settings.maxTarikTaliPerHouseYear || 0} onChange={(event) => setSettings({ ...settings, maxTarikTaliPerHouseYear: Number(event.target.value) })} /></label>
              <div className="stats-box">
                <span>Students: <b>{students.length}</b></span>
                <span>Events: <b>{events.length}</b></span>
                <span>Registrations: <b>{registrations.length}</b></span>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
