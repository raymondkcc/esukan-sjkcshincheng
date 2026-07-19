import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';
import { initializeApp } from 'firebase/app';
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

const DEFAULT_SOURCE = 'C:/Users/User/Downloads/Senarai Atlet Mengikut Acara.xlsx';
const args = process.argv.slice(2);
const applyChanges = args.includes('--apply');
const sourceArgument = args.find((argument) => argument.startsWith('--source='));
const sourcePath = sourceArgument ? sourceArgument.slice('--source='.length) : DEFAULT_SOURCE;
const siteArgument = args.find((argument) => argument.startsWith('--site='));

const LABELS = {
  event: '\u9879\u76ee',
  lane: '\u8dd1\u9053',
  name: '\u59d3\u540d',
  className: '\u73ed\u7ea7',
  house: '\u8272\u7ec4',
};

const canonicalHouses = {
  red: '\u7ea2 MERAH',
  yellow: '\u9ec4 KUNING',
  blue: '\u84dd BIRU',
  green: '\u9752 HIJAU',
};

const houseTokens = [
  [canonicalHouses.red, '\u7ea2', 'MERAH', 'RED'],
  [canonicalHouses.yellow, '\u9ec4', 'KUNING', 'YELLOW'],
  [canonicalHouses.blue, '\u84dd', 'BIRU', 'BLUE'],
  [canonicalHouses.green, '\u9752', 'HIJAU', 'GREEN'],
];

const yearLabels = {
  1: '\u4e00\u5e74\u7ea7',
  2: '\u4e8c\u5e74\u7ea7',
  3: '\u4e09\u5e74\u7ea7',
  4: '\u56db\u5e74\u7ea7',
  5: '\u4e94\u5e74\u7ea7',
  6: '\u516d\u5e74\u7ea7',
};

const genderLabels = {
  female: '\u5973\u5b50\u7ec4',
  male: '\u7537\u5b50\u7ec4',
  mixed: '\u7537\u5973\u6df7\u5408',
};

const scoring = { 1: 10, 2: 7, 3: 5, 4: 3 };
const OPEN_SIGNUP_EVENTS = {
  37: {
    name: '\u4e8c\u4eba\u4e09\u8db3',
    baseName: '\u4e8c\u4eba\u4e09\u8db3',
    registrationMode: 'open-pair',
    teamSize: 2,
  },
  38: {
    name: '\u5bb6\u957f/\u6821\u53cb/\u6559\u5e08 4\u00d7100\u7c73\u63a5\u529b\u8d5b',
    baseName: '4\u00d7100\u7c73\u63a5\u529b\u8d5b',
    registrationMode: 'open-relay',
    teamSize: 4,
  },
};

const cleanText = (value) => String(value ?? '')
  .normalize('NFC')
  .trim()
  .replace(/\s+/gu, ' ');

const normalizeText = (value) => cleanText(value).toLocaleUpperCase('ms-MY');

const normalizeHouse = (value) => {
  const text = cleanText(value);
  const key = normalizeText(text);
  const match = houseTokens.find((tokens) => tokens.some((token) => key.includes(normalizeText(token))));
  return match ? match[0] : text;
};

const sourceGender = (value) => {
  const key = normalizeText(value);
  if (key.includes('\u5973')) return 'female';
  if (key.includes('\u7537') && key.includes('\u6df7')) return 'mixed';
  if (key.includes('\u7537')) return 'male';
  if (key.includes('MIXED') || key.includes('CAMPURAN')) return 'mixed';
  return '';
};

const studentGender = (gender) => {
  if (gender === 'female') return 'Perempuan';
  if (gender === 'male') return 'Lelaki';
  return '';
};

const eventCategory = (year, gender) => {
  const numericYear = Number(year);
  if (Number.isInteger(numericYear) && numericYear >= 1 && numericYear <= 6) {
    if (gender === 'female') return `P${numericYear}`;
    if (gender === 'male') return `L${numericYear}`;
    return `Tahun ${numericYear}`;
  }
  if (String(year).includes('4 - 6')) return 'Tahap 2 (Terbuka)';
  return 'Terbuka';
};

const defaultEventName = (event) => {
  const year = Number(event.year);
  const gender = sourceGender(event.gender);
  if (yearLabels[year] && genderLabels[gender]) {
    return `${yearLabels[year]} ${event.name} (${genderLabels[gender]})`;
  }
  return event.name;
};

