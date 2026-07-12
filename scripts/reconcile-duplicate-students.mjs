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

const env = Object.fromEntries(
  fs.readFileSync(path.resolve('.env.local'), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);
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

const canonicalHouses = ['红 MERAH', '黄 KUNING', '蓝 BIRU', '青 HIJAU'];
const houseTokens = [
  ['红', 'MERAH', 'RED'],
  ['黄', 'KUNING', 'YELLOW'],
  ['蓝', 'BIRU', 'BLUE'],
  ['青', '绿', 'HIJAU', 'GREEN'],
];
const normalizeHouse = (value) => {
  const house = String(value || '').trim();
  const key = house.toLocaleUpperCase('ms-MY');
  const index = houseTokens.findIndex((tokens) => tokens.some((token) => key.includes(token)));
  return index >= 0 ? canonicalHouses[index] : house;
};
const normalizeText = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('ms-MY');
const studentId = (student) => String(student?.ic || student?.studentKey || student?.id || '').trim();
const chineseName = (student) => normalizeText(student?.chineseName || student?.name);
const profileKey = (student) => {
  const name = chineseName(student);
  const className = normalizeText(student?.className);
  return name && className ? `${name}|${className}` : '';
};
const classHouseKey = (student) => {
  const className = normalizeText(student?.className);
  const house = normalizeText(normalizeHouse(student?.house));
  return className && house ? `${className}|${house}` : '';
};
const isChineseDuplicate = (student) => {
  const name = normalizeText(student?.name);
  const chinese = normalizeText(student?.chineseName);
  return Boolean(name && chinese && name === chinese);
};
const editDistance = (first, second) => {
  const source = Array.from(String(first || ''));
  const target = Array.from(String(second || ''));
  if (Math.abs(source.length - target.length) > 1) return 2;
  const row = Array.from({ length: target.length + 1 }, (_, index) => index);
  for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex += 1) {
    let diagonal = row[0];
    row[0] = sourceIndex;
    for (let targetIndex = 1; targetIndex <= target.length; targetIndex += 1) {
      const top = row[targetIndex];
      row[targetIndex] = Math.min(
        row[targetIndex] + 1,
        row[targetIndex - 1] + 1,
        diagonal + (source[sourceIndex - 1] === target[targetIndex - 1] ? 0 : 1),
      );
      diagonal = top;
    }
  }
  return row[target.length];
};
const resultPriority = (registration) => {
  const position = Number(registration?.position || 0);
  return position > 0 ? position : 99;
};
const mergeRegistrations = (current, incoming, targetStudent) => {
  const winner = resultPriority(incoming) < resultPriority(current) ? incoming : current;
  const loser = winner === incoming ? current : incoming;
  return {
    ...loser,
    ...winner,
    id: incoming.id,
    eventId: incoming.eventId,
    studentIc: studentId(targetStudent),
    house: normalizeHouse(targetStudent.house),
    className: targetStudent.className || incoming.className || current.className || '',
    updatedAt: serverTimestamp(),
    updatedMs: Date.now(),
  };
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const siteId = process.argv[2] || env.VITE_ESUKAN_SITE_ID || 'sinming-esukan';
const root = doc(db, 'esukanSites', siteId);
const refs = {
  students: collection(root, 'students'),
  registrations: collection(root, 'registrations'),
  summary: doc(root, 'summaries', 'liveBoard'),
};

const [studentsSnapshot, registrationsSnapshot, summarySnapshot] = await Promise.all([
  getDocs(refs.students),
  getDocs(refs.registrations),
  getDoc(refs.summary),
]);
const students = studentsSnapshot.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }));
const registrations = registrationsSnapshot.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }));
const canonicalByProfile = new Map();
const canonicalByName = new Map();
const canonicalByClassHouse = new Map();

students.filter((student) => !isChineseDuplicate(student) && student.name).forEach((student) => {
  const key = profileKey(student);
  if (key && !canonicalByProfile.has(key)) canonicalByProfile.set(key, student);
  const name = chineseName(student);
  if (name) {
    if (!canonicalByName.has(name)) canonicalByName.set(name, student);
    else if (studentId(canonicalByName.get(name)) !== studentId(student)) canonicalByName.set(name, null);
  }
  const classHouse = classHouseKey(student);
  if (classHouse) canonicalByClassHouse.set(classHouse, [...(canonicalByClassHouse.get(classHouse) || []), student]);
});

const duplicateMap = new Map();
students.filter(isChineseDuplicate).forEach((duplicate) => {
  const exact = canonicalByProfile.get(profileKey(duplicate)) || canonicalByName.get(chineseName(duplicate));
  if (exact) {
    duplicateMap.set(studentId(duplicate), exact);
    return;
  }
  const candidates = canonicalByClassHouse.get(classHouseKey(duplicate)) || [];
  const fuzzy = candidates.filter((candidate) => editDistance(chineseName(duplicate), chineseName(candidate)) === 1);
  if (fuzzy.length === 1) duplicateMap.set(studentId(duplicate), fuzzy[0]);
});

