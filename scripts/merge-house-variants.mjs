import fs from 'node:fs';
import path from 'node:path';
import { initializeApp } from 'firebase/app';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

const envPath = path.resolve('.env.local');
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);

const canonicalHouses = ['红 MERAH', '黄 KUNING', '蓝 BIRU', '青 HIJAU'];
const houseTokens = [
  ['红', 'MERAH', 'RED'],
  ['黄', 'KUNING', 'YELLOW'],
  ['蓝', 'BIRU', 'BLUE'],
  ['青', '绿', 'HIJAU', 'GREEN'],
];
const normalizeHouse = (value) => {
  const house = String(value || '').trim();
  if (!house) return '';
  const key = house.toLocaleUpperCase('ms-MY');
  const colorIndex = houseTokens.findIndex((tokens) => tokens.some((token) => key.includes(token)));
  return colorIndex >= 0 ? canonicalHouses[colorIndex] : house;
};
const mergeScores = (rows) => {
  const totals = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const name = normalizeHouse(row?.name);
    if (!name) return;
    totals.set(name, (totals.get(name) || 0) + Number(row?.total || 0));
  });
  return canonicalHouses
    .filter((name) => totals.has(name))
    .map((name) => ({ name, total: totals.get(name) }));
};
const normalizeResult = (result = {}) => ({
  ...result,
  house: normalizeHouse(result.house),
  student: result.student ? { ...result.student, house: normalizeHouse(result.student.house) } : result.student,
});
const normalizeSummary = (summary = {}) => ({
  scoreData: summary.scoreData ? {
    ...summary.scoreData,
    houses: mergeScores(summary.scoreData.houses),
  } : summary.scoreData,
  latestResultGroups: Array.isArray(summary.latestResultGroups)
    ? summary.latestResultGroups.map((group) => ({ ...group, results: (group.results || []).map(normalizeResult) }))
    : summary.latestResultGroups,
  resultGroups: Array.isArray(summary.resultGroups)
    ? summary.resultGroups.map((group) => ({ ...group, results: (group.results || []).map(normalizeResult) }))
    : summary.resultGroups,
  laneGroups: Array.isArray(summary.laneGroups)
    ? summary.laneGroups.map((group) => ({
      ...group,
      rows: (group.rows || []).map((row) => ({
        ...row,
        house: normalizeHouse(row.house),
        registration: row.registration ? normalizeResult(row.registration) : row.registration,
      })),
    }))
    : summary.laneGroups,
  athleteLeaders: summary.athleteLeaders ? {
    ...summary.athleteLeaders,
    male: summary.athleteLeaders.male ? {
      ...summary.athleteLeaders.male,
      student: { ...summary.athleteLeaders.male.student, house: normalizeHouse(summary.athleteLeaders.male.student?.house) },
    } : null,
    female: summary.athleteLeaders.female ? {
      ...summary.athleteLeaders.female,
      student: { ...summary.athleteLeaders.female.student, house: normalizeHouse(summary.athleteLeaders.female.student?.house) },
    } : null,
  } : summary.athleteLeaders,
});
const sameJson = (first, second) => JSON.stringify(first) === JSON.stringify(second);

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};
if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
  throw new Error('Missing Firebase configuration in .env.local.');
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const siteId = process.argv[2] || env.VITE_ESUKAN_SITE_ID || 'sinming-esukan';
const root = doc(db, 'esukanSites', siteId);
const refs = {
  settings: doc(root, 'settings', 'app'),
  students: collection(root, 'students'),
  events: collection(root, 'events'),
  registrations: collection(root, 'registrations'),
  summary: doc(root, 'summaries', 'liveBoard'),
};

const [settingsSnapshot, studentsSnapshot, eventsSnapshot, registrationsSnapshot, summarySnapshot] = await Promise.all([
  getDoc(refs.settings),
  getDocs(refs.students),
  getDocs(refs.events),
  getDocs(refs.registrations),
  getDoc(refs.summary),
]);

const writes = [];
const settings = settingsSnapshot.exists() ? settingsSnapshot.data() : {};
const normalizedSettingsHouses = Array.from(new Set((settings.houses || []).map(normalizeHouse).filter(Boolean)));
if (!sameJson(settings.houses || [], normalizedSettingsHouses)) {
  writes.push((batch) => batch.set(refs.settings, { houses: normalizedSettingsHouses, updatedAt: serverTimestamp() }, { merge: true }));
}

studentsSnapshot.docs.forEach((snapshot) => {
  const student = snapshot.data();
  const house = normalizeHouse(student.house);
  if (house && house !== student.house) {
    writes.push((batch) => batch.set(snapshot.ref, { house, updatedAt: serverTimestamp() }, { merge: true }));
  }
});

eventsSnapshot.docs.forEach((snapshot) => {
  const event = snapshot.data();
  if (!Array.isArray(event.lanePlan)) return;
  const lanePlan = event.lanePlan.map((lane) => ({ ...lane, house: normalizeHouse(lane.house) }));
  if (!sameJson(event.lanePlan, lanePlan)) {
    writes.push((batch) => batch.set(snapshot.ref, { lanePlan, updatedAt: serverTimestamp() }, { merge: true }));
  }
});

registrationsSnapshot.docs.forEach((snapshot) => {
  const registration = snapshot.data();
  const house = normalizeHouse(registration.house);
  if (house && house !== registration.house) {
    writes.push((batch) => batch.set(snapshot.ref, { house, updatedAt: serverTimestamp() }, { merge: true }));
  }
});

if (summarySnapshot.exists()) {
  const summary = summarySnapshot.data();
  const normalizedSummary = normalizeSummary(summary);
  const patch = Object.fromEntries(Object.entries(normalizedSummary).filter(([key, value]) => !sameJson(summary[key], value)));
  if (Object.keys(patch).length) {
    writes.push((batch) => batch.set(refs.summary, { ...patch, updatedAt: serverTimestamp() }, { merge: true }));
  }
}

let batch = writeBatch(db);
let count = 0;
let batches = 0;
for (const write of writes) {
  write(batch);
  count += 1;
  if (count === 400) {
    await batch.commit();
    batch = writeBatch(db);
    count = 0;
    batches += 1;
  }
}
if (count) {
  await batch.commit();
  batches += 1;
}

console.log(JSON.stringify({
  siteId,
  canonicalHouses,
  students: studentsSnapshot.size,
  events: eventsSnapshot.size,
  registrations: registrationsSnapshot.size,
  writes: writes.length,
  batches,
}, null, 2));