const isRelayName = (name) => cleanText(name).includes('\u63a5\u529b');

const sourceStudentKey = (student) => [
  normalizeText(student.name),
  normalizeText(student.className),
  normalizeText(normalizeHouse(student.house)),
].join('|');

const nameClassKey = (name, className) => [normalizeText(name), normalizeText(className)].join('|');

const nameClassHouseKey = (name, className, house) => [
  normalizeText(name),
  normalizeText(className),
  normalizeText(normalizeHouse(house)),
].join('|');

const nameHouseKey = (name, house) => [normalizeText(name), normalizeText(normalizeHouse(house))].join('|');

const containsHan = (value) => /\p{Script=Han}/u.test(String(value || ''));

const editDistance = (first, second) => {
  const source = Array.from(normalizeText(first));
  const target = Array.from(normalizeText(second));
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

const hashText = (value) => {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const readEnv = () => Object.fromEntries(
  fs.readFileSync(path.resolve('.env.local'), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);

const parseMasterEvents = (workbook) => {
  const sheet = workbook.Sheets.Acara;
  if (!sheet) throw new Error('The workbook does not contain the required Acara sheet.');
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false })
    .map((row) => ({
      no: Number(row[1]),
      name: cleanText(row[2]),
      year: cleanText(row[3]),
      gender: cleanText(row[4]),
      lanePlan: row.slice(5, 13)
        .map((house, index) => ({ laneNumber: index + 1, house: normalizeHouse(house) }))
        .filter((lane) => lane.house),
    }))
    .filter((event) => Number.isInteger(event.no) && event.no > 0 && event.name);
};

const getCellIndex = (row, label, startAt = 0) => row.findIndex((value, index) => index >= startAt && cleanText(value) === label);

const parseParticipantBlocks = (workbook) => {
  const entriesByEvent = new Map();

  workbook.SheetNames.filter((sheetName) => sheetName !== 'Acara').forEach((sheetName) => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', raw: false });
    const headers = [];

    rows.forEach((row, rowIndex) => {
      row.forEach((value, columnIndex) => {
        if (cleanText(value) !== LABELS.event) return;
        const title = cleanText(row[columnIndex + 1]);
        const no = Number(rows[rowIndex - 2]?.[columnIndex + 1]);
        if (title && Number.isInteger(no) && no > 0) headers.push({ rowIndex, columnIndex, no, title });
      });
    });

    headers.forEach((header, blockIndex) => {
      const tableHeader = rows[header.rowIndex + 2] || [];
      const laneIndex = getCellIndex(tableHeader, LABELS.lane);
      const houseIndex = getCellIndex(tableHeader, LABELS.house);
      const nameIndexes = tableHeader
        .map((value, index) => (cleanText(value) === LABELS.name ? index : -1))
        .filter((index) => index >= 0);
      const nextHeaderRow = headers[blockIndex + 1]?.rowIndex ?? rows.length;
      const entries = [];

      const hasNamedRows = nameIndexes.some((nameIndex) => rows
        .slice(header.rowIndex + 3, nextHeaderRow)
        .some((row) => {
          const value = cleanText(row?.[nameIndex]);
          return value && value !== LABELS.name;
        }));
      if (laneIndex < 0 || houseIndex < 0 || !nameIndexes.length) {
        if (!hasNamedRows) return;
        throw new Error(`Could not find participant table columns for event ${header.no} on ${sheetName}.`);
      }

      for (let rowIndex = header.rowIndex + 3; rowIndex < nextHeaderRow; rowIndex += 1) {
        const row = rows[rowIndex] || [];
        const laneNumber = Number(row[laneIndex]);
        const house = normalizeHouse(row[houseIndex]);
        const members = nameIndexes.map((nameIndex) => ({
          name: cleanText(row[nameIndex]),
          className: cleanText(row[nameIndex + 1]),
          house,
        })).filter((member) => member.name);

        if (!members.length) continue;
        if ((!Number.isInteger(laneNumber) || laneNumber < 1) && !house) continue;
        if (!Number.isInteger(laneNumber) || laneNumber < 1 || !house) {
          throw new Error(`Invalid lane or house in event ${header.no}, row ${rowIndex + 1} on ${sheetName}.`);
        }

        entries.push({
          laneNumber,
          house,
          members,
          relay: members.length > 1,
        });
      }

      if (entriesByEvent.has(header.no)) {
        throw new Error(`Event ${header.no} appears in more than one participant block.`);
      }
      entriesByEvent.set(header.no, { no: header.no, title: header.title, entries });
    });
  });

  return entriesByEvent;
};

