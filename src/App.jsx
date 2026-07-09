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
  Download,
  FileSpreadsheet,
  Medal,
  Monitor,
  Plus,
  Save,
  Settings,
  Trash2,
  Trophy,
  Upload,
  Users,
} from 'lucide-react';

const DEFAULT_HOUSES = ['MERAH', 'BIRU', 'KUNING', 'HIJAU', 'UNGU'];
const DEFAULT_SETTINGS = {
  schoolName: 'SJKC Sin Ming',
  eventTitle: 'Kejohanan e-Sukan',
  year: new Date().getFullYear(),
  houses: DEFAULT_HOUSES,
  liveBoardMode: 'total-only',
  maxIndividuTahap1: 2,
  maxIndividuTahap2: 3,
  maxKumpulanTahap1: 1,
  maxKumpulanTahap2: 2,
  maxTarikTaliPerHouseYear: 4,
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

const normalizeIc = (value) => String(value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
const normalizeHouse = (value) => String(value || '').trim().toUpperCase();
const getYear = (className) => {
  const match = String(className || '').match(/[1-6]/);
  return match ? Number(match[0]) : 0;
};

const getCell = (row, names) => {
  const keys = Object.keys(row || {});
  const key = keys.find((candidate) =>
    names.some((name) => candidate.trim().toLowerCase() === name),
  );
  return key ? String(row[key] || '').trim() : '';
};

const houseClassName = (house) => {
  const name = normalizeHouse(house);
  if (name.includes('MERAH')) return 'house red';
  if (name.includes('BIRU')) return 'house blue';
  if (name.includes('KUNING')) return 'house yellow';
  if (name.includes('HIJAU')) return 'house green';
  if (name.includes('UNGU')) return 'house purple';
  if (name.includes('JINGGA')) return 'house orange';
  return 'house slate';
};

const sortByName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''));