const registrationsById = new Map(registrations.map((registration) => [registration.id, registration]));
const pendingSets = new Map();
const pendingDeletes = new Set();
registrations.forEach((registration) => {
  if (registration.entryType === 'relay') {
    const members = (registration.teamMembers || []).map((member) => {
      const canonical = duplicateMap.get(member.studentIc);
      return canonical ? {
        name: canonical.name || '',
        chineseName: canonical.chineseName || '',
        className: canonical.className || '',
        studentIc: studentId(canonical),
      } : member;
    });
    if (JSON.stringify(members) !== JSON.stringify(registration.teamMembers || [])) {
      pendingSets.set(registration.id, {
        ...registration,
        teamMembers: members,
        className: Array.from(new Set(members.map((member) => member.className).filter(Boolean))).join(' / ') || registration.className || '',
        updatedAt: serverTimestamp(),
        updatedMs: Date.now(),
      });
    }
    return;
  }
  const canonical = duplicateMap.get(registration.studentIc);
  if (!canonical) return;
  const targetId = `${registration.eventId}_${studentId(canonical)}`;
  const incoming = {
    ...registration,
    id: targetId,
    studentIc: studentId(canonical),
    house: normalizeHouse(canonical.house),
    className: canonical.className || registration.className || '',
    updatedAt: serverTimestamp(),
    updatedMs: Date.now(),
  };
  const existing = pendingSets.get(targetId) || registrationsById.get(targetId);
  pendingSets.set(targetId, existing ? mergeRegistrations(existing, incoming, canonical) : incoming);
  if (targetId !== registration.id) pendingDeletes.add(registration.id);
});

const summaryPatch = {};
if (summarySnapshot.exists()) {
  const summary = summarySnapshot.data();
  const canonicalStudent = (student) => duplicateMap.get(studentId(student)) || student;
  const remapResult = (result) => ({ ...result, student: result.student ? canonicalStudent(result.student) : result.student });
  const remapGroups = (groups) => Array.isArray(groups)
    ? groups.map((group) => ({ ...group, results: (group.results || []).map(remapResult) }))
    : groups;
  const remapLaneGroups = Array.isArray(summary.laneGroups)
    ? summary.laneGroups.map((group) => ({
      ...group,
      rows: (group.rows || []).map((row) => ({
        ...row,
        registration: row.registration ? remapResult(row.registration) : row.registration,
      })),
    }))
    : summary.laneGroups;
  const remapLeader = (leader) => leader ? { ...leader, student: canonicalStudent(leader.student) } : leader;
  const nextSummary = {
    latestResultGroups: remapGroups(summary.latestResultGroups),
    resultGroups: remapGroups(summary.resultGroups),
    laneGroups: remapLaneGroups,
    athleteLeaders: summary.athleteLeaders ? {
      male: remapLeader(summary.athleteLeaders.male),
      female: remapLeader(summary.athleteLeaders.female),
    } : summary.athleteLeaders,
  };
  Object.entries(nextSummary).forEach(([key, value]) => {
    if (JSON.stringify(value) !== JSON.stringify(summary[key])) summaryPatch[key] = value;
  });
}

const writes = [];
pendingSets.forEach((registration, id) => {
  writes.push((batch) => batch.set(doc(refs.registrations, id), registration, { merge: true }));
});
pendingDeletes.forEach((id) => {
  if (!pendingSets.has(id)) writes.push((batch) => batch.delete(doc(refs.registrations, id)));
});
duplicateMap.forEach((_, duplicateId) => {
  writes.push((batch) => batch.delete(doc(refs.students, duplicateId)));
});
if (Object.keys(summaryPatch).length) {
  writes.push((batch) => batch.set(refs.summary, { ...summaryPatch, updatedAt: serverTimestamp() }, { merge: true }));
}

let batch = writeBatch(db);
let writeCount = 0;
let batches = 0;
for (const write of writes) {
  write(batch);
  writeCount += 1;
  if (writeCount === 400) {
    await batch.commit();
    batch = writeBatch(db);
    writeCount = 0;
    batches += 1;
  }
}
if (writeCount) {
  await batch.commit();
  batches += 1;
}

console.log(JSON.stringify({
  siteId,
  matchedDuplicateStudents: duplicateMap.size,
  registrationWrites: pendingSets.size,
  registrationDeletes: pendingDeletes.size,
  summaryUpdated: Object.keys(summaryPatch).length > 0,
  writes: writes.length,
  batches,
}, null, 2));