const addToIndex = (index, key, student) => {
  if (!key) return;
  const current = index.get(key) || [];
  current.push(student);
  index.set(key, current);
};

const makeStudentIndexes = (students) => {
  const byNameClassHouse = new Map();
  const byNameClass = new Map();
  const byNameHouse = new Map();
  const byName = new Map();

  students.forEach((student) => {
    const aliases = new Set([student.name, student.chineseName].map(cleanText).filter(Boolean));
    aliases.forEach((name) => {
      addToIndex(byNameClassHouse, nameClassHouseKey(name, student.className, student.house), student);
      addToIndex(byNameClass, nameClassKey(name, student.className), student);
      addToIndex(byNameHouse, nameHouseKey(name, student.house), student);
      addToIndex(byName, normalizeText(name), student);
    });
  });

  return { byNameClassHouse, byNameClass, byNameHouse, byName };
};

const uniqueCandidate = (candidates = []) => {
  const unique = Array.from(new Map(candidates.map((candidate) => [candidate.id, candidate])).values());
  return unique.length === 1 ? unique[0] : null;
};

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
};

const comparable = (value) => JSON.stringify(canonicalize(value));

const changedFields = (before, after) => Object.keys(after)
  .filter((key) => comparable(before?.[key]) !== comparable(after[key]));

const sameLanePlan = (first, second) => {
  const normalizePlan = (plan) => (Array.isArray(plan) ? plan : [])
    .map((lane) => ({
      laneNumber: Number(lane?.laneNumber || lane?.lane || 0),
      house: normalizeHouse(lane?.house),
    }))
    .filter((lane) => lane.laneNumber && lane.house);
  return comparable(normalizePlan(first)) === comparable(normalizePlan(second));
};

const describeEntry = (entry) => ({
  lane: entry.laneNumber,
  house: entry.house,
  name: entry.relay ? entry.members.map((member) => member.name).join(' / ') : entry.members[0]?.name || '',
});

const buildReport = (source) => ({
  source: {
    path: source,
    importedAt: new Date().toISOString(),
  },
  eventAdds: [],
  eventUpdates: [],
  studentAdds: [],
  studentUpdates: [],
  registrationAdds: [],
  registrationUpdates: [],
  registrationDeletes: [],
  unresolvedStudents: [],
});

const workbook = XLSX.readFile(sourcePath, { cellDates: true, raw: false });
const masterEvents = parseMasterEvents(workbook);
const participantBlocks = parseParticipantBlocks(workbook);
const env = readEnv();
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
const siteId = siteArgument ? siteArgument.slice('--site='.length) : (env.VITE_ESUKAN_SITE_ID || 'sinming-esukan');
const root = doc(db, 'esukanSites', siteId);
const refs = {
  students: collection(root, 'students'),
  events: collection(root, 'events'),
  registrations: collection(root, 'registrations'),
};

const [studentSnapshot, eventSnapshot, registrationSnapshot] = await Promise.all([
  getDocs(refs.students),
  getDocs(refs.events),
  getDocs(refs.registrations),
]);

const students = studentSnapshot.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }));
const events = eventSnapshot.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }));
const registrations = registrationSnapshot.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }));
const eventsByNo = new Map(events.map((event) => [Number(event.no), event]));
const registrationsById = new Map(registrations.map((registration) => [registration.id, registration]));
const indexes = makeStudentIndexes(students);
const pendingStudents = new Map();
const pendingStudentPatches = new Map();
const pendingEvents = new Map();
const pendingRegistrations = new Map();
const pendingRegistrationDeletes = new Map();
const report = buildReport(sourcePath);