function App() {
  const fileInputRef = useRef(null);
  const params = new URLSearchParams(window.location.search);
  const siteId = params.get('site') || import.meta.env.VITE_ESUKAN_SITE_ID || 'sinming-esukan';

  const [activeTab, setActiveTab] = useState('live');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [eventForm, setEventForm] = useState({
    name: '',
    category: 'L1',
    type: 'Individu',
    points1: 10,
    points2: 7,
    points3: 5,
    points4: 3,
    points5: 0,
  });

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

  useEffect(() => {
    if (!refs) return undefined;

    const unsubscribers = [
      onSnapshot(refs.settings, (snapshot) => {
        setSettings({ ...DEFAULT_SETTINGS, ...(snapshot.exists() ? snapshot.data() : {}) });
      }),
      onSnapshot(refs.students, (snapshot) => {
        setStudents(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).sort(sortByName));
      }),
      onSnapshot(refs.events, (snapshot) => {
        const nextEvents = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort((a, b) => Number(a.no || 0) - Number(b.no || 0));
        setEvents(nextEvents);
        setSelectedEventId((current) => current || (nextEvents[0] ? nextEvents[0].id : ''));
      }),
      onSnapshot(refs.registrations, (snapshot) => {
        setRegistrations(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        setLoading(false);
      }),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [refs]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const studentMap = useMemo(() => new Map(students.map((student) => [student.ic, student])), [students]);
  const eventMap = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);
  const selectedEvent = eventMap.get(selectedEventId);
  const registrationsByEvent = registrations.filter((item) => item.eventId === selectedEventId);
  const registeredIcSet = new Set(registrationsByEvent.map((item) => item.studentIc));

  const filteredStudents = students.filter((student) => {
    const query = studentQuery.trim().toLowerCase();
    if (!query) return true;
    return [student.name, student.className, student.ic, student.house].some((value) =>
      String(value || '').toLowerCase().includes(query),
    );
  });

  const scoreData = useMemo(() => {
    const houseTotals = houses.map((house) => ({ name: house, total: 0 }));
    const classTotals = new Map();

    registrations.forEach((registration) => {
      const student = studentMap.get(registration.studentIc) || {};
      const house = normalizeHouse(registration.house || student.house);
      const points = Number(registration.points || 0);
      const row = houseTotals.find((item) => item.name === house);
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

  const saveSettings = async () => {
    await setDoc(refs.settings, { ...settings, houses, updatedAt: serverTimestamp() }, { merge: true });
    setNotice('Settings saved.');
  };

  const downloadTemplate = () => {
    import('xlsx').then((XLSX) => {
    const worksheet = XLSX.utils.json_to_sheet([
      { Name: 'Ali Bin Abu', Class: '4M', IC: '120101010001', 'Rumah Sukan': houses[0] || 'MERAH' },
      { Name: 'Tan Mei Ling', Class: '5B', IC: '120202020002', 'Rumah Sukan': houses[1] || 'BIRU' },
    ]);
    worksheet['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 18 }, { wch: 18 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Namelist');
    XLSX.writeFile(workbook, `e-sukan-template-${settings.year}.xlsx`);
    });
  };

  const importStudents = async (file) => {
    if (!file) return;

    const XLSX = await import('xlsx');
    const workbook = XLSX.read(await file.arrayBuffer());
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    const validStudents = rows
      .map((row) => ({
        ic: normalizeIc(getCell(row, ['ic', 'no ic', 'no. ic', 'kad pengenalan', 'identity card'])),
        name: getCell(row, ['name', 'nama', 'nama murid']),
        className: getCell(row, ['class', 'kelas', 'class name']),
        house: normalizeHouse(getCell(row, ['rumah sukan', 'rumah', 'house'])),
      }))
      .filter((student) => student.ic && student.name && student.className && student.house);

    if (!validStudents.length) {
      setNotice('No valid rows. Required columns: Name, Class, IC, Rumah Sukan.');
      return;
    }

    const batch = writeBatch(db);
    validStudents.forEach((student) => {
      batch.set(doc(refs.students, student.ic), {
        ...student,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    });
    await batch.commit();
    if (fileInputRef.current) fileInputRef.current.value = '';
    setNotice(`${validStudents.length} students imported using IC as key.`);
  };

  const saveEvent = async (submitEvent) => {
    submitEvent.preventDefault();
    const safeName = eventForm.name.trim();
    if (!safeName) return;

    const id = `${Date.now()}-${safeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
    await setDoc(doc(refs.events, id), {
      no: events.length + 1,
      name: safeName,
      category: eventForm.category.trim().toUpperCase(),
      type: eventForm.type,
      scoring: {
        1: Number(eventForm.points1 || 0),
        2: Number(eventForm.points2 || 0),
        3: Number(eventForm.points3 || 0),
        4: Number(eventForm.points4 || 0),
        5: Number(eventForm.points5 || 0),
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setEventForm({
      name: '',
      category: 'L1',
      type: 'Individu',
      points1: 10,
      points2: 7,
      points3: 5,
      points4: 3,
      points5: 0,
    });
    setSelectedEventId(id);
    setNotice('Event saved.');
  };

  const getRegistrationBlockReason = (student) => {
    if (!selectedEvent) return 'Choose an event first.';
    const year = getYear(student.className);
    if (!year) return 'Student class must contain year 1-6.';

    const isTahap2 = year >= 4;
    const type = String(selectedEvent.type || '').toUpperCase();
    const isTarikTali = String(selectedEvent.name || '').toUpperCase().includes('TARIK TALI');

    if (isTarikTali) {
      if (year < 4 || year > 6) return 'Tarik Tali is only for Tahun 4, 5, 6.';
      const sameHouseYear = registrationsByEvent.filter((registration) => {
        const registeredStudent = studentMap.get(registration.studentIc) || {};
        return normalizeHouse(registration.house) === student.house && getYear(registeredStudent.className) === year;
      });
      if (sameHouseYear.length >= Number(settings.maxTarikTaliPerHouseYear || 4)) {
        return `Tarik Tali quota is full for Tahun ${year} Rumah ${student.house}.`;
      }
    }

    const existingEvents = registrations
      .filter((registration) => registration.studentIc === student.ic && registration.eventId !== selectedEvent.id)
      .map((registration) => eventMap.get(registration.eventId))
      .filter(Boolean);
    const currentIndividu = existingEvents.filter((event) => String(event.type || '').toUpperCase().includes('INDIVIDU')).length;
    const currentKumpulan = existingEvents.filter((event) => String(event.type || '').toUpperCase().includes('KUMPULAN')).length;
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
    if (!selectedEvent) {
      setNotice('Choose an event first.');
      return;
    }

    const id = `${selectedEvent.id}_${student.ic}`;
    if (registeredIcSet.has(student.ic)) {
      await deleteDoc(doc(refs.registrations, id));
      return;
    }

    const blockReason = getRegistrationBlockReason(student);
    if (blockReason) {
      setNotice(blockReason);
      return;
    }

    await setDoc(doc(refs.registrations, id), {
      eventId: selectedEvent.id,
      studentIc: student.ic,
      house: student.house,
      className: student.className,
      position: '',
      points: 0,
      updatedAt: serverTimestamp(),
      updatedMs: Date.now(),
    });
  };

  const updateResult = async (registration, position) => {
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
    const batch = writeBatch(db);
    registrations.filter((registration) => registration.eventId === eventId).forEach((registration) => {
      batch.delete(doc(refs.registrations, registration.id));
    });
    batch.delete(doc(refs.events, eventId));
    await batch.commit();
    setNotice('Event deleted.');
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

  const tabs = [
    ['live', Monitor, 'Live Board'],
    ['students', Users, 'Students'],
    ['events', Trophy, 'Events'],
    ['settings', Settings, 'Settings'],
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">{settings.schoolName}</p>
          <h1>{settings.eventTitle}</h1>
          <p className="subtle">Standalone Firebase site: {siteId}</p>
        </div>
        <nav className="tabbar">
          {tabs.map(([id, Icon, label]) => (
            <button key={id} type="button" className={activeTab === id ? 'tab active' : 'tab'} onClick={() => setActiveTab(id)}>
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
      </header>

      {notice && <button className="notice" type="button" onClick={() => setNotice('')}>{notice}</button>}

      <main className="workspace">
        {loading && <div className="status-line">Loading realtime Firebase data...</div>}

        {activeTab === 'live' && (
          <section className={settings.liveBoardMode === 'total-only' ? 'live-grid total-only' : 'live-grid'}>
            <div className="panel scoreboard-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Realtime</p>
                  <h2>Total Marks</h2>
                </div>
                <Activity size={22} />
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
                      <strong>{result.student?.name || result.studentIc}</strong>
                      <span>{result.event?.name || 'Event'} ({result.event?.category || '-'})</span>
                    </div>
                    <b>{result.points || 0}</b>
                  </div>
                )) : <p className="empty">No results entered yet.</p>}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'students' && (
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
              <button className="secondary-button" type="button" onClick={() => fileInputRef.current?.click()}>
                <Upload size={16} /> Upload Completed List
              </button>
              <label>
                Search
                <input value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} placeholder="Name, class, IC, house" />
              </label>
              <p className="help-text">Required columns: Name, Class, IC, Rumah Sukan. IC is the Firebase document key.</p>
            </div>

            <div className="panel table-panel">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Class</th>
                    <th>IC</th>
                    <th>House</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.ic}>
                      <td>{student.name}</td>
                      <td>{student.className}</td>
                      <td className="mono">{student.ic}</td>
                      <td><span className={houseClassName(student.house)}>{student.house}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'events' && (
          <section className="event-layout">
            <form className="panel control-panel" onSubmit={saveEvent}>
              <div className="section-head">
                <div>
                  <p className="eyebrow">Setup</p>
                  <h2>Event</h2>
                </div>
                <Plus size={22} />
              </div>
              <label>
                Event name
                <input required value={eventForm.name} onChange={(event) => setEventForm({ ...eventForm, name: event.target.value })} placeholder="Lari 100m" />
              </label>
              <div className="inline-fields">
                <label>
                  Category
                  <input value={eventForm.category} onChange={(event) => setEventForm({ ...eventForm, category: event.target.value.toUpperCase() })} />
                </label>
                <label>
                  Type
                  <select value={eventForm.type} onChange={(event) => setEventForm({ ...eventForm, type: event.target.value })}>
                    <option>Individu</option>
                    <option>Kumpulan</option>
                  </select>
                </label>
              </div>
              <div className="points-grid">
                {[1, 2, 3, 4, 5].map((position) => (
                  <label key={position}>
                    P{position}
                    <input type="number" value={eventForm[`points${position}`]} onChange={(event) => setEventForm({ ...eventForm, [`points${position}`]: event.target.value })} />
                  </label>
                ))}
              </div>
              <button className="primary-button" type="submit"><Save size={16} /> Save Event</button>
            </form>

            <div className="panel entry-panel">
              <div className="entry-head">
                <select value={selectedEventId} onChange={(event) => setSelectedEventId(event.target.value)}>
                  <option value="">Choose event</option>
                  {events.map((event) => <option key={event.id} value={event.id}>{event.no}. {event.name} ({event.category})</option>)}
                </select>
                {selectedEvent && (
                  <button className="icon-button danger" title="Delete event" type="button" onClick={() => deleteEvent(selectedEvent.id)}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="entry-columns">
                <div className="student-picker">
                  {students.map((student) => {
                    const selected = registeredIcSet.has(student.ic);
                    return (
                      <button className={selected ? 'picker-row selected' : 'picker-row'} key={student.ic} type="button" onClick={() => toggleRegistration(student)}>
                        <span>
                          <strong>{student.name}</strong>
                          <small>{student.className} - {student.house}</small>
                        </span>
                        <b>{selected ? 'IN' : '+'}</b>
                      </button>
                    );
                  })}
                </div>

                <div className="registered-list">
                  {registrationsByEvent.map((registration) => {
                    const student = studentMap.get(registration.studentIc) || {};
                    return (
                      <div className="registered-row" key={registration.id}>
                        <div className="registered-top">
                          <div>
                            <strong>{student.name || registration.studentIc}</strong>
                            <small>{student.className || registration.className} - {registration.house}</small>
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
              </div>
            </div>
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="settings-grid">
            <div className="panel settings-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">General</p>
                  <h2>e-Sukan Settings</h2>
                </div>
                <Settings size={22} />
              </div>
              <label>
                School name
                <input value={settings.schoolName || ''} onChange={(event) => setSettings({ ...settings, schoolName: event.target.value })} />
              </label>
              <label>
                Event title
                <input value={settings.eventTitle || ''} onChange={(event) => setSettings({ ...settings, eventTitle: event.target.value })} />
              </label>
              <label>
                Year
                <input type="number" value={settings.year || ''} onChange={(event) => setSettings({ ...settings, year: Number(event.target.value) })} />
              </label>
              <label>
                Houses
                <input value={houses.join(', ')} onChange={(event) => setSettings({ ...settings, houses: event.target.value.split(',').map(normalizeHouse).filter(Boolean) })} />
              </label>
              <label>
                Live board
                <select value={settings.liveBoardMode || 'total-only'} onChange={(event) => setSettings({ ...settings, liveBoardMode: event.target.value })}>
                  <option value="total-only">Realtime total marks only</option>
                  <option value="total-and-class">Total marks + class marks</option>
                </select>
              </label>
              <button className="primary-button" type="button" onClick={saveSettings}><Save size={16} /> Save Settings</button>
            </div>

            <div className="panel settings-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Rules</p>
                  <h2>Participation Limits</h2>
                </div>
                <Medal size={22} />
              </div>
              <div className="inline-fields">
                <label>
                  Individu T1
                  <input type="number" value={settings.maxIndividuTahap1 || 0} onChange={(event) => setSettings({ ...settings, maxIndividuTahap1: Number(event.target.value) })} />
                </label>
                <label>
                  Individu T2
                  <input type="number" value={settings.maxIndividuTahap2 || 0} onChange={(event) => setSettings({ ...settings, maxIndividuTahap2: Number(event.target.value) })} />
                </label>
              </div>
              <div className="inline-fields">
                <label>
                  Kumpulan T1
                  <input type="number" value={settings.maxKumpulanTahap1 || 0} onChange={(event) => setSettings({ ...settings, maxKumpulanTahap1: Number(event.target.value) })} />
                </label>
                <label>
                  Kumpulan T2
                  <input type="number" value={settings.maxKumpulanTahap2 || 0} onChange={(event) => setSettings({ ...settings, maxKumpulanTahap2: Number(event.target.value) })} />
                </label>
              </div>
              <label>
                Tarik Tali quota per house/year
                <input type="number" value={settings.maxTarikTaliPerHouseYear || 0} onChange={(event) => setSettings({ ...settings, maxTarikTaliPerHouseYear: Number(event.target.value) })} />
              </label>
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