const findOrCreateStudent = (sourceStudent, inferredGender) => {
  const exact = uniqueCandidate(indexes.byNameClassHouse.get(
    nameClassHouseKey(sourceStudent.name, sourceStudent.className, sourceStudent.house),
  ));
  const relaxed = exact
    || uniqueCandidate(indexes.byNameClass.get(nameClassKey(sourceStudent.name, sourceStudent.className)))
    || uniqueCandidate(indexes.byNameHouse.get(nameHouseKey(sourceStudent.name, sourceStudent.house)))
    || uniqueCandidate(indexes.byName.get(normalizeText(sourceStudent.name)));

  const fuzzyCandidates = students.filter((student) => {
    if (!sourceStudent.className || !sourceStudent.house) return false;
    if (normalizeText(student.className) !== normalizeText(sourceStudent.className)) return false;
    if (normalizeHouse(student.house) !== sourceStudent.house) return false;
    return [student.name, student.chineseName]
      .filter((name) => containsHan(name))
      .some((name) => editDistance(name, sourceStudent.name) === 1);
  });
  const matchedStudent = relaxed || uniqueCandidate(fuzzyCandidates);

  if (matchedStudent) {
    return matchedStudent;
  }

  const seed = sourceStudentKey(sourceStudent);
  const id = `excel-import-${hashText(seed)}`;
  const existingPending = pendingStudents.get(id);
  if (existingPending) return existingPending;

  const newStudent = {
    id,
    ic: id,
    studentKey: id,
    name: sourceStudent.name,
    chineseName: '',
    className: sourceStudent.className,
    house: sourceStudent.house,
    gender: studentGender(inferredGender),
  };
  pendingStudents.set(id, newStudent);
  addToIndex(indexes.byNameClassHouse, nameClassHouseKey(newStudent.name, newStudent.className, newStudent.house), newStudent);
  addToIndex(indexes.byNameClass, nameClassKey(newStudent.name, newStudent.className), newStudent);
  addToIndex(indexes.byNameHouse, nameHouseKey(newStudent.name, newStudent.house), newStudent);
  addToIndex(indexes.byName, normalizeText(newStudent.name), newStudent);
  report.studentAdds.push({ id, name: newStudent.name, className: newStudent.className, house: newStudent.house });
  return newStudent;
};

masterEvents.forEach((sourceEvent) => {
  const existing = eventsByNo.get(sourceEvent.no);
  const participantBlock = participantBlocks.get(sourceEvent.no);
  const openSignup = OPEN_SIGNUP_EVENTS[sourceEvent.no];
  const title = openSignup ? openSignup.name : participantBlock?.title || existing?.name || defaultEventName(sourceEvent);
  const event = existing || {
    id: `excel-event-${sourceEvent.no}`,
    type: isRelayName(sourceEvent.name) ? 'Kumpulan' : 'Individu',
    kind: 'Utama',
    withoutStudent: false,
    teamCountPerHouse: 1,
    scoring,
  };
  const managed = {
    id: event.id,
    no: sourceEvent.no,
    name: title,
    baseName: openSignup ? openSignup.baseName : sourceEvent.name,
    category: openSignup ? 'Terbuka' : existing?.category || eventCategory(sourceEvent.year, sourceGender(sourceEvent.gender)),
    lanePlan: openSignup
      ? sourceEvent.lanePlan.map((lane) => ({ laneNumber: lane.laneNumber }))
      : sourceEvent.lanePlan,
    ...(openSignup ? {
      type: 'Kumpulan',
      registrationMode: openSignup.registrationMode,
      teamSize: openSignup.teamSize,
      withoutStudent: false,
    } : {}),
  };
  const fields = changedFields(existing, managed)
    .filter((field) => field !== 'lanePlan' || !sameLanePlan(existing?.lanePlan, managed.lanePlan));
  if (!existing) {
    pendingEvents.set(event.id, { ...event, ...managed });
    report.eventAdds.push({ no: sourceEvent.no, id: event.id, name: title });
  } else if (fields.length) {
    pendingEvents.set(event.id, managed);
    report.eventUpdates.push({ no: sourceEvent.no, id: event.id, fields });
  }

  if (!participantBlock) return;
  const desiredRegistrationIds = new Set();
  const gender = sourceGender(sourceEvent.gender);
  participantBlock.entries.forEach((entry) => {
    const memberRecords = entry.members.map((member) => findOrCreateStudent(member, gender));
    const relay = entry.relay;
    const studentIc = relay ? `relay-${event.id}-lane-${entry.laneNumber}` : memberRecords[0].id;
    const registrationId = `${event.id}_${studentIc}`;
    const existingRegistration = registrationsById.get(registrationId);
    const className = relay
      ? Array.from(new Set(entry.members.map((member) => cleanText(member.className)).filter(Boolean))).join(' / ')
      : cleanText(entry.members[0].className);
    const managedRegistration = {
      id: registrationId,
      eventId: event.id,
      studentIc,
      house: entry.house,
      className,
      laneNumber: entry.laneNumber,
      ...(relay ? {
        entryType: 'relay',
        teamMembers: entry.members.map((member, index) => ({
          name: member.name,
          chineseName: member.name,
          className: member.className,
          studentIc: memberRecords[index].id,
        })),
      } : {}),
    };
    const fields = changedFields(existingRegistration, managedRegistration);
    desiredRegistrationIds.add(registrationId);

    if (!existingRegistration) {
      pendingRegistrations.set(registrationId, managedRegistration);
      report.registrationAdds.push({ eventNo: sourceEvent.no, eventId: event.id, ...describeEntry(entry) });
    } else if (fields.length) {
      pendingRegistrations.set(registrationId, managedRegistration);
      report.registrationUpdates.push({ eventNo: sourceEvent.no, eventId: event.id, fields, ...describeEntry(entry) });
    }
  });

  registrations.filter((registration) => registration.eventId === event.id).forEach((registration) => {
    if (desiredRegistrationIds.has(registration.id)) return;
    pendingRegistrationDeletes.set(registration.id, registration);
    report.registrationDeletes.push({
      eventNo: sourceEvent.no,
      eventId: event.id,
      lane: Number(registration.laneNumber || 0),
      house: registration.house || '',
      name: registration.entryType === 'relay'
        ? (registration.teamMembers || []).map((member) => member.name || member.chineseName || '').filter(Boolean).join(' / ')
        : registration.studentIc,
    });
  });
});

pendingStudentPatches.forEach((patch, id) => {
  const student = students.find((item) => item.id === id);
  report.studentUpdates.push({ id, name: student?.name || student?.chineseName || '', fields: Object.keys(patch), to: patch });
});

const summary = {
  siteId,
  applyChanges,
  sourceEvents: masterEvents.length,
  sourceParticipantEvents: participantBlocks.size,
  sourceEntries: Array.from(participantBlocks.values()).reduce((total, block) => total + block.entries.length, 0),
  sourceAthleteSlots: Array.from(participantBlocks.values()).reduce(
    (total, block) => total + block.entries.reduce((entryTotal, entry) => entryTotal + entry.members.length, 0),
    0,
  ),
  events: { added: report.eventAdds.length, updated: report.eventUpdates.length },
  students: { added: report.studentAdds.length, updated: report.studentUpdates.length },
  registrations: {
    added: report.registrationAdds.length,
    updated: report.registrationUpdates.length,
    deleted: report.registrationDeletes.length,
  },
};

if (applyChanges) {
  const operations = [];
  pendingEvents.forEach((event, id) => {
    operations.push((batch) => batch.set(doc(refs.events, id), {
      ...event,
      ...(eventsByNo.has(Number(event.no)) ? {} : { createdAt: serverTimestamp() }),
      updatedAt: serverTimestamp(),
    }, { merge: true }));
  });
  pendingStudents.forEach((student, id) => {
    operations.push((batch) => batch.set(doc(refs.students, id), {
      ...student,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true }));
  });
  pendingStudentPatches.forEach((patch, id) => {
    operations.push((batch) => batch.set(doc(refs.students, id), { ...patch, updatedAt: serverTimestamp() }, { merge: true }));
  });
  pendingRegistrations.forEach((registration, id) => {
    const existing = registrationsById.get(id);
    operations.push((batch) => batch.set(doc(refs.registrations, id), {
      ...registration,
      position: existing?.position || '',
      points: Number(existing?.points || 0),
      updatedAt: serverTimestamp(),
      updatedMs: Date.now(),
    }, { merge: true }));
  });
  pendingRegistrationDeletes.forEach((_, id) => {
    operations.push((batch) => batch.delete(doc(refs.registrations, id)));
  });

  let batch = writeBatch(db);
  let batchSize = 0;
  let batches = 0;
  for (const operation of operations) {
    operation(batch);
    batchSize += 1;
    if (batchSize === 400) {
      await batch.commit();
      batch = writeBatch(db);
      batchSize = 0;
      batches += 1;
    }
  }
  if (batchSize) {
    await batch.commit();
    batches += 1;
  }
  summary.writes = operations.length;
  summary.batches = batches;
}

console.log(JSON.stringify({ summary, report }, null, 2));
